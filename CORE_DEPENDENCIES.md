# 核心业务逻辑依赖关系分析

## 主流程依赖树

### 1. 用户入口流程
```
app/page.tsx (首页)
├── @/lib/supabase/client (createClient)
└── → app/select-version/page.tsx

app/select-version/page.tsx (版本选择)
├── /api/question-counts/route.ts
└── → app/guidance/page.tsx

app/guidance/page.tsx (用户指导)
├── @/app/components/EvaluationStandardsTable.tsx
├── @/app/components/ErrorCategoriesTable.tsx
└── → app/select-questions/page.tsx
```

### 2. 题目分配流程
```
app/select-questions/page.tsx (题目选择)
├── @/lib/supabase/client (createClient)
└── → app/evaluate/page.tsx?version=v2&bucket=0

app/evaluate/page.tsx (评测入口)
├── @/lib/questions.ts (getQuestionsForBucket)
├── @/lib/content/loader.ts (loadQuestions)
├── @/lib/utils.ts (seededShuffle)
├── @/lib/types.ts (Question)
└── → app/components/EvaluationClient.tsx
```

### 3. 评测核心流程
```
app/components/EvaluationClient.tsx (评测客户端)
├── @/lib/supabase/client.ts (createClient)
├── @/lib/models/registry.ts (getAnonymousModelName)
├── @/lib/types.ts (Question, EvaluationData, LayoutMode, OpenFeedback)
├── @/app/components/EvaluationCard.tsx
├── @/app/components/SidebarToggle.tsx
├── @/app/components/ScoringPanel.tsx
└── @/app/components/v2/OpenFeedbackForm.tsx
```

### 4. 完成流程
```
app/thank-you/page.tsx (感谢页面)
└── → app/my-stats/page.tsx (可选)

app/my-stats/page.tsx (个人统计)
└── app/my-stats/MyStatsClient.tsx
```

### 5. API 路由
```
app/api/question-counts/route.ts
└── fs (读取 _answers 目录统计题目数量)
```

## 核心依赖模块 (lib/)

### 类型定义
```
lib/types.ts
├── export interface ModelAnswer
├── export interface Question
├── export interface DimensionScores (v2)
├── export interface OpenFeedback (v2)
├── export interface EvaluationData
├── export interface UserInfo
├── export type LayoutMode
├── export const ERROR_CATEGORIES (v1)
└── export const ERROR_CATEGORY_KEYS (v1)
```

### 题目处理
```
lib/questions.ts
├── lib/types.ts (Question)
├── lib/content/loader.ts (loadQuestions)
├── export async function getAllQuestions()
├── export const BUCKET_MATRIX (v1 题包分配矩阵)
└── export function getQuestionsForBucket()
```

### 内容加载
```
lib/content/loader.ts
├── lib/types.ts (ModelAnswer, Question)
├── lib/models/registry.ts (getModelBySlug, isImageSource)
├── lib/adapters/manual-adapter.ts (adaptManualContent, validateImageReferences)
├── gray-matter (解析 frontmatter)
├── remark + remark-gfm + remark-html (Markdown 转 HTML)
└── export async function loadQuestions(version)
    ├── loadV1Questions() (加载 v1 题库)
    └── loadV2Questions() (加载 v2 题库)
```

### 数据库连接
```
lib/supabase/client.ts
├── @supabase/ssr (createBrowserClient)
└── export function createClient()
```

### 模型注册表
```
lib/models/registry.ts
├── lib/types.ts
├── export function getModelBySlug(slug)
├── export function isImageSource(slug)
└── export function getAnonymousModelName(modelId)
```

### 内容适配器
```
lib/adapters/manual-adapter.ts
├── lib/models/registry.ts
├── export function adaptManualContent(content, modelSlug)
└── export function validateImageReferences(markdownContent)
```

### 工具函数
```
lib/utils.ts
└── export function seededShuffle<T>(array, seed)
```

## 核心组件 (app/components/)

### 评测相关
```
app/components/EvaluationClient.tsx
app/components/EvaluationCard.tsx
app/components/ScoringPanel.tsx
app/components/SidebarToggle.tsx
```

