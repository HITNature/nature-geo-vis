# Web Worker 优化

> 与 [`性能优化说明.md`](./性能优化说明.md) 配套：本文侧重 **Worker 选型判断**；性能全链路与宣讲材料见性能文档。
>
> **落地状态（当前仓库）**
> - ☑ OffscreenCanvas 渲染 Worker：`render-worker.js` + `OffscreenCanvasLayer`（`?perf` 可切换）
> - ☑ Geometry Worker 能力代码：`geometry-worker.js`（主路径暂由服务端预聚合覆盖，作扩展储备）
> - × 已弃用：在 Worker 中做 `fetch` + `JSON.parse`

## 问题重述

**早期实验尝试失败（已改为其他方案）：**
在 Worker 中做 `fetch()` + `JSON.parse()`，但实际收益很小，因为：
1. `fetch` 本身就是异步的，不会阻塞主线程
2. `JSON.parse()` 虽然是同步的，但对于几 MB 的数据只需几十 ms
3. `postMessage` 的结构化克隆（structured clone）本身有序列化开销

## Web Worker 的工作原理

### 通信开销
```javascript
// 主线程 → Worker
worker.postMessage(data);  // 序列化（structured clone）

// Worker → 主线程  
self.postMessage(result);  // 序列化（structured clone）
```

**结构化克隆的成本：**
- 对于简单数据类型：O(n) 时间复杂度
- 对于复杂对象：需要遍历所有属性
- **无法传递函数、DOM 节点、Symbol**
- 大数据传输可以用 `Transferable Objects`（ArrayBuffer、ImageBitmap）

### 正确的使用场景

| 场景 | 是否适合 Worker | 原因 |
|------|----------------|------|
| 网络请求（fetch） | × **不适合** | fetch 本身就是异步的，不阻塞主线程 |
| JSON 解析 | ⚠️ **收益小** | 除非数据量极大（>10MB），否则通信开销可能抵消收益 |
| **几何计算** | ☑ **非常适合** | CPU 密集型，会阻塞主线程渲染 |
| **空间过滤** | ☑ **非常适合** | 遍历大数组判断 BBox 碰撞 |
| **动态聚类** | ☑ **非常适合** | K-means、DBSCAN 等算法计算量大 |
| **图像处理** | ☑ **非常适合** | 像素级操作，可用 OffscreenCanvas |
| **数据转换** | ☑ **适合** | 大批量格式转换、索引构建 |

## 推荐的优化方案

### 方案 1：几何计算 Worker

```javascript
// ☑ 在 Worker 中做 CPU 密集型的几何计算
worker.postMessage({
    type: 'FILTER_BY_BBOX',
    data: {
        features: allFeatures,  // 传整个数据集（一次性）
        bbox: currentViewport
    }
});

// Worker 端
features.filter(f => pointInBbox(f.geometry.coordinates, bbox));
```

**收益分析：**
- 近 8 万点 × BBox 判断 = 主线程可能卡顿数十至上百 ms
- 放到 Worker 后主线程可以继续渲染动画

### 方案 2：动态聚类 Worker

```javascript
// ☑ 动态聚类（替代服务端预计算）
worker.postMessage({
    type: 'DYNAMIC_CLUSTER',
    data: {
        points: visiblePoints,
        radius: getClusterRadius(zoom),  // 根据缩放级别动态计算
        zoom: currentZoom
    }
});
```

**收益分析：**
- K-means 聚类：O(n²) 复杂度，10,000 点需要 500ms+
- 在 Worker 中计算不会阻塞地图交互

### 方案 3：OffscreenCanvas 渲染 Worker

```javascript
// ☑ 离屏 Canvas 渲染（终极方案）
const offscreen = canvas.transferControlToOffscreen();
worker.postMessage({ canvas: offscreen }, [offscreen]);

// Worker 端
const ctx = offscreen.getContext('2d');
// 在 Worker 中直接绘制，结果自动同步到主线程 Canvas
```

**收益分析：**
- 近 8 万圆形绘制：主线程数百 ms → Worker 渲染主线程接近 0ms
- **真正的零阻塞渲染**

## 优化优先级

### 当前瓶颈排序（从实测数据）

1. **DOM Marker 渲染** ☑ 已用 Canvas 解决（默认路径）
2. **Canvas 绘制阻塞** ☑ 已提供 OffscreenCanvas + Worker（可切换演示）
3. **数据过滤 / 空间查询** ☑ 服务端 R-Tree 已覆盖主路径；客户端 Geometry Worker 作储备
4. **网络/解析** ⚠️ 下一阶段重点（MVT / Protobuf），Worker 收益有限

### 实施顺序与状态

#### Phase 1: OffscreenCanvas ☑ 已落地
```javascript
// src/workers/render-worker.js
self.onmessage = (e) => {
    if (e.data.canvas) {
        const ctx = e.data.canvas.getContext('2d');
        renderPoints(ctx, e.data.points);
    }
};
```

#### Phase 2: 几何计算 ☑ 代码就绪 / 主路径未强制接入
```javascript
// src/workers/geometry-worker.js
// - BBox 过滤
// - 聚类计算
// - 坐标变换
```

#### Phase 3: 增量更新 ⏳ 路线图
```javascript
// 只传输变化的数据，不是每次都传全量
worker.postMessage({
    type: 'UPDATE_VIEWPORT',
    added: newPoints,    // ArrayBuffer
    removed: oldIds      // Uint32Array
}, [newPoints.buffer]);
```

## 路径对比（实测 / 预估）

| 方案 | FPS (1000 points) | FPS (10000 points) | 主线程占用 | 状态 |
|------|-------------------|-------------------|-----------|------|
| DOM Marker | &lt; 10 | 不可用 | 极高 | 已淘汰 |
| Canvas（默认） | 60 | 30–40 | 中高 | ☑ 生产默认 |
| + OffscreenCanvas | 60 | 60 | 低 | ☑ 可切换 |
| + Geometry Worker | 60 | 50–55 | 中 | 储备 |

## 代码示例：OffscreenCanvas

```javascript
// MapView.jsx
useEffect(() => {
    const canvas = canvasRef.current;
    const offscreen = canvas.transferControlToOffscreen();
    
    const worker = new Worker(
        new URL('../workers/render-worker.js', import.meta.url),
        { type: 'module' }
    );
    
    worker.postMessage({
        type: 'INIT',
        canvas: offscreen,
        dpr: window.devicePixelRatio
    }, [offscreen]);
    
    // 后续只需要传数据，不需要传 Canvas
    worker.postMessage({
        type: 'RENDER',
        points: pois.features.map(f => ({
            x: latLngToPixel(f.geometry.coordinates).x,
            y: latLngToPixel(f.geometry.coordinates).y
        }))
    });
    
}, [pois]);
```

## 总结

**核心原则：**
1. Worker 适合 CPU 密集型任务，不适合 I/O 密集型
2. 数据传输有序列化成本，考虑用 `Transferable Objects`
3. 优先优化主线程瓶颈（测量后决定）

**本项目最佳实践：**
1. 默认使用 Canvas 渲染（主路径稳定、兼容性好）
2. 高密度场景用 OffscreenCanvas Worker（PERF 面板可切换对比）
3. 动态聚类 / 客户端几何运算需要时再挂 Geometry Worker
4. **不要**把 `fetch` + `JSON.parse` 塞进 Worker（收益不明显，已弃用）
