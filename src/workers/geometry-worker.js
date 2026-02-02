/**
 * Geometry Worker - 处理计算密集型的几何和渲染任务
 * 
 * 真正适合在 Worker 中做的事情：
 * 1. 大量点位的空间过滤（BBox 碰撞检测）
 * 2. 聚类计算（动态聚类而非预计算）
 * 3. 屏幕坐标投影计算
 * 4. 数据格式转换和预处理
 */

// 简化的 BBox 碰撞检测
function pointInBbox(point, bbox) {
    const [lng, lat] = point;
    const [west, south, east, north] = bbox;
    return lng >= west && lng <= east && lat >= south && lat <= north;
}

// 计算两点距离（用于聚类）
function distance(p1, p2) {
    const dx = p1[0] - p2[0];
    const dy = p1[1] - p2[1];
    return Math.sqrt(dx * dx + dy * dy);
}

// 动态聚类算法（简化版 K-means）
function clusterPoints(points, radius) {
    const clusters = [];
    const used = new Set();

    points.forEach((point, idx) => {
        if (used.has(idx)) return;

        const cluster = {
            center: point.coordinates,
            points: [point],
            count: 1
        };

        // 查找附近的点
        points.forEach((other, otherIdx) => {
            if (used.has(otherIdx) || idx === otherIdx) return;
            if (distance(point.coordinates, other.coordinates) < radius) {
                cluster.points.push(other);
                cluster.count++;
                used.add(otherIdx);
            }
        });

        clusters.push(cluster);
        used.add(idx);
    });

    return clusters;
}

// 批量坐标转换（如果需要投影变换）
function transformCoordinates(features, projection) {
    return features.map(f => ({
        ...f,
        screenCoords: projectToScreen(f.geometry.coordinates, projection)
    }));
}

function projectToScreen(coords, params) {
    // 这里可以做复杂的投影计算
    // 例如：墨卡托投影、Lambert投影等
    // 这些计算是 CPU 密集型的，适合在 Worker 中做
    return coords; // 简化版
}

self.onmessage = async (e) => {
    const { type, data, requestId } = e.data;
    const start = performance.now();

    try {
        switch (type) {
            case 'FILTER_BY_BBOX': {
                // 在 Worker 中过滤数据，避免主线程遍历大数组
                const { features, bbox } = data;
                const filtered = features.filter(f =>
                    pointInBbox(f.geometry.coordinates, bbox)
                );

                self.postMessage({
                    type: 'FILTER_COMPLETE',
                    data: filtered,
                    requestId,
                    duration: performance.now() - start,
                    count: filtered.length
                });
                break;
            }

            case 'DYNAMIC_CLUSTER': {
                // 动态聚类计算（CPU 密集型）
                const { points, radius, zoom } = data;
                const clusters = clusterPoints(points, radius);

                self.postMessage({
                    type: 'CLUSTER_COMPLETE',
                    data: clusters,
                    requestId,
                    duration: performance.now() - start
                });
                break;
            }

            case 'TRANSFORM_COORDINATES': {
                // 批量坐标变换（CPU 密集型）
                const { features, projection } = data;
                const transformed = transformCoordinates(features, projection);

                self.postMessage({
                    type: 'TRANSFORM_COMPLETE',
                    data: transformed,
                    requestId,
                    duration: performance.now() - start
                });
                break;
            }

            case 'PREPROCESS_DATA': {
                // 复杂的数据预处理
                const { rawData } = data;

                // 1. 格式转换
                // 2. 索引构建
                // 3. 统计计算
                const processed = rawData.features.map(f => ({
                    id: f.properties.id,
                    coords: f.geometry.coordinates,
                    props: f.properties,
                    // 预计算一些派生数据
                    bbox: calculateBBox(f.geometry),
                    area: calculateArea(f.geometry)
                }));

                self.postMessage({
                    type: 'PREPROCESS_COMPLETE',
                    data: processed,
                    requestId,
                    duration: performance.now() - start
                });
                break;
            }

            default:
                throw new Error(`Unknown task type: ${type}`);
        }
    } catch (error) {
        self.postMessage({
            type: 'ERROR',
            error: error.message,
            requestId
        });
    }
};

function calculateBBox(geometry) {
    // 计算几何体的边界框
    if (geometry.type === 'Point') {
        const [lng, lat] = geometry.coordinates;
        return [lng, lat, lng, lat];
    }
    // ... 其他几何类型
    return [0, 0, 0, 0];
}

function calculateArea(geometry) {
    // 计算几何体面积（简化版）
    return 0;
}

// 空间索引（R-tree 简化版）
class SpatialIndex {
    constructor() {
        this.items = [];
    }

    insert(item, bbox) {
        this.items.push({ item, bbox });
    }

    query(bbox) {
        return this.items.filter(({ bbox: itemBbox }) =>
            this.bboxIntersects(bbox, itemBbox)
        );
    }

    bboxIntersects(a, b) {
        return !(a[2] < b[0] || a[0] > b[2] || a[3] < b[1] || a[1] > b[3]);
    }
}
