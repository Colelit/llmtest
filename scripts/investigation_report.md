# v1/v2 版本数据隔离问题调查报告

## 一、问题现象

用户反馈：使用 `test1` 和 `zzl` 账号做 **v2 题包**测试，保存进度后回来找不到记录。

数据库实际查询结果：

| 账号 | submissions | user_progress | 实际存在的题包/版本 |
|------|-------------|---------------|-------------------|
| test1 | 1条 | 0条 | 题包1 / v2 / completed |
| zzl | 1条 | 2条 | 题包1 / v2 / in-progress |

**结论：test1 和 zzl 在题包2中确实没有任何记录。** 但这不是"记录丢失"，而是根本就没写入过题包2。数据写入到了题包1。

---

## 二、根因分析（5个问题点）

### 问题1：submissions 表 `user_name` 有 UNIQUE 约束，导致 v1/v2 数据互斥

**代码位置：**
- `scripts/setup_supabase.sql` 第12行：`user_name text NOT NULL UNIQUE`
- `select-questions/page.tsx` 第107行：`onConflict: 'user_name'`
- `EvaluationClient.tsx` 第265、328行：`onConflict: 'user_name'`

**影响：**
- 同一用户只能有一条 submissions 记录。
- 如果 `test1` 先在 v1 答题，再切换到 v2，`v2` 的 upsert 会**覆盖** v1 的记录（因为冲突键只有 `user_name`）。
- 反之亦然。用户无法在两个版本间分别保存独立的进度。

**实际数据验证：** submissions 表中 user=test1 只有1条记录（v2），没有 v1 记录——如果 test1 曾经答过 v1，那条记录已经被覆盖了。

---

### 问题2：user_progress 加载历史记录时，缺少 `bucket_index` 过滤

**代码位置：** `EvaluationClient.tsx` 第86-90行

```javascript
const { data: progress, error } = await supabase
  .from('user_progress')
  .select('question_id, model_id, evaluation_data')
  .eq('user_id', parsedUserInfo.name)
  .eq('version', version);   // ← 没有 .eq('bucket_index', bucketIndex)
```

**影响：**
- 如果一个用户在同一版本的不同题包（如 v2 题包1 和 v2 题包3）都答过题，加载时会**混为一谈**。
- 打开题包2时，可能加载出题包1的旧数据，导致显示混乱或覆盖当前进度。
- 虽然 v2 当前所有题包显示的题目一样（见问题5），但数据逻辑仍然是错误的。

---

### 问题3：user_progress upsert 的冲突键不包含 `bucket_index`

**代码位置：** `EvaluationClient.tsx` 第176行

```javascript
{ onConflict: 'user_id,question_id,model_id,version' }
// ← 缺少 bucket_index
```

**影响：**
- 同一用户 + 同一版本 + 同一题同一模型，在不同题包之间会互相覆盖。
- 例如：test1 在 v2 题包1 评了 q1/model-a，再去 v2 题包2 评 q1/model-a，后者会覆盖前者。
- 因为冲突键中没有 `bucket_index`，数据库认为这是同一条记录。

---

### 问题4：select-questions 查询和写入的冲突键不一致

**查询时**（`select-questions/page.tsx` 第60-65行）：
```javascript
.eq('user_name', userInfo.name)
.eq('version', version)   // 按 version 过滤
```

**写入时**（`select-questions/page.tsx` 第107行）：
```javascript
{ onConflict: 'user_name' }  // 冲突键不包含 version
```

**影响：**
- 查询时按 version 过滤，可能返回 null（如果已有记录是另一个版本的）。
- 写入时不按 version 区分，会把另一个版本的记录覆盖掉。
- 造成行为不一致：查询说"没记录"，写入却把别人的记录覆盖了。

---

### 问题5：v2 版本不区分题包（所有题包题目相同）

**代码位置：** `lib/questions.ts` 第27-29行

```javascript
if (allQuestions.length > 0 && allQuestions[0].id.startsWith('q')) {
  return allQuestions;  // v2 直接返回全部，不按 bucket 切分
}
```

**影响：**
- 虽然 v2 仍然分配 `bucket_index`（0-9）并保存到数据库，但所有用户看到的题目完全一样。
- 这意味着 `bucket_index` 在 v2 中失去了"分题包"的意义，变成一个纯粹的计数器。
- 如果未来 v2 也要按题包分题，现在的问题2和问题3会立刻暴露为严重 bug。

