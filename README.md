# 中国基础教育设施地图集（Nature Geo Vis）

> 仓库：https://github.com/HITNature/nature-geo-vis

将 ArcGIS geodatabase 中的全国教育设施与人口网格数据（2010→2020 年变化）做成可交互的全国尺度 Web 地图：按视口动态加载、按缩放层级 LOD 聚合、前端 Canvas / OffscreenCanvas Worker 批量渲染。

**在线访问**

| 角色 | 地址 |
|------|------|
| 前端 | https://nature-geo-vis.pages.dev |
| 后端 API | https://nature-geo-vis-server-production.up.railway.app |
| 运行库 Release | https://github.com/HITNature/nature-geo-vis/releases/tag/v1.0.0-data |

本地性能面板：在 URL 后加 `?perf`（如 `http://localhost:5173/?perf`）。

---

## 功能概览

- **国境线 / 行政区划**：边界展示，城市悬停 Tooltip（含英文名）
- **1km 网格**：约 17.7 万格，5 套数据层（总人口变化 / 小学学龄人口 / 初中学龄人口 / 小学可达距离 / 初中可达距离），四色分级着色，可随时切换
- **学校 POI**：初中（JS）+ 小学（PS），合计约 **7.8 万** 点；红色表示服务人口增加 / 距离变远，绿色表示改善
- **行政 LOD**：省 → 市 → 区县 → 详细点位，随 Zoom 自动切换，预聚合气泡可下钻
- **搜索**：内部地点 / POI 检索，无结果时自动回退至 OSM Nominatim 地理编码
- **详情面板**：可拖拽浮动（Pointer Events API），支持 POI 与网格单元两种展示模式

### 当前数据规模（`data/geodata.db`）

| 图层 | 数量 |
|------|------|
| POI | **78,444**（JS 32,231 + PS 46,213） |
| 网格 cells | **177,610** |
| 行政区 cities | 355 |
| 国境线 boundaries | 7 |

源库表为 NC 命名（`GCs_level` / `city_level` / `JS_POI_level` / `PS_POI_level`），见 [表字段映射](docs/表字段映射.md)。

---

## 技术栈

| 层 | 技术 |
|----|------|
| 前端 | React 18、Vite、Leaflet、react-leaflet、Canvas / OffscreenCanvas Worker |
| 后端 | Node.js、Express、**better-sqlite3**（R-Tree 视口查询） |
| 数据 | 源：`geodatabase.db`；中间 GeoJSON / 分片；运行库：`data/geodata.db` |
| 部署 | 前端 Cloudflare Pages；后端 Railway（Volume + Release 拉库） |

生产默认入口：`npm run server` → `server/index-sqlite.js`（不是内存全量 GeoJSON 的 legacy 路径）。

---

## 文档目录

| 文档 | 说明 |
|------|------|
| [系统架构与设计解析](docs/系统架构与设计解析.md) | **全系统架构、设计决策、性能优化的综合说明（推荐首读）** |
| [数据管线文档](docs/数据管线文档.md) | 源表 → 清洗 → 导入 SQLite 的完整流转 |
| [数据更新与上云文档](docs/数据更新与上云文档.md) | 日常换库、`import-data`、Release、`GEODATA_DB_SIZE` |
| [表字段映射](docs/表字段映射.md) | NC 表与匹配键（名称 / OBJECTID 边界） |
| [前后端服务部署文档](docs/前后端服务部署文档.md) | Pages + Railway 部署与环境变量 |
| [前后端服务部署检查](docs/前后端服务部署检查.md) | 发版勾选清单 |
| [性能优化说明](docs/性能优化说明.md) | 全链路性能、基准与宣讲要点 |
| [WEB_WORKER_GUIDE](docs/WEB_WORKER_GUIDE.md) | Worker / OffscreenCanvas 选型 |
| [AGENTS.md](AGENTS.md) | AI / 协作者避坑（数据同步、后端重启等） |

---

## 项目结构（摘要）

```
nature-geo-vis/
├── data/                      # 本地数据（大文件多被 gitignore）
│   ├── geodata.db             # 运行库（服务端唯一依赖，约 425MB）
│   ├── cells_chunks/          # 网格几何分片 + 属性
│   ├── cities.geojson
│   ├── boundaries.geojson
│   ├── pois.geojson           # 初中
│   └── pois_ps.geojson        # 小学
├── docs/                      # 技术文档（见上表）
├── server/
│   ├── index-sqlite.js        # 生产 / 开发默认后端
│   ├── index.js               # legacy（内存 GeoJSON）
│   └── config.js              # 缩放与展示字段
├── src/
│   ├── components/            # MapView、Legend、SearchBox、Canvas / Offscreen 层等
│   ├── workers/               # render-worker、geometry-worker
│   └── utils/                 # api.js、perf.js
├── scripts/
│   ├── update-from-nc.js      # 日常：从 geodatabase 刷属性 / 导出 POI
│   ├── import-to-sqlite.js    # 重建 geodata.db
│   ├── ensure-db.js           # Railway 冷启动拉库
│   ├── convert-raw-data.js    # 几何重建（raw-data → WGS84）
│   └── …                      # split / convert（遗留）/ export_arcpy 等
├── geodatabase.db             # 源库（gitignore，约 85MB）
├── railway.toml
└── package.json
```

`raw-data/` 仅在**重建面线几何**时需要；日常更新不依赖它。

---

## 快速开始

### 环境

- Node.js **≥ 18**（推荐，与 better-sqlite3 / Vite 5 匹配）
- npm ≥ 8
- 本地需已有 `data/geodata.db`（自行 `import-data`，或从 Release 下载）

### 安装与启动

