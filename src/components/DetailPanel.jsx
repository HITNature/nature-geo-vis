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
                    {/* ID Field */}
                    <div className="data-row">
                        <span className="data-label">ID REF</span>
                        <span className="data-value" style={{ opacity: 0.5 }}>{properties.id}</span>
                    </div>

                    {/* Dynamic Fields */}
                    {isPOI ? (
                        // POI Fields
                        poiDisplayFields && poiDisplayFields.map((field) => (
                            <div key={field.key} className="data-row">
                                <span className="data-label">{field.label}</span>
                                <span className="data-value">
                                    {properties[field.key] !== undefined && properties[field.key] !== null
                                        ? properties[field.key]
                                        : 'N/A'}
                                </span>
                            </div>
                        ))
                    ) : (
                        // Grid Fields
                        displayFields && displayFields.map((field) => (
                            <div key={field.key} className="data-row">
                                <span className="data-label">{field.label}</span>
                                <span className="data-value">
                                    {properties[field.key] !== undefined && properties[field.key] !== null
                                        ? typeof properties[field.key] === 'number'
                                            ? properties[field.key].toFixed(2)
                                            : properties[field.key]
                                        : 'N/A'}
                                </span>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
}

export default DetailPanel;
