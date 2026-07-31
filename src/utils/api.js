// API 配置
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';

/** @typedef {{ path: string, label: string, startedAt: number, ttfbMs: number | null, bytes: number, speedBps: number | null }} InFlightRequest */
/** @typedef {{ inFlight: number, active: InFlightRequest[], lastLatencyMs: number | null, lastSpeedBps: number | null, lastBytes: number | null, lastPath: string | null, updatedAt: number }} NetworkSnapshot */

const listeners = new Set();

/** @type {Map<number, InFlightRequest>} */
const activeRequests = new Map();
let reqSeq = 0;
let lastLatencyMs = null;
let lastSpeedBps = null;
let lastBytes = null;
let lastPath = null;

function notify() {
    const snapshot = getNetworkSnapshot();
    listeners.forEach((fn) => {
        try { fn(snapshot); } catch { /* ignore subscriber errors */ }
    });
}

/**
 * @returns {NetworkSnapshot}
 */
export function getNetworkSnapshot() {
    const active = Array.from(activeRequests.values());
    const liveSpeeds = active.map((r) => r.speedBps).filter((v) => typeof v === 'number' && v > 0);
    const liveSpeed = liveSpeeds.length
        ? liveSpeeds.reduce((a, b) => a + b, 0) / liveSpeeds.length
        : lastSpeedBps;

    return {
        inFlight: active.length,
        active,
        lastLatencyMs,
        lastSpeedBps: liveSpeed,
        lastBytes,
        lastPath,
        updatedAt: Date.now(),
    };
}

/**
 * Subscribe to network stats updates.
 * @param {(snap: NetworkSnapshot) => void} listener
 * @returns {() => void} unsubscribe
 */
export function subscribeNetworkStats(listener) {
    listeners.add(listener);
    listener(getNetworkSnapshot());
    return () => listeners.delete(listener);
}

/**
 * 构建完整的 API URL
 * @param {string} path - API 路径，例如 '/api/config'
 * @returns {string} 完整的 API URL
 */
export function getApiUrl(path) {
    // 确保 path 以 / 开头
    const normalizedPath = path.startsWith('/') ? path : `/${path}`;

    // 如果设置了 API_BASE_URL，使用完整 URL；否则使用相对路径（开发环境通过 proxy）
    return API_BASE_URL ? `${API_BASE_URL}${normalizedPath}` : normalizedPath;
}

function pathLabel(path) {
    if (path.includes('/pois/aggregated')) return 'school clusters';
    if (path.includes('/pois')) return 'school points';
    if (path.includes('/cells')) return 'grid cells';
    if (path.includes('/cities')) return 'city boundaries';
    if (path.includes('/boundaries')) return 'map boundaries';
    if (path.includes('/config')) return 'config';
    if (path.includes('/search') || path.includes('/places')) return 'search';
    return path.replace(/^\/api\//, '') || 'data';
}

/**
 * Read response body while measuring throughput, then return a new Response
 * so callers can still call .json() / .text().
 * @param {Response} response
 * @param {number} reqId
 */
async function instrumentBody(response, reqId) {
    const entry = activeRequests.get(reqId);
    if (!entry || !response.body) {
        return response;
    }

    const reader = response.body.getReader();
    const chunks = [];
    let bytes = 0;
    const downloadStart = performance.now();

    while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        chunks.push(value);
        bytes += value.byteLength;
        const elapsedSec = Math.max((performance.now() - downloadStart) / 1000, 0.001);
        entry.bytes = bytes;
        entry.speedBps = bytes / elapsedSec;
        activeRequests.set(reqId, entry);
        notify();
    }

    const elapsedSec = Math.max((performance.now() - downloadStart) / 1000, 0.001);
    const speedBps = bytes / elapsedSec;
    lastBytes = bytes;
    lastSpeedBps = speedBps;
    lastPath = entry.path;

    const totalLength = chunks.reduce((n, c) => n + c.byteLength, 0);
    const merged = new Uint8Array(totalLength);
    let offset = 0;
    for (const chunk of chunks) {
        merged.set(chunk, offset);
        offset += chunk.byteLength;
    }

    return new Response(merged, {
        status: response.status,
        statusText: response.statusText,
        headers: response.headers,
    });
}

/**
 * 封装 fetch 请求，自动处理 API URL，并统计延迟 / 吞吐
 * @param {string} path - API 路径
 * @param {RequestInit} options - fetch 选项
 * @returns {Promise<Response>}
 */
export async function apiFetch(path, options = {}) {
    const url = getApiUrl(path);
    const reqId = ++reqSeq;
    const startedAt = performance.now();
    const label = pathLabel(path);

    activeRequests.set(reqId, {
        path,
        label,
        startedAt,
        ttfbMs: null,
        bytes: 0,
        speedBps: null,
    });
    notify();

    try {
        const response = await fetch(url, options);
        const ttfbMs = Math.round(performance.now() - startedAt);
        lastLatencyMs = ttfbMs;
        lastPath = path;

        const entry = activeRequests.get(reqId);
        if (entry) {
            entry.ttfbMs = ttfbMs;
            activeRequests.set(reqId, entry);
            notify();
        }

        // 仅对成功且有 body 的响应测速；错误响应仍原样返回
        if (response.ok && response.body) {
            return await instrumentBody(response, reqId);
        }
        return response;
    } finally {
        activeRequests.delete(reqId);
        notify();
    }
}

/** Format helpers for UI */
export function formatLatency(ms) {
    if (ms == null || Number.isNaN(ms)) return '—';
    if (ms < 1000) return `${Math.round(ms)} ms`;
    return `${(ms / 1000).toFixed(1)} s`;
}

export function formatSpeed(bps) {
    if (bps == null || Number.isNaN(bps) || bps <= 0) return '—';
    const kbps = bps / 1024;
    if (kbps < 1024) return `${kbps.toFixed(0)} KB/s`;
    return `${(kbps / 1024).toFixed(2)} MB/s`;
}

export function formatBytes(bytes) {
    if (bytes == null || Number.isNaN(bytes)) return '—';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export default {
    getApiUrl,
    apiFetch,
    subscribeNetworkStats,
    getNetworkSnapshot,
    formatLatency,
    formatSpeed,
    formatBytes,
};
