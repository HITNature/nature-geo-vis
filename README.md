# 教育资源分布可视化

数据可视化项目，用于展示和探索基于geodatabase的教育资源分布数据。

## 项目概述

将ArcGIS geodatabase格式的地理数据转换为Web可视化应用，提供交互式地图展示中国教育资源的分布情况。整体为一个基于 TypeScript 的 Web 全栈项目，实现高性能的地理数据可视化。

### 设计目标

原始设计包含以下可视化内容：

1. **区域划分（静态底图）**
   - China_city_pl：中国国境线
   - China_city_pg：中国行政区划

2. **详细数据（可交互元素）**
   - China_city_cell：城市区域1km网格分割（177,611个网格）
     - 展示字段：wpop change, pop6-11 change, pop12-14 change, ed ps change, ed js change
   - China_city_POI_JS2020：2020年城市初中POI点（32,231个）
     - 展示字段：name, survive pop change

## 当前进展

### 已完成

1. **数据转换**
   - 成功将geodatabase（SQLite格式）中的POI数据转换为GeoJSON格式
   - POI数据量：32,231个初中POI点
   - 数据文件大小：6.3MB

2. **后端服务**
   - 基于Express的Node.js服务器
   - 实现按视口（bbox）过滤的数据API
   - 支持按缩放级别（zoom level）控制数据加载
   - RESTful API接口设计

3. **前端可视化**
   - 基于React + Leaflet的交互式地图
   - 暗色主题底图（CARTO Dark）
   - POI点击查看详情功能
   - 响应式设计和现代化UI

###  待解决问题

**数据编码问题**：geodatabase中的大部分表（国境线、行政区划、网格数据）在转换过程中遇到编码问题，导致转换失败。目前只有POI数据成功转换。

**影响范围**：
- China_city_pl（国境线）- 转换失败 ❌
- China_city_pg（行政区划）- 转换失败 ❌
- China_city_cell（网格数据）- 转换失败 ❌
- China_city_POI_JS2020（POI数据）- 转换成功

### 当前实现

由于数据转换问题，当前版本**仅实现POI数据可视化**：
- 32,231个初中POI点的地图展示
- 按视口动态加载数据
- 点击POI查看学校名称、城市、survive_pop_change等信息
- 缩放级别 ≥ 10 时显示POI数据

## 技术栈

### 后端
- **Node.js** - JavaScript运行时
- **Express** - Web服务器框架
- **better-sqlite3** - SQLite数据库操作

### 前端
- **React 18** - UI框架
- **Vite** - 构建工具和开发服务器
- **Leaflet** - 开源地图库
- **react-leaflet** - Leaflet的React封装

### 数据格式
- **GeoJSON** - 地理数据交换格式
- **SQLite/geodatabase** - 原始数据源

## 项目结构

```
nature-geo-vis/
├── data/                      # 转换后的GeoJSON数据
│   ├── boundaries.geojson     # 国境线（TODO）
│   ├── cities.geojson         # 城市边界（TODO）
│   ├── cells.geojson          # 网格数据（TODO）
│   └── pois.geojson           # POI数据 ✓
├── server/                    # 后端服务
│   ├── index.js              # Express服务器主文件
│   └── config.js             # 服务器配置
├── src/                       # 前端源码
│   ├── components/           # React组件
│   │   ├── MapView.jsx      # 地图视图组件
│   │   └── DetailPanel.jsx  # 详情面板组件
│   ├── App.jsx              # 主应用组件
│   ├── main.jsx             # 应用入口
│   └── index.css            # 全局样式
├── scripts/                   # 数据处理脚本
│   ├── convert-geodata.js   # geodatabase转换脚本
│   └── generate-mock-data.js # 模拟数据生成
├── geodatabase.db            # 原始geodatabase文件（127MB）
├── background.md             # 需求文档
├── package.json              # 项目配置
└── vite.config.js           # Vite配置

```

## 快速开始

### 环境要求

- Node.js >= 14.0.0
- npm >= 6.0.0

### 安装依赖

```bash
npm install
```

### 启动开发服务器

需要同时启动后端和前端服务：

```bash
# 终端1: 启动后端服务器（端口 3001）
npm run server

# 终端2: 启动前端开发服务器（端口 5173）
npm run dev
```

### 访问应用

- **前端页面**: http://localhost:5173/
- **后端API**: http://localhost:3001/

## API接口

### 配置接口
```
GET /api/config
```
返回前端配置信息（展示字段、缩放配置等）

### 数据接口

```
GET /api/boundaries
```
获取国境线数据（当前为空）

```
GET /api/cities?bbox=west,south,east,north
```
获取城市边界数据，支持视口过滤（当前为空）

```
GET /api/cells?bbox=west,south,east,north&zoom=10
```
获取网格数据，支持视口过滤和缩放级别控制（当前为空）

```
GET /api/cell/:id
```
获取指定ID的网格详情（当前无数据）

```
GET /api/pois?bbox=west,south,east,north&zoom=10
```
获取POI数据，支持视口过滤和缩放级别控制

### 瓦片接口

```
GET /api/tiles/:layer/:z/:x/:y.json
```
获取指定层（`cells` 或 `pois`）在特定缩放级别和坐标下的瓦片数据（GeoJSON格式）。该接口用于支持大规模数据的高性能加载。

**示例请求**：
```bash
curl "http://localhost:3001/api/pois?bbox=103,31,105,33&zoom=10"
```

## 配置说明

### 缩放级别配置 (`server/config.js`)

```javascript
export const zoomConfig = {
    showCities: 4,    // 缩放级别 >= 4 显示城市边界
    showCells: 8,     // 缩放级别 >= 8 显示网格
    showPOIs: 10,     // 缩放级别 >= 10 显示 POI
};
```

### 展示字段配置

**网格数据字段** (displayFields):
- wpop change
- pop6-11 change
- pop12-14 change
- ed ps change
- ed js change

**POI数据字段** (poiDisplayFields):
- name（学校名称）
- survive pop change（人口变化）

## 开发指南

### 数据转换

如需重新转换geodatabase数据：

```bash
npm run convert
```

**注意**：由于编码问题，当前只有POI数据能成功转换。

### 构建生产版本

```bash
npm run build
```

构建产物会输出到 `dist/` 目录。

### 预览生产构建

```bash
npm run preview
```

## 故障排查

### 问题：地图不显示数据

**原因**：需要放大到足够的缩放级别
**解决**：放大地图到城市级别（缩放级别 ≥ 10）

### 问题：后端API返回空数据

**原因**：
1. boundaries、cities、cells数据转换失败，文件为空
2. 缩放级别不够（POI需要zoom >= 10）

**解决**：
1. 对于POI数据：放大到缩放级别10或更高
2. 对于其他数据：需要解决原始geodatabase的编码问题

### 问题：数据转换失败

**原因**：geodatabase中的数据使用了特殊编码（可能是中文Windows编码）

**可能的解决方案**：
1. 使用ArcGIS Pro或QGIS重新导出数据为标准GeoJSON
2. 使用`ogr2ogr`工具指定正确的编码进行转换：
   ```bash
   ogr2ogr -f "GeoJSON" output.geojson geodatabase.db table_name \
     -lco ENCODING=UTF-8 -oo ENCODING=GBK
   ```
3. 使用Python的`geopandas`库进行转换

## 性能优化

### 已实现的优化
1. **视口过滤**：只加载当前可见区域的数据
2. **缩放级别控制**：根据缩放级别决定是否加载数据
3. **服务端瓦片索引 (Tile-based)**：利用 `geojson-vt` 在服务端动态生成瓦片索引，支持大数据量的高性能请求
4. **POI 聚合 (Clustering)**：在前段实现 POI 点的自动聚合显示，解决海量标记导致的视觉拥挤和性能下降
5. **服务端缓存**：geodata 在服务器启动时一次性加载到内存并建立瓦片索引
6. **前端按需请求**：地图移动或缩放时动态请求数据

### 未来可优化方向
1. 使用 Web Workers 进行大数据量渲染
2. 实现虚拟滚动和增量渲染

## Roadmap & TODO

短期唯一目标：成功转换国境线、行政区划、网格数据

因为目前 ESRI 几何数据解析情况是
  - boundaries: 0 条记录转换
  - cities: 0 条记录转换
  - cells: 0 条记录转换
  - POIs: 32231 条记录转换成功（因为 POI 使用的是明文的 wgs84lon/wgs84lat 字段，不依赖 Shape 解析）

已把需求发给数据提供者，等待她用 ArcGIS Pro 将这3个图层分别导出为 GeoJSON 或Shapefile 格式:
  1. China_city_pl → 导出为 boundaries.geojson
  2. China_city_pg → 导出为 cities.geojson
  3. China_city_cell → 导出为 cells.geojson