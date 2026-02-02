import { useEffect, useRef, useMemo, useCallback } from 'react';
import { useMap } from 'react-leaflet';
import { perf } from '../utils/perf';

/**
 * OffscreenCanvas-based POI renderer
 * 
 * 优化原理：
 * 1. 使用 OffscreenCanvas.transferControlToOffscreen() 将 Canvas 控制权转移给 Worker
 * 2. 所有绑制操作在 Worker 线程执行，主线程零阻塞
 * 3. 浏览器自动将 Worker 的渲染结果同步到屏幕
 * 
 * 注意：OffscreenCanvas 需要现代浏览器支持（Chrome 69+, Firefox 105+）
 */
function OffscreenCanvasLayer({ pois, onPOIClick, visible }) {
    const map = useMap();
    const canvasRef = useRef(null);
    const workerRef = useRef(null);
    const overlayRef = useRef(null);
    const isInitializedRef = useRef(false);

    // 预计算屏幕坐标
    const screenPoints = useMemo(() => {
        if (!pois?.features || !map || !visible) return [];

        const endMeasure = perf.startMeasure('Coord Transform');
        const points = pois.features.map(feature => {
            const [lng, lat] = feature.geometry.coordinates;
            const point = map.latLngToContainerPoint([lat, lng]);
            return {
                x: point.x,
                y: point.y,
                feature
            };
        });
        endMeasure();
        perf.setCount('Points Transformed', points.length);

        console.log('[OffscreenCanvas] Transformed coordinates:', {
            totalPoints: points.length,
            firstPoint: points[0],
            samplePoint: points[Math.floor(points.length / 2)]
        });

        return points;
    }, [pois, map, visible]);

    // 初始化 Worker 和 OffscreenCanvas
    useEffect(() => {
        if (!map) return;

        // 检查浏览器是否支持 OffscreenCanvas
        if (typeof OffscreenCanvas === 'undefined') {
            console.warn('OffscreenCanvas not supported, falling back to main thread rendering');
            return;
        }

        // 获取地图容器尺寸
        const container = map.getContainer();
        const { width, height } = container.getBoundingClientRect();

        // 创建 Canvas 元素
        if (!canvasRef.current) {
            const canvas = document.createElement('canvas');
            canvas.width = width * window.devicePixelRatio;
            canvas.height = height * window.devicePixelRatio;
            canvas.style.cssText = `
                position: absolute;
                top: 0;
                left: 0;
                width: ${width}px;
                height: ${height}px;
                pointer-events: auto;
                z-index: 650;
            `;

            // 添加到标记层，确保在所有覆盖层之上
            const pane = map.getPane('markerPane');
            if (pane) {
                pane.appendChild(canvas);
                canvasRef.current = canvas;
            }
        }

        // 创建 Worker 并转移 Canvas 控制权
        if (!workerRef.current && canvasRef.current) {
            try {
                console.log('[OffscreenCanvas] Creating worker and transferring control...');
                const offscreen = canvasRef.current.transferControlToOffscreen();
                const worker = new Worker(
                    new URL('../workers/render-worker.js', import.meta.url),
                    { type: 'module' }
                );

                worker.onmessage = (e) => {
                    console.log('[OffscreenCanvas] Worker message:', e.data);
                    if (e.data.type === 'RENDER_COMPLETE') {
                        perf.setCount('Offscreen Markers', e.data.pointCount);
                        perf.addHistory(`Worker rendered ${e.data.pointCount} points in ${e.data.duration}ms`);
                    } else if (e.data.type === 'INIT_COMPLETE') {
                        console.log('[OffscreenCanvas] Worker initialized, sending RESIZE');
                        // 发送初始尺寸
                        worker.postMessage({
                            type: 'RESIZE',
                            width,
                            height
                        });
                    }
                };

                worker.onerror = (err) => {
                    console.error('[OffscreenCanvas] Worker error:', err);
                };

                console.log('[OffscreenCanvas] Sending INIT with canvas:', {
                    width: canvasRef.current.width,
                    height: canvasRef.current.height,
                    dpr: window.devicePixelRatio
                });

                worker.postMessage({
                    type: 'INIT',
                    canvas: offscreen,
                    dpr: window.devicePixelRatio
                }, [offscreen]);

                workerRef.current = worker;
                isInitializedRef.current = true;
                perf.addHistory('OffscreenCanvas Worker initialized');
            } catch (err) {
                console.error('Failed to create OffscreenCanvas:', err);
            }
        }

        return () => {
            if (workerRef.current) {
                workerRef.current.terminate();
                workerRef.current = null;
            }
            if (canvasRef.current && canvasRef.current.parentNode) {
                canvasRef.current.parentNode.removeChild(canvasRef.current);
                canvasRef.current = null;
            }
            isInitializedRef.current = false;
        };
    }, [map]);

    // 发送渲染指令到 Worker
    useEffect(() => {
        if (!workerRef.current || !isInitializedRef.current) {
            console.log('[OffscreenCanvas] Worker not ready:', {
                hasWorker: !!workerRef.current,
                isInitialized: isInitializedRef.current
            });
            return;
        }

        const container = map.getContainer();
        const { width, height } = container.getBoundingClientRect();

        // 如果不可见，清空画布
        if (!visible) {
            console.log('[OffscreenCanvas] Layer hidden, sending CLEAR command');
            workerRef.current.postMessage({
                type: 'CLEAR',
                width,
                height
            });
            return;
        }

        // 即使没有点，也要清空画布
        if (screenPoints.length === 0) {
            console.log('[OffscreenCanvas] No points, sending CLEAR command');
            workerRef.current.postMessage({
                type: 'CLEAR',
                width,
                height
            });
            return;
        }

        const renderData = {
            type: 'RENDER',
            points: screenPoints.map(({ x, y }) => ({ x, y })),
            width,
            height
        };

        console.log('[OffscreenCanvas] Sending RENDER command:', {
            pointCount: renderData.points.length,
            width,
            height,
            firstPoint: renderData.points[0]
        });

        const endMeasure = perf.startMeasure('Worker Render Request');
        workerRef.current.postMessage(renderData);
        endMeasure();

    }, [screenPoints, map, visible]);

    // 监听地图移动，更新坐标并重新渲染
    useEffect(() => {
        if (!map || !visible) return;

        const handleMoveEnd = () => {
            if (!workerRef.current || !pois?.features) return;

            const container = map.getContainer();
            const { width, height } = container.getBoundingClientRect();

            // 重新计算屏幕坐标
            const points = pois.features.map(feature => {
                const [lng, lat] = feature.geometry.coordinates;
                const point = map.latLngToContainerPoint([lat, lng]);
                return { x: point.x, y: point.y };
            });

            workerRef.current.postMessage({
                type: 'RENDER',
                points,
                width,
                height
            });
        };

        map.on('moveend', handleMoveEnd);
        map.on('zoomend', handleMoveEnd);

        return () => {
            map.off('moveend', handleMoveEnd);
            map.off('zoomend', handleMoveEnd);
        };
    }, [map, pois, visible]);

    // 处理点击事件（在主线程，因为需要 DOM 事件）
    const handleCanvasClick = useCallback((e) => {
        if (!onPOIClick || screenPoints.length === 0) return;

        const rect = canvasRef.current?.getBoundingClientRect();
        if (!rect) return;

        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        const hitRadius = 10; // 点击容差

        // 查找被点击的点
        for (const point of screenPoints) {
            const dx = point.x - x;
            const dy = point.y - y;
            if (dx * dx + dy * dy < hitRadius * hitRadius) {
                onPOIClick(point.feature);
                break;
            }
        }
    }, [screenPoints, onPOIClick]);

    // 绑定点击事件到 Canvas
    useEffect(() => {
        if (canvasRef.current) {
            canvasRef.current.style.pointerEvents = 'auto';
            canvasRef.current.addEventListener('click', handleCanvasClick);
            return () => {
                if (canvasRef.current) {
                    canvasRef.current.removeEventListener('click', handleCanvasClick);
                }
            };
        }
    }, [handleCanvasClick]);

    return null;
}

export default OffscreenCanvasLayer;
