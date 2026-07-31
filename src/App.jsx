import { useState, useEffect, useCallback } from 'react';
import MapView from './components/MapView';
import DetailPanel from './components/DetailPanel';
import PerformanceMonitor from './components/PerformanceMonitor';
import Legend from './components/Legend';
import { apiFetch, formatLatency, formatSpeed, formatBytes } from './utils/api';
import { useNetworkStats } from './hooks/useNetworkStats';

function App() {
    const [config, setConfig] = useState(null);
    const [selectedFeature, setSelectedFeature] = useState(null);
    const [zoom, setZoom] = useState(5);
    const [useOffscreen, setUseOffscreen] = useState(false);
    const [showGrid, setShowGrid] = useState(true);
    const [selectedGridLayer, setSelectedGridLayer] = useState('wpop_change'); // 默认选中人口变化图层
    const [showJsPOI, setShowJsPOI] = useState(true);
    const [showPsPOI, setShowPsPOI] = useState(true);

    const [isLoading, setIsLoading] = useState(false);
    const [connectionError, setConnectionError] = useState(null);
    const [map, setMap] = useState(null);
    const [configRetryKey, setConfigRetryKey] = useState(0);
    const net = useNetworkStats();
    const isFetching = net.inFlight > 0;

    const reportConnectionError = useCallback((message) => {
        setConnectionError(message || 'Unable to reach the data service. Please check the backend connection.');
    }, []);

    const clearConnectionError = useCallback(() => {
        setConnectionError(null);
    }, []);

    const handleRetryConnection = () => {
        setConnectionError(null);
        setConfig(null);
        setConfigRetryKey((k) => k + 1);
    };

    useEffect(() => {
        let cancelled = false;
        setIsLoading(true);
        setConnectionError(null);

        apiFetch('/api/config')
            .then(async (res) => {
                if (!res.ok) {
                    throw new Error(`Data service responded with HTTP ${res.status}`);
                }
                return res.json();
            })
            .then((data) => {
                if (cancelled) return;
                setConfig(data);
                setConnectionError(null);
                setIsLoading(false);
            })
            .catch((err) => {
                if (cancelled) return;
                console.error('Failed to load config:', err);
                setConfig(null);
                setIsLoading(false);
                setConnectionError(
                    'Unable to connect to the data service. Map layers cannot load — please check the backend / database connection and try again.'
                );
            });

        return () => { cancelled = true; };
    }, [configRetryKey]);

    const handlePOIClick = (feature) => {
        setSelectedFeature(feature);
    };

    const handleClosePanel = () => {
        setSelectedFeature(null);
    };

    const handleZoomChange = (newZoom) => {
        setZoom(newZoom);
    };

    const handleLayerToggle = (layerType, visible, extra) => {
        if (layerType === 'grid') {
            setShowGrid(visible);
            if (extra) {
                setSelectedGridLayer(extra);
            }
        } else if (layerType === 'poi-js') {
            setShowJsPOI(visible);
        } else if (layerType === 'poi-ps') {
            setShowPsPOI(visible);
        } else if (layerType === 'poi') {
            // 兼容旧调用
            setShowJsPOI(visible);
            setShowPsPOI(visible);
        }
    };

    return (
        <div className={`app ${isLoading ? 'is-loading' : ''}`}>
            {/* Layer 1: Map Canvas (Background) */}
            <div className="map-canvas">
                <MapView
                    key={configRetryKey}
                    config={config}
                    selectedFeature={selectedFeature}
                    useOffscreen={useOffscreen}
                    onPOIClick={handlePOIClick}
                    onPopupClose={handleClosePanel}
                    onZoomChange={handleZoomChange}
                    onLoadingChange={setIsLoading}
                    onConnectionError={reportConnectionError}
                    onConnectionRecovered={clearConnectionError}
                    showGrid={showGrid}
                    selectedGridLayer={selectedGridLayer}
                    showJsPOI={showJsPOI}
                    showPsPOI={showPsPOI}
                    onMapInstance={setMap}
                />
            </div>

            {/* Layer 2: UI Overlay (Foreground) */}
            <div className="ui-layer">
                <PerformanceMonitor useOffscreen={useOffscreen} onToggleOffscreen={() => setUseOffscreen(!useOffscreen)} />
                {/* Header / Status Bar */}
                <header className="params-bar">
                    <div className="brand">
                        <h1 className="brand__title">China Basic Education Facilities Atlas at 1 km Resolution</h1>
                        <span className="brand__subtitle">Mapping Changes in School Supply, Accessibility, and Compulsory School-Age Population</span>
                    </div>

                    <div className={`status-indicators ${connectionError ? 'status-indicators--error' : ''}`}>
                        <div className={`status-dot ${connectionError ? 'status-dot--error' : (isLoading || isFetching) ? 'status-dot--loading' : ''}`}></div>
                        <span>
                            {connectionError
                                ? 'CONNECTION ERROR'
                                : (isLoading || isFetching)
                                    ? 'SYNCING DATA...'
                                    : 'SYSTEM READY'}
                        </span>
                        <div style={{ width: '1px', height: '12px', background: 'var(--color-border)' }}></div>
                        <span className="net-stat" title="API round-trip latency (TTFB)">
                            LAT {formatLatency(
                                isFetching
                                    ? (net.active.find((r) => r.ttfbMs != null)?.ttfbMs ?? net.lastLatencyMs)
                                    : net.lastLatencyMs
                            )}
                        </span>
                        <div style={{ width: '1px', height: '12px', background: 'var(--color-border)' }}></div>
                        <span className="net-stat" title="Download throughput of current / last API response">
                            SPD {formatSpeed(net.lastSpeedBps)}
                        </span>
                        {isFetching && (
                            <>
                                <div style={{ width: '1px', height: '12px', background: 'var(--color-border)' }}></div>
                                <span className="net-stat net-stat--active" title="In-flight API requests">
                                    ×{net.inFlight}
                                </span>
                            </>
                        )}
                        <div style={{ width: '1px', height: '12px', background: 'var(--color-border)' }}></div>
                        <span>ZOOM: {zoom.toFixed(1)}</span>
                    </div>
                </header>

                {/* Right Side: Detail Panel */}
                {selectedFeature && config && (
                    <DetailPanel
                        feature={selectedFeature}
                        displayFields={config.displayFields}
                        poiDisplayFields={config.poiDisplayFields}
                        onClose={handleClosePanel}
                    />
                )}

                {/* Bottom Left: Legend */}
                <Legend onLayerToggle={handleLayerToggle} map={map} selectedGridLayer={selectedGridLayer} />

                {/* Connection error banner */}
                {connectionError && (
                    <div className="connection-error-banner" role="alert">
                        <div className="connection-error-banner__body">
                            <strong>Data service unavailable</strong>
                            <span>{connectionError}</span>
                        </div>
                        <button type="button" className="connection-error-banner__retry" onClick={handleRetryConnection}>
                            Retry
                        </button>
                    </div>
                )}

                {/* Status Bar / Hint (Floating) */}
                <div className={`insight-pill ${connectionError ? 'insight-pill--error' : isFetching ? 'insight-pill--fetching' : ''}`}>
                    {connectionError ? (
                        <span>Backend / database connection failed — check Railway service &amp; network</span>
                    ) : isFetching ? (
                        <>
                            <div className="spinner" style={{ width: '14px', height: '14px', borderWidth: '2px' }}></div>
                            <span style={{ color: 'var(--color-primary)' }}>
                                Loading {net.active.map((r) => r.label).filter((v, i, a) => a.indexOf(v) === i).join(', ') || 'data'}…
                            </span>
                            <span className="insight-pill__meta">
                                {(() => {
                                    const oldest = net.active.reduce((a, b) => (a.startedAt < b.startedAt ? a : b), net.active[0]);
                                    const elapsed = oldest ? ((performance.now() - oldest.startedAt) / 1000).toFixed(1) : '0.0';
                                    return `${elapsed}s`;
                                })()}
                                {' · '}
                                {formatSpeed(net.lastSpeedBps)}
                                {net.active.some((r) => r.bytes > 0) && (
                                    <> · {formatBytes(net.active.reduce((n, r) => n + (r.bytes || 0), 0))}</>
                                )}
                                {net.lastLatencyMs != null && <> · LAT {formatLatency(net.lastLatencyMs)}</>}
                            </span>
                        </>
                    ) : isLoading ? (
                        <>
                            <div className="spinner" style={{ width: '14px', height: '14px', borderWidth: '2px' }}></div>
                            <span style={{ color: 'var(--color-primary)' }}>Rendering spatial data...</span>
                        </>
                    ) : (
                        <>
                            <span style={{ opacity: 0.6 }}>Insight:</span>
                            <span>{zoom < (config?.zoomConfig.showCells || 8) ? 'Zoom in for grid-level indicators' : 'Explore detail grids on the map'}</span>
                            {net.lastLatencyMs != null && (
                                <span className="insight-pill__meta" style={{ opacity: 0.55 }}>
                                    Last API {formatLatency(net.lastLatencyMs)} · {formatSpeed(net.lastSpeedBps)}
                                </span>
                            )}
                        </>
                    )}
                </div>

                {/* Map approval number — fixed below status bar */}
                <div className="map-approval-number">
                    The map approval number for the China map is GS (20240650)
                </div>
            </div>
        </div>
    );
}

export default App;
