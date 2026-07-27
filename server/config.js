/**
 * 可配置的展示字段
 * 对齐 GCs_level / POI 展示字段（见 docs/NC_DATA_MAPPING.md）
 */
export const displayFields = [
    // 1. 人口变化 (Population Grid Cells)
    {
        key: 'wpop_change',
        label: 'Population change',
        color: '#3b82f6',
        format: 'int',
        layerName: 'Population Grid Cells',
        metrics: [
            { key: 'wpop_2010_corrected', label: 'Population in 2010 (persons)', format: 'int' },
            { key: 'wpop_2020_corrected', label: 'Population in 2020 (persons)', format: 'int' },
            { key: 'wpop_change', label: 'Population change', format: 'int' },
            { key: 'wpop_change_ratio', label: 'Population change rate (%)', format: 'percent' }
        ]
    },
    // 2. 小学学龄人口变化 (PSAP Grid Cells)
    {
        key: 'pop_6_11_change',
        label: 'Changes of PSAP',
        color: '#60a5fa',
        format: 'int',
        layerName: 'PSAP Grid Cells',
        metrics: [
            { key: 'pop2010_6_11_corrected', label: 'PSAP in 2010 (persons)', format: 'int' },
            { key: 'pop2020_6_11_corrected', label: 'PSAP in 2020 (persons)', format: 'int' },
            { key: 'pop_6_11_change', label: 'Changes of PSAP', format: 'int' },
            { key: 'pop_6_11_change_ratio', label: 'Change rate of PSAP (%)', format: 'percent' }
        ]
    },
    // 3. 初中学龄人口变化 (JSAP Grid Cells)
    {
        key: 'pop_12_14_change',
        label: 'Changes of JSAP',
        color: '#8b5cf6',
        format: 'int',
        layerName: 'JSAP Grid Cells',
        metrics: [
            { key: 'pop2010_12_14_corrected', label: 'JSAP in 2010 (persons)', format: 'int' },
            { key: 'pop2020_12_14_corrected', label: 'JSAP in 2020 (persons)', format: 'int' },
            { key: 'pop_12_14_change', label: 'Changes of JSAP', format: 'int' },
            { key: 'pop_12_14_change_ratio', label: 'Change rate of JSAP (%)', format: 'percent' }
        ]
    },
    // 4. 小学教育距离变化 (PS Accessibility Distance Grid Cells)
    {
        key: 'ed_ps_change',
        label: 'Changes of PS accessibility distance (m)',
        color: '#f59e0b',
        format: 'float',
        layerName: 'PS Accessibility Distance Grid Cells',
        metrics: [
            { key: 'ED_2010_PSchool', label: 'PS accessibility distance in 2010 (m)', format: 'float' },
            { key: 'ED_2020_PSchool', label: 'PS accessibility distance in 2020 (m)', format: 'float' },
            { key: 'ED_PS_change', label: 'Changes of PS accessibility distance (m)', format: 'float' },
            { key: 'ED_PS_change_ratio', label: 'Change rate of PS accessibility distance (%)', format: 'percent' },
            { key: 'PS_count_change', label: 'Change in the number of PS facilities', format: 'facility_change' }
        ]
    },
    // 5. 初中教育距离变化 (JS Accessibility Distance Grid Cells)
    {
        key: 'ed_js_change',
        label: 'Changes of JS accessibility distance (m)',
        color: '#ef4444',
        format: 'float',
        layerName: 'JS Accessibility Distance Grid Cells',
        metrics: [
            { key: 'ED_2010_JSchool', label: 'JS accessibility distance in 2010 (m)', format: 'float' },
            { key: 'ED_2020_JSchool', label: 'JS accessibility distance in 2020 (m)', format: 'float' },
            { key: 'ED_JS_change', label: 'Changes of JS accessibility distance (m)', format: 'float' },
            { key: 'ED_JS_change_ratio', label: 'Change rate of JS accessibility distance (%)', format: 'percent' },
            { key: 'JS_count_change', label: 'Change in the number of JS facilities', format: 'facility_change' }
        ]
    }
];

/**
 * POI 展示字段（初中 / 小学 PLS）
 */
export const poiDisplayFields = [
    { key: 'name', label: 'Facility Name', color: '#10b981' },
    { key: 'survive_2010_pop', label: 'PLS in 2010', color: '#38bdf8', format: 'int' },
    { key: 'survive_2020_pop', label: 'PLS in 2020', color: '#38bdf8', format: 'int' },
    { key: 'survive_pop_change', label: 'Changes in 2020', color: '#f59e0b', format: 'int' },
    { key: 'survive_pop_change_R', label: 'Change rate of PLS', color: '#a3e635', format: 'percent' }
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
