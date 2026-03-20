# 部署指南

本文档详细说明如何将 Nature Geo Vis 项目部署到生产环境。

## 部署架构

采用**前后端分离部署**方案：
- **前端**：部署到 **Vercel** 或 **Cloudflare Pages**（见下文「中国大陆访问」）
- **后端**：部署到 Railway 或 Render（支持 Node.js 长期运行服务）

## 部署前准备

### 1. 确保代码已提交到 Git 仓库

```bash
# 查看当前状态
git status

# 添加所有更改
git add .

# 提交更改
git commit -m "chore: prepare for deployment"

# 推送到远程仓库（GitHub/GitLab）
git push origin main
```

### 2. 准备数据文件

确保以下文件存在于 `data/` 目录：
- `boundaries.geojson`
- `cities.geojson`
- `cells.geojson`
- `pois.geojson`

这些文件将被包含在后端部署中。

---

## 第一步：部署后端

### 选项 A: 使用 Railway（推荐）

#### 1. 创建 Railway 账号
访问 [railway.app](https://railway.app/) 并使用 GitHub 账号登录。

#### 2. 创建新项目
1. 点击 "New Project"
2. 选择 "Deploy from GitHub repo"
3. 选择 `nature-geo-vis` 仓库
4. Railway 会自动检测到 Node.js 项目

#### 3. 配置环境变量
在 Railway Dashboard 中添加以下环境变量：

| 变量名 | 值 | 说明 |
|--------|-----|------|
| `PORT` | （自动设置） | Railway 自动分配 |
| `NODE_ENV` | `production` | 生产环境标识 |
| `FRONTEND_URL` | （待填写） | 第二步部署前端后获得 |

#### 4. 部署
- Railway 会自动运行 `npm install` 和 `npm run server`
- 等待部署完成（约 2-3 分钟）
- 记录分配的 URL，例如：`https://nature-geo-vis-server-production.up.railway.app`

---

## 第二步：部署前端

### 使用 Vercel

#### 1. 创建 Vercel 账号
访问 [vercel.com](https://vercel.com/) 并使用 GitHub 账号登录。

#### 2. 导入项目
1. 点击 "Add New..." → "Project"
2. 选择 `nature-geo-vis` 仓库
3. Vercel 会自动检测到 Vite 项目

#### 3. 配置构建设置
保持默认配置：
- **Framework Preset**: Vite
- **Build Command**: `npm run build`
- **Output Directory**: `dist`
- **Install Command**: `npm install`

#### 4. 配置环境变量
添加以下环境变量：

| Name | Value | 说明 |
|------|-------|------|
| `VITE_API_BASE_URL` | `https://nature-geo-vis-server-production.up.railway.app` | 替换为第一步获得的后端 URL 不允许后面带/否则请求出错 |

**重要**：将 `your-backend.railway.app` 替换为您在第一步中获得的实际后端 URL。

#### 5. 部署
- 点击 "Deploy"
- 等待构建完成（约 1-2 分钟）
- 获得前端 URL，例如：`https://nature-geo-vis.vercel.app` 

### 中国大陆无法访问 Vercel 怎么办？

`*.vercel.app` 等默认域名在中国大陆常被墙或极慢，**不是项目配置错误**，无法通过改代码修复。

**推荐做法**：再部署一份前端到 **Cloudflare Pages**（与 Vercel 共用同一 Git 仓库即可），把 `*.pages.dev` 或自定义域名作为大陆用户入口。

1. 登录 [Cloudflare Dashboard](https://dash.cloudflare.com/) → **Workers & Pages** → **Create** → **Pages** → **Connect to Git**
2. 选择本仓库，构建设置：
   - **Build command**：`npm run build`
   - **Build output directory**：`dist`
3. **Environment variables**：添加 `VITE_API_BASE_URL`（与 Vercel 相同，指向 Railway 后端 URL，**末尾不要加 `/`**）
4. 可选：添加 `NODE_VERSION` = `18`
5. 保存并部署。仓库已包含 `public/_redirects`，用于 SPA 路由回退。

部署完成后：
- 将 Railway 的 `FRONTEND_URL` 改为**你实际给用户用的前端域名**（若需严格 CORS，可同时配置多个来源需改 `server/config.js` 或环境变量逻辑；当前默认 `*` 时无需改）
- 大陆用户访问 **Cloudflare Pages** 地址；海外用户可继续用 Vercel

**其他选项**：自有域名经 Cloudflare DNS 代理指向前端；或国内云 + CDN（通常需 **ICP 备案**）。

---

## 第三步：配置 CORS

返回后端部署平台（Railway 或 Render），更新 `FRONTEND_URL` 环境变量：

### Railway
1. 进入项目 → Variables
2. 更新 `FRONTEND_URL` 为前端 URL（例如：`https://nature-geo-vis.vercel.app`）
3. 保存后会自动重新部署

### Render
1. 进入 Web Service → Environment
2. 更新 `FRONTEND_URL` 为前端 URL
3. 点击 "Save Changes"，触发重新部署

---

## 验证部署

### 1. 测试后端 API
```bash
# 替换为您的后端 URL
curl https://your-backend.railway.app/api/config
```

应返回配置 JSON。

### 2. 测试前端
访问前端 URL（例如：`https://nature-geo-vis.vercel.app`）：
- 地图应正常加载
- 放大地图，POI 数据应正常显示
- 检查浏览器控制台，确保没有 CORS 错误

### 3. 检查性能监控
- 左上角应显示 "PERF MONITOR"
- FPS 应保持在 60 左右

---

## 环境变量总结

### 后端环境变量（Railway/Render）

| 变量名 | 开发环境 | 生产环境 | 说明 |
|--------|----------|----------|------|
| `PORT` | `3001` | （平台自动设置） | 服务器端口 |
| `NODE_ENV` | `development` | `production` | 运行环境 |
| `FRONTEND_URL` | `*` | `https://nature-geo-vis.vercel.app` | 前端域名（CORS） |

### 前端环境变量（Vercel）

| 变量名 | 开发环境 | 生产环境 | 说明 |
|--------|----------|----------|------|
| `VITE_API_BASE_URL` | （空，使用 proxy） | `https://your-backend.railway.app` | 后端 API 地址 |

---

## 更新部署

### 自动部署
两个平台都支持 Git 自动部署：
- 推送到 `main` 分支 → 自动触发重新部署
- 无需手动操作

### 手动触发
- **Vercel**: Deployments → Redeploy
- **Railway**: Deployments → Deploy
- **Render**: Manual Deploy → Deploy latest commit

---

## 故障排查

### 问题 1: 前端无法加载数据
**症状**：地图显示正常，但没有数据点

**解决方案**：
1. 检查浏览器控制台是否有 CORS 错误
2. 确认后端 `FRONTEND_URL` 环境变量正确
3. 确认前端 `VITE_API_BASE_URL` 正确

### 问题 2: 后端部署失败
**可能原因**：
- 依赖安装失败 → 检查 `package.json`
- 数据文件太大 → 考虑使用外部存储（S3/Cloudflare R2）

**解决方案**：
- 查看部署日志
- 确保 `data/` 目录未被 `.gitignore` 排除

### 问题 3: 地图加载缓慢
**优化建议**：
1. 启用 Vercel 的 Edge Caching
2. 考虑升级后端为付费实例（更多资源）
3. 使用 CDN 加速数据文件访问

---

## 成本估算

### 免费方案
- **Vercel**: 免费（每月 100 GB 带宽）
- **Railway**: 免费（每月 $5 额度，约 500 小时运行时间）
- **Render**: 免费（但有冷启动延迟）

### 推荐方案（小规模使用）
- **前端**: Vercel 免费
- **后端**: Railway 免费
- **总成本**: $0/月

### 升级方案（高流量）
- **前端**: Vercel Pro ($20/月)
- **后端**: Railway Starter ($5/月)
- **总成本**: $25/月

---

## 安全建议

1. **限制 CORS**：不要在生产环境使用 `*`，明确指定前端域名
2. **数据验证**：在 API 层添加输入验证
3. **速率限制**：考虑添加 API 速率限制（防止滥用）
4. **HTTPS**：两个平台默认启用 HTTPS

---

## 下一步优化

1. **监控和日志**：
   - Railway: 内置日志查看器
   - 考虑集成 Sentry（错误监控）

2. **数据优化**：
   - 实现服务端瓦片缓存
   - 考虑使用 PostgreSQL + PostGIS 替代 JSON 文件

3. **性能优化**：
   - 启用 Gzip/Brotli 压缩
   - 实现 Service Worker（离线支持）

---

## 相关资源

- [Vercel 文档](https://vercel.com/docs)
- [Railway 文档](https://docs.railway.app/)
- [Render 文档](https://render.com/docs)
- [Vite 部署指南](https://vitejs.dev/guide/static-deploy.html)
