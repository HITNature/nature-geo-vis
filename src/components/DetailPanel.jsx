function DetailPanel({ feature, displayFields, poiDisplayFields, onClose }) {
    if (!feature || !feature.properties) {
        return null;
    }

    const { properties, geometry } = feature;
    const isPOI = geometry && geometry.type === 'Point';

    return (
        <div className="detail-panel">
            <div className="detail-panel__header">
                <h2 className="detail-panel__title">
                    {isPOI ? 'POI 详情' : '网格详情'}
                </h2>
                <button
                    className="detail-panel__close"
                    onClick={onClose}
                    aria-label="关闭"
                >
                    ×
                </button>
            </div>

            <div className="detail-panel__content">
                {/* 位置信息 */}
                <div className="detail-panel__location">
                    <span className="detail-panel__location-icon">
                        {isPOI ? '📍' : '🔲'}
                    </span>
                    <span>{properties.name || properties.city || '未知'}</span>
                    {properties.province && (
                        <span style={{ color: 'var(--color-text-muted)' }}>
                            · {properties.province}
                        </span>
                    )}
                </div>

                {/* 字段列表 */}
                <div className="field-list">
                    {isPOI ? (
                        // POI 字段
                        poiDisplayFields && poiDisplayFields.map((field) => (
                            <div
                                key={field.key}
                                className="field-item"
                                style={{ borderLeftColor: field.color }}
                            >
                                <span className="field-item__label">{field.label}</span>
                                <span className="field-item__value">
                                    {properties[field.key] !== undefined && properties[field.key] !== null
                                        ? properties[field.key]
                                        : '-'}
                                </span>
                            </div>
                        ))
                    ) : (
                        // 网格字段
                        displayFields && displayFields.map((field) => (
                            <div
                                key={field.key}
                                className="field-item"
                                style={{ borderLeftColor: field.color }}
                            >
                                <span className="field-item__label">{field.label}</span>
                                <span className="field-item__value">
                                    {properties[field.key] !== undefined && properties[field.key] !== null
                                        ? typeof properties[field.key] === 'number'
                                            ? properties[field.key].toFixed(2)
                                            : properties[field.key]
                                        : '-'}
                                </span>
                            </div>
                        ))
                    )}
                </div>

                {/* ID 信息 */}
                <div style={{
                    marginTop: 'var(--space-lg)',
                    paddingTop: 'var(--space-md)',
                    borderTop: '1px solid var(--color-border)',
                    fontSize: '0.75rem',
                    color: 'var(--color-text-muted)'
                }}>
                    {isPOI ? 'POI' : '网格'} ID: {properties.id}
                </div>
            </div>
        </div>
    );
}

export default DetailPanel;
