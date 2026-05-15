# Phase 1 PLAN — FINEVAL 题库 2.0 重构

## 项目背景

现有 FINEVAL 评测平台使用单版本平铺题库（`_answers/`），无版本概念，无法支持新旧题库共存。新题库（v2）基于 docx 模板设计，题目结构、评分维度、模型接入方式均有更新。本次 Phase 1 目标是在不改动 Supabase 表结构的前提下，完成文件层重构与前端路由层改造，使平台支持 v1/v2 双版本切换。

## Phase 1 目标

1. 建立 `_answers/v1/` 和 `_answers/v2/` 双版本目录结构
2. 创建模型注册表（registry）和答案适配层（adapter），支持异构模型接入
3. 改造前端路由与渲染层，支持 URL 驱动的版本切换（`?version=v1|v2`）
4. 保持 v1 完全兼容，确保现有 111 条历史数据不受影响

## 技术约束

- **不修改 Supabase 表结构**（`submissions` / `user_progress` 保持现状）
- **单 Wave 内禁止同时读取超过 3 个模型答案文件**（节省 Token / 适配 Kimi 2.6）
- **所有代码注释使用中文**
- **Markdown 保持单栏流式**，前端通过 iframe + CSS Grid 实现左右并排
- **豆包处理流程必须文档化**到 `docs/doubao-workflow.md`
- **预留 scrape-adapter.ts 空壳**，为垂类模型链接爬取占位

---

## Wave 1 — 目录重构与版本隔离

### 任务 1.1：重命名现有题库目录

将 `_answers/` 平铺结构重命名为 `_answers/v1/`，保持内部 `question-{id}/` 结构不变。

**操作：**
- 使用 `git mv` 将 `_answers/question-{id}/` 全部移动到 `_answers/v1/question-{id}/`
- 更新 `scripts/sync-images.mjs` 的源路径：`./_answers/` → `./_answers/v1/`
- 更新 `scripts/sync-images.mjs` 的目标路径：`public/vendor/` → `public/vendor/v1/`

**涉及文件：**
- `scripts/sync-images.mjs`

### 任务 1.2：创建 v2 目录骨架与示例

创建 `_answers/v2/` 目录结构，包含一个示例题目用于验证 loader。

**结构：**
```
_answers/v2/
└── q1/                          # questionId = "q1"
    ├── question.md              # 题干（YAML frontmatter 可选）
    ├── images/                  # 题目专用图片
    │   └── example.png
    ├── gemini.md                # Gemini 答案
    ├── chatgpt.md               # ChatGPT 答案
    ├── deepseek.md              # DeepSeek 答案
    └── doubao.md                # 豆包答案（需经 manual-adapter 清洗）
```

**v2 模型答案 frontmatter 格式：**
```yaml
---
modelId: gemini
modelSlug: gemini
---
```

**图片路径规范：**
- Markdown 中使用相对路径：`./images/xxx.png`
- 答案中的图片统一放在该题目目录的 `images/` 下

### 任务 1.3：提取加载逻辑到 `lib/content/loader.ts`

当前加载逻辑散落在 `lib/questions.ts`（第 30-86 行）。提取并重构为独立的 `lib/content/loader.ts`，支持按 `version` 参数加载。

**设计：**
```typescript
// lib/content/loader.ts
export async function loadQuestions(version: 'v1' | 'v2'): Promise<Question[]>;

// v1 loader：兼容现有逻辑
// - 扫描 _answers/v1/question-{id}/
// - 读取 question.txt + model-a.md ~ model-h.md
// - 使用 gray-matter 解析 frontmatter
// - remark 转 HTML，图片路径重写

// v2 loader：新逻辑
// - 扫描 _answers/v2/{questionId}/
// - 读取 question.md（题干）+ {model-slug}.md（答案）
// - 模型列表从 registry.ts 读取（仅 isActive 且 source !== 'scrape' 的模型）
// - 根据 adapterType 调用对应 adapter 解析
// - 返回标准 Question[] 格式
```

**兼容性处理：**
- `lib/questions.ts` 保留 `BUCKET_MATRIX`、`getQuestionsForBucket`、`getUserPackIndex` 等函数
- `lib/questions.ts` 中的 `getAllQuestions` 改为调用 `loadQuestions('v1')`
- 现有所有引用 `lib/questions.ts` 的文件无需修改

