import { useState, useCallback, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMapEvents, ZoomControl, GeoJSON } from 'react-leaflet';
import L from 'leaflet';
import MarkerClusterGroup from 'react-leaflet-cluster';
import { perf } from '../utils/perf';
import { apiFetch } from '../utils/api';
import CanvasMarkerLayer from './CanvasMarkerLayer';
import OffscreenCanvasLayer from './OffscreenCanvasLayer';
import 'leaflet/dist/leaflet.css';
import 'leaflet.markercluster/dist/MarkerCluster.css';
import 'leaflet.markercluster/dist/MarkerCluster.Default.css';

// 修复 Leaflet 默认图标问题
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// 自定义 POI 图标
const poiIcon = new L.Icon({
    iconUrl: 'data:image/svg+xml;base64,' + btoa(`
        <svg width="24" height="24" xmlns="http://www.w3.org/2000/svg">
            <circle cx="12" cy="12" r="8" fill="#f59e0b" opacity="0.8" stroke="#fff" stroke-width="2"/>
        </svg>
    `),
    iconSize: [24, 24],
    iconAnchor: [12, 12],
    popupAnchor: [0, -12],
});

// 边界线样式
const boundaryStyle = {
    color: '#ff6b6b',
    weight: 2,
    opacity: 0.8,
    dashArray: '5, 5'
};

// 行政区划样式
const cityStyle = (feature) => ({
    color: '#4ecdc4',
    weight: 1,
    fillColor: '#4ecdc4',
    fillOpacity: 0.1,
    opacity: 0.6
});

// 网格样式
const cellStyle = (feature) => {
    // 根据人口变化显示不同颜色
    const change = feature.properties?.wpop_change || 0;
    let fillColor = '#888888';
    if (change > 500) fillColor = '#22c55e';      // 增长大
    else if (change > 0) fillColor = '#84cc16';   // 小幅增长
    else if (change > -500) fillColor = '#f59e0b'; // 小幅减少
    else fillColor = '#ef4444';                    // 大幅减少

    return {
        color: '#ffffff',
        weight: 0.5,
        fillColor: fillColor,
        fillOpacity: 0.4,
        opacity: 0.3
    };
};

// 地图事件处理组件
function MapEvents({ onZoomChange, onMoveEnd, onLoadingChange, selectedFeature }) {
    const map = useMapEvents({
        zoomstart: () => {
            perf.addHistory('Zoom animation started');
            perf.startMeasure('Zoom Animation')();
        },
        zoomend: () => {
            onZoomChange(map.getZoom());
            perf.addHistory(`Zoom ended at level ${map.getZoom()}`);
        },
        movestart: () => {
            perf.addHistory('Map move started');
        },
        moveend: () => {
            const bounds = map.getBounds();
            const bbox = [
                bounds.getWest(),
                bounds.getSouth(),
                bounds.getEast(),
                bounds.getNorth(),
            ].join(',');
            onMoveEnd(bbox, map.getZoom());
        },
        tileloadstart: () => {
            onLoadingChange(true);
            perf.setCount('Tiles Loading', (perf.getMetrics().counts['Tiles Loading'] || 0) + 1);
        },
        tileload: () => {
            const loading = (perf.getMetrics().counts['Tiles Loading'] || 1) - 1;
            perf.setCount('Tiles Loading', Math.max(0, loading));
            if (loading <= 0) {
                onLoadingChange(false);
            }
        },
        tileerror: () => {
            perf.addHistory('Tile load error!');
        }
    });

    // 当详情面板关闭时（selectedFeature 变为 null），关闭地图上的气泡
    useEffect(() => {
        if (!selectedFeature) {
            map.closePopup();
        }
    }, [selectedFeature, map]);

    return null;
}

