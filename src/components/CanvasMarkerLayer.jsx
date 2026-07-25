import { useEffect, useRef, useMemo } from 'react';
import { useMap } from 'react-leaflet';
import L from 'leaflet';
import { perf } from '../utils/perf';

/**
 * Canvas-based POI renderer for high performance with thousands of points.
 * Replaces DOM markers with a single Canvas layer, eliminating DOM explosion.
 */
function CanvasMarkerLayer({ pois, onPOIClick, visible }) {
    const map = useMap();
    const canvasLayerRef = useRef(null);
    const markersDataRef = useRef([]);

    // POI 颜色：初中橙/紫，小学天蓝/青
    const JS_INCREASE = '#f59e0b';
    const JS_DECREASE = '#c084fc';
    const PS_INCREASE = '#38bdf8';
    const PS_DECREASE = '#22d3ee';

    // Precompute marker positions
    const markerPositions = useMemo(() => {
        if (!pois?.features) return [];
        return pois.features.map(feature => {
            const [lng, lat] = feature.geometry.coordinates;
            const change = feature.properties?.survive_pop_change;
            const isPs = feature.properties?.poi_type === 'PS';
            const isIncrease = change !== null && change !== undefined && change >= 0;
            return {
                lat,
                lng,
                feature,
                isIncrease,
                color: isPs
                    ? (isIncrease ? PS_INCREASE : PS_DECREASE)
                    : (isIncrease ? JS_INCREASE : JS_DECREASE),
            };
        });
    }, [pois]);

    useEffect(() => {
        if (!map) return;

        const endMeasure = perf.startMeasure('Canvas Layer Init');

        // Create canvas layer if not exists
        if (!canvasLayerRef.current) {
            const CanvasLayer = L.Canvas.extend({
                _updateCircle: function (layer) {
                    if (!this._drawing || layer._empty()) { return; }
                    const p = layer._point;
                    const ctx = this._ctx;
                    const r = Math.max(Math.round(layer._radius), 1);
                    const s = (Math.max(Math.round(layer._radiusY), 1) || r) / r;

                    if (s !== 1) {
                        ctx.save();
                        ctx.scale(1, s);
                    }

                    ctx.beginPath();
                    ctx.arc(p.x, p.y / s, r, 0, Math.PI * 2, false);

                    if (s !== 1) {
                        ctx.restore();
                    }

                    this._fillStroke(ctx, layer);
                }
            });

            // 使用markerPane确保POI在最上层
            canvasLayerRef.current = new CanvasLayer({ pane: 'markerPane' });
            map.addLayer(canvasLayerRef.current);
        }

        // Clear existing markers
        markersDataRef.current.forEach(marker => {
            if (map.hasLayer(marker)) {
                map.removeLayer(marker);
            }
        });
        markersDataRef.current = [];

        // Only create markers if visible
        if (!visible) {
            endMeasure();
            perf.setCount('Canvas Markers', 0);
            return;
        }

        // Create circle markers (rendered on canvas, not DOM)
        const endRender = perf.startMeasure('Canvas Marker Render');

        markerPositions.forEach(({ lat, lng, feature, isIncrease }) => {
            const fillColor = isIncrease ? POI_COLOR_INCREASE : POI_COLOR_DECREASE;
            const circleMarker = L.circleMarker([lat, lng], {
                radius: 6,
                fillColor,
                fillOpacity: 0.8,
                color: '#ffffff',
                weight: 1.5,
                renderer: canvasLayerRef.current
            });

            circleMarker.on('click', () => {
                if (onPOIClick) {
                    onPOIClick(feature);
                }
            });

            // Add tooltip on hover instead of always-present popup
            circleMarker.bindTooltip(feature.properties.name, {
                permanent: false,
                direction: 'top',
                className: 'poi-tooltip'
            });

            circleMarker.addTo(map);
            markersDataRef.current.push(circleMarker);
        });

        endRender();
        endMeasure();
        perf.setCount('Canvas Markers', markerPositions.length);

        return () => {
            // Cleanup on unmount or when pois change
            markersDataRef.current.forEach(marker => {
                if (map.hasLayer(marker)) {
                    map.removeLayer(marker);
                }
            });
            markersDataRef.current = [];
        };
    }, [map, markerPositions, visible, onPOIClick]);

    // Cleanup canvas layer on unmount
    useEffect(() => {
        return () => {
            if (canvasLayerRef.current && map) {
                map.removeLayer(canvasLayerRef.current);
            }
        };
    }, [map]);

    return null;
}

export default CanvasMarkerLayer;
