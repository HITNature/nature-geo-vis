# 部署检查清单

在部署到生产环境之前，请确保完成以下检查项。

## 已部署地址

| 平台 | URL | 状态 |
|------|-----|------|
| GitHub | https://github.com/HITNature/nature-geo-vis | ✅ |
| 后端 API（Railway） | https://nature-geo-vis-server-production.up.railway.app | ✅ |
| 前端应用（Cloudflare Pages） | https://nature-geo-vis.pages.dev | ✅ |

---

## 📋 部署前检查

### 代码准备
- [x] 所有代码已提交到 Git 仓库
- [x] 已推送到远程仓库（GitHub）
- [x] 确认 `main` 分支是最新版本

### 数据文件
- [ ] `data/boundaries.geojson` 存在且有效
- [ ] `data/cities.geojson` 存在且有效
- [ ] `data/cells.geojson` 存在且有效
- [ ] `data/pois.geojson` 存在且有效
- [ ] 数据文件未被 `.gitignore` 排除

### 配置文件
- [x] `.env.example` 已创建
- [x] `.env.development` 已创建
- [x] `railway.toml` 已创建
- [x] `public/_redirects` 已创建（Cloudflare Pages SPA 回退）

### 代码检查
- [x] 所有 API 调用使用 `apiFetch` 而非 `fetch`
- [x] 服务器配置使用环境变量（`process.env.PORT`）
- [x] CORS 配置支持环境变量（`process.env.FRONTEND_URL`）

---

## 🚀 后端部署（Railway）

### 1. 创建项目
- [x] 访问 [railway.app](https://railway.app/)
- [x] 使用 GitHub 账号登录
- [x] 选择 "Deploy from GitHub repo"
- [x] 选择 `HITNature/nature-geo-vis` 仓库

### 2. 配置环境变量
在 Variables 面板添加：
- [x] `NODE_ENV` = `production`
- [x] `FRONTEND_URL` = `https://nature-geo-vis.pages.dev`

### 3. 验证部署
- [x] 部署成功（绿色状态）
- [x] 后端 URL：`https://nature-geo-vis-server-production.up.railway.app`
- [ ] 测试 API：`curl https://nature-geo-vis-server-production.up.railway.app/api/config`
- [ ] API 返回正常 JSON

---

## 🌐 前端部署（Cloudflare Pages）

### 1. 创建项目
- [x] 访问 [Cloudflare Dashboard](https://dash.cloudflare.com/) → Workers & Pages
- [x] 使用 GitHub 账号连接仓库
- [x] 选择 `HITNature/nature-geo-vis` 仓库
- [x] 确认 Build command = `npm run build`，Output = `dist`

### 2. 配置环境变量
在 Environment Variables 添加：
- [x] `VITE_API_BASE_URL` = `https://nature-geo-vis-server-production.up.railway.app`

### 3. 部署
- [x] 构建成功
- [x] 前端 URL：`https://nature-geo-vis.pages.dev`

### 4. 验证部署
- [ ] 访问前端 URL
- [ ] 地图正常加载
- [ ] 无 CORS 错误（检查浏览器控制台）
- [ ] 放大地图可看到数据点

---

## 🔄 更新后端 CORS 配置

### Railway
- [x] 返回 Railway 项目
- [x] 进入 Variables
- [x] 更新 `FRONTEND_URL` = `https://nature-geo-vis.pages.dev`
- [ ] 保存（自动触发重新部署）
- [ ] 等待重新部署完成

---

## ✅ 最终验证

### 功能测试
- [ ] 前端页面可访问
- [ ] 地图底图正常加载
- [ ] 国境线显示正常（红色虚线）
- [ ] 行政区划显示正常（青色边界）
- [ ] 缩放到 Zoom 8，网格数据显示
- [ ] 缩放到 Zoom 13，POI 详细数据显示
- [ ] 点击 POI 可查看详情
- [ ] 详情面板可拖拽
- [ ] 性能监控显示正常（FPS 60+）

### 性能检查
- [ ] 初次加载时间 < 3 秒
- [ ] 地图缩放流畅（无卡顿）
- [ ] POI 渲染流畅（FPS 保持 50+）
- [ ] 无内存泄漏（长时间使用）

### 错误检查
- [ ] 浏览器控制台无 CORS 错误
- [ ] 浏览器控制台无 404 错误
- [ ] 浏览器控制台无 JavaScript 错误
- [ ] 后端日志无错误

### 跨浏览器测试
- [ ] Chrome/Edge（推荐）
- [ ] Firefox
- [ ] Safari
- [ ] 移动端浏览器

---

## 📊 监控和维护

### 设置监控
- [ ] 查看 Railway Metrics（CPU/内存使用）
- [ ] 查看 Cloudflare Analytics（访问量/性能）
- [ ] （可选）集成 Sentry 错误监控

### 文档更新
- [x] 在 README 中填写实际部署 URL
- [ ] 团队成员能访问部署链接
- [x] 更新项目文档中的演示地址

---

## 🎯 部署 URLs 记录

| 服务 | URL | 状态 |
|------|-----|------|
| GitHub | https://github.com/HITNature/nature-geo-vis | ✅ |
| 后端 API | https://nature-geo-vis-server-production.up.railway.app | ✅ |
| 前端应用 | https://nature-geo-vis.pages.dev | ✅ |

---

## ⚠️ 常见问题

### 问题：前端显示 CORS 错误
**解决方案**：
1. 确认后端 `FRONTEND_URL` = `https://nature-geo-vis.pages.dev`
2. 确认 URL 末尾没有 `/`
3. 等待后端重新部署完成

### 问题：前端无法加载数据
**解决方案**：
1. 检查 `VITE_API_BASE_URL` 是否为 `https://nature-geo-vis-server-production.up.railway.app`
2. 在浏览器访问 `{VITE_API_BASE_URL}/api/config` 测试
3. 确认后端服务正在运行

### 问题：Railway 部署失败
**解决方案**：
1. 查看 Deployment Logs
2. 确认 `package.json` 正确
3. 确认数据文件已提交到 Git

---

## 📞 获取帮助

- **部署文档**: 查看 [DEPLOYMENT.md](./DEPLOYMENT.md)
- **Railway 文档**: https://docs.railway.app/
- **Cloudflare Pages 文档**: https://developers.cloudflare.com/pages/
- **项目 Issues**: https://github.com/HITNature/nature-geo-vis/issues

---

**部署完成日期**: ____________________

**部署人员**: ____________________

**备注**:
```



```
