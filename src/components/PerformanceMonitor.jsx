import { useState, useEffect } from 'react';
import { perf } from '../utils/perf';

const PerformanceMonitor = () => {
    const [metrics, setMetrics] = useState(perf.getMetrics());
    const [isVisible, setIsVisible] = useState(true);

    useEffect(() => {
        const unsubscribe = perf.subscribe(newMetrics => {
            setMetrics(newMetrics);
        });
        return unsubscribe;
    }, []);

    if (!isVisible) {
        return (
            <div
                onClick={() => setIsVisible(true)}
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
            width: '240px',
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
                    onClick={() => setIsVisible(false)}
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

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>FPS</span>
                    <span style={{ color: metrics.fps > 45 ? '#10b981' : metrics.fps > 20 ? '#f59e0b' : '#ef4444' }}>
                        {metrics.fps}
                    </span>
                </div>

                <div className="perf-divider" style={{ height: '1px', background: 'rgba(255,255,255,0.1)', margin: '4px 0' }} />

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
