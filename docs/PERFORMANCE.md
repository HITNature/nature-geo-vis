# 性能优化技术文档

> 本文档记录了 Nature Geo Vis 项目在性能方面的分析、监控和优化工作。

## 目录

1. [性能问题描述](#性能问题描述)
2. [性能开销分布分析](#性能开销分布分析)
3. [监控系统架构](#监控系统架构)
4. [已实施的优化](#已实施的优化)
5. [地图瓦片优化](#地图瓦片优化)
6. [性能排查流程](#性能排查流程)
7. [基准测试结果](#基准测试结果)

---

## 性能问题描述

### 原始问题

在地图上点击聚类点进行放大后，出现以下问题：

- **FPS 骤降至个位数**（正常应 60+）
- **缩放和拖动操作延迟严重**，需要等待 "rendering" 完成
- **UI 失去响应**，鼠标操作有明显卡顿

### 用户体验影响

| 场景 | 优化前 | 优化后 |
|------|--------|--------|
| 点击聚类点放大 | 卡顿 3-5 秒 | 流畅过渡 |
| 高缩放级别拖动 | FPS < 10 | FPS 60+ |
| 数据点悬停 | 无响应 | 即时 Tooltip |

---

## 性能开销分布分析

### 架构层级划分

```
┌─────────────────────────────────────────────────────────────┐
│                         用户浏览器                           │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐  │
│  │  地图瓦片   │  │  数据点渲染  │  │    React 组件树     │  │
│  │  (GPU/网络) │  │  (Canvas)   │  │    (主线程/DOM)     │  │
│  └─────────────┘  └─────────────┘  └─────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                              │
                              │ HTTP/JSON
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                       Express 服务端                         │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐  │
│  │  数据查询   │  │  聚类计算   │  │    JSON 序列化      │  │
│  │  (内存过滤) │  │  (预计算)   │  │    (CPU)           │  │
│  └─────────────┘  └─────────────┘  └─────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

### 开销分布表

| 环节 | 归属层级 | 主要开销 | 优化前状态 | 优化后状态 |
|------|----------|----------|------------|------------|
| 数据查询 | 服务端 | CPU/内存 | 全量内存过滤 | 同左（可接受） |
| 网络传输 | 网络 | 带宽/延迟 | GeoJSON 文本 | 同左（待优化） |
| 聚类计算 | 服务端 | CPU | 预计算（低开销） | 同左 |
| 地图渲染 | 前端 | GPU/网络 | CARTO CDN 瓦片 | 已优化缓存 |
| **数据点渲染** | **前端** | **主线程** | **DOM 爆炸** | **Canvas 渲染** ✅ |

---

## 监控系统架构

### 核心模块：`src/utils/perf.js`

```javascript
class PerfTracker {
    metrics = {
        fps: 0,              // 实时帧率
        loadTimes: {},       // 各环节加载时间
        counts: {},          // 各类计数器
        history: [],         // 事件日志
        benchmarks: {}       // A/B 测试数据
    };
}
```

### 监控指标说明

| 指标名称 | 类型 | 说明 | 健康阈值 |
|----------|------|------|----------|
| `FPS` | 计数器 | 主线程帧率 | > 30 |
| `Tiles Loading` | 计数器 | 正在加载的地图瓦片数 | < 5 |
| `React Renders` | 计数器 | MapView 组件渲染次数 | 观察趋势 |
| `Canvas Markers` | 计数器 | Canvas 渲染的点数 | 无上限 |
| `Cluster Nodes` | 计数器 | 当前显示的聚合点数 | < 500 |
| `Load Aggr Data` | 耗时 | 聚合数据加载时间 | < 200ms |
| `Fetch Detailed POIs` | 耗时 | 详细 POI 获取时间 | < 500ms |
| `Canvas Marker Render` | 耗时 | Canvas 渲染耗时 | < 100ms |

### UI 组件：`src/components/PerformanceMonitor.jsx`

- **位置**：左上角浮动面板
- **功能**：
  - 实时显示所有监控指标
  - 一键开关 Web Worker 模式
  - 显示 A/B 测试对比图表
  - 事件日志滚动列表

---

## 已实施的优化

### 1. Web Worker 数据处理

**文件**：`src/workers/data-worker.js`

**问题**：主线程的 `fetch()` + `JSON.parse()` 会阻塞 UI 渲染。

**方案**：

```javascript
// Worker 线程
self.onmessage = async (e) => {
    const response = await fetch(url);
    const data = await response.json(); // 耗时操作在后台完成
    self.postMessage({ data });
};
```

**效果**：
- 主线程数据处理：~122ms
- Web Worker：~19ms
- **提升约 6 倍**

### 2. Canvas 渲染替代 DOM Marker

**文件**：`src/components/CanvasMarkerLayer.jsx`

**问题**：每个 POI 都是一个 `<Marker>` React 组件 + DOM 节点，导致：
- 数千个 DOM 节点创建/销毁
- React 虚拟 DOM Diff 开销
- 浏览器布局/重绘压力

**方案**：

```javascript
// 使用 Leaflet Canvas Renderer
const circleMarker = L.circleMarker([lat, lng], {
    renderer: canvasRenderer  // 所有点共享一个 Canvas
});
```

**效果**：
| 指标 | 优化前 (DOM) | 优化后 (Canvas) |
|------|--------------|-----------------|
| DOM 节点数 | ~3000+ | 1 |
| 渲染耗时 | 800-1500ms | < 50ms |
| 拖动时 FPS | < 10 | 60+ |

### 3. 细粒度事件追踪

**文件**：`src/components/MapView.jsx`

新增追踪事件：
- `zoomstart` / `zoomend`：缩放动画
- `movestart` / `moveend`：拖动事件
- `tileloadstart` / `tileload` / `tileerror`：瓦片加载

---

## 地图瓦片优化

### 当前配置

```javascript
<TileLayer
    url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
/>
```

### 优化策略

#### 1. 启用瓦片预加载

```javascript
<TileLayer
    url="..."
    keepBuffer={4}        // 保留视口外 4 个瓦片的缓冲区
    updateWhenZooming={false}  // 缩放动画期间不更新瓦片
    updateWhenIdle={true}      // 仅在空闲时更新
/>
```

#### 2. 使用更快的瓦片源

| 瓦片源 | 特点 | 适用场景 |
|--------|------|----------|
| CARTO Dark | 美观、CDN 快 | 当前使用 |
| OSM | 默认、稳定 | 备选 |
| Mapbox | 高质量、需 Token | 生产环境 |
| 自托管 | 完全可控 | 离线/内网 |

#### 3. 添加加载状态优化

```javascript
// 在缩放时减少视觉抖动
<TileLayer
    className="smooth-tiles"
    // CSS: .smooth-tiles { transition: opacity 0.3s; }
/>
```

#### 4. 离线缓存（PWA）

```javascript
// 使用 Service Worker 缓存瓦片
// vite-plugin-pwa 配置
workbox: {
    runtimeCaching: [{
        urlPattern: /basemaps\.cartocdn\.com/,
        handler: 'CacheFirst',
        options: {
            cacheName: 'map-tiles',
            expiration: { maxAgeSeconds: 7 * 24 * 60 * 60 }
        }
    }]
}
```

---

## 性能排查流程

当遇到性能问题时，按以下流程排查：

```
开始
  │
  ▼
┌─────────────────┐
│ 查看 FPS 指标   │
└────────┬────────┘
         │
    FPS < 30?
    ╱        ╲
  是          否
   │           │
   ▼           ▼
┌─────────────┐    ┌─────────────┐
│查看 Tiles   │    │ 性能正常    │
│Loading 计数 │    └─────────────┘
└──────┬──────┘
       │
  Tiles > 0 持续?
  ╱           ╲
是             否
 │              │
 ▼              ▼
┌──────────┐  ┌──────────────┐
│ 网络问题  │  │ 查看 Markers │
│ 瓦片加载  │  │ 或 Renders   │
└──────────┘  └───────┬──────┘
                      │
              Markers 很多?
              ╱        ╲
            是          否
             │           │
             ▼           ▼
      ┌───────────┐  ┌───────────┐
      │ 渲染问题   │  │ React 重  │
      │ 考虑 LOD   │  │ 渲染问题  │
      └───────────┘  └───────────┘
```

---

## 基准测试结果

### 测试环境

- **设备**：MacBook Pro M1
- **浏览器**：Chrome 120
- **数据量**：32,231 POI 点

### 测试结果

#### 场景 1：初始加载

| 指标 | 时间 |
|------|------|
| 聚合数据加载 | 76ms |
| 首次渲染完成 | 150ms |

#### 场景 2：放大到详细级别

| 指标 | 优化前 | 优化后 |
|------|--------|--------|
| 数据获取（主线程） | 122ms | - |
| 数据获取（Worker） | - | 19ms |
| Marker 渲染（DOM） | 1200ms | - |
| Marker 渲染（Canvas） | - | 35ms |
| 总延迟 | ~1400ms | ~60ms |

#### 场景 3：高缩放级别拖动

| 指标 | 优化前 | 优化后 |
|------|--------|--------|
| FPS | 5-15 | 60+ |
| 卡顿感知 | 明显 | 无 |

---

## 后续优化方向

1. **矢量瓦片 (MVT)**：使用 Mapbox Vector Tiles 替代 GeoJSON，减少网络传输量
2. **Protobuf 传输**：二进制格式替代 JSON，压缩率更高
3. **空间索引**：使用 R-Tree 优化 BBox 查询
4. **渐进式加载**：先显示中心区域，再加载边缘
5. **LOD（细节层次）**：根据缩放级别动态调整点大小/密度
