// API 配置
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';

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

/**
 * 封装 fetch 请求，自动处理 API URL
 * @param {string} path - API 路径
 * @param {RequestInit} options - fetch 选项
 * @returns {Promise<Response>}
 */
export async function apiFetch(path, options = {}) {
    const url = getApiUrl(path);
    return fetch(url, options);
}

export default {
    getApiUrl,
    apiFetch,
};
