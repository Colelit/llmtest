# 垂类模型截图入库操作手册

本文档说明如何将垂类模型（蚂小财、同花顺等）的截图答案录入评测系统。

## 一、目录结构

垂类模型截图答案存放于 v2 题库目录下：

```
_answers/v2/
└── {questionId}/               # 题目目录，如 q1、q2
    ├── question.md             # 题干（已有，无需修改）
    ├── gemini.md               # 通用模型答案
    ├── chatgpt.md
    ├── maxiaocai.md            # 蚂小财截图答案
    └── tonghuashun.md          # 同花顺截图答案
```

## 二、截图模型答案文件格式

### 2.1 文件命名

必须与 `lib/models/registry.ts` 中注册的 `slug` 完全一致：

| 模型 | 文件名 |
|------|--------|
| 蚂小财 | `maxiaocai.md` |
| 同花顺 | `tonghuashun.md` |

### 2.2 Frontmatter 格式

文件头部需包含 YAML frontmatter：

```yaml
---
modelId: maxiaocai
---
```

- `modelId`：与文件名（不含 `.md`）保持一致

### 2.3 正文格式

正文由**图片引用**和**备注文字**组成。图片使用标准 Markdown 语法：

```markdown
---
modelId: maxiaocai
---

![回答截图1](./images/maxiaocai-q1-1.png)

备注：该截图展示了蚂小财对 Retirement Planning 问题的推荐页面。

![回答截图2](./images/maxiaocai-q1-2.png)

备注：第二页包含具体产品配置详情。
```

**图片路径规则**：
- 必须使用相对路径 `./images/xxx.png`
- 不允许使用绝对路径（如 `/images/xxx.png`）或网络 URL
- 支持格式：`png`、`jpg`、`jpeg`、`gif`、`svg`、`webp`

## 三、图片存放位置

截图文件存放于题目目录下的 `images/` 子文件夹：

```
_answers/v2/q1/
├── question.md
├── maxiaocai.md
├── tonghuashun.md
└── images/
    ├── maxiaocai-q1-1.png     # 蚂小财第1张截图
    ├── maxiaocai-q1-2.png     # 蚂小财第2张截图
    └── tonghuashun-q1-1.png   # 同花顺第1张截图
```

**命名建议**：`{model-slug}-{questionId}-{序号}.{格式}`，如 `maxiaocai-q1-1.png`。

## 四、系统处理逻辑

### 4.1 适配器行为

截图模型在 `lib/adapters/manual-adapter.ts` 中的处理逻辑：

1. **不执行文本清洗**：保留 Markdown 原文，包括图片引用和备注
2. **图片路径保留**：`./images/xxx.png` 原样保留，交由 loader 统一转换为绝对路径
3. **合法性校验**：若发现非 `./images/` 开头的图片引用，控制台输出警告

### 4.2 iframe 渲染时图片路径转换

`lib/content/loader.ts` 中的 `convertMarkdownToHtml` 函数负责路径转换：

- 原始 Markdown：`![desc](./images/xxx.png)`
- HTML 输出：`<img src="/vendor/v2/{questionId}/images/xxx.png" alt="desc">`

最终图片请求指向 `public/vendor/v2/{questionId}/images/xxx.png`，确保：
- 图片文件已复制到对应 `public/vendor/v2/{questionId}/images/` 目录
- 或构建时 `_answers/v2/{questionId}/images/` 被正确映射到 public 目录

## 五、入库操作步骤

1. **准备截图**：对垂类模型进行相同问题的提问，截取完整回答页面
2. **重命名图片**：按 `{model-slug}-{questionId}-{序号}.png` 规则命名
3. **创建 Markdown 文件**：在对应题目目录下创建 `{model-slug}.md`
4. **编写 frontmatter**：填写 `modelId: {model-slug}`
5. **插入图片引用**：使用 `![描述](./images/xxx.png)` 格式
6. **添加备注**（可选）：在图片下方补充文字说明
7. **存放图片**：将截图放入 `_answers/v2/{questionId}/images/`
8. **验证**：启动开发服务器，进入对应题目检查图片是否正常渲染

## 六、常见问题

### Q1：图片在 iframe 中不显示

- 检查图片是否放入了正确的 `public/vendor/v2/{questionId}/images/` 目录
- 检查浏览器控制台是否有 404 错误
- 确认 Markdown 中使用的是 `./images/` 相对路径，不是 `images/` 或 `/images/`

### Q2：控制台出现"非法图片引用"警告

- 说明图片路径不符合 `./images/xxx.png` 格式
- 修改为正确的相对路径即可

### Q3：是否需要对截图做 OCR 或文字提取？

- 不需要。截图模型以图片形式展示回答，研究员通过肉眼阅读截图内容进行评分
- 如需补充文字，可在 Markdown 中通过备注形式添加

## 七、模型注册

如需新增其他垂类截图模型，在 `lib/models/registry.ts` 中添加：

```typescript
{ slug: 'new-model', displayName: '新模型', family: 'vertical', source: 'manual_image', adapterType: 'manual', isActive: true }
```

参数说明：
- `slug`：唯一标识，决定文件名 `{slug}.md`
- `displayName`：前端展示名称
- `source`：必须为 `'manual_image'`，表示截图来源
- `adapterType`：必须为 `'manual'`，使用 manual-adapter 处理