### 任务 1.4：更新图片同步脚本

修改 `scripts/sync-images.mjs`，使其支持 v1 和 v2 双路径。

**设计：**
- v1 图片：`_answers/v1/question-{id}/images/` → `public/vendor/v1/question-{id}/images/`
- v2 图片：`_answers/v2/{questionId}/images/` → `public/vendor/v2/{questionId}/images/`
- 运行时 loader 根据 version 参数选择对应的 public 路径前缀

### Wave 1 验证标准

- [ ] `_answers/v1/` 目录下所有旧题目完整保留，git 历史可追溯
- [ ] `_answers/v2/` 目录结构创建成功，包含至少一个示例题目
- [ ] `node scripts/sync-images.mjs` 成功同步 v1 和 v2 图片到 `public/vendor/`
- [ ] `loadQuestions('v1')` 返回的数据结构与重构前完全一致
- [ ] `loadQuestions('v2')` 能正确读取示例题目及所有模型答案
- [ ] 现有 `/evaluate` 页面（无 version 参数）仍能正常加载 v1 题目

---

## Wave 2 — 答案适配层、模型注册表与图片规范

### 任务 2.1：创建模型注册表 `lib/models/registry.ts`

定义所有模型及其元数据，支持运行时动态读取。

**设计：**
```typescript
// lib/models/registry.ts
export interface ModelInfo {
  slug: string;           // 唯一标识，如 'gemini'
  displayName: string;    // 展示名，如 'Gemini'
  family: 'generic' | 'vertical';
  source: 'api' | 'manual' | 'scrape';
  adapterType: 'default' | 'manual' | 'scrape';
  isActive: boolean;
}

export const MODEL_REGISTRY: ModelInfo[] = [
  // 通用模型
  { slug: 'chatgpt', displayName: 'ChatGPT', family: 'generic', source: 'api', adapterType: 'default', isActive: true },
  { slug: 'gemini', displayName: 'Gemini', family: 'generic', source: 'api', adapterType: 'default', isActive: true },
  { slug: 'deepseek', displayName: 'DeepSeek', family: 'generic', source: 'api', adapterType: 'default', isActive: true },
  { slug: 'doubao', displayName: '豆包', family: 'generic', source: 'manual', adapterType: 'manual', isActive: true },
  // 垂类预留
  { slug: 'wind-alice', displayName: 'Wind Alice', family: 'vertical', source: 'scrape', adapterType: 'scrape', isActive: false },
  { slug: 'miaoxiang', displayName: '妙想', family: 'vertical', source: 'scrape', adapterType: 'scrape', isActive: false },
  { slug: 'maxiaocai', displayName: '蚂小财', family: 'vertical', source: 'scrape', adapterType: 'scrape', isActive: false },
];

export function getActiveModels(): ModelInfo[];
export function getModelBySlug(slug: string): ModelInfo | undefined;
```

### 任务 2.2：创建标准答案类型 `lib/content/standard-answer.ts`

定义答案的标准化格式，使 loader 与 adapter 解耦。

**设计：**
```typescript
// lib/content/standard-answer.ts
export interface ImageRef {
  alt: string;
  src: string;        // 相对路径，如 './images/example.png'
}

export interface StandardAnswer {
  metadata: {
    modelId: string;
    modelSlug: string;
  };
  contentMarkdown: string;   // 清洗后的标准 Markdown
  imageRefs: ImageRef[];     // 图片引用列表，供前端解析
}
```

### 任务 2.3：创建适配器基类 `lib/adapters/base.ts`

定义统一接口，所有模型答案解析器必须实现。

**设计：**
```typescript
// lib/adapters/base.ts
export interface AnswerAdapter {
  parse(raw: string, questionPath: string): StandardAnswer;
}

// 默认适配器：直接返回，仅提取 frontmatter
export class DefaultAdapter implements AnswerAdapter {
  parse(raw: string, questionPath: string): StandardAnswer;
}
```

### 任务 2.4：创建豆包专用适配器 `lib/adapters/manual-adapter.ts`

实现豆包答案的脱敏清洗，**保留原文结构**。

