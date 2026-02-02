import { useState } from 'react';

function Legend({ onLayerToggle }) {
    const [showGrid, setShowGrid] = useState(true);
    const [showPOI, setShowPOI] = useState(true);

    const handleGridToggle = () => {
        const newValue = !showGrid;
        setShowGrid(newValue);
        onLayerToggle('grid', newValue);
    };

    const handlePOIToggle = () => {
        const newValue = !showPOI;
        setShowPOI(newValue);
        onLayerToggle('poi', newValue);
    };

    return (
        <div className="glass-panel legend-card">
            <div className="legend-title">Layer Control</div>

            {/* POI 图层切换 */}
            <div className="legend-item legend-toggle">
                <div className="legend-marker">
                    <div className="legend-dot" style={{
                        background: '#f59e0b',
                        boxShadow: showPOI ? '0 0 8px #f59e0b' : 'none',
                        opacity: showPOI ? 1 : 0.4
                    }}></div>
                    <span style={{ opacity: showPOI ? 1 : 0.5 }}>Junior High School (POI)</span>
                </div>
                <button
                    className={`toggle-btn ${showPOI ? 'active' : ''}`}
                    onClick={handlePOIToggle}
                    aria-label="Toggle POI layer"
                >
                    <span className="toggle-slider"></span>
                </button>
            </div>

            {/* 网格图层切换 */}
            <div className="legend-item legend-toggle">
                <div className="legend-marker">
                    <div className="legend-grid-sample" style={{
                        opacity: showGrid ? 1 : 0.4
                    }}>
                        <div className="grid-cell" style={{ background: '#22c55e' }}></div>
                        <div className="grid-cell" style={{ background: '#84cc16' }}></div>
                        <div className="grid-cell" style={{ background: '#f59e0b' }}></div>
                        <div className="grid-cell" style={{ background: '#ef4444' }}></div>
                    </div>
                    <span style={{ opacity: showGrid ? 1 : 0.5 }}>Population Grid</span>
                </div>
                <button
                    className={`toggle-btn ${showGrid ? 'active' : ''}`}
                    onClick={handleGridToggle}
                    aria-label="Toggle grid layer"
                >
                    <span className="toggle-slider"></span>
                </button>
            </div>

            {/* 图例说明 */}
            {showGrid && (
                <div className="legend-description">
                    <div className="legend-subtitle">Population Change (2010→2020)</div>
                    <div className="legend-item-small">
                        <div className="legend-color" style={{ background: '#22c55e' }}></div>
                        <span>Strong Growth (&gt;500)</span>
                    </div>
                    <div className="legend-item-small">
                        <div className="legend-color" style={{ background: '#84cc16' }}></div>
                        <span>Moderate Growth (0-500)</span>
                    </div>
                    <div className="legend-item-small">
                        <div className="legend-color" style={{ background: '#f59e0b' }}></div>
                        <span>Slight Decline (0 to -500)</span>
                    </div>
                    <div className="legend-item-small">
                        <div className="legend-color" style={{ background: '#ef4444' }}></div>
                        <span>Significant Decline (&lt;-500)</span>
                    </div>
                </div>
            )}
        </div>
    );
}

export default Legend;