function MapView({
    config,
    selectedFeature,
    useOffscreen = false,
    onPOIClick,
    onPopupClose,
    onZoomChange,
    onLoadingChange,
    showGrid = true,
    showPOI = true
}) {
    const [pois, setPois] = useState(null);
    const [boundaries, setBoundaries] = useState(null);
    const [cities, setCities] = useState(null);
    const [cells, setCells] = useState(null);
    const [selectedCell, setSelectedCell] = useState(null);

    const [aggregatedData, setAggregatedData] = useState({
        province: null,
        city: null,
        district: null
    });
    const [currentZoom, setCurrentZoom] = useState(5);
    const [isDataLoading, setIsDataLoading] = useState(false);
    const [isMapLoading, setIsMapLoading] = useState(false);

    // Sync combined loading state to parent
    useEffect(() => {
        onLoadingChange(isDataLoading || isMapLoading);
    }, [isDataLoading, isMapLoading, onLoadingChange]);

    // 加载静态图层数据（国境线和行政区划）
    useEffect(() => {
        // 加载国境线
        apiFetch('/api/boundaries')
            .then(res => res.json())
            .then(data => {
                if (data.features && data.features.length > 0) {
                    setBoundaries(data);
                    console.log(`Loaded ${data.features.length} boundary lines`);
                }
            })
            .catch(err => console.error('Failed to load boundaries:', err));

        // 加载行政区划
        apiFetch('/api/cities')
            .then(res => res.json())
            .then(data => {
                if (data.features && data.features.length > 0) {
                    setCities(data);
                    console.log(`Loaded ${data.features.length} city areas`);
                }
            })
            .catch(err => console.error('Failed to load cities:', err));
    }, []);

    // 加载所有级别的聚合数据
    useEffect(() => {
        setIsDataLoading(true);
        const endMeasure = perf.startMeasure('Load Aggr Data');
        const levels = ['province', 'city', 'district'];
        Promise.all(levels.map(level =>
            apiFetch(`/api/pois/aggregated?level=${level}`).then(res => res.json())
        ))
            .then(([province, city, district]) => {
                setAggregatedData({ province, city, district });
                setIsDataLoading(false);
                endMeasure();
            })
            .catch(err => {
                console.error('Failed to load aggregated POIs:', err);
                setIsDataLoading(false);
                endMeasure();
            });
    }, []);

    // 视口变化时加载详细数据
    const handleMoveEnd = useCallback((bbox, zoom) => {
        setCurrentZoom(zoom);

        // 加载网格数据（当缩放级别足够高时）
        if (config && zoom >= config.zoomConfig.showCells) {
            const endMeasureCells = perf.startMeasure('Fetch Cells');
            apiFetch(`/api/cells?bbox=${bbox}&zoom=${zoom}`)
                .then(res => res.json())
                .then(data => {
                    setCells(data);
                    endMeasureCells();
                    perf.setCount('Cells', data.features?.length || 0);
                })
                .catch(err => {
                    console.error('Failed to load cells:', err);
                    endMeasureCells();
                });
        } else {
            setCells(null);
            perf.setCount('Cells', 0);
        }

        // 加载详细 POI 数据
        if (config && zoom >= config.zoomConfig.poiLevels.detail) {
            setIsDataLoading(true);
            const endMeasure = perf.startMeasure('Fetch Detailed POIs');
            const url = `/api/pois?bbox=${bbox}&zoom=${zoom}`;

            apiFetch(url)
                .then(res => res.json())
                .then(data => {
                    setPois(data);
                    setIsDataLoading(false);
                    endMeasure();
                    perf.setCount('Markers (Detail)', data.features?.length || 0);
                })
                .catch(err => {
                    console.error('Failed to load POIs:', err);
                    setIsDataLoading(false);
                    endMeasure();
                });
        } else {
            setPois(null);
            perf.setCount('Markers (Detail)', 0);
        }
    }, [config]);

    const handleZoomChange = useCallback((zoom) => {
        onZoomChange(zoom);
        setCurrentZoom(zoom);
    }, [onZoomChange]);

    // 自定义聚合图标
    const createClusterIcon = (name, count, level) => {
        const size = Math.min(80, 40 + Math.log10(count) * 10);
        let color = '#f59e0b'; // Default city (orange)
        let zoomTo = 10;

        if (level === 'province') {
            color = '#3b82f6'; // Blue
            zoomTo = config?.zoomConfig.poiLevels.city || 6;
        } else if (level === 'district') {
            color = '#10b981'; // Green
            zoomTo = config?.zoomConfig.poiLevels.detail || 12;
        } else {
            zoomTo = config?.zoomConfig.poiLevels.district || 9;
        }

        return new L.DivIcon({
            html: `
                <div class="city-cluster-marker cluster-${level}" style="width: ${size}px; height: ${size}px; background-color: ${color}33;">
                    <div class="cluster-content">
                        <span class="city-name">${name}</span>
                        <span class="city-count">${count}</span>
                    </div>
                </div>
            `,
            className: 'custom-city-cluster',
            iconSize: [size, size],
            iconAnchor: [size / 2, size / 2],
        });
    };

    // 确定当前应该显示的级别
    let currentLevel = null;
    if (config) {
        const { poiLevels } = config.zoomConfig;
        if (currentZoom >= poiLevels.detail) currentLevel = 'detail';
        else if (currentZoom >= poiLevels.district) currentLevel = 'district';
        else if (currentZoom >= poiLevels.city) currentLevel = 'city';
        else currentLevel = 'province';
    }

    const showDetailedPOIs = currentLevel === 'detail';
    const clusterFeatures = currentLevel && currentLevel !== 'detail' ? aggregatedData[currentLevel]?.features : [];

    // Track render count
    useEffect(() => {
        const renderCount = (perf.getMetrics().counts['React Renders'] || 0) + 1;
        perf.setCount('React Renders', renderCount);
    });

    useEffect(() => {
        if (!showDetailedPOIs) {
            perf.setCount('Cluster Nodes', clusterFeatures?.length || 0);
        } else {
            perf.setCount('Cluster Nodes', 0);
        }
    }, [clusterFeatures, showDetailedPOIs]);

    // Track marker render timing
    useEffect(() => {
        if (showDetailedPOIs && pois?.features?.length > 0) {
            perf.addHistory(`Rendering ${pois.features.length} DOM markers...`);
            const endMeasure = perf.startMeasure('DOM Marker Render');
            // The actual render happens after this effect, so we use requestAnimationFrame
            requestAnimationFrame(() => {
                requestAnimationFrame(() => {
                    endMeasure();
                });
            });
        }
    }, [pois, showDetailedPOIs]);

    return (
        <MapContainer
            center={[35.8, 104.1]} // 中国中心
            zoom={5}
            style={{ width: '100%', height: '100%' }}
            zoomControl={false}
            whenReady={() => setIsMapLoading(false)}
        >
            <ZoomControl position="bottomright" />
            <TileLayer
                attribution='&copy; <a href="https://carto.com/">CARTO</a>'
                url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
                // Performance optimizations
                keepBuffer={4}              // Keep 4 tiles outside viewport in memory
                updateWhenZooming={false}   // Don't update during zoom animation
                updateWhenIdle={true}       // Only update when map is idle
                maxNativeZoom={18}          // Max zoom level of tiles
                maxZoom={20}                // Allow zooming beyond native
                tileSize={256}              // Standard tile size
                crossOrigin="anonymous"     // Enable CORS for caching
                eventHandlers={{
                    loading: () => setIsMapLoading(true),
                    load: () => setIsMapLoading(false),
                }}
            />

            <MapEvents
                onZoomChange={handleZoomChange}
                onMoveEnd={handleMoveEnd}
                onLoadingChange={setIsMapLoading}
                selectedFeature={selectedFeature}
            />

            {/* 静态图层：行政区划边界 */}
            {cities && (
                <GeoJSON
                    key="cities-layer"
                    data={cities}
                    style={cityStyle}
                    onEachFeature={(feature, layer) => {
                        const props = feature.properties;
                        const name = props.city || props.City_name_CN || props.name || '未知区域';
                        layer.on({
                            mouseover: (e) => {
                                e.target.setStyle({ fillOpacity: 0.3, weight: 2 });
                            },
                            mouseout: (e) => {
                                e.target.setStyle(cityStyle(feature));
                            }
                        });
                        layer.bindTooltip(name, { sticky: true, className: 'city-tooltip' });
                    }}
                />
            )}

            {/* 静态图层：国境线 */}
            {boundaries && (
                <GeoJSON
                    key="boundaries-layer"
                    data={boundaries}
                    style={boundaryStyle}
                />
            )}

            {/* 动态图层：网格数据 */}
            {showGrid && cells && cells.features && cells.features.length > 0 && (
                <GeoJSON
                    key={`cells-${currentZoom}-${cells.features.length}`}
                    data={cells}
                    style={cellStyle}
                    onEachFeature={(feature, layer) => {
                        const props = feature.properties;
                        layer.on({
                            mouseover: (e) => {
                                e.target.setStyle({ fillOpacity: 0.6, weight: 1 });
                            },
                            mouseout: (e) => {
                                e.target.setStyle(cellStyle(feature));
                            },
                            click: () => {
                                setSelectedCell(feature);
                            }
                        });
                    }}
                />
            )}

            {/* 网格详情弹窗 */}
            {selectedCell && (
                <Popup
                    position={[
                        selectedCell.geometry.coordinates[0].reduce((sum, c) => sum + c[1], 0) / selectedCell.geometry.coordinates[0].length,
                        selectedCell.geometry.coordinates[0].reduce((sum, c) => sum + c[0], 0) / selectedCell.geometry.coordinates[0].length
                    ]}
                    eventHandlers={{
                        remove: () => setSelectedCell(null)
                    }}
                >
                    <div className="cell-popup">
                        <h4>{selectedCell.properties.city || '网格'} - {selectedCell.properties.country || ''}</h4>
                        <div className="cell-stats">
                            <div className="stat-row">
                                <span>人口变化:</span>
                                <span className={selectedCell.properties.wpop_change > 0 ? 'positive' : 'negative'}>
                                    {selectedCell.properties.wpop_change?.toFixed(1) || 'N/A'}
                                </span>
                            </div>
                            <div className="stat-row">
                                <span>小学(2010→2020):</span>
                                <span>{selectedCell.properties.PS_2010_count} → {selectedCell.properties.PS_2020_count}</span>
                            </div>
                            <div className="stat-row">
                                <span>初中(2010→2020):</span>
                                <span>{selectedCell.properties.JS_2010_count} → {selectedCell.properties.JS_2020_count}</span>
                            </div>
                            <div className="stat-row">
                                <span>小学教育距离变化:</span>
                                <span className={selectedCell.properties.ED_PS_change < 0 ? 'positive' : 'negative'}>
                                    {selectedCell.properties.ED_PS_change?.toFixed(1) || 'N/A'}m
                                </span>
                            </div>
                            <div className="stat-row">
                                <span>初中教育距离变化:</span>
                                <span className={selectedCell.properties.ED_JS_change < 0 ? 'positive' : 'negative'}>
                                    {selectedCell.properties.ED_JS_change?.toFixed(1) || 'N/A'}m
                                </span>
                            </div>
                        </div>
                    </div>
                </Popup>
            )}

            {/* 模式 1: 行政聚合显示 */}
            {!showDetailedPOIs && clusterFeatures.map((feature, idx) => {
                const [lng, lat] = feature.geometry.coordinates;
                const { name, count, level } = feature.properties;
                return (
                    <Marker
                        key={`${level}-${idx}`}
                        position={[lat, lng]}
                        icon={createClusterIcon(name, count, level)}
                        eventHandlers={{
                            click: (e) => {
                                const map = e.target._map;
                                let nextZoom = 10;
                                if (level === 'province') nextZoom = config?.zoomConfig.poiLevels.city;
                                else if (level === 'city') nextZoom = config?.zoomConfig.poiLevels.district;
                                else nextZoom = config?.zoomConfig.poiLevels.detail;
                                map.setView([lat, lng], nextZoom);
                            }
                        }}
                    >
                        <Popup eventHandlers={{ remove: onPopupClose }}>
                            <strong>{name}</strong>
                            <br />
                            Level: {level}
                            <br />
                            Schools: {count}
                        </Popup>
                    </Marker>
                );
            })}

            {/* 模式 2: 详细 POI 显示 */}
            {showPOI && showDetailedPOIs && (
                useOffscreen ? (
                    <OffscreenCanvasLayer
                        pois={pois}
                        visible={showPOI && showDetailedPOIs}
                        onPOIClick={onPOIClick}
                    />
                ) : (
                    <CanvasMarkerLayer
                        pois={pois}
                        visible={showPOI && showDetailedPOIs}
                        onPOIClick={onPOIClick}
                    />
                )
            )}
        </MapContainer>
    );
}

export default MapView;
