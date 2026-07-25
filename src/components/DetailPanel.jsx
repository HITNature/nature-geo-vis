import { useState, useRef, useEffect } from 'react';

function DetailPanel({ feature, displayFields, poiDisplayFields, onClose }) {
    const [position, setPosition] = useState({ x: 0, y: 0 });
    const [isDragging, setIsDragging] = useState(false);
    const dragStart = useRef({ x: 0, y: 0 });

    useEffect(() => {
        setPosition({ x: 0, y: 0 });
    }, [feature?.properties?.id]);

    if (!feature || !feature.properties) {
        return null;
    }

    const { properties, geometry } = feature;
    const isPOI = geometry && geometry.type === 'Point';

    const handlePointerDown = (e) => {
        // Only trigger drag if clicking the header (or its children) and NOT a button
        const header = e.currentTarget.querySelector('.detail-view__header');
        if (header && header.contains(e.target) && !e.target.closest('button')) {
            setIsDragging(true);
            dragStart.current = {
                x: e.clientX - position.x,
                y: e.clientY - position.y
            };
            e.currentTarget.setPointerCapture(e.pointerId);
        }
    };

    const handlePointerMove = (e) => {
        if (!isDragging) return;

        // Prevent default browser behavior (scrolling, etc.)
        if (e.cancelable) e.preventDefault();

        setPosition({
            x: e.clientX - dragStart.current.x,
            y: e.clientY - dragStart.current.y
        });
    };

    const handlePointerUp = (e) => {
        if (isDragging) {
            setIsDragging(false);
            e.currentTarget.releasePointerCapture(e.pointerId);
        }
    };

    return (
        <div
            className={`glass-panel detail-view ${isDragging ? 'is-dragging' : ''}`}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
            style={{
                transform: `translate(${position.x}px, ${position.y}px)`,
                transition: isDragging ? 'none' : 'transform 0.3s cubic-bezier(0.2, 0.8, 0.2, 1)',
                touchAction: 'none' /* Critical for mobile/pointer dragging */
            }}
        >
            <div className="detail-view__header">
                <div>
                    <h2 className="detail-view__title">
                        {properties.name || properties.city || 'Unknown Location'}
                    </h2>
                    <div className="detail-view__subtitle">
                        {isPOI ? 'POI Data Point' : 'Grid Cell Analysis'}
                        {properties.province && ` • ${properties.province}`}
                    </div>
                </div>
                <button
                    className="detail-view__close-btn"
                    onClick={onClose}
                    aria-label="Close"
                >
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M18 6L6 18M6 6l12 12" />
                    </svg>
                </button>
            </div>

            <div className="detail-view__content">
                <div className="data-grid">
                    {/* Dynamic Fields */}
                    {isPOI ? (
                        // POI Fields
                        poiDisplayFields && poiDisplayFields.map((field) => {
                            const value = properties[field.key];
                            // Hide null, undefined, or empty string values
                            if (value === null || value === undefined || value === '') return null;

                            let displayValue = value;
                            if (typeof value === 'number') {
                                if (field.format === 'percent' || field.key.endsWith('_R') || field.key.includes('ratio') || field.key.includes('changeR')) {
                                    displayValue = `${(value * (Math.abs(value) <= 1 ? 100 : 1)).toFixed(2)}%`;
                                } else if (field.format === 'int') {
                                    displayValue = Math.round(value).toLocaleString();
                                } else {
                                    displayValue = value.toFixed(2);
                                }
                            } else if (field.key === 'poi_type') {
                                displayValue = value === 'PS' ? '小学' : value === 'JS' ? '初中' : value;
                            }

                            return (
                                <div key={field.key} className="data-row">
                                    <span className="data-label">{field.label}</span>
                                    <span className={`data-value ${
                                        field.key.includes('change') || field.key.includes('pop')
                                            ? (parseFloat(value) > 0 ? 'positive' : parseFloat(value) < 0 ? 'negative' : '')
                                            : ''
                                    }`}>
                                        {displayValue}
                                    </span>
                                </div>
                            );
                        })
                    ) : (
                        // Grid Fields
                        displayFields && displayFields.map((field) => {
                            let value = properties[field.key];
                            let displayValue = value;
                            let statusClass = '';

                            // Special formatting for School count change ranges
                            if (field.key === 'PS_count_change') {
                                displayValue = `${properties.PS_2010_count || 0} → ${properties.PS_2020_count || 0}`;
                                const diff = (properties.PS_2020_count || 0) - (properties.PS_2010_count || 0);
                                if (diff > 0) statusClass = 'positive';
                                else if (diff < 0) statusClass = 'negative';
                            } else if (field.key === 'JS_count_change') {
                                displayValue = `${properties.JS_2010_count || 0} → ${properties.JS_2020_count || 0}`;
                                const diff = (properties.JS_2020_count || 0) - (properties.JS_2010_count || 0);
                                if (diff > 0) statusClass = 'positive';
                                else if (diff < 0) statusClass = 'negative';
                            } else {
                                if (value === null || value === undefined) return null;
                                if (typeof value === 'number') {
                                    if (field.format === 'percent' || String(field.key).includes('ratio') || String(field.key).includes('changeR')) {
                                        // 库内可能是 0~1 小数或已是百分数
                                        const pct = Math.abs(value) <= 1 ? value * 100 : value;
                                        displayValue = `${pct.toFixed(2)}%`;
                                    } else if (field.format === 'int') {
                                        displayValue = Math.round(value).toLocaleString();
                                    } else {
                                        displayValue = value.toFixed(2);
                                    }
                                    if (value > 0) statusClass = 'positive';
                                    else if (value < 0) statusClass = 'negative';
                                } else {
                                    displayValue = value;
                                }
                            }

                            return (
                                <div key={field.key} className="data-row">
                                    <span className="data-label">{field.label}</span>
                                    <span className={`data-value ${statusClass}`}>
                                        {displayValue}
                                    </span>
                                </div>
                            );
                        })
                    )}
                </div>
            </div>
        </div>
    );
}

export default DetailPanel;
