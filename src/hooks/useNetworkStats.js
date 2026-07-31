import { useEffect, useState } from 'react';
import { getNetworkSnapshot, subscribeNetworkStats } from '../utils/api';

/**
 * Live API network stats (in-flight requests, latency, throughput).
 */
export function useNetworkStats() {
    const [stats, setStats] = useState(() => getNetworkSnapshot());

    useEffect(() => {
        return subscribeNetworkStats(setStats);
    }, []);

    // Tick elapsed time while requests are in flight
    useEffect(() => {
        if (stats.inFlight <= 0) return undefined;
        const id = setInterval(() => {
            setStats(getNetworkSnapshot());
        }, 200);
        return () => clearInterval(id);
    }, [stats.inFlight]);

    return stats;
}

export default useNetworkStats;
