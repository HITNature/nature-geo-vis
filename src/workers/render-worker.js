/**
 * OffscreenCanvas Render Worker
 * 在 Worker 线程中执行所有 Canvas 绘制操作，实现零卡顿渲染
 */

let canvas = null;
let ctx = null;
let dpr = 1;
let canvasWidth = 0;
let canvasHeight = 0;

// 渲染配置
const MARKER_RADIUS = 6;
const MARKER_FILL = '#f59e0b';
const MARKER_STROKE = '#ffffff';
const MARKER_STROKE_WIDTH = 1.5;

console.log('[RenderWorker] Worker initialized');

self.onmessage = (e) => {
    const { type, ...data } = e.data;
    console.log('[RenderWorker] Received message:', type, data);

    switch (type) {
        case 'INIT':
            // 初始化 OffscreenCanvas
            canvas = data.canvas;
            ctx = canvas.getContext('2d');
            dpr = data.dpr || 1;

            console.log('[RenderWorker] Canvas initialized:', {
                width: canvas.width,
                height: canvas.height,
                dpr
            });

            self.postMessage({ type: 'INIT_COMPLETE' });
            break;

        case 'RESIZE':
            // 调整画布尺寸
            if (canvas && ctx) {
                canvasWidth = data.width;
                canvasHeight = data.height;
                canvas.width = data.width * dpr;
                canvas.height = data.height * dpr;

                // 重新设置缩放（每次改变尺寸都需要重新设置）
                ctx.setTransform(1, 0, 0, 1, 0, 0); // 重置变换
                ctx.scale(dpr, dpr); // 应用 DPI 缩放

                console.log('[RenderWorker] Canvas resized:', {
                    cssWidth: canvasWidth,
                    cssHeight: canvasHeight,
                    physicalWidth: canvas.width,
                    physicalHeight: canvas.height,
                    dpr
                });
            }
            break;

        case 'RENDER':
            // 渲染点位
            if (!ctx) {
                console.error('[RenderWorker] Context not initialized!');
                return;
            }

            const start = performance.now();
            const { points, width, height } = data;

            console.log('[RenderWorker] Starting render:', {
                pointCount: points.length,
                viewportWidth: width,
                viewportHeight: height,
                canvasWidth: canvas.width,
                canvasHeight: canvas.height
            });

            // 清空画布（使用CSS像素，因为我们已经应用了DPI缩放）
            ctx.clearRect(0, 0, width, height);

            if (points.length === 0) {
                console.log('[RenderWorker] No points to render');
                self.postMessage({
                    type: 'RENDER_COMPLETE',
                    pointCount: 0,
                    duration: 0
                });
                return;
            }

            // 批量绘制所有点
            ctx.fillStyle = MARKER_FILL;
            ctx.strokeStyle = MARKER_STROKE;
            ctx.lineWidth = MARKER_STROKE_WIDTH;
            ctx.globalAlpha = 0.85;

            // 使用 Path2D 批量绘制提升性能
            const path = new Path2D();

            for (let i = 0; i < points.length; i++) {
                const { x, y } = points[i];
                // 记录前几个点的坐标用于调试
                if (i < 3) {
                    console.log(`[RenderWorker] Point ${i}:`, { x, y });
                }
                path.moveTo(x + MARKER_RADIUS, y);
                path.arc(x, y, MARKER_RADIUS, 0, Math.PI * 2);
            }

            ctx.fill(path);
            ctx.stroke(path);

            const duration = performance.now() - start;

            console.log('[RenderWorker] Render complete:', {
                pointCount: points.length,
                duration: duration.toFixed(2)
            });

            self.postMessage({
                type: 'RENDER_COMPLETE',
                pointCount: points.length,
                duration: duration.toFixed(2)
            });
            break;

        case 'CLEAR':
            if (ctx && canvas) {
                ctx.clearRect(0, 0, canvasWidth || canvas.width / dpr, canvasHeight || canvas.height / dpr);
                console.log('[RenderWorker] Canvas cleared');
            }
            break;

        default:
            console.warn('[RenderWorker] Unknown message type:', type);
    }
};
