import { useState } from 'react';
import SearchBox from './SearchBox';

const GRID_LAYERS = [
    {
        key: 'wpop_change',
        label: 'Population Grid Cells',
        subtitle: 'Population Change (2010→2020)',
        ranges: [
            { color: '#ef4444', label: 'Strong Growth (>5000)' },
            { color: '#f87171', label: 'Moderate Growth (0 to 5000]' },
            { color: '#a3e635', label: 'Slight Decline (-5000 to 0]' },
            { color: '#22c55e', label: 'Significant Decline (≤-5000)' }
        ]
    },
    {
        key: 'pop_6_11_change',
        label: 'PSAP Grid Cells',
        subtitle: 'PSAP Change (2010→2020)',
        ranges: [
            { color: '#ef4444', label: 'Strong Growth (>500)' },
            { color: '#f87171', label: 'Moderate Growth (0 to 500]' },
            { color: '#a3e635', label: 'Slight Decline (-500 to 0]' },
            { color: '#22c55e', label: 'Significant Decline (≤-500)' }
        ]
    },
    {
        key: 'pop_12_14_change',
        label: 'JSAP Grid Cells',
        subtitle: 'JSAP Change (2010→2020)',
        ranges: [
            { color: '#ef4444', label: 'Strong Growth (>500)' },
            { color: '#f87171', label: 'Moderate Growth (0 to 500]' },
            { color: '#a3e635', label: 'Slight Decline (-500 to 0]' },
            { color: '#22c55e', label: 'Significant Decline (≤-500)' }
        ]
    },
    {
        key: 'ed_ps_change',
        label: 'PS Accessibility Distance Grid Cells',
        subtitle: 'PS Accessibility Distance Change (2010→2020)',
        ranges: [
            { color: '#ef4444', label: 'Strong Growth (>1000m)' },
            { color: '#f87171', label: 'Moderate Growth (0 to 1000m]' },
            { color: '#a3e635', label: 'Slight Decline (-1000m to 0]' },
            { color: '#22c55e', label: 'Significant Decline (≤-1000m)' }
        ]
    },
    {
        key: 'ed_js_change',
        label: 'JS Accessibility Distance Grid Cells',
        subtitle: 'JS Accessibility Distance Change (2010→2020)',
        ranges: [
            { color: '#ef4444', label: 'Strong Growth (>1000m)' },
            { color: '#f87171', label: 'Moderate Growth (0 to 1000m]' },
            { color: '#a3e635', label: 'Slight Decline (-1000m to 0]' },
            { color: '#22c55e', label: 'Significant Decline (≤-1000m)' }
        ]
    }
];

function Legend({ onLayerToggle, map, selectedGridLayer }) {
    const [showGrid, setShowGrid] = useState(true);
    const [showJsPOI, setShowJsPOI] = useState(true);
    const [showPsPOI, setShowPsPOI] = useState(true);

    const handleGridToggle = () => {
        const newValue = !showGrid;
        setShowGrid(newValue);
        onLayerToggle('grid', newValue, selectedGridLayer);
    };

    const handleGridLayerChange = (key) => {
        onLayerToggle('grid', showGrid, key);
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

    const activeGridLayer = GRID_LAYERS.find(l => l.key === selectedGridLayer) || GRID_LAYERS[0];

    return (
        <div className="glass-panel legend-card">
            <div className="legend-title">Layer Control</div>

            {/* POI Layers */}
            <div className="legend-item legend-toggle">
                <div className="legend-marker">
                    <div style={{ display: 'flex', gap: '3px', opacity: showJsPOI ? 1 : 0.4, alignItems: 'center' }}>
                        <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#ef4444', boxShadow: showJsPOI ? '0 0 6px #ef4444' : 'none' }}></div>
                        <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10b981', boxShadow: showJsPOI ? '0 0 6px #10b981' : 'none' }}></div>
                    </div>
                    <span style={{ opacity: showJsPOI ? 1 : 0.5, marginLeft: '6px' }}>Junior High School (JS) POI</span>
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
                    <span style={{ opacity: showPsPOI ? 1 : 0.5, marginLeft: '6px' }}>Primary School (PS) POI</span>
                </div>
                <button
                    className={`toggle-btn ${showPsPOI ? 'active' : ''}`}
                    onClick={handlePsToggle}
                    aria-label="Toggle primary school POI layer"
                >
                    <span className="toggle-slider"></span>
                </button>
            </div>

            {/* Grid Master Toggle */}
            <div className="legend-item legend-toggle" style={{ borderTop: '1px solid var(--color-border)', marginTop: 'var(--space-sm)', paddingTop: 'var(--space-sm)' }}>
                <div className="legend-marker">
                    <div className="legend-grid-sample" style={{ opacity: showGrid ? 1 : 0.4 }}>
                        <div className="grid-cell" style={{ background: '#ef4444' }}></div>
                        <div className="grid-cell" style={{ background: '#f87171' }}></div>
                        <div className="grid-cell" style={{ background: '#a3e635' }}></div>
                        <div className="grid-cell" style={{ background: '#22c55e' }}></div>
                    </div>
                    <span style={{ opacity: showGrid ? 1 : 0.5, fontWeight: 'bold' }}>Grid Analysis Layers</span>
                </div>
                <button
                    className={`toggle-btn ${showGrid ? 'active' : ''}`}
                    onClick={handleGridToggle}
                    aria-label="Toggle grid layer"
                >
                    <span className="toggle-slider"></span>
                </button>
            </div>

            {/* Radio Grid Layers Selection */}
            {showGrid && (
                <div className="grid-layers-selector" style={{ paddingLeft: '8px', marginTop: 'var(--space-xs)' }}>
                    {GRID_LAYERS.map((layer) => (
                        <label
                            key={layer.key}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                margin: '6px 0',
                                fontSize: '0.85rem',
                                color: selectedGridLayer === layer.key ? '#3b82f6' : 'var(--color-text-muted)',
                                cursor: 'pointer',
                                transition: 'color 0.2s'
                            }}
                        >
                            <input
                                type="radio"
                                name="grid-layer-radio"
                                checked={selectedGridLayer === layer.key}
                                onChange={() => handleGridLayerChange(layer.key)}
                                style={{ cursor: 'pointer' }}
                            />
                            <span>{layer.label}</span>
                        </label>
                    ))}
                </div>
            )}

            {/* Dynamic Legend Ranges */}
            {showGrid && activeGridLayer && (
                <div className="legend-description" style={{ borderTop: '1px dashed var(--color-border)', marginTop: 'var(--space-xs)', paddingTop: 'var(--space-xs)' }}>
                    <div className="legend-subtitle" style={{ fontSize: '0.8rem', color: '#f8fafc', marginBottom: '6px' }}>
                        {activeGridLayer.subtitle}
                    </div>
                    {activeGridLayer.ranges.map((range, idx) => (
                        <div key={idx} className="legend-item-small" style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: '4px 0' }}>
                            <div className="legend-color" style={{ background: range.color, width: '12px', height: '12px', borderRadius: '2px' }}></div>
                            <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>{range.label}</span>
                        </div>
                    ))}
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