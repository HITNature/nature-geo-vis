/**
 * 可配置的展示字段
 * 根据 background.md 需求更新为正确的字段
 */
export const displayFields = [
    { key: 'wpop_change', label: '人口变化', color: '#3b82f6' },
    { key: 'pop_6_11_change', label: '小学学龄人口变化', color: '#60a5fa' },
    { key: 'pop_12_14_change', label: '初中学龄人口变化', color: '#8b5cf6' },
    { key: 'PS_count_change', label: '小学数量变化', color: '#22c55e' }, // Special handling in UI for text
    { key: 'JS_count_change', label: '初中数量变化', color: '#84cc16' }, // Special handling in UI for text
    { key: 'ed_ps_change', label: '小学教育距离变化', color: '#f59e0b' },
    { key: 'ed_js_change', label: '初中教育距离变化', color: '#ef4444' },
];

/**
 * POI 展示字段
 */
export const poiDisplayFields = [
    { key: 'name', label: '名称', color: '#10b981' },
    { key: 'survive_2010_pop', label: '2010_survice_pop', color: '#38bdf8' },
    { key: 'survive_2020_pop', label: '2020_survice_pop', color: '#38bdf8' },
    { key: 'survive_pop_change', label: 'survice pop change', color: '#f59e0b' },
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
 * 支持通过环境变量配置，便于部署
 */
export const serverConfig = {
    // Railway/Render 会通过 PORT 环境变量分配端口
    port: process.env.PORT || 3001,

    // CORS 配置：生产环境应指定前端域名，开发环境使用通配符
    // 示例：export FRONTEND_URL=https://your-frontend.vercel.app
    corsOrigin: process.env.FRONTEND_URL || '*',
};
