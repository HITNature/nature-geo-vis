import { useState, useEffect } from 'react';
import { perf } from '../utils/perf';

const PerformanceMonitor = ({ useOffscreen, onToggleOffscreen }) => {
    const [metrics, setMetrics] = useState(perf.getMetrics());
    const [isExpanded, setIsExpanded] = useState(true);
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        if (location.search.includes('perf')) setIsVisible(true);
        const unsubscribe = perf.subscribe(newMetrics => {
            setMetrics(newMetrics);
        });
        return unsubscribe;
    }, []);

    if (!isVisible) return null;

    if (!isExpanded) {
        return (
            <div
                onClick={() => setIsExpanded(true)}
                style={{
                    position: 'fixed',
                    top: '80px',
                    left: '20px',
                    zIndex: 9999,
                    background: 'rgba(15, 23, 42, 0.8)',
                    color: '#38bdf8',
                    padding: '4px 8px',
                    borderRadius: '4px',
                    fontSize: '10px',
                    cursor: 'pointer',
                    border: '1px solid rgba(56, 189, 248, 0.3)',
                    backdropFilter: 'blur(4px)'
                }}
            >
                PERF
            </div>
        );
    }

    return (
        <div className="perf-monitor glass-panel" style={{
            position: 'fixed',
            top: '80px',
            left: '20px',
            zIndex: 9999,
            width: '280px',
            maxHeight: '80vh',
            overflowY: 'auto',
            padding: '16px',
            fontSize: '12px',
            fontFamily: 'monospace',
            color: '#e2e8f0',
            userSelect: 'none',
            pointerEvents: 'auto'
        }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px', alignItems: 'center' }}>
                <span style={{ fontWeight: 'bold', color: '#38bdf8', letterSpacing: '1px' }}>PERF MONITOR</span>
                <button
                    onClick={() => setIsExpanded(false)}
                    style={{
                        background: 'transparent',
                        border: 'none',
                        color: '#64748b',
                        cursor: 'pointer',
                        fontSize: '16px',
                        padding: '0 4px'
                    }}
                >×</button>
            </div>

            {/* OffscreenCanvas Toggle */}
            <div style={{
                background: 'rgba(16, 185, 129, 0.1)',
                padding: '8px',
                borderRadius: '6px',
                marginBottom: '16px',
                border: '1px solid rgba(16, 185, 129, 0.2)'
            }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                        <span style={{ color: '#10b981', fontSize: '11px', fontWeight: 'bold' }}>OFFSCREEN CANVAS</span>
                        <div style={{ fontSize: '9px', color: '#64748b', marginTop: '2px' }}>Worker 线程渲染</div>
                    </div>
                    <label className="switch" style={{ position: 'relative', display: 'inline-block', width: '32px', height: '18px' }}>
                        <input
                            type="checkbox"
                            checked={useOffscreen}
                            onChange={onToggleOffscreen}
                            style={{ opacity: 0, width: 0, height: 0 }}
                        />
                        <span style={{
                            position: 'absolute',
                            cursor: 'pointer',
                            top: 0, left: 0, right: 0, bottom: 0,
                            backgroundColor: useOffscreen ? '#10b981' : '#334155',
                            transition: '.4s',
                            borderRadius: '18px'
                        }}>
                            <span style={{
                                position: 'absolute',
                                height: '14px',
                                width: '14px',
                                left: useOffscreen ? '16px' : '2px',
                                bottom: '2px',
                                backgroundColor: 'white',
                                transition: '.4s',
                                borderRadius: '50%'
                            }}></span>
                        </span>
                    </label>
                </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Main Thread FPS</span>
                    <span style={{ color: metrics.fps > 45 ? '#10b981' : metrics.fps > 20 ? '#f59e0b' : '#ef4444' }}>
                        {metrics.fps}
                    </span>
                </div>

                <div className="perf-divider" style={{ height: '1px', background: 'rgba(255,255,255,0.1)', margin: '4px 0' }} />

                {/* Benchmarks / Comparison */}
                {Object.keys(metrics.benchmarks).length > 0 && (
                    <>
                        <div style={{ fontSize: '10px', color: '#38bdf8', margin: '8px 0 4px 0', fontWeight: 'bold' }}>BENCHMARKS (AVG)</div>
                        {Object.entries(metrics.benchmarks).map(([key, data]) => (
                            <div key={key} style={{ marginBottom: '6px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', opacity: 0.8 }}>
                                    <span style={{ fontSize: '10px' }}>{key}</span>
                                    <span style={{ color: '#94a3b8' }}>{data.avg}ms</span>
                                </div>
                                <div style={{ height: '4px', background: 'rgba(255,255,255,0.05)', borderRadius: '2px', marginTop: '2px' }}>
                                    <div style={{
                                        height: '100%',
                                        width: `${Math.min(100, (parseFloat(data.avg) / 1000) * 100)}%`,
                                        background: key.includes('Worker') ? '#10b981' : '#3b82f6',
                                        borderRadius: '2px'
                                    }} />
                                </div>
                            </div>
                        ))}
                        <div className="perf-divider" style={{ height: '1px', background: 'rgba(255,255,255,0.1)', margin: '8px 0' }} />
                    </>
                )}

                {Object.entries(metrics.loadTimes).map(([name, time]) => (
                    <div key={name} style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ opacity: 0.7 }}>{name}</span>
                        <span style={{ color: '#94a3b8' }}>{time}ms</span>
                    </div>
                ))}

                {Object.entries(metrics.counts).map(([name, count]) => (
                    <div key={name} style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ opacity: 0.7 }}>{name}</span>
                        <span style={{ color: '#3b82f6' }}>{count}</span>
                    </div>
                ))}

                {metrics.history.length > 0 && (
                    <>
                        <div className="perf-divider" style={{ height: '1px', background: 'rgba(255,255,255,0.1)', margin: '8px 0 4px 0' }} />
                        <div style={{ fontSize: '10px', color: '#64748b', marginBottom: '4px' }}>LOGS</div>
                        <div style={{ maxHeight: '80px', overflowY: 'auto', fontSize: '10px' }}>
                            {metrics.history.map(item => (
                                <div key={item.id} style={{ marginBottom: '2px', opacity: 0.6 }}>
                                    [{item.time.split(' ')[0]}] {item.msg}
                                </div>
                            ))}
                        </div>
                    </>
                )}
            </div>
        </div>
    );
};

export default PerformanceMonitor;
