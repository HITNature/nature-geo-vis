# 部署指南

本文档详细说明如何将 Nature Geo Vis 项目部署到生产环境。

## 已部署地址

| 平台 | 地址 |
|------|------|
| GitHub | https://github.com/HITNature/nature-geo-vis |
| 前端（Cloudflare Pages） | https://nature-geo-vis.pages.dev |
| 后端（Railway） | https://nature-geo-vis-server-production.up.railway.app |

## 部署架构

采用**前后端分离部署**方案：
- **前端**：部署到 **Cloudflare Pages**（全球 CDN + 自动构建）
- **后端**：部署到 **Railway**（支持 Node.js 长期运行服务）

---

## 部署前准备

### 1. 确保代码已提交到 Git 仓库

```bash
# 查看当前状态
git status

# 添加所有更改
git add .

# 提交更改
git commit -m "chore: prepare for deployment"

# 推送到远程仓库
git push origin main
```

仓库地址：https://github.com/HITNature/nature-geo-vis

### 2. 准备数据文件

确保以下文件存在于 `data/` 目录：
- `boundaries.geojson`
- `cities.geojson`
- `cells.geojson`
- `pois.geojson`

这些文件将被包含在后端部署中。

---

## 第一步：部署后端（Railway）

#### 1. 创建 Railway 账号
访问 [railway.app](https://railway.app/) 并使用 GitHub 账号登录。

#### 2. 创建新项目
1. 点击 "New Project"
2. 选择 "Deploy from GitHub repo"
3. 选择 `HITNature/nature-geo-vis` 仓库
4. Railway 会自动检测到 Node.js 项目

#### 3. 配置环境变量
在 Railway Dashboard 中添加以下环境变量：

| 变量名 | 值 | 说明 |
|--------|-----|------|
| `PORT` | （自动设置） | Railway 自动分配 |
| `NODE_ENV` | `production` | 生产环境标识 |
| `FRONTEND_URL` | `https://nature-geo-vis.pages.dev` | 前端域名（CORS） |

若前端尚未部署完成，可先将 `FRONTEND_URL` 设为 `*`，第二步完成后再改回正式域名。

#### 4. 部署
- Railway 会自动运行 `npm install` 和 `npm run server`
- 等待部署完成（约 2-3 分钟）
- 生产后端 URL：`https://nature-geo-vis-server-production.up.railway.app`

---

## 第二步：部署前端（Cloudflare Pages）

#### 1. 创建项目
1. 登录 [Cloudflare Dashboard](https://dash.cloudflare.com/)
2. 进入 **Workers & Pages** → **Create** → **Pages** → **Connect to Git**
3. 选择 `HITNature/nature-geo-vis` 仓库

#### 2. 配置构建设置
- **Build command**：`npm run build`
- **Build output directory**：`dist`
- 可选：添加 `NODE_VERSION` = `18`

#### 3. 配置环境变量

| Name | Value | 说明 |
|------|-------|------|
| `VITE_API_BASE_URL` | `https://nature-geo-vis-server-production.up.railway.app` | 后端 URL，**末尾不要加 `/`** |

#### 4. 部署
- 保存并部署（约 1-2 分钟）
- 生产前端 URL：`https://nature-geo-vis.pages.dev`
- 仓库已包含 `public/_redirects`，用于 SPA 路由回退

**其他选项**：自有域名经 Cloudflare DNS 代理指向前端；或国内云 + CDN（通常需 **ICP 备案**）。

---

## 第三步：确认 CORS

返回 Railway，确认 `FRONTEND_URL` 环境变量：

1. 进入项目 → Variables
2. 确认 `FRONTEND_URL` = `https://nature-geo-vis.pages.dev`
3. 保存后会自动重新部署（若需严格 CORS，可同时配置多个来源需改 `server/config.js`；当前默认 `*` 时无需改）

---

## 验证部署

### 1. 测试后端 API
```bash
curl https://nature-geo-vis-server-production.up.railway.app/api/config
```

应返回配置 JSON。

### 2. 测试前端
访问 https://nature-geo-vis.pages.dev ：
- 地图应正常加载
- 放大地图，POI 数据应正常显示
- 检查浏览器控制台，确保没有 CORS 错误

### 3. 检查性能监控
- 左上角应显示 "PERF MONITOR"
- FPS 应保持在 60 左右

---

## 环境变量总结

### 后端环境变量（Railway）

| 变量名 | 开发环境 | 生产环境 | 说明 |
|--------|----------|----------|------|
| `PORT` | `3001` | （平台自动设置） | 服务器端口 |
| `NODE_ENV` | `development` | `production` | 运行环境 |
| `FRONTEND_URL` | `*` | `https://nature-geo-vis.pages.dev` | 前端域名（CORS） |

### 前端环境变量（Cloudflare Pages）

| 变量名 | 开发环境 | 生产环境 | 说明 |
|--------|----------|----------|------|
| `VITE_API_BASE_URL` | （空，使用 proxy） | `https://nature-geo-vis-server-production.up.railway.app` | 后端 API 地址 |

---

## 更新部署

### 自动部署
两个平台都支持 Git 自动部署：
- 推送到 `main` 分支 → 自动触发重新部署
- 无需手动操作

### 手动触发
- **Cloudflare Pages**: Deployments → Retry deployment
- **Railway**: Deployments → Deploy

---

## 故障排查

### 问题 1: 前端无法加载数据
**症状**：地图显示正常，但没有数据点

**解决方案**：
1. 检查浏览器控制台是否有 CORS 错误
2. 确认后端 `FRONTEND_URL` 环境变量正确
3. 确认前端 `VITE_API_BASE_URL` 正确（末尾无 `/`）

### 问题 2: 后端部署失败或启动崩溃 (Crashed)
**可能原因**：
- 依赖安装失败 → 检查 `package.json`
- 数据文件太大 → 考虑使用外部存储（S3/Cloudflare R2）或 GitHub Release + Volume
- **Schema 不匹配崩溃**：如果后端代码升级了（例如新增了 POI 类型 `poi_type` 字段的查询），但 Railway 启动时下载的仍是 GitHub Release 上的旧版数据库，会因 `no such column: p.poi_type` 报错直接 Crash。

**解决方案**：
- 查看部署日志。
- 确保 `data/` 目录未被 `.gitignore` 排除。
- **解决 Schema 不匹配**：
  1. 本地运行 `npm run update-from-nc` 和 `npm run import-data` 重新生成带有新字段的 `data/geodata.db`。
  2. 使用 `gh release upload v1.0.0-data data/geodata.db --clobber` 将最新数据库覆盖上传到 GitHub Release。
  3. 获取本地 `data/geodata.db` 的精确字节数（macOS 运行 `stat -f %z data/geodata.db`，Linux 运行 `stat -c %s data/geodata.db`），得到一个数字如 `433405952`。
  4. 在 Railway 后端控制面板中，将环境变量 **`GEODATA_DB_SIZE`** 的值更新为该精确字节数，并确保 `GEODATA_DB_URL` 指向 GitHub Release 的下载直连。
  5. 重新部署 Railway。启动脚本 `ensure-db.js` 会对比本地硬盘上的数据库与 `GEODATA_DB_SIZE`，如果大小不匹配，会自动删除旧库并拉取最新的正确数据库。

### 问题 3: 线上数据省市不匹配（如点击哈尔滨网格显示为吉林省）
**可能原因**：
- 原始地理数据库的 `GCs_level`（网格表）中，网格所属的 `province` 录入存在大面积逻辑错误（如哈尔滨网格被写成吉林省，齐齐哈尔网格被写成内蒙古）。
- 新旧地理数据库的 `OBJECTID` 发生漂移错位，导致属性合并时发生错位。

**解决方案**：
1. 确保在 `scripts/update-from-nc.js` 中，**统一使用唯一的“城市名称 / POI 名称”进行对齐匹配**，禁止使用 `OBJECTID`。
2. 在 `update-from-nc.js` 的 `updateCells` 逻辑中，加载 `city_level` 表中正确的 `城市 -> 省份` 映射，对网格的省份进行强制清洗和校正。
3. 本地重新运行数据清洗与导入：
   ```bash
   npm run update-from-nc
   npm run import-data
   ```
4. 按照 **问题 2** 中的步骤，将更新后的 `geodata.db` 覆盖上传至 GitHub Release，并更新 Railway 的 `GEODATA_DB_SIZE` 环境变量重新部署。

### 问题 3: 地图加载缓慢
**优化建议**：
1. 依赖 Cloudflare CDN 缓存静态资源
2. 考虑升级后端为付费实例（更多资源）
3. 使用 CDN 加速数据文件访问

---

## 成本估算

### 免费方案
- **Cloudflare Pages**: 免费（含全球 CDN）
- **Railway**: 免费额度有限（按用量计费）

### 推荐方案（小规模使用）
- **前端**: Cloudflare Pages 免费
- **后端**: Railway 免费额度
- **总成本**: 约 $0/月（超出额度后按用量）

### 升级方案（高流量）
- **前端**: Cloudflare Pages（通常仍可免费）
- **后端**: Railway Starter（约 $5/月起）
- **总成本**: 约 $5+/月

---

## 安全建议

1. **限制 CORS**：不要在生产环境使用 `*`，明确指定前端域名 `https://nature-geo-vis.pages.dev`
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

- [Cloudflare Pages 文档](https://developers.cloudflare.com/pages/)
- [Railway 文档](https://docs.railway.app/)
- [Vite 部署指南](https://vitejs.dev/guide/static-deploy.html)
- [GitHub 仓库](https://github.com/HITNature/nature-geo-vis)
