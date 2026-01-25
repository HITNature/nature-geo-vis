import { useState, useCallback, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMapEvents, ZoomControl } from 'react-leaflet';
import L from 'leaflet';
import MarkerClusterGroup from 'react-leaflet-cluster';
import { perf } from '../utils/perf';
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

// 地图事件处理组件
function MapEvents({ onZoomChange, onMoveEnd, onLoadingChange, selectedFeature }) {
    const map = useMapEvents({
        zoomend: () => {
            onZoomChange(map.getZoom());
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
        loading: () => onLoadingChange(true),
        load: () => onLoadingChange(false),
        tileloadstart: () => onLoadingChange(true),
        tileload: () => { }
    });

    // 当详情面板关闭时（selectedFeature 变为 null），关闭地图上的气泡
    useEffect(() => {
        if (!selectedFeature) {
            map.closePopup();
        }
    }, [selectedFeature, map]);

    return null;
}

function MapView({ config, selectedFeature, onPOIClick, onPopupClose, onZoomChange, onLoadingChange }) {
    const [pois, setPois] = useState(null);
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

    // 加载所有级别的聚合数据
    useEffect(() => {
        setIsDataLoading(true);
        const endMeasure = perf.startMeasure('Load Aggr Data');
        const levels = ['province', 'city', 'district'];
        Promise.all(levels.map(level =>
            fetch(`/api/pois/aggregated?level=${level}`).then(res => res.json())
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

    // 视口变化时加载详细 POI 数据
    const handleMoveEnd = useCallback((bbox, zoom) => {
        setCurrentZoom(zoom);
        // 只有在放大到详细级别才加载单个 POI
        if (config && zoom >= config.zoomConfig.poiLevels.detail) {
            setIsDataLoading(true);
            const endMeasure = perf.startMeasure('Fetch Detailed POIs');
            fetch(`/api/pois?bbox=${bbox}&zoom=${zoom}`)
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

    useEffect(() => {
        if (!showDetailedPOIs) {
            perf.setCount('Cluster Nodes', clusterFeatures?.length || 0);
        } else {
            perf.setCount('Cluster Nodes', 0);
        }
    }, [clusterFeatures, showDetailedPOIs]);

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
            {showDetailedPOIs && (
                <>
                    {pois && pois.features && pois.features.map((feature) => {
                        const [lng, lat] = feature.geometry.coordinates;
                        return (
                            <Marker
                                key={feature.properties.id}
                                position={[lat, lng]}
                                icon={poiIcon}
                                eventHandlers={{
                                    click: () => {
                                        if (onPOIClick) {
                                            onPOIClick(feature);
                                        }
                                    },
                                }}
                            >
                                <Popup eventHandlers={{ remove: onPopupClose }}>
                                    <strong>{feature.properties.name}</strong>
                                    <div style={{ fontSize: '0.875rem', opacity: 0.7 }}>
                                        {feature.properties.province} {feature.properties.city} {feature.properties.district}
                                    </div>
                                </Popup>
                            </Marker>
                        );
                    })}
                </>
            )}
        </MapContainer>
    );
}

export default MapView;