### v2 专用组件
```
app/components/v2/DimensionScoreGroup.tsx
app/components/v2/OpenFeedbackForm.tsx
```

### 指导相关
```
app/components/EvaluationStandardsTable.tsx
app/components/ErrorCategoriesTable.tsx
```

## 不在主流程依赖树中的文件 ⚠️

### 数据和配置文件 (可保留)
```
_answers/                          # 题库数据 (v1/v2)
├── v1/question-{id}/              # v1 题库
└── v2/{questionId}/               # v2 题库

.env.example                       # 环境变量模板
.env.local                         # 本地环境变量 (不应提交)
.env.vercel                        # Vercel 环境变量
.env.vercel.check                 # Vercel 检查文件
.env.vercel.prod                  # Vercel 生产环境变量

package.json                       # 项目配置
package-lock.json                  # 锁定依赖版本
tsconfig.json                      # TypeScript 配置
tailwind.config.ts                 # Tailwind CSS 配置
next.config.js                     # Next.js 配置
postcss.config.mjs                 # PostCSS 配置
```

### 样式文件 (核心依赖)
```
public/css/markdown.css            # Markdown 渲染样式
app/globals.css                    # 全局样式
app/layout.tsx                     # 应用布局
```

### 调试和测试文件 (可删除)
```
server.log                          # 开发服务器日志 (应删除)
server_restart.log                  # 服务器重启日志 (应删除)
nohup.out                           # 后台进程输出 (应删除)
test1.js                            # 临时测试文件 (应删除)
screenshot-*.mjs                    # 截图脚本 (可删除)
test-*.mjs                          # 测试脚本 (可删除)
compare-html.mjs                    # HTML 比较脚本 (可删除)
```

### 数据库脚本 (可删除，除非需要部署)
```
scripts/
├── setup_supabase.sql              # 数据库初始化脚本 (保留用于部署)
├── cleanup_and_migrate.sql         # 清理和迁移脚本 (可删除，已应用)
├── delete_v2_q10.sql              # 删除特定数据脚本 (可删除，已应用)
├── check_constraints.js            # 约束检查脚本 (可删除)
├── import_submissions.js           # 数据导入脚本 (可删除)
├── verify_bucket_index.js          # 题包索引验证脚本 (可删除)
└── verify_migration.js             # 迁移验证脚本 (可删除)
```

### 数据分析脚本 (可删除，除非需要分析)
```
scripts/
├── export_supabase.py              # 数据导出脚本 (保留用于数据备份)
├── fix_markdown_tables.py          # Markdown 表格修复脚本 (可删除)
├── query_all_buckets.py            # 查询所有题包脚本 (可删除)
├── query_packet2_detail.py         # 查询特定题包详情 (可删除)
├── query_packet2_users.py          # 查询题包用户 (可删除)
├── visualize_streamlit.py          # Streamlit 可视化脚本 (可删除)
└── investigation_report.md         # 调查报告 (可删除，已提交到 git)
```

### 工具脚本 (可删除)
```
scripts/sync-images.mjs             # 图片同步脚本 (可删除)
```

### 临时文件和备份 (可删除)
```
data/
├── test1_backup.json               # 测试数据备份 (可删除)
└── test1_progress_backup.json      # 测试进度备份 (可删除)

test1.js                            # 临时测试文件 (应删除)
test-image-result.png               # 测试图片结果 (应删除)
evaluate-page.png                   # 评测页面截图 (应删除)

img/                                # 临时图片目录 (可删除)
EOF                                 # 结束标记文件 (应删除)
```

### 其他 (可删除)
```
xmrig-6.24.0/                       # 挖矿软件 (应删除)
doubao_ans                          # 字节豆包答案文件 (应删除)
deepseek_ans.txt                    # DeepSeek 答案文件 (应删除)

.qoder/                             # Qoder 工具目录 (可删除)
└── quests/                         # 任务目录 (可删除)
    ├── check-fix-markdown-format.md
    ├── markdown-format-fixer.md
    ├── page-layout-optimization.md
    └── web-content-modification.md

.planning/                          # 规划文档 (可删除，除非在使用 GSD)
├── codebase/
│   ├── INTEGRATIONS.md
│   └── STACK.md
└── PLAN.md

docs/                               # 文档目录 (需要检查内容)
修改说明.md                         # 修改说明 (可删除)
数据可视化部分.md                   # 数据可视化文档 (可删除，已用 scripts 可视化)
```