---

## 三、整改方案

### 方案A：数据库层修改（推荐，治本）

#### Step 1：修改 submissions 表的唯一约束

**目标：** 允许同一用户同时拥有 v1 和 v2 的记录。

```sql
-- 删除旧约束
ALTER TABLE submissions DROP CONSTRAINT IF EXISTS submissions_user_name_key;

-- 添加新约束（user_name + version 联合唯一）
ALTER TABLE submissions
ADD CONSTRAINT submissions_user_name_version_key
UNIQUE (user_name, version);
```

**代码修改：** 所有 `onConflict: 'user_name'` 改为 `onConflict: 'user_name,version'`：
- `select-questions/page.tsx` 第107行
- `EvaluationClient.tsx` 第265行
- `EvaluationClient.tsx` 第328行

#### Step 2：修改 user_progress 表的冲突键

**目标：** 让同一用户在同一版本的不同题包可以独立保存。

```sql
-- 删除旧约束
ALTER TABLE user_progress
DROP CONSTRAINT IF EXISTS user_progress_user_id_question_id_model_id_version_key;

-- 添加新约束（包含 bucket_index）
ALTER TABLE user_progress
ADD CONSTRAINT user_progress_user_id_question_id_model_id_version_bucket_key
UNIQUE (user_id, question_id, model_id, version, bucket_index);
```

**代码修改：** `EvaluationClient.tsx` 第176行：
```javascript
{ onConflict: 'user_id,question_id,model_id,version,bucket_index' }
```

#### Step 3：修改 user_progress 查询条件

**目标：** 加载历史记录时只加载当前题包的数据。

**代码修改：** `EvaluationClient.tsx` 第86-90行：
```javascript
const bucketIndex = getBucketIndex();
const { data: progress, error } = await supabase
  .from('user_progress')
  .select('question_id, model_id, evaluation_data')
  .eq('user_id', parsedUserInfo.name)
  .eq('version', version)
  .eq('bucket_index', bucketIndex);  // 新增：按题包过滤
```

#### Step 4：修改提交后的清理逻辑

**目标：** 最终提交后只清理当前版本+当前题包的进度。

**代码修改：** `EvaluationClient.tsx` 第341行：
```javascript
await supabase.from('user_progress')
  .delete()
  .eq('user_id', userInfo.name)
  .eq('version', version)
  .eq('bucket_index', bucketIndex);  // 新增：只删当前题包
```

### 方案B：应用层兼容（不修改数据库，短期 workaround）

如果不方便改数据库约束，可以在应用层做兼容：

1. **submissions 查询时**：按 `user_name + version` 联合查询（已有）+ 写入时主动带上 version（已有），但 upsert 的 fallback 逻辑需要调整，因为 `user_name` 冲突会覆盖所有版本。
2. **user_progress 查询时**：先查出所有记录，再在客户端按 `bucket_index` 过滤。缺点：数据量大时浪费带宽。
3. **user_progress 写入时**：在 `evaluation_data` JSON 中内嵌 `bucket_index`，用逻辑隔离代替物理隔离。缺点：脏且难以维护。

**不推荐方案B**，因为会积累技术债务。

---

## 四、对 test1/zzl 的具体解释

| 账号 | 发生了什么 |
|------|-----------|
| **test1** | 数据库中只有1条 submissions 记录（题包1/v2/completed），user_progress 已清理。如果 test1 曾经做过其他题包或其他版本，那些记录已被覆盖。 |
| **zzl** | 数据库中有1条 submissions（题包1/v2/in-progress）+ 2条 user_progress（q1/q9 + maxiaocai）。如果 zzl 在题包2做过测试，数据没有保存成功（可能是因为冲突覆盖、或保存时报错）。 |

---

## 五、执行建议

1. **先备份数据**：导出当前 submissions 和 user_progress 表。
2. **执行数据库迁移**：按方案A的 Step 1-2 修改约束。
3. **修改前端代码**：按方案A的 Step 3-4 修改查询和清理逻辑。
4. **验证**：用 test1/zzl 分别在 v1/v2 各选一个题包测试，确认数据互不覆盖、切换后可正常加载。
