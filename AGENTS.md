# AI 协同开发规约 (AGENTS.md)

本文档记录了 `nature-geo-vis` 项目中 AI 编码智能体（Agent）在开发与维护时必须遵循的核心规约、技术细节和避坑指南。

---

## 1. 核心数据同步与部署规约 (重中之重)

项目采用 **“本地清洗 -> GitHub Release 托管 -> Railway Volume 挂载”** 的大型地理数据库同步方案。

### 1.1 数据库防 Crash 与 Schema 匹配规约
当后端代码更新了查询 SQL（例如新增了 POI 字段、网格字段或关联查询）时，**必须同步更新云端数据库**。否则，云端服务启动时下载旧版数据库，会因为 `no such column` 报错直接 Crash。

**更新 SOP 流程**：
1. **本地清洗**：将最新的 `.geodatabase` 覆盖到根目录 `geodatabase.db`。
2. **生成数据**：
   ```bash
   npm run update-from-nc   # 清洗并生成最新的 GeoJSON 属性
   npm run import-data      # 重新生成 data/geodata.db 运行库
   ```
3. **上传 GitHub Release**：
   使用 GitHub CLI 将本地最新的 `data/geodata.db` 覆盖上传至 `v1.0.0-data` 标签：
   ```bash
   gh release upload v1.0.0-data data/geodata.db --clobber
   ```
4. **精确字节对齐**：
   - 获取本地 `data/geodata.db` 的精确字节大小：
     ```bash
     # macOS
     stat -f %z data/geodata.db
     # Linux
     stat -c %s data/geodata.db
     ```
   - 将此字节数（例如 `433405952`）填入 Railway 后端的 **`GEODATA_DB_SIZE`** 环境变量中。
5. **触发云端拉取**：
   - 重新部署 Railway。
   - 启动脚本 `scripts/ensure-db.js` 会对比本地硬盘上的数据库与 `GEODATA_DB_SIZE` 环境变量，如果大小不匹配，会自动删除旧库并从 `GEODATA_DB_URL` 重新下载最新的正确数据库。

### 1.2 数据纠偏与清洗原则
- **禁止使用 `OBJECTID` 匹配省市/POI 属性**：新旧地理数据库的 `OBJECTID` 存在漂移错位。在 `update-from-nc.js` 中，**必须统一使用唯一的“城市名称 / POI 名称”进行对齐匹配**。
- **网格数据省份纠偏**：原始地理数据库的 `GCs_level`（网格表）中，网格所属的 `province` 录入存在大面积逻辑错误（如哈尔滨网格被写成吉林省，齐齐哈尔网格被写成内蒙古）。在更新网格属性时，**必须加载 `city_level` 表中正确的 `城市 -> 省份` 映射，对网格的省份进行强制清洗和校正**。

---

## 2. 前后端协同与开发规约

### 2.1 后端服务重启规约
- 前端（Vite）支持热重载（HMR），修改代码后浏览器自动刷新。
- 后端（Express）**不支持热重载**。若修改了后端 API、路由或数据库查询，**必须手动重启后端服务**（或重新运行 `npm run web`）以注册新路由，否则前端请求会报 `404 (Not Found)`。

### 2.2 地图底图与 UI 对比度
- 地图底图采用暗黑模式（`dark_all`）。为了在不破坏现有白色文字、红绿网格和 POI 点对比度的前提下调亮地图，**禁止切换为浅色底图**。
- 推荐使用 CSS 滤镜在前端微调亮度：
  ```css
  .dark-map-tiles {
    filter: brightness(1.35) contrast(1.05) saturate(0.95);
  }
  ```

### 2.3 搜索组件交互优化
- 搜索框嵌套于左下角图例卡片（`.legend-card`）下方。
- 在选择下拉推荐项时，必须通过 `isSelectingRef` 标记暂时拦截输入框 `query` 改变带来的二次防抖请求，避免冗余的 API 消耗。

---

## 3. 核心脚本速查

| 脚本命令 | 对应文件 | 作用 |
| :--- | :--- | :--- |
| `npm run update-from-nc` | `scripts/update-from-nc.js` | 从根目录 `geodatabase.db` 清洗并生成最新的 GeoJSON 分片。 |
| `npm run import-data` | `scripts/import-to-sqlite.js` | 读取 GeoJSON 并重建带有空间索引的 SQLite 数据库。 |
| `npm run server` | `server/index-sqlite.js` | 启动 Express 后端服务（端口 `3001`）。 |
| `npm run dev` | `vite` | 启动前端开发服务器（端口 `5173`）。 |
| `npm run web` | `concurrently ...` | 同时启动前端和后端服务（推荐开发时使用）。 |
