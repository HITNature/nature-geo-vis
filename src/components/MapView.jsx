import { useState, useCallback } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import MarkerClusterGroup from 'react-leaflet-cluster';
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
function MapEvents({ onZoomChange, onMoveEnd }) {
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
    });
    return null;
}

function MapView({ config, onCellClick, onPOIClick, onZoomChange }) {
    const [pois, setPois] = useState(null);
    const [loading, setLoading] = useState(false);
    const [currentZoom, setCurrentZoom] = useState(5);

    // 视口变化时加载 POI 数据
    const handleMoveEnd = useCallback((bbox, zoom) => {
        setCurrentZoom(zoom);

        // 加载 POI 数据
        if (config && zoom >= config.zoomConfig.showPOIs) {
            fetch(`/api/pois?bbox=${bbox}&zoom=${zoom}`)
                .then(res => res.json())
                .then(data => setPois(data))
                .catch(err => console.error('Failed to load POIs:', err));
        } else {
            setPois(null);
        }
    }, [config]);

    const handleZoomChange = useCallback((zoom) => {
        setCurrentZoom(zoom);
        onZoomChange(zoom);
    }, [onZoomChange]);

    return (
        <div className="map-container">
            <MapContainer
                center={[35.8, 104.1]} // 中国中心
                zoom={5}
                style={{ width: '100%', height: '100%' }}
                zoomControl={true}
            >
                <TileLayer
                    attribution='&copy; <a href="https://carto.com/">CARTO</a>'
                    url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
                />

                <MapEvents
                    onZoomChange={handleZoomChange}
                    onMoveEnd={handleMoveEnd}
                />

                {/* POI 标记层 (带聚合) */}
                <MarkerClusterGroup
                    chunkedLoading
                    maxClusterRadius={60}
                    spiderfyOnMaxZoom={true}
                >
                    {pois && pois.features && pois.features.length > 0 && pois.features.map((feature) => {
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
                                <Popup>
                                    <strong>{feature.properties.name}</strong>
                                    {feature.properties.city && (
                                        <div style={{ fontSize: '0.875rem', color: '#666' }}>
                                            {feature.properties.city}
                                        </div>
                                    )}
                                </Popup>
                            </Marker>
                        );
                    })}
                </MarkerClusterGroup>
            </MapContainer>
        </div>
    );
}

export default MapView;
