/**
 * 可配置的展示字段
 * 对齐 toXY0723/平台展示信息toXY.md（GCs_level / POI）
 */
export const displayFields = [
    // 人口
    { key: 'wpop_2010_corrected', label: '人口 2010', color: '#3b82f6', format: 'int' },
    { key: 'wpop_2020_corrected', label: '人口 2020', color: '#3b82f6', format: 'int' },
    { key: 'wpop_change', label: '人口变化', color: '#3b82f6', format: 'int' },
    { key: 'wpop_change_ratio', label: '人口变化率', color: '#3b82f6', format: 'percent' },
    { key: 'pop2010_6_11_corrected', label: 'PSAP 2010', color: '#60a5fa', format: 'int' },
    { key: 'pop2020_6_11_corrected', label: 'PSAP 2020', color: '#60a5fa', format: 'int' },
    { key: 'pop_6_11_change', label: 'PSAP 变化', color: '#60a5fa', format: 'int' },
    { key: 'pop_6_11_change_ratio', label: 'PSAP 变化率', color: '#60a5fa', format: 'percent' },
    { key: 'pop2010_12_14_corrected', label: 'JSAP 2010', color: '#8b5cf6', format: 'int' },
    { key: 'pop2020_12_14_corrected', label: 'JSAP 2020', color: '#8b5cf6', format: 'int' },
    { key: 'pop_12_14_change', label: 'JSAP 变化', color: '#8b5cf6', format: 'int' },
    { key: 'pop_12_14_change_ratio', label: 'JSAP 变化率', color: '#8b5cf6', format: 'percent' },
    // 教育距离
    { key: 'ED_2010_PSchool', label: '小学可达距离 2010 (m)', color: '#f59e0b', format: 'float' },
    { key: 'ED_2020_PSchool', label: '小学可达距离 2020 (m)', color: '#f59e0b', format: 'float' },
    { key: 'ED_PS_change', label: '小学可达距离变化', color: '#f59e0b', format: 'float' },
    { key: 'ED_PS_change_ratio', label: '小学可达距离变化率', color: '#f59e0b', format: 'percent' },
    { key: 'ED_2010_JSchool', label: '初中可达距离 2010 (m)', color: '#ef4444', format: 'float' },
    { key: 'ED_2020_JSchool', label: '初中可达距离 2020 (m)', color: '#ef4444', format: 'float' },
    { key: 'ED_JS_change', label: '初中可达距离变化', color: '#ef4444', format: 'float' },
    { key: 'ED_JS_change_ratio', label: '初中可达距离变化率', color: '#ef4444', format: 'percent' },
    // 兼容旧 UI（学校数量箭头展示）
    { key: 'PS_count_change', label: '小学数量 2010→2020', color: '#22c55e' },
    { key: 'JS_count_change', label: '初中数量 2010→2020', color: '#84cc16' },
];

/**
 * POI 展示字段（初中 / 小学 PLS）
 */
export const poiDisplayFields = [
    { key: 'name', label: '名称', color: '#10b981' },
    { key: 'poi_type', label: '类型', color: '#94a3b8' },
    { key: 'survive_2010_pop', label: 'PLS 2010', color: '#38bdf8', format: 'int' },
    { key: 'survive_2020_pop', label: 'PLS 2020', color: '#38bdf8', format: 'int' },
    { key: 'survive_pop_change', label: 'PLS 变化', color: '#f59e0b', format: 'int' },
    { key: 'survive_pop_change_R', label: 'PLS 变化率', color: '#f59e0b', format: 'percent' },
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
