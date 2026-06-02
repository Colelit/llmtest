# Streamlit Cloud 部署指南

## 方案对比

| 方案 | 成本 | 难度 | 访问性 | 推荐度 |
|------|------|------|--------|--------|
| Streamlit Cloud | 免费 | ⭐ 简单 | 公网访问 | ⭐⭐⭐⭐⭐ |
| Railway/Render | 免费额度 | ⭐⭐ 中等 | 公网访问 | ⭐⭐⭐⭐ |
| 内网穿透 | 免费 | ⭐ 简单 | 临时访问 | ⭐⭐⭐ |
| VPS | 付费 | ⭐⭐⭐ 较难 | 稳定访问 | ⭐⭐⭐ |

---

## 推荐：Streamlit Cloud（官方免费托管）

### 步骤1：准备代码

1. 创建 GitHub 仓库并推送代码
2. 确保项目根目录有以下文件：
   - `requirements_dashboard.txt`（已创建）
   - `scripts/visualize_streamlit_cloud.py`（已创建，支持实时连接）
   - `.streamlit/config.toml`

### 步骤2：配置环境变量

在 Streamlit Cloud 的 Secrets 中添加：

```toml
[supabase]
url = "你的_SUPABASE_URL"
anon_key = "你的_SUPABASE_ANON_KEY"
```

### 步骤3：部署

1. 访问 [share.streamlit.io](https://share.streamlit.io)
2. 点击 "New app"
3. 连接 GitHub 仓库
4. 选择分支（通常是 main）
5. 主文件路径：`scripts/visualize_streamlit_cloud.py`
6. 点击 Deploy

部署成功后会得到一个公网 URL，例如：
`https://ria-dashboard.streamlit.app`

---

## 方案2：内网穿透（临时方案，适合快速分享）

### 使用 npx localtunnel

```bash
# 安装并启动内网穿透
npx -y localtunnel --port 8502

# 输出示例：
# your url is: https://random-name.loca.lt
```

将生成的 URL 发给同事即可临时访问。

### 使用 Ngrok

```bash
# 下载 ngrok 后
ngrok http 8502
```

---

## 方案3：Railway 部署

```bash
# 安装 Railway CLI
npm install -g @railway/cli

# 登录并部署
railway login
railway init
railway up

# 添加环境变量
railway variables set SUPABASE_URL=你的URL
railway variables set SUPABASE_ANON_KEY=你的KEY

# 启动服务
railway start -- python -m streamlit run scripts/visualize_streamlit_cloud.py
```

---

## 快速开始（最简单）

现在面板已在本地运行：**http://localhost:8502**

如果只是临时给同事看，直接用内网穿透：

```bash
npx -y localtunnel --port 8502
```

生成链接后发给同事，他们就可以在外网访问你的面板了。

---

## 安全提示

⚠️ 部署到公网时请注意：

1. **不要暴露 service_role_key**，只用 anon_key
2. Supabase RLS（Row Level Security）需要正确配置，防止未授权访问
3. 考虑添加访问密码（可以在 Streamlit 中用 `st.text_input` 实现）
4. 定期更新依赖包

---

## 已创建的文件

✅ `requirements_dashboard.txt` - 依赖清单
✅ `scripts/visualize_streamlit_cloud.py` - 实时连接版本（自动从 Supabase 获取最新数据）
✅ `scripts/visualize_streamlit.py` - 本地版本（从 JSON 文件读取，已修复语法错误）

两个版本功能相同，区别在于：
- 本地版本：需要手动导出数据（`python scripts/export_supabase.py`）
- 云端版本：自动从 Supabase 获取最新数据，有刷新按钮

建议部署时使用 `visualize_streamlit_cloud.py`。