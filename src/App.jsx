import { useState, useEffect } from 'react';
import MapView from './components/MapView';
import DetailPanel from './components/DetailPanel';
import PerformanceMonitor from './components/PerformanceMonitor';

function App() {
    const [config, setConfig] = useState(null);
    const [selectedFeature, setSelectedFeature] = useState(null);
    const [zoom, setZoom] = useState(5);

    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        setIsLoading(true);
        fetch('/api/config')
            .then(res => res.json())
            .then(data => {
                setConfig(data);
                setIsLoading(false);
            })
            .catch(err => {
                console.error('Failed to load config:', err);
                setIsLoading(false);
            });
    }, []);

    const handlePOIClick = (feature) => {
        setSelectedFeature(feature);
    };

    const handleClosePanel = () => {
        setSelectedFeature(null);
    };

    const handleZoomChange = (newZoom) => {
        setZoom(newZoom);
    };

    return (
        <div className={`app ${isLoading ? 'is-loading' : ''}`}>
            {/* Layer 1: Map Canvas (Background) */}
            <div className="map-canvas">
                <MapView
                    config={config}
                    selectedFeature={selectedFeature}
                    onPOIClick={handlePOIClick}
                    onPopupClose={handleClosePanel}
                    onZoomChange={handleZoomChange}
                    onLoadingChange={setIsLoading}
                />
            </div>

            {/* Layer 2: UI Overlay (Foreground) */}
            <div className="ui-layer">
                <PerformanceMonitor />
                {/* Header / Status Bar */}
                <header className="params-bar">
                    <div className="brand">
                        <h1 className="brand__title">Nature Geo Vis</h1>
                        <span className="brand__subtitle">Educational Resource Distribution</span>
                    </div>

                    <div className="status-indicators">
                        <div className={`status-dot ${isLoading ? 'status-dot--loading' : ''}`}></div>
                        <span>{isLoading ? 'SYNCING DATA...' : 'SYSTEM READY'}</span>
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
                <div className="glass-panel legend-card">
                    <div className="legend-title">Legend</div>
                    <div className="legend-item">
                        <div className="legend-dot" style={{ background: '#f59e0b', boxShadow: '0 0 8px #f59e0b' }}></div>
                        <span>Junior High School (POI)</span>
                    </div>
                </div>

                {/* Status Bar / Hint (Floating) */}
                <div style={{
                    position: 'absolute',
                    bottom: '32px',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    background: 'rgba(11, 17, 33, 0.85)',
                    padding: '8px 20px',
                    borderRadius: '999px',
                    fontSize: '0.8rem',
                    color: '#f8fafc',
                    backdropFilter: 'blur(8px)',
                    border: '1px solid rgba(148, 163, 184, 0.2)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
                    transition: 'all 0.3s ease'
                }}>
                    {isLoading ? (
                        <>
                            <div className="spinner" style={{ width: '14px', height: '14px', borderWidth: '2px' }}></div>
                            <span style={{ color: 'var(--color-primary)' }}>Rendering spatial data...</span>
                        </>
                    ) : (
                        <>
                            <span style={{ opacity: 0.6 }}>Insight:</span>
                            <span>{zoom < (config?.zoomConfig.showCells || 8) ? 'Zoom in for grid-level indicators' : 'Explore detail grids on the map'}</span>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}

export default App;