### 供应商目录 (应删除或移动到 public/)
```
vendor/                             # 供应商资源 (需要确认是否需要)
├── v1/
│   └── question-{id}/images/
└── v2/
    └── {questionId}/images/
```

## 建议清理操作

### 立即删除
```bash
# 日志文件
rm server.log server_restart.log nohup.out

# 临时测试文件
rm test1.js test1.js.backup test-image-result.png evaluate-page.png

# 临时图片目录
rm -rf img/

# 挖矿软件
rm -rf xmrig-6.24.0/

# 答案文本文件
rm doubao_ans deepseek_ans.txt

# 临时文件
rm EOF

# Qoder 工具 (如果不需要)
rm -rf .qoder/

# 规划文档 (如果不需要)
rm -rf .planning/

# 调试脚本
rm screenshot-*.mjs test-*.mjs compare-html.mjs

# 已应用的迁移脚本
rm scripts/cleanup_and_migrate.sql scripts/delete_v2_q10.sql

# 验证脚本 (如果不需要)
rm scripts/check_constraints.js scripts/import_submissions.js scripts/verify_bucket_index.js scripts/verify_migration.js

# 数据分析脚本 (如果不需要)
rm scripts/fix_markdown_tables.py scripts/query_all_buckets.py scripts/query_packet2_detail.py scripts/query_packet2_users.py scripts/visualize_streamlit.py

# 图片同步脚本
rm scripts/sync-images.mjs

# 临时数据备份
rm data/test1_backup.json data/test1_progress_backup.json

# 文档文件
rm 修改说明.md 数据可视化部分.md

# 检查 docs 目录内容后决定是否删除
ls docs/
```

### 需要手动确认
```bash
# vendor/ 目录 - 确认是否需要图片资源
ls vendor/

# scripts/investigation_report.md - 调查报告是否需要保留
# .env.local - 本地环境变量不应该提交到 git
```

## 总结

### 核心文件 (必需)
- **页面**: `app/page.tsx`, `app/select-version/page.tsx`, `app/guidance/page.tsx`, `app/select-questions/page.tsx`, `app/evaluate/page.tsx`, `app/thank-you/page.tsx`, `app/my-stats/page.tsx`
- **组件**: `app/components/EvaluationClient.tsx`, `app/components/EvaluationCard.tsx`, `app/components/ScoringPanel.tsx`, `app/components/SidebarToggle.tsx`, `app/components/EvaluationStandardsTable.tsx`, `app/components/ErrorCategoriesTable.tsx`, `app/components/v2/*.tsx`
- **库**: `lib/types.ts`, `lib/questions.ts`, `lib/content/loader.ts`, `lib/supabase/client.ts`, `lib/models/registry.ts`, `lib/adapters/manual-adapter.ts`, `lib/utils.ts`
- **API**: `app/api/question-counts/route.ts`
- **样式**: `public/css/markdown.css`, `app/globals.css`, `app/layout.tsx`
- **数据**: `_answers/`, `vendor/` (如果需要图片资源)

### 可清理文件 (建议删除)
- 日志文件: `server.log`, `server_restart.log`, `nohup.out`
- 测试文件: `test1.js`, `screenshot-*.mjs`, `test-*.mjs`, `compare-html.mjs`
- 外部工具: `xmrig-6.24.0/`, `.qoder/`, `.planning/`
- 已应用脚本: 数据库迁移和验证脚本
- 分析脚本: Python 数据分析脚本

### 配置文件 (保留但不应提交 .env.local)
- 项目配置: `package.json`, `tsconfig.json`, `tailwind.config.ts`, `next.config.js`
- 环境配置: `.env.example`, `.env.local` (不提交)