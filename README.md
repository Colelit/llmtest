# 匿名AI评测平台 (FINEVAL)

这是一个用于对大型语言模型（在此项目中特指**智能投资助手，Robo-Advisor, RIA**）进行匿名、并排比较和人工打分的Web应用。

## 项目概述

该平台允许研究人员加载一系列由不同匿名AI模型生成的对同一组问题的回答，并邀请用户（评测官）对这些回答进行主观评价。用户的评价数据（分数、优缺点标签）以及用户的基本画像信息将被收集并储存在后端数据库中，用于后续的学术研究。

## ✨ 项目特色

- **清晰的测评流程**: 用户首先填写基本信息，然后进入一个统一的测评主页，逐一完成所有问题的评价，最后一次性提交所有数据。
- **避免顺序偏见**: 在测评主页，不同模型的回答顺序在每次加载时都会被随机打乱。
- **所见即所得的内容管理**: 所有的问题和答案均以本地Markdown文件的形式进行管理，便于非技术人员直接修改和扩展。
- **现代化的技术栈**: 使用 Next.js, Tailwind CSS 和 Supabase 构建，开发体验优秀，易于部署和维护。
- **样式隔离**: 通过`<iframe>`沙盒环境来渲染Markdown内容，确保了自定义样式和主页面样式互不干扰，完美显示表格、代码块、列表和图片。

## 🛠️ 技术栈

- **前端框架**: [Next.js](https://nextjs.org/) (使用App Router)
- **样式方案**: [Tailwind CSS](https://tailwindcss.com/)
- **后端即服务 (BaaS)**: [Supabase](https://supabase.com/) (用于数据库和API)
- **部署平台**: [Vercel](https://vercel.com/)
- **Markdown渲染**: [Remark](https://remark.js.org/) + [remark-gfm](https://github.com/remarkjs/remark-gfm)

## 📁 项目结构

```
FINEVAL/
├── _answers/                 # 存放所有问题和答案的Markdown文件
│   ├── question-1/
│   │   ├── images/           # 问题1专用的图片文件夹
│   │   │   └── Q1MH.png
│   │   ├── model-a.md
│   │   ├── ...
│   │   └── question.txt      # 问题1的描述文本
│   └── ...
├── app/                      # Next.js App Router 核心目录
│   ├── components/           # React组件
│   ├── evaluate/             # 测评主页
│   └── ...
├── lib/                      # 辅助函数和类型定义
├── public/                   # 存放公开静态资源
│   └── css/
│       └── markdown.css      # Markdown内容的专属样式表
└── ...
```

## 🚀 本地开发指南

1.  **克隆项目**
    ```bash
    git clone https://github.com/wuhuihangsufe/llmtest.git
    cd llmtest
    ```

2.  **安装依赖**
    ```bash
    npm install
    ```

3.  **配置环境变量**
    - 复制 `.env.example` 文件并重命名为 `.env.local`。
    - 在 `.env.local` 中填入以下变量（根路径部署时 `NEXT_PUBLIC_BASE_PATH` 可留空）：
    ```env
    # Supabase
    NEXT_PUBLIC_SUPABASE_URL=YOUR_SUPABASE_URL
    NEXT_PUBLIC_SUPABASE_ANON_KEY=YOUR_SUPABASE_ANON_KEY

    # 站点前缀（部署在子路径时设置，例如 /fineval；根路径留空）
    NEXT_PUBLIC_BASE_PATH=
    ```
    - 说明：
      - 若部署在子路径（例如 `https://domain.com/fineval`），请将 `NEXT_PUBLIC_BASE_PATH` 设置为 `/fineval`。
      - 兼容变量 `BASE_URL` 仍可用，但不再推荐；如使用，请确保与最终域名一致（例如 `https://your-project.vercel.app`）。

4.  **设置Supabase数据库**
    - 前往 Supabase 项目，创建 `submissions` 表。
    - 开启 RLS，并为 `anon` 与 `authenticated` 角色添加允许 `INSERT` 的策略。

5.  **启动本地服务器**
    ```bash
    npm run dev
    ```
    现在可在浏览器打开 `http://localhost:10005` 访问开发环境。
6. 导出结果
python scripts/export_supabase.py --table submissions --normalize --pretty


## 部署上线

本项目已配置为可以无缝部署到 [Vercel](https://vercel.com/)。

1.  **推送代码到GitHub**。

2.  **在Vercel上导入项目**。
    - 使用您的GitHub账号登录Vercel。
    - 选择导入您刚刚推送的仓库。

3.  **在Vercel中配置环境变量**
    - 在项目的 "Environment Variables" 中添加：
      - `NEXT_PUBLIC_SUPABASE_URL`
      - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
      - `NEXT_PUBLIC_BASE_PATH`（根路径部署留空；子路径例如 `/fineval`）
    - 可选兼容：若继续使用 `BASE_URL`，请设置为线上域名（例如 `https://your-project-name.vercel.app`）。

4.  **点击 "Deploy"**，Vercel 将自动完成构建与部署。
