# RIA评测系统题目分组设置指南

## 📋 概述

本次修改实现了新的题目抽样方案：

- **固定题目**：q0 (空白题目)
- **题目分组**：将9道题分成3组，每组3题
  - 组0: q1, q2, q3
  - 组1: q4, q5, q6
  - 组2: q7, q8, q9
- **用户分配**：每个组需要收集3个用户的答题数据
- **最终展示**：用户看到 1道固定题 + 3道随机题 = 共4道题

## 🗂️ 文件修改清单

### 新增文件

1. **题目文件**
   - `_answers/v2/q0/question.md` - 固定空白题目
   - `_answers/v2/q0/deepseek.md` - DeepSeek模型答案
   - `_answers/v2/q0/doubao.md` - 豆包模型答案
   - `_answers/v2/q0/maxiaocai.md` - 蚂小财模型答案
   - `_answers/v2/q0/tonghuashun.md` - 同花顺模型答案
   - `_answers/v2/q0/images/` - 图片目录

2. **API端点**
   - `app/api/get-next-group/route.ts` - 获取下一个可用分组的API
   - `app/api/group-stats/route.ts` - 分组统计API

3. **数据库脚本**
   - `scripts/setup_database.sql` - 数据库设置SQL脚本
   - `scripts/setup_question_groups.py` - Python设置脚本
   - `scripts/assign_users_to_groups.py` - 用户分配脚本
   - `scripts/check_groups.py` - 分组状态检查脚本

4. **可视化脚本**
   - `scripts/visualize_groups.py` - 分组统计可视化面板
   - `start_groups_panel.py` - 启动分组面板脚本

### 修改文件

1. **业务逻辑**
   - `lib/questions.ts` - 添加了 `getQuestionsByIds` 函数
   - `app/select-questions/page.tsx` - 修改了用户分配逻辑
   - `app/evaluate/page.tsx` - 修改了题目加载逻辑

## 🔧 数据库设置步骤

### 步骤1：在Supabase控制台执行SQL

1. 登录 Supabase 控制台
2. 选择你的项目
3. 进入 SQL Editor
4. 复制 `scripts/setup_database.sql` 中的内容
5. 点击 "Run" 执行SQL

**注意**：SQL脚本中的用户ID（28, 31, 35）需要根据实际情况调整。

### 步骤2：验证数据库设置

运行检查脚本：

```bash
python scripts/check_groups.py
```

预期输出：
```
[INFO] Question Groups:
Group 0: ['q1', 'q2', 'q3'] - 1/3 users (33.3%)
Group 1: ['q4', 'q5', 'q6'] - 1/3 users (33.3%)
Group 2: ['q7', 'q8', 'q9'] - 1/3 users (33.3%)

[INFO] User Assignments:
User: 张艺伟, Group: 0, Questions: ['q0', 'q1', 'q2', 'q3'], Status: completed
User: test1, Group: 1, Questions: ['q0', 'q4', 'q5', 'q6'], Status: completed
User: gh, Group: 2, Questions: ['q0', 'q7', 'q8', 'q9'], Status: completed
```

## 🚀 启动和测试

### 1. 启动主应用

```bash
npm run dev
```

### 2. 启动分组统计面板（可选）

```bash
python start_groups_panel.py
```

访问 http://localhost:8502 查看分组统计。

### 3. 测试新用户注册流程

1. 访问 http://localhost:3000
2. 填写用户信息并选择 v2 版本
3. 系统会自动分配到可用分组
4. 用户将看到 4道题：q0 + 3道随机题目

## 📊 API使用说明

### 获取下一个可用分组

```bash
GET /api/get-next-group
```

响应示例：
```json
{
  "group_index": 0,
  "question_ids": ["q1", "q2", "q3"],
  "question_set": ["q0", "q1", "q2", "q3"]
}
```

### 更新分组用户计数

```bash
POST /api/get-next-group
Content-Type: application/json

{
  "group_index": 0
}
```

响应示例：
```json
{
  "success": true,
  "group_index": 0,
  "new_count": 2
}
```

### 获取分组统计

```bash
GET /api/group-stats
```

响应示例：
```json
{
  "summary": {
    "total_groups": 3,
    "total_target_users": 9,
    "total_current_users": 3,
    "overall_progress": 33.3
  },
  "groups": [
    {
      "id": 1,
      "group_index": 0,
      "question_ids": ["q1", "q2", "q3"],
      "target_users": 3,
      "current_users": 1,
      "is_active": true,
      "progress": 33.3,
      "users": [
        {
          "user_name": "张艺伟",
          "created_at": "2026-05-25T08:42:16.079+00:00"
        }
      ]
    }
  ]
}
```

## 🎯 系统工作流程

### 新用户注册流程

1. 用户填写信息并选择 v2 版本
2. 系统检查用户是否已有分组分配
3. 如果没有，调用 `/api/get-next-group` 获取可用分组
4. 创建用户记录，包含 `group_index` 和 `question_set`
5. 调用 `/api/get-next-group` (POST) 更新分组用户计数
6. 跳转到评估页面，只显示分配的4道题目

### 评估流程

1. 用户访问 `/evaluate?version=v2&bucket=0&ids=q0,q1,q2,q3`
2. 系统根据 `ids` 参数加载对应题目
3. 用户完成答题后，数据保存到 `evaluation_data` 字段
4. 更新用户状态为 `completed`

## ⚠️ 注意事项

1. **数据库权限**：确保Supabase项目有足够的权限执行DDL操作
2. **用户ID调整**：SQL脚本中的用户ID需要根据实际情况修改
3. **向后兼容**：v1版本的功能不受影响
4. **题目顺序**：固定题目q0始终排在第一位
5. **分组轮询**：当所有组都满时，系统会自动轮询分配

## 🔍 故障排查

### 问题1：无法访问分组表

**解决方案**：确认已在Supabase控制台执行了 `setup_database.sql` 脚本。

### 问题2：用户分配失败

**解决方案**：
1. 检查 `question_groups` 表是否正确初始化
2. 确认API服务是否正常运行
3. 查看浏览器控制台错误信息

### 问题3：题目加载错误

**解决方案**：
1. 确认 `_answers/v2/q0/` 目录及文件已创建
2. 检查题目ID格式是否正确（q0, q1, q2...）
3. 验证 `question_set` 参数格式

## 📈 后续扩展

如果需要添加更多分组，只需：

1. 在 `question_groups` 表中插入新记录
2. 创建对应的题目文件
3. 更新 `app/select-questions/page.tsx` 中的配置

例如，添加组3：

```sql
INSERT INTO question_groups (group_index, question_ids, target_users, current_users, is_active)
VALUES (3, ARRAY['q10', 'q11', 'q12'], 3, 0, TRUE);
```

## 🎉 完成

设置完成后，系统将按照新的分组逻辑运行：
- 每个新用户自动分配到可用分组
- 每组收集3个用户数据后自动切换到下一组
- 最终每组都有完整的用户数据用于分析