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

4. **性能优化**
   - Web Worker 后台数据处理（6倍性能提升）
   - Canvas 渲染替代 DOM Marker（FPS 从 <10 提升至 60+）
   - 实时性能监控面板（左上角 PERF MONITOR）
   - 地图瓦片加载优化（预加载、平滑过渡）

###  待解决问题

**数据编码问题**：geodatabase中的大部分表（国境线、行政区划、网格数据）在转换过程中遇到编码问题，导致转换失败。目前只有POI数据成功转换。

**影响范围**：
- China_city_pl（国境线）- 转换失败 ❌
- China_city_pg（行政区划）- 转换失败 ❌
- China_city_cell（网格数据）- 转换失败 ❌
- China_city_POI_JS2020（POI数据）- 转换成功

### 当前实现

由于数据转换问题，当前版本**仅实现POI数据可视化**：
- 32,231个初中POI点的高性能层级化展示
- **行政分级聚合**：按“省-市-区”自动汇总数据，支持多级下钻探索
- 按视口动态加载数据，支持海量点位顺滑交互
- 点击POI或聚合点查看多维空间属性信息
- 自动同步地图气泡与侧边详情面板的状态

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
- **Web Workers** - 后台数据处理
- **Canvas API** - 高性能点位渲染

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
├── docs/                       # 技术文档
│   └── PERFORMANCE.md         # 性能优化技术文档 ✓
├── server/                    # 后端服务
│   ├── index.js              # Express服务器主文件
│   └── config.js             # 服务器配置
├── src/                       # 前端源码
│   ├── components/           # React组件
│   │   ├── MapView.jsx      # 地图视图组件
│   │   ├── DetailPanel.jsx  # 详情面板组件
│   │   ├── CanvasMarkerLayer.jsx  # Canvas渲染层 ✓
│   │   └── PerformanceMonitor.jsx # 性能监控面板 ✓
│   ├── utils/                # 工具函数
│   │   └── perf.js          # 性能追踪工具 ✓
│   ├── workers/              # Web Workers
│   │   └── data-worker.js   # 数据处理Worker ✓
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
    poiLevels: {
        province: 0,  // 0-7 级显示省级聚合（蓝色）
        city: 8,      // 8-10 级显示市级聚合（橙色）
        district: 11, // 11-12 级显示区县级聚合（绿色）
        detail: 13    // >= 13 级显示详细学校点位
    },
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
4. **层级化行政聚合 (Hierarchical Administrative Clustering)**：摒弃传统的基于物理距离的盲目聚合，实现了按“省-市-区”行政隶属关系的层级化实时汇总。通过后端分级索引提升了海量点位的下钻查询性能。
5. **服务端缓存**：geodata 在服务器启动时一次性加载到内存并建立瓦片索引
6. **前端按需请求**：地图移动或缩放时动态请求数据

## 交互体验优化 (UI/UX)

1. **视觉设计系统**：
   - 深邃午夜蓝背景，高对比度的青色 (Cyan) 和靛蓝 (Indigo) 强调色，营造专业且高端的科研工具感。
   - 广泛应用 透明玻璃 效果，使 UI 层级清晰且不遮挡地图细节。

2. **渲染状态实时反馈**：
   - **动态状态栏**：位于屏幕底部的状态栏实时反馈数据加载（Fetching）、瓦片同步（Syncing）和空间渲染（Rendering）的生命周期。
   - **脉冲动画**：加载过程中状态点通过脉冲动画提示后台活动，增强用户感知的响应性。
   - **全局等待指针**：由于地理数据渲染可能涉及大量 DOM 操作，在渲染繁忙期，鼠标指针会自动切换为 `wait` 状态，告知用户正在处理中。

3. **自由布局交互界面**：
   - **双向联动关闭**：点击地图气泡关闭按钮自动收起详情面板，反之亦然，保持 UI 状态高度一致性。
   - **可拖拽详情面板**：右侧详情面板通过浮动玻璃层展示，支持用户自由拖拽至屏幕任何位置，确保在大屏探索时重要地图区域不被遮挡。

4. **多级地理尺度可视化**：
   - **视口动态切换**：地图根据缩放级别自动切换统计口径。低缩放 (Zoom 0-7) 展示省级规模，中缩放 (Zoom 8-10) 展示地级市规模，高缩放 (Zoom 11-12) 精细至区县，最高缩放 (Zoom 13+) 渲染具体学校点位。
   - **拟态视觉设计**：聚合点采用极简的半透明圆圈设计（20% 不透明度），移除硬朗边框，将行政区名与统计数字垂直整合于圆圈内部，实现了“信息即设计”的现代观感。

### 已完成的性能优化

> 💡 **详细技术文档**：查看 [`docs/PERFORMANCE.md`](docs/PERFORMANCE.md) 了解完整的性能分析、优化方案和基准测试结果。

1. **Web Worker 数据处理** (`src/workers/data-worker.js`)：将 `fetch` + JSON 解析移入后台线程，主线程数据处理耗时从 ~122ms 降至 ~19ms（约 6 倍提升）
2. **Canvas 渲染替代 DOM Marker** (`src/components/CanvasMarkerLayer.jsx`)：使用 Leaflet Canvas Renderer 绘制所有 POI，DOM 节点从数千个降至 1 个 Canvas，FPS 保持 60+
3. **细粒度性能监控** (`src/utils/perf.js`)：实时追踪 FPS、Tiles Loading、React Renders、Canvas Markers 等关键指标
4. **地图瓦片优化** (`src/components/MapView.jsx` + `src/index.css`)：
   - 瓦片预加载（keepBuffer）减少重复请求
   - 缩放时禁用更新避免抖动
   - CSS 硬件加速和平滑过渡

### 未来可优化方向
1. 实现虚拟滚动和增量渲染
2. 采用矢量瓦片 (MVT) 或二进制传输 (Protobuf)


#### 性能开销分布梳理

| 环节 | 归属层级 | 主要开销点     | 当前实现说明                                                                                                                                                                        |
| ------ | ---------- | ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **数据查询**     | **服务端 (Server)**         | CPU / 内存     | **全量内存过滤：**  目前服务端在启动时将 `pois.geojson` 全量加载到内存，查询时使用 `.filter()` 遍历数组并进行 BBox 计算。数据量大时，CPU 压力随数据量线性增长。                                                                 |
| **网络传输**     | **网络 (Network)**         | 带宽 / 延迟    | **GeoJSON 传输量：**  采用标准的文本格式传输。对于详细 POI，如果视口内有数千个点，返回的 JSON 体积（包含属性字段）会达到数 MB，导致排队等待和下载延迟。                                                  |
| **聚类计算**     | **服务端 / 前端**         | 计算能力 (CPU) | **预处理模式：**  目前行政级别的聚合（省/市/区）是在**服务端启动时预计算**好的，请求时直接返回，所以运行时开销极低。但如果未来引入动态聚类，开销将显著增加。                                                               |
| **地图渲染**     | **前端 (Browser)**         | GPU / 内存     | **Canvas/SVG 绘制：**  地图底图瓦片由浏览器 GPU 渲染。行政边界（Boundaries）作为矢量路径渲染，路径节点越多，渲染压力越大。                                                                                |
| **数据点渲染**     | **前端 (Browser)**         | **Canvas (已优化)**               | **Canvas 渲染（已优化）：** 使用 Leaflet Canvas Renderer (`L.circleMarker`) 替代 DOM Marker，所有点统一绘制在同一 Canvas 上，彻底消除 DOM 爆炸问题，FPS 保持 60+。 |

---

#### 系统当前性能瓶颈分析

1. ~~**前端瓶颈 (最严重)**~~ **已解决**：通过 Canvas 渲染替代 DOM Marker，数据点渲染不再是瓶颈。
2. **网络瓶颈**：**数据量过大**。直接请求大批量的 GeoJSON 特征点，没有采用二进制格式（如 Protocol Buffers）或矢量瓦片（MVT）。
3. **服务端瓶颈**：**内存溢出风险**。全量加载 1.2亿+ 的原始数据（虽然目前只是一部分）会导致内存占用极高。


#### 基础设施已就绪

**Perf Monitor** 已经上线，它可以实时监控：

* **FPS**：直接反映“数据点渲染”对主线程的阻塞程度。
* **Load Times**：通过

  ```inline
  Load Aggr Data
  ```

  和

  ```inline
  Fetch Detailed POIs
  ```

  可以观察到“数据查询 + 网络传输”的总时长。
* **Marker Counts**：量化当前导致卡顿的 DOM 节点数量。

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