import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import Database from 'better-sqlite3';
import { displayFields, poiDisplayFields, zoomConfig, serverConfig } from './config.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dataDir = path.join(__dirname, '..', 'data');
const dbPath = path.join(dataDir, 'geodata.db');

const app = express();
app.use(cors({ origin: serverConfig.corsOrigin }));
app.use(express.json());

// 初始化数据库连接
let db = null;

function initDatabase() {
    console.log('正在连接 SQLite 数据库...');
    db = new Database(dbPath, { readonly: true });
    db.pragma('cache_size = 5000');
    db.pragma('mmap_size = 268435456'); // 256MB mmap

    // 验证表是否存在
    const tables = db.prepare(`
        SELECT name FROM sqlite_master WHERE type='table'
    `).all().map(t => t.name);

    console.log(`  已加载表: ${tables.join(', ')}`);

    // 输出数据统计
    const stats = {
        boundaries: db.prepare('SELECT COUNT(*) as c FROM boundaries').get().c,
        cities: db.prepare('SELECT COUNT(*) as c FROM cities').get().c,
        cells: db.prepare('SELECT COUNT(*) as c FROM cells').get().c,
        pois: db.prepare('SELECT COUNT(*) as c FROM pois').get().c,
    };

    console.log('  数据统计:');
    Object.entries(stats).forEach(([k, v]) => {
        console.log(`    ${k}: ${v.toLocaleString()} 条`);
    });
}

// 预编译常用查询
let queries = {};

function prepareQueries() {
    // Boundaries - 全量返回（数据量小）
    queries.allBoundaries = db.prepare(`
        SELECT geometry, properties FROM boundaries
    `);

    // Cities - 通过 R-Tree 空间查询
    queries.citiesByBBox = db.prepare(`
        SELECT c.id, c.name, c.geometry, c.properties
        FROM cities c
        INNER JOIN cities_rtree r ON c.id = r.id
        WHERE r.max_x >= ? AND r.min_x <= ?
          AND r.max_y >= ? AND r.min_y <= ?
    `);

    queries.allCities = db.prepare(`
        SELECT id, name, geometry, properties FROM cities
    `);

    // Cells - 通过 R-Tree 空间查询
    queries.cellsByBBox = db.prepare(`
        SELECT c.id, c.cell_id, c.city, c.country,
               c.wpop_change, c.pop_6_11_change, c.pop_12_14_change,
               c.ed_ps_change, c.ed_js_change,
               c.PS_2010_count, c.PS_2020_count, c.JS_2010_count, c.JS_2020_count,
               c.geometry, c.properties
        FROM cells c
        INNER JOIN cells_rtree r ON c.id = r.id
        WHERE r.max_x >= ? AND r.min_x <= ?
          AND r.max_y >= ? AND r.min_y <= ?
    `);

    queries.cellById = db.prepare(`
        SELECT * FROM cells WHERE cell_id = ?
    `);

    // POIs - 通过 R-Tree 空间查询
    queries.poisByBBox = db.prepare(`
        SELECT p.id, p.name, p.poi_type, p.province, p.city, p.district,
               p.lng, p.lat, p.survive_pop_change, p.properties
        FROM pois p
        INNER JOIN pois_rtree r ON p.id = r.id
        WHERE r.max_x >= ? AND r.min_x <= ?
          AND r.max_y >= ? AND r.min_y <= ?
          AND (? = 'all' OR p.poi_type = ? OR (p.poi_type IS NULL AND ? = 'JS'))
    `);

    // 聚合数据
    queries.aggregatedProvince = db.prepare(`
        SELECT name, key, count, lng, lat, level FROM pois_aggregated_province
    `);

    queries.aggregatedCity = db.prepare(`
        SELECT name, key, count, lng, lat, level FROM pois_aggregated_city
    `);

    queries.aggregatedDistrict = db.prepare(`
        SELECT name, key, count, lng, lat, level FROM pois_aggregated_district
    `);

    // 搜索地点和 POI
    queries.searchPlaces = db.prepare(`
        SELECT name, 'province' AS type, lng, lat FROM pois_aggregated_province WHERE name LIKE ?
        UNION ALL
        SELECT name, 'city' AS type, lng, lat FROM pois_aggregated_city WHERE name LIKE ?
        UNION ALL
        SELECT name, 'district' AS type, lng, lat FROM pois_aggregated_district WHERE name LIKE ?
        LIMIT 15
    `);

    queries.searchPois = db.prepare(`
        SELECT name, 'poi' AS type, lng, lat FROM pois WHERE name LIKE ? LIMIT 10
    `);
}

