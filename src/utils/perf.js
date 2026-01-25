/**
 * Simple Performance Measurement Utility
 */
class PerfTracker {
    constructor() {
        this.metrics = {
            fps: 0,
            loadTimes: {}, // key: duration
            counts: {},    // key: number
            history: []     // Recent events
        };
        this.listeners = new Set();
        this._lastTime = performance.now();
        this._frames = 0;
        this._fps = 0;

        this.startFPSCounter();
    }

    startFPSCounter() {
        const loop = () => {
            this._frames++;
            const now = performance.now();
            if (now >= this._lastTime + 1000) {
                this._fps = Math.round((this._frames * 1000) / (now - this._lastTime));
                this.metrics.fps = this._fps;
                this._frames = 0;
                this._lastTime = now;
                this.notify();
            }
            requestAnimationFrame(loop);
        };
        requestAnimationFrame(loop);
    }

    startMeasure(name) {
        const start = performance.now();
        return () => {
            const duration = performance.now() - start;
            this.metrics.loadTimes[name] = duration.toFixed(2);
            this.addHistory(`Task ${name} took ${duration.toFixed(2)}ms`);
            this.notify();
        };
    }

    setCount(name, value) {
        this.metrics.counts[name] = value;
        this.notify();
    }

    addHistory(msg) {
        this.metrics.history = [
            { id: Date.now(), msg, time: new Date().toLocaleTimeString() },
            ...this.metrics.history.slice(0, 9)
        ];
        this.notify();
    }

    subscribe(listener) {
        this.listeners.add(listener);
        return () => this.listeners.delete(listener);
    }

    notify() {
        this.listeners.forEach(l => l({ ...this.metrics }));
    }

    getMetrics() {
        return { ...this.metrics };
    }
}

export const perf = new PerfTracker();
