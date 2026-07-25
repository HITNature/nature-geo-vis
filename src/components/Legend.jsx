import { useState } from 'react';
import SearchBox from './SearchBox';

function Legend({ onLayerToggle, map }) {
    const [showGrid, setShowGrid] = useState(true);
    const [showJsPOI, setShowJsPOI] = useState(true);
    const [showPsPOI, setShowPsPOI] = useState(true);

    const handleGridToggle = () => {
        const newValue = !showGrid;
        setShowGrid(newValue);
        onLayerToggle('grid', newValue);
    };

    const handleJsToggle = () => {
        const newValue = !showJsPOI;
        setShowJsPOI(newValue);
        onLayerToggle('poi-js', newValue);
    };

    const handlePsToggle = () => {
        const newValue = !showPsPOI;
        setShowPsPOI(newValue);
        onLayerToggle('poi-ps', newValue);
    };

    return (
        <div className="glass-panel legend-card">
            <div className="legend-title">Layer Control</div>

            <div className="legend-item legend-toggle">
                <div className="legend-marker">
                    <div style={{ display: 'flex', gap: '3px', opacity: showJsPOI ? 1 : 0.4, alignItems: 'center' }}>
                        <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#ef4444', boxShadow: showJsPOI ? '0 0 6px #ef4444' : 'none' }}></div>
                        <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10b981', boxShadow: showJsPOI ? '0 0 6px #10b981' : 'none' }}></div>
                    </div>
                    <span style={{ opacity: showJsPOI ? 1 : 0.5, marginLeft: '6px' }}>Junior High (JS POI)</span>
                </div>
                <button
                    className={`toggle-btn ${showJsPOI ? 'active' : ''}`}
                    onClick={handleJsToggle}
                    aria-label="Toggle junior high POI layer"
                >
                    <span className="toggle-slider"></span>
                </button>
            </div>

            <div className="legend-item legend-toggle">
                <div className="legend-marker">
                    <div style={{ display: 'flex', gap: '3px', opacity: showPsPOI ? 1 : 0.4, alignItems: 'center' }}>
                        <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#ef4444', boxShadow: showPsPOI ? '0 0 6px #ef4444' : 'none' }}></div>
                        <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10b981', boxShadow: showPsPOI ? '0 0 6px #10b981' : 'none' }}></div>
                    </div>
                    <span style={{ opacity: showPsPOI ? 1 : 0.5, marginLeft: '6px' }}>Primary School (PS POI)</span>
                </div>
                <button
                    className={`toggle-btn ${showPsPOI ? 'active' : ''}`}
                    onClick={handlePsToggle}
                    aria-label="Toggle primary school POI layer"
                >
                    <span className="toggle-slider"></span>
                </button>
            </div>

            <div className="legend-item legend-toggle">
                <div className="legend-marker">
                    <div className="legend-grid-sample" style={{
                        opacity: showGrid ? 1 : 0.4
                    }}>
                        <div className="grid-cell" style={{ background: '#ef4444' }}></div>
                        <div className="grid-cell" style={{ background: '#f87171' }}></div>
                        <div className="grid-cell" style={{ background: '#a3e635' }}></div>
                        <div className="grid-cell" style={{ background: '#22c55e' }}></div>
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

            {showGrid && (
                <div className="legend-description">
                    <div className="legend-subtitle">Population Change (2010→2020)</div>
                    <div className="legend-item-small">
                        <div className="legend-color" style={{ background: '#ef4444' }}></div>
                        <span>Strong Growth (&gt;500)</span>
                    </div>
                    <div className="legend-item-small">
                        <div className="legend-color" style={{ background: '#f87171' }}></div>
                        <span>Moderate Growth (0-500)</span>
                    </div>
                    <div className="legend-item-small">
                        <div className="legend-color" style={{ background: '#a3e635' }}></div>
                        <span>Slight Decline (0 to -500)</span>
                    </div>
                    <div className="legend-item-small">
                        <div className="legend-color" style={{ background: '#22c55e' }}></div>
                        <span>Significant Decline (&lt;-500)</span>
                    </div>
                </div>
            )}

            {(showJsPOI || showPsPOI) && (
                <div className="legend-description" style={{ marginTop: 'var(--space-sm)', borderTop: '1px solid var(--color-border)', paddingTop: 'var(--space-sm)' }}>
                    <div className="legend-subtitle">POI Service Pop Change</div>
                    <div className="legend-item-small">
                        <div className="legend-color" style={{ background: '#ef4444', borderRadius: '50%', width: '10px', height: '10px' }}></div>
                        <span>Increase / No Change (&ge; 0)</span>
                    </div>
                    <div className="legend-item-small">
                        <div className="legend-color" style={{ background: '#10b981', borderRadius: '50%', width: '10px', height: '10px' }}></div>
                        <span>Decrease (&lt; 0)</span>
                    </div>
                </div>
            )}

            {/* Search Box integrated directly below the Legend controls */}
            <div style={{ marginTop: 'var(--space-md)', borderTop: '1px solid var(--color-border)', paddingTop: 'var(--space-md)' }}>
                <SearchBox map={map} />
            </div>
        </div>
    );
}

export default Legend;
