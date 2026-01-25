/**
 * Data Worker for Handling Heavy POI Fetching and Parsing
 */

self.onmessage = async (e) => {
    const { type, url, requestId } = e.data;

    if (type === 'FETCH_POIS') {
        const start = performance.now();
        try {
            const response = await fetch(url);
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

            // Heavy part: Parsing JSON off-thread
            const data = await response.json();

            const duration = performance.now() - start;

            // Send back data
            self.postMessage({
                type: 'FETCH_POIS_SUCCESS',
                data,
                requestId,
                workerDuration: duration
            });
        } catch (error) {
            self.postMessage({
                type: 'FETCH_POIS_ERROR',
                error: error.message,
                requestId
            });
        }
    }
};