**清洗规则：**
1. 删除"豆包"平台水印、广告条（正则匹配常见广告文案）
2. 表情符号（📈🔍💎等）替换为文本标记：`[结论]`、`[分析]`、`[建议]` 等
3. **保留原文结构**，不做强制标题层级转换或段落重组
4. 图片处理：若含截图，清洗后保留 `![desc](./images/doubao-img-{n}.png)` 占位，并输出警告提示研究员手动放入对应目录
5. 输出含 YAML frontmatter 的标准 Markdown

### 任务 2.5：预留爬取适配器空壳 `lib/adapters/scrape-adapter.ts`

仅定义接口和 TODO 注释，不实现具体逻辑。

```typescript
// lib/adapters/scrape-adapter.ts
// TODO: 实现垂类模型答案的链接爬取与解析
// 预期输入：URL + 选择器配置
// 预期输出：StandardAnswer
export class ScrapeAdapter implements AnswerAdapter {
  parse(raw: string, questionPath: string): StandardAnswer {
    throw new Error('ScrapeAdapter 尚未实现');
  }
}
```

### 任务 2.6：编写图片规范文档 `docs/image-embedding.md`

明确 v2 题库的图片描述、路径规范与渲染方式。

**内容要点：**
- 所有图片放在 `_answers/v2/{questionId}/images/`
- Markdown 中使用相对路径 `./images/xxx.png`
- iframe 沙盒渲染时，loader 自动将相对路径解析为绝对路径（`{basePath}/vendor/v2/{questionId}/images/xxx.png`）
- 运行 `npm run sync-images`（或 `node scripts/sync-images.mjs`）同步图片到 public 目录

### 任务 2.7：编写豆包处理流程文档 `docs/doubao-workflow.md`

为非技术研究员提供标准操作流程。

**内容要点：**
1. 在豆包平台获取答案 → 全选复制
2. 粘贴到 `_answers/v2/{questionId}/doubao.raw.md`
3. 运行清洗脚本（或手动按规范整理）
4. 若答案含截图，保存为 `images/doubao-img-1.png` 等放入对应目录
5. 删除 `.raw.md`，保留清洗后的 `doubao.md`
6. 检查 frontmatter 格式

### Wave 2 验证标准

- [ ] `MODEL_REGISTRY` 能正确返回 4 个活跃通用模型 + 3 个预留垂类模型
- [ ] `DefaultAdapter` 能正确解析 API 模型的标准 Markdown
- [ ] `ManualAdapter` 能正确清洗豆包答案（水印删除、表情替换、结构提取）
- [ ] `ScrapeAdapter` 存在且调用时抛出预期错误
- [ ] `docs/image-embedding.md` 和 `docs/doubao-workflow.md` 内容完整、可被非技术研究员理解

---

## Wave 3 — 前端版本切换与题库渲染

### 任务 3.1：修改 `app/evaluate/page.tsx` 增加版本选择器

**设计：**
- 读取 URL query param `version`（`'v1'` | `'v2'`），默认 `'v1'`
- 调用 `loadQuestions(version)` 加载对应版本题目
- 将 `version` 传递给 `EvaluationClient`

```typescript
// app/evaluate/page.tsx
const version = (searchParams.version as 'v1' | 'v2') || 'v1';
const allQuestions = await loadQuestions(version);
```

### 任务 3.2：修改 `EvaluationClient.tsx` 支持版本化状态

**设计：**
- 接收 `version: 'v1' | 'v2'` prop
- v1：保持现有 `EvaluationData` 结构（`score` + `cons: string[]`）
- v2：扩展 `EvaluationData` 结构（`score` + `dimensions: DimensionScores` + `feedback: OpenFeedback`）
- 由于不修改 Supabase 表结构，v2 评分数据暂存前端状态，提交时序列化为 `evaluation_data` jsonb

**v2 EvaluationData 扩展：**
```typescript
// lib/types.ts 新增
export interface DimensionScores {
  riskBlindness: 'severe' | 'obvious' | 'slight' | 'none';
  valueMisalignment: 'severe' | 'obvious' | 'slight' | 'none';
  conceptError: 'severe' | 'obvious' | 'slight' | 'none';
  dataHallucination: 'severe' | 'obvious' | 'slight' | 'none';
  logicError: 'severe' | 'obvious' | 'slight' | 'none';
  precisionIllusion: 'severe' | 'obvious' | 'slight' | 'none';
}

export interface OpenFeedback {
  supplementLeft: string;
  supplementRight: string;
  modelAComment: string;
  modelBComment: string;
  interestedQuestions: string;
  suggestions: string;
}

export interface EvaluationData {
  score: number;
  cons?: string[];           // v1 兼容
  dimensions?: DimensionScores;  // v2
  feedback?: OpenFeedback;       // v2
}
```