```bash
npm install

# 推荐：前后端一起开
npm run web

# 或分别：
# npm run server   # http://localhost:3001  → index-sqlite.js
# npm run dev      # http://localhost:5173
```

若没有运行库：

```bash
# 将交付的 .geodatabase 覆盖为根目录 geodatabase.db 后：
npm run update-from-nc
npm run import-data
```

### 常用脚本

| 命令 | 作用 |
|------|------|
| `npm run web` | 同时启动后端 + 前端 |
| `npm run update-from-nc` | NC 源库 → 更新分片 / 城市 / POI GeoJSON |
| `npm run import-data` | 重建 `data/geodata.db`（会删旧库） |
| `npm run build` / `preview` | 前端生产构建与预览 |
| `npm run server:legacy` | 旧版内存 GeoJSON 服务（不推荐） |
| `npm run convert` | **遗留**：读旧表名，当前 NC 源库不可用 |

数据与上云完整步骤：[数据更新与上云文档](docs/数据更新与上云文档.md)。

---

## 生产部署（摘要）

- **前端**：Cloudflare Pages，`VITE_API_BASE_URL` = Railway 后端（无尾 `/`）
- **后端**：Railway，`startCommand` = `node scripts/ensure-db.js && npm run server`
- **必配**：`GEODATA_DB_URL`、`GEODATA_DB_SIZE`、`FRONTEND_URL`，并挂载 Volume 到 `data/`
- **数据不进 Git**：改库后需 `gh release upload v1.0.0-data data/geodata.db --clobber` 并更新字节数

详见 [前后端服务部署文档](docs/前后端服务部署文档.md) 与 [部署检查清单](docs/前后端服务部署检查.md)。

### 环境变量

**开发**（`.env.development`）：`VITE_API_BASE_URL` 留空，走 Vite proxy。

**前端生产（Pages）**：

```bash
VITE_API_BASE_URL=https://nature-geo-vis-server-production.up.railway.app
```

**后端生产（Railway）**：

```bash
NODE_ENV=production
FRONTEND_URL=https://nature-geo-vis.pages.dev
GEODATA_DB_URL=<Release 上 geodata.db 直链>
GEODATA_DB_SIZE=<本地 stat 精确字节数>
```

---

## API（`index-sqlite.js`）

| 方法 | 说明 |
|------|------|
| `GET /api/config` | 展示字段、缩放配置 |
| `GET /api/health` | 健康检查（含 `poisCount`） |
| `GET /api/boundaries` | 国境线 |
| `GET /api/cities?bbox=` | 城市边界（可选视口） |
| `GET /api/cells?bbox=&zoom=` | 网格（需 bbox） |
| `GET /api/cell/:id` | 单格详情 |
| `GET /api/pois?bbox=&zoom=&type=` | 详细 POI；`type` = `js` / `ps` / `all` |
| `GET /api/pois/aggregated?level=&type=` | 省 / 市 / 区预聚合 |
| `GET /api/search?q=` | 地点与 POI 搜索 |

```bash
curl "http://localhost:3001/api/health"
curl "http://localhost:3001/api/pois?bbox=103,31,105,33&zoom=14&type=all"
```

> `/api/tiles/...` 仅存在于 legacy `server/index.js`，默认服务端未挂载。

---

## 缩放与图层

```javascript
// server/config.js（摘要）
zoomConfig = {
  showCities: 4,
  showCells: 8,
  poiLevels: {
    province: 0,   // 0–7 省级聚合
    city: 8,       // 8–10 市级
    district: 11,  // 11–12 区县
    detail: 13     // ≥13 详细 POI
  }
}
```

网格指标与 POI 字段配置见 `server/config.js` 的 `displayFields` / `poiDisplayFields`。

---

## 性能要点

| 环节 | 现状 |
|------|------|
| 空间查询 | SQLite **R-Tree** 视口检索（非全表内存 filter），O(log n) 复杂度 |
| 聚合数据 | 导入时预物化省 / 市 / 区统计表（含 JS / PS / ALL），查询为常数时间 |
| 点位渲染 | 默认 **Canvas**（L.Canvas 批绘，消除 78K DOM 节点）；可选 OffscreenCanvas Worker（`?perf` 面板切换） |
| 网络反馈 | 流式字节计数（ReadableStream），实时显示下载速率 / 已传输量 / 延迟 |
| 底图 | CARTO Dark + `keepBuffer=4` 预缓冲 + 空闲更新 + GPU 合成层 + 淡入过渡 |

详解：[系统架构与设计解析](docs/系统架构与设计解析.md)、[性能优化说明](docs/性能优化说明.md)、[WEB_WORKER_GUIDE](docs/WEB_WORKER_GUIDE.md)。

---

## 故障排查

| 现象 | 处理 |
|------|------|
| 地图无详细点 | 放大到 Zoom ≥ **13**（不是 10） |
| 无网格 | Zoom ≥ **8**，并确认 `geodata.db` 存在 |
| 改了 API 仍 404 | 后端无 HMR，重启 `npm run server` / `npm run web` |
| Railway `no such column` | 重建库 → Release `--clobber` → 更新 `GEODATA_DB_SIZE` → Redeploy |
| 城市标签错位 | 按**名称**对齐，勿用 OBJECTID（见 AGENTS / 表字段映射） |
| `npm run convert` 失败 | 预期：旧表名已不存在；请用 `update-from-nc` |

---

## 开发注意

- 修改后端后**必须重启** Express（无 HMR）
- `import-data` 会**删除并重建**整个 `geodata.db`
- 属性合并使用**城市名 / 学校名**作为连接键，勿依赖 OBJECTID（版本间不稳定）
- 协作者 / Agent 规约见 [AGENTS.md](AGENTS.md)