// 工具函数：构建 GeoJSON FeatureCollection
function toFeatureCollection(rows, geometryField = 'geometry') {
    return {
        type: 'FeatureCollection',
        features: rows.map((row, idx) => {
            const geometry = typeof row[geometryField] === 'string'
                ? JSON.parse(row[geometryField])
                : row[geometryField];

            // 从 properties JSON 或直接从行数据构建属性
            let properties = {};
            if (row.properties) {
                properties = typeof row.properties === 'string'
                    ? JSON.parse(row.properties)
                    : row.properties;
            } else {
                // 直接使用行数据作为属性
                properties = { ...row };
                delete properties[geometryField];
                delete properties.properties;
            }

            return {
                type: 'Feature',
                id: row.id || idx,
                geometry,
                properties
            };
        })
    };
}

// 工具函数：构建 POI 聚合 FeatureCollection
function toAggregatedFeatureCollection(rows) {
    return {
        type: 'FeatureCollection',
        features: rows.map((row, idx) => ({
            type: 'Feature',
            id: `${row.level}-${idx}`,
            geometry: {
                type: 'Point',
                coordinates: [row.lng, row.lat]
            },
            properties: {
                name: row.name,
                key: row.key,
                count: row.count,
                level: row.level,
                isCluster: true
            }
        }))
    };
}

// API: 获取配置
app.get('/api/config', (req, res) => {
    res.json({
        displayFields,
        poiDisplayFields,
        zoomConfig,
    });
});

// API: 获取国境线 (静态数据，全量返回)
app.get('/api/boundaries', (req, res) => {
    const rows = queries.allBoundaries.all();
    res.json(toFeatureCollection(rows));
});

// API: 获取城市边界
app.get('/api/cities', (req, res) => {
    const { bbox } = req.query;

    if (bbox) {
        const [west, south, east, north] = bbox.split(',').map(Number);
        const rows = queries.citiesByBBox.all(west, east, south, north);
        return res.json(toFeatureCollection(rows));
    }

    const rows = queries.allCities.all();
    res.json(toFeatureCollection(rows));
});

// API: 获取网格数据 (支持 bbox + zoom 过滤)
app.get('/api/cells', (req, res) => {
    const { bbox, zoom } = req.query;
    const zoomLevel = parseInt(zoom) || 10;

    // 如果缩放级别不够，返回空数据
    if (zoomLevel < zoomConfig.showCells) {
        return res.json({ type: 'FeatureCollection', features: [] });
    }

    if (!bbox) {
        return res.status(400).json({ error: 'bbox is required for cells query' });
    }

    const [west, south, east, north] = bbox.split(',').map(Number);
    const rows = queries.cellsByBBox.all(west, east, south, north);

    // properties JSON 含完整新字段；列字段作兜底
    const features = rows.map((row, idx) => {
        let props = {};
        try {
            props = row.properties ? JSON.parse(row.properties) : {};
        } catch {
            props = {};
        }
        return {
            type: 'Feature',
            id: row.id || idx,
            geometry: JSON.parse(row.geometry),
            properties: {
                ...props,
                id: row.cell_id ?? props.id,
                city: row.city ?? props.city,
                country: row.country ?? props.country,
                wpop_change: row.wpop_change ?? props.wpop_change,
                pop_6_11_change: row.pop_6_11_change ?? props.pop_6_11_change,
                pop_12_14_change: row.pop_12_14_change ?? props.pop_12_14_change,
                ed_ps_change: row.ed_ps_change ?? props.ed_ps_change ?? props.ED_PS_change,
                ed_js_change: row.ed_js_change ?? props.ed_js_change ?? props.ED_JS_change,
                ED_PS_change: row.ed_ps_change ?? props.ED_PS_change,
                ED_JS_change: row.ed_js_change ?? props.ED_JS_change,
                PS_2010_count: row.PS_2010_count ?? props.PS_2010_count,
                PS_2020_count: row.PS_2020_count ?? props.PS_2020_count,
                JS_2010_count: row.JS_2010_count ?? props.JS_2010_count,
                JS_2020_count: row.JS_2020_count ?? props.JS_2020_count,
            }
        };
    });

    res.json({ type: 'FeatureCollection', features });
});

// API: 获取单个网格详情
app.get('/api/cell/:id', (req, res) => {
    const id = parseInt(req.params.id);
    const row = queries.cellById.get(id);

    if (!row) {
        return res.status(404).json({ error: 'Cell not found' });
    }

    res.json({
        type: 'Feature',
        id: row.id,
        geometry: JSON.parse(row.geometry),
        properties: JSON.parse(row.properties)
    });
});

