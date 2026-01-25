/**
 * 可配置的展示字段
 * 根据 background.md 需求更新为正确的字段
 */
export const displayFields = [
    { key: 'wpop_change', label: 'wpop change', color: '#3b82f6' },
    { key: 'pop_6_11_change', label: 'pop6-11 change', color: '#60a5fa' },
    { key: 'pop_12_14_change', label: 'pop12-14 change', color: '#8b5cf6' },
    { key: 'ed_ps_change', label: 'ed ps change', color: '#f59e0b' },
    { key: 'ed_js_change', label: 'ed js change', color: '#ef4444' },
];

/**
 * POI 展示字段
 */
export const poiDisplayFields = [
    { key: 'name', label: '名称', color: '#10b981' },
    { key: 'survive_pop_change', label: 'survive pop change', color: '#f59e0b' },
];

/**
 * 缩放级别配置
 */
export const zoomConfig = {
    showCities: 4,    // 缩放级别 >= 4 时显示城市边界
    showCells: 8,     // 缩放级别 >= 8 时显示网格
    poiLevels: {
        province: 0,  // 0-7 级显示省级聚合
        city: 8,      // 8-10 级显示市级聚合
        district: 11, // 11-12 级显示区县级聚合
        detail: 13    // >= 13 级显示详细 POI
    },
};

/**
 * 服务器配置
 */
export const serverConfig = {
    port: 3001,
    corsOrigin: '*',
};