### 任务 3.3：创建 v2 六维度评分组件

创建 `app/components/v2/DimensionScoreGroup.tsx`。

**设计：**
- 6 个维度，每维度 4 个单选按钮（严重 / 明显 / 轻微 / 无）
- 接收 `value: DimensionScores` 和 `onChange` 回调
- 中文标签，紧凑布局（节省屏幕空间）

### 任务 3.4：创建 v2 开放反馈区组件

创建 `app/components/v2/OpenFeedbackForm.tsx`。

**设计：**
- 补充说明（左右两个 textarea）
- 对不同模型的评判（按匿名标签显示输入框，如"匿名模型A"、"匿名模型B"）
- 感兴趣的问题（textarea）
- 对问卷的建议（textarea）

### 任务 3.5：修改 `EvaluationCard.tsx` 支持版本化展示

**设计：**
- v1：保持现有匿名展示（`modelDisplayName` = "匿名模型A" 等）
- v2：仍然匿名展示，显示为 "匿名模型A" 到 "匿名模型H"（与 v1 一致）
- 顺序仍随机打乱（与现有逻辑一致）
- iframe 渲染逻辑不变，`contentHtml` 仍通过 `srcDoc` 注入

### 任务 3.6：修改 `lib/questions.ts` 中的 v2 图片路径重写

**设计：**
- v2 loader 在 remark 转 HTML 后，将 `./images/` 替换为 `{basePath}/vendor/v2/{questionId}/images/`
- 保持与 v1 相同的 iframe 渲染方式

### Wave 3 验证标准

- [ ] `/evaluate`（无参数）默认加载 v1，界面与重构前完全一致
- [ ] `/evaluate?version=v2` 正确加载 v2 示例题目
- [ ] v2 页面显示 6 维度评分表单和开放反馈区
- [ ] v2 模型展示名仍为 "匿名模型X"（与 v1 一致），且顺序随机
- [ ] v2 图片正确显示在 iframe 中
- [ ] v1 历史提交数据不受影响，stats 页面正常显示

---

## 回滚策略

1. **Wave 1 回滚**：`git revert` 目录重命名提交，恢复 `_answers/` 平铺结构
2. **Wave 2 回滚**：删除新增文件（`lib/adapters/`, `lib/models/`, `lib/content/`, `docs/`），恢复 `lib/questions.ts` 到原始状态
3. **Wave 3 回滚**：恢复 `app/evaluate/page.tsx`、`EvaluationClient.tsx`、`EvaluationCard.tsx` 到原始状态
4. **全量回滚**：`git checkout -- .` 恢复到 Phase 1 开始前的状态（未提交的历史数据需提前备份）

---

## 风险与应对

| 风险 | 影响 | 应对 |
|---|---|---|
| `_answers/` 重命名导致构建失败 | 高 | 使用 `git mv` 保持历史，同步更新所有硬编码路径 |
| v2 loader 读取大量文件导致 Token 膨胀 | 中 | 单 Wave 内限制同时读取 ≤3 个模型文件，采用分批加载策略 |
| v2 评分数据无法存入现有 Supabase 表 | 中 | v2 评分数据序列化为 jsonb 存入 `evaluation_data`，Phase 2 再做表结构升级 |
| 豆包清洗规则不完善 | 低 | manual-adapter 输出警告日志，研究员可手动修正 |
| iframe CSS 样式冲突 | 低 | v2 沿用现有 `public/css/markdown.css`，不引入新样式文件 |

---

## 执行顺序

1. **用户确认本 PLAN.md**
2. **Wave 1**（目录重构）→ 验证 → 提交
3. **Wave 2**（适配层 + 注册表）→ 验证 → 提交
4. **Wave 3**（前端版本切换）→ 验证 → 提交
5. **Phase 1 验收**