// API: 获取 POI 数据（按行政级别聚合）
app.get('/api/pois/aggregated', (req, res) => {
    const { level } = req.query;

    let rows;
    switch (level) {
        case 'province':
            rows = queries.aggregatedProvince.all();
            break;
        case 'city':
            rows = queries.aggregatedCity.all();
            break;
        case 'district':
            rows = queries.aggregatedDistrict.all();
            break;
        default:
            return res.status(400).json({ error: 'Invalid aggregation level' });
    }

    res.json(toAggregatedFeatureCollection(rows));
});

// API: 获取 POI 数据（按城市聚合） - 保持向下兼容
app.get('/api/pois/city-clusters', (req, res) => {
    const rows = queries.aggregatedCity.all();
    res.json(toAggregatedFeatureCollection(rows));
});

// API: 获取 POI 数据
app.get('/api/pois', (req, res) => {
    const { bbox, zoom, type } = req.query;
    const zoomLevel = parseInt(zoom) || 10;
    const poiType = (type || 'all').toUpperCase(); // JS | PS | ALL

    if (zoomLevel < zoomConfig.poiLevels.detail) {
        return res.json({ type: 'FeatureCollection', features: [] });
    }

    if (!bbox) {
        return res.status(400).json({ error: 'bbox is required for POI query' });
    }

    const [west, south, east, north] = bbox.split(',').map(Number);
    const filter = poiType === 'ALL' ? 'all' : poiType;
    const rows = queries.poisByBBox.all(west, east, south, north, filter, filter, filter);

    const features = rows.map((row, idx) => {
        let extra = {};
        try {
            extra = row.properties ? JSON.parse(row.properties) : {};
        } catch {
            extra = {};
        }
        return {
            type: 'Feature',
            id: row.id || idx,
            geometry: {
                type: 'Point',
                coordinates: [row.lng, row.lat]
            },
            properties: {
                ...extra,
                name: row.name,
                poi_type: row.poi_type || extra.poi_type || 'JS',
                province: row.province,
                city: row.city,
                district: row.district,
                survive_pop_change: row.survive_pop_change ?? extra.survive_pop_change,
            }
        };
    });

    res.json({ type: 'FeatureCollection', features });
});

// API: 搜索地点和 POI
app.get('/api/search', (req, res) => {
    const { q } = req.query;
    if (!q || q.trim() === '') {
        return res.json([]);
    }

    try {
        const likeParam = `%${q}%`;
        const places = queries.searchPlaces.all(likeParam, likeParam, likeParam);
        const pois = queries.searchPois.all(likeParam);

        // 合并结果，地点优先，POI 靠后
        const results = [
            ...places.map(p => ({ ...p, category: 'place' })),
            ...pois.map(p => ({ ...p, category: 'poi' }))
        ];

        res.json(results);
    } catch (error) {
        console.error('搜索失败:', error);
        res.status(500).json({ error: '搜索失败', message: error.message });
    }
});

// 健康检查
app.get('/api/health', (req, res) => {
    try {
        const count = db.prepare('SELECT COUNT(*) as c FROM pois').get().c;
        res.json({ status: 'ok', poisCount: count });
    } catch (error) {
        res.status(500).json({ status: 'error', message: error.message });
    }
});

// 启动服务器
try {
    initDatabase();
    prepareQueries();

    app.listen(serverConfig.port, () => {
        console.log(`\n🚀 Server running at http://localhost:${serverConfig.port}`);
        console.log(`\nAPI Endpoints:`);
        console.log(`  GET /api/config           - 获取配置`);
        console.log(`  GET /api/health           - 健康检查`);
        console.log(`  GET /api/boundaries       - 获取国境线`);
        console.log(`  GET /api/cities?bbox=     - 获取城市边界`);
        console.log(`  GET /api/cells?bbox=&zoom=  - 获取网格数据`);
        console.log(`  GET /api/cell/:id         - 获取网格详情`);
        console.log(`  GET /api/pois?bbox=&zoom=   - 获取 POI 数据`);
        console.log(`  GET /api/pois/aggregated?level= - 获取聚合数据`);
    });
} catch (error) {
    console.error('❌ 启动失败:', error.message);
    console.error('\n请确保已运行数据导入脚本:');
    console.error('  npm run import-data');
    process.exit(1);
}

// 优雅关闭
process.on('SIGINT', () => {
    console.log('\n正在关闭数据库连接...');
    if (db) db.close();
    process.exit(0);
});
