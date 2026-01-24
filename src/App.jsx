import { useState, useEffect } from 'react';
import MapView from './components/MapView';
import DetailPanel from './components/DetailPanel';

function App() {
    const [config, setConfig] = useState(null);
    const [selectedFeature, setSelectedFeature] = useState(null);
    const [zoom, setZoom] = useState(5);

    useEffect(() => {
        fetch('/api/config')
            .then(res => res.json())
            .then(data => setConfig(data))
            .catch(err => console.error('Failed to load config:', err));
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
        <div className="app">
            <header className="header">
                <div style={{ display: 'flex', alignItems: 'baseline' }}>
                    <h1 className="header__title">教育资源分布可视化</h1>
                    <span className="header__subtitle">(Work in Progress)</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', color: 'var(--color-text-muted)', fontSize: '0.875rem' }}>
                    <span>缩放级别: {zoom}</span>
                </div>
            </header>

            <main className="main-content">
                <MapView
                    config={config}
                    onPOIClick={handlePOIClick}
                    onZoomChange={handleZoomChange}
                />

                {selectedFeature && config && (
                    <DetailPanel
                        feature={selectedFeature}
                        displayFields={config.displayFields}
                        poiDisplayFields={config.poiDisplayFields}
                        onClose={handleClosePanel}
                    />
                )}

                {config && zoom < config.zoomConfig.showPOIs && (
                    <div className="zoom-hint">
                        🔍 放大到城市级别查看初中POI数据
                    </div>
                )}

                <div className="legend">
                    <div className="legend__title">图例</div>
                    <div className="legend__item">
                        <div className="legend__color" style={{ background: '#f59e0b' }}></div>
                        <span>初中 POI</span>
                    </div>
                </div>
            </main>
        </div>
    );
}

export default App;
