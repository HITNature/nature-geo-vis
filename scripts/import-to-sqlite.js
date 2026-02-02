/**
 * GeoJSON 转 SQLite 脚本
 * 将 GeoJSON 数据导入 SQLite 数据库，支持空间索引
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import Database from 'better-sqlite3';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dataDir = path.join(__dirname, '..', 'data');
const dbPath = path.join(dataDir, 'geodata.db');

// 删除旧数据库
if (fs.existsSync(dbPath)) {
    console.log('删除旧数据库...');
    fs.unlinkSync(dbPath);
}

const db = new Database(dbPath);

// 启用性能优化
db.pragma('journal_mode = WAL');
db.pragma('synchronous = OFF');
db.pragma('cache_size = 10000');

console.log('=== GeoJSON 转 SQLite ===\n');
console.log(`数据库: ${dbPath}\n`);

/**
 * 从分片或单文件加载 GeoJSON
 */
function loadGeoJSON(baseName) {
    const singleFile = path.join(dataDir, `${baseName}.geojson`);
    const chunksDir = path.join(dataDir, `${baseName}_chunks`);
    const indexFile = path.join(chunksDir, '_index.json');

    // 优先从分片加载
    if (fs.existsSync(indexFile)) {
        console.log(`  从分片加载: ${baseName}_chunks/`);
        const index = JSON.parse(fs.readFileSync(indexFile, 'utf-8'));
        const allFeatures = [];

        for (const chunk of index.chunks) {
            const chunkPath = path.join(chunksDir, chunk.filename);
            const chunkData = JSON.parse(fs.readFileSync(chunkPath, 'utf-8'));
            allFeatures.push(...chunkData.features);
            process.stdout.write(`\r    已加载 ${allFeatures.length}/${index.totalFeatures} 个特征`);
        }
        console.log('');

        return { type: 'FeatureCollection', features: allFeatures };
    }

    // 从单文件加载
    if (fs.existsSync(singleFile)) {
        console.log(`  从单文件加载: ${baseName}.geojson`);
        return JSON.parse(fs.readFileSync(singleFile, 'utf-8'));
    }

    // 检查备份文件
    const backupFile = singleFile + '.backup';
    if (fs.existsSync(backupFile)) {
        console.log(`  从备份加载: ${baseName}.geojson.backup`);
        return JSON.parse(fs.readFileSync(backupFile, 'utf-8'));
    }

    console.log(`  跳过: ${baseName} 不存在`);
    return { type: 'FeatureCollection', features: [] };
}

/**
 * 计算多边形的边界框
 */
function getBBox(geometry) {
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;

    function processCoords(coords) {
        if (typeof coords[0] === 'number') {
            // 单点 [lng, lat]
            minX = Math.min(minX, coords[0]);
            maxX = Math.max(maxX, coords[0]);
            minY = Math.min(minY, coords[1]);
            maxY = Math.max(maxY, coords[1]);
        } else {
            // 数组of坐标
            coords.forEach(processCoords);
        }
    }

    if (geometry.coordinates) {
        processCoords(geometry.coordinates);
    }

    return { minX, minY, maxX, maxY };
}

/**
 * 导入 Boundaries（国境线）
 */
function importBoundaries() {
    console.log('\n📍 导入 Boundaries...');

    db.exec(`
        CREATE TABLE IF NOT EXISTS boundaries (
            id INTEGER PRIMARY KEY,
            geometry TEXT NOT NULL,
            properties TEXT
        )
    `);

    const data = loadGeoJSON('boundaries');
    const insert = db.prepare(`
        INSERT INTO boundaries (geometry, properties) VALUES (?, ?)
    `);

    const insertMany = db.transaction((features) => {
        for (const f of features) {
            insert.run(JSON.stringify(f.geometry), JSON.stringify(f.properties || {}));
        }
    });

    insertMany(data.features);
    console.log(`  ✅ 导入 ${data.features.length} 条国境线`);
}

/**
 * 导入 Cities（行政区划）
 */
function importCities() {
    console.log('\n📍 导入 Cities...');

    db.exec(`
        CREATE TABLE IF NOT EXISTS cities (
            id INTEGER PRIMARY KEY,
            name TEXT,
            min_x REAL,
            min_y REAL,
            max_x REAL,
            max_y REAL,
            geometry TEXT NOT NULL,
            properties TEXT
        )
    `);

    // 创建空间索引（R-Tree）
    db.exec(`
        CREATE VIRTUAL TABLE IF NOT EXISTS cities_rtree USING rtree(
            id,
            min_x, max_x,
            min_y, max_y
        )
    `);

    const data = loadGeoJSON('cities');

    const insertCity = db.prepare(`
        INSERT INTO cities (name, min_x, min_y, max_x, max_y, geometry, properties)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    const insertRTree = db.prepare(`
        INSERT INTO cities_rtree (id, min_x, max_x, min_y, max_y)
        VALUES (?, ?, ?, ?, ?)
    `);

    const insertMany = db.transaction((features) => {
        for (const f of features) {
            const bbox = getBBox(f.geometry);
            const name = f.properties?.city || f.properties?.City_name_CN || f.properties?.name || '';

            const result = insertCity.run(
                name,
                bbox.minX, bbox.minY, bbox.maxX, bbox.maxY,
                JSON.stringify(f.geometry),
                JSON.stringify(f.properties || {})
            );

            insertRTree.run(
                result.lastInsertRowid,
                bbox.minX, bbox.maxX,
                bbox.minY, bbox.maxY
            );
        }
    });

    insertMany(data.features);
    console.log(`  ✅ 导入 ${data.features.length} 个行政区划`);
}

/**
 * 导入 Cells（网格数据） - 核心优化点
 */
function importCells() {
    console.log('\n📍 导入 Cells（网格数据）...');

    db.exec(`
        CREATE TABLE IF NOT EXISTS cells (
            id INTEGER PRIMARY KEY,
            cell_id INTEGER,
            city TEXT,
            country TEXT,
            min_x REAL,
            min_y REAL,
            max_x REAL,
            max_y REAL,
            wpop_change REAL,
            pop_6_11_change REAL,
            pop_12_14_change REAL,
            ed_ps_change REAL,
            ed_js_change REAL,
            PS_2010_count INTEGER,
            PS_2020_count INTEGER,
            JS_2010_count INTEGER,
            JS_2020_count INTEGER,
            geometry TEXT NOT NULL,
            properties TEXT
        )
    `);

    // 创建空间索引
    db.exec(`
        CREATE VIRTUAL TABLE IF NOT EXISTS cells_rtree USING rtree(
            id,
            min_x, max_x,
            min_y, max_y
        )
    `);

    const data = loadGeoJSON('cells');

    const insertCell = db.prepare(`
        INSERT INTO cells (
            cell_id, city, country,
            min_x, min_y, max_x, max_y,
            wpop_change, pop_6_11_change, pop_12_14_change,
            ed_ps_change, ed_js_change,
            PS_2010_count, PS_2020_count, JS_2010_count, JS_2020_count,
            geometry, properties
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const insertRTree = db.prepare(`
        INSERT INTO cells_rtree (id, min_x, max_x, min_y, max_y)
        VALUES (?, ?, ?, ?, ?)
    `);

    let count = 0;
    const batchSize = 10000;
    const total = data.features.length;

    const insertBatch = db.transaction((features) => {
        for (const f of features) {
            const bbox = getBBox(f.geometry);
            const props = f.properties || {};

            const result = insertCell.run(
                props.id || null,
                props.city || null,
                props.country || null,
                bbox.minX, bbox.minY, bbox.maxX, bbox.maxY,
                props.wpop_change || null,
                props.pop_6_11_change || props['pop6-11_change'] || null,
                props.pop_12_14_change || props['pop12-14_change'] || null,
                props.ed_ps_change || props.ED_PS_change || null,
                props.ed_js_change || props.ED_JS_change || null,
                props.PS_2010_count || null,
                props.PS_2020_count || null,
                props.JS_2010_count || null,
                props.JS_2020_count || null,
                JSON.stringify(f.geometry),
                JSON.stringify(props)
            );

            insertRTree.run(
                result.lastInsertRowid,
                bbox.minX, bbox.maxX,
                bbox.minY, bbox.maxY
            );

            count++;
        }
    });

    // 分批导入
    for (let i = 0; i < total; i += batchSize) {
        const batch = data.features.slice(i, i + batchSize);
        insertBatch(batch);
        process.stdout.write(`\r    已导入 ${Math.min(i + batchSize, total)}/${total} 个网格`);
    }

    console.log(`\n  ✅ 导入 ${count} 个网格`);
}

/**
 * 导入 POIs
 */
function importPOIs() {
    console.log('\n📍 导入 POIs...');

    db.exec(`
        CREATE TABLE IF NOT EXISTS pois (
            id INTEGER PRIMARY KEY,
            name TEXT,
            province TEXT,
            city TEXT,
            district TEXT,
            lng REAL,
            lat REAL,
            survive_pop_change REAL,
            geometry TEXT NOT NULL,
            properties TEXT
        )
    `);

    // 创建空间索引
    db.exec(`
        CREATE VIRTUAL TABLE IF NOT EXISTS pois_rtree USING rtree(
            id,
            min_x, max_x,
            min_y, max_y
        )
    `);

    // 创建普通索引用于聚合查询
    db.exec(`CREATE INDEX IF NOT EXISTS idx_pois_province ON pois(province)`);
    db.exec(`CREATE INDEX IF NOT EXISTS idx_pois_city ON pois(city)`);
    db.exec(`CREATE INDEX IF NOT EXISTS idx_pois_district ON pois(district)`);

    const data = loadGeoJSON('pois');

    const insertPOI = db.prepare(`
        INSERT INTO pois (name, province, city, district, lng, lat, survive_pop_change, geometry, properties)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const insertRTree = db.prepare(`
        INSERT INTO pois_rtree (id, min_x, max_x, min_y, max_y)
        VALUES (?, ?, ?, ?, ?)
    `);

    const insertMany = db.transaction((features) => {
        for (const f of features) {
            const coords = f.geometry?.coordinates || [0, 0];
            const props = f.properties || {};

            const result = insertPOI.run(
                props.name || null,
                props.province || null,
                props.city || null,
                props.district || null,
                coords[0],
                coords[1],
                props.survive_pop_change || null,
                JSON.stringify(f.geometry),
                JSON.stringify(props)
            );

            insertRTree.run(
                result.lastInsertRowid,
                coords[0], coords[0],
                coords[1], coords[1]
            );
        }
    });

    insertMany(data.features);
    console.log(`  ✅ 导入 ${data.features.length} 个 POI`);
}

/**
 * 创建聚合视图（预计算）
 */
function createAggregationViews() {
    console.log('\n📊 创建聚合视图...');

    // 省级聚合
    db.exec(`
        CREATE TABLE IF NOT EXISTS pois_aggregated_province AS
        SELECT 
            province as name,
            province as key,
            COUNT(*) as count,
            AVG(lng) as lng,
            AVG(lat) as lat,
            'province' as level
        FROM pois
        WHERE province IS NOT NULL
        GROUP BY province
    `);

    // 市级聚合
    db.exec(`
        CREATE TABLE IF NOT EXISTS pois_aggregated_city AS
        SELECT 
            city as name,
            province || ':' || city as key,
            COUNT(*) as count,
            AVG(lng) as lng,
            AVG(lat) as lat,
            'city' as level
        FROM pois
        WHERE city IS NOT NULL
        GROUP BY province, city
    `);

    // 区县级聚合
    db.exec(`
        CREATE TABLE IF NOT EXISTS pois_aggregated_district AS
        SELECT 
            district as name,
            province || ':' || city || ':' || district as key,
            COUNT(*) as count,
            AVG(lng) as lng,
            AVG(lat) as lat,
            'district' as level
        FROM pois
        WHERE district IS NOT NULL
        GROUP BY province, city, district
    `);

    const provinceCount = db.prepare('SELECT COUNT(*) as c FROM pois_aggregated_province').get().c;
    const cityCount = db.prepare('SELECT COUNT(*) as c FROM pois_aggregated_city').get().c;
    const districtCount = db.prepare('SELECT COUNT(*) as c FROM pois_aggregated_district').get().c;

    console.log(`  ✅ 省级聚合: ${provinceCount} 条`);
    console.log(`  ✅ 市级聚合: ${cityCount} 条`);
    console.log(`  ✅ 区县级聚合: ${districtCount} 条`);
}

/**
 * 输出数据库统计
 */
function printStats() {
    console.log('\n📈 数据库统计:');

    const tables = [
        'boundaries', 'cities', 'cells', 'pois',
        'pois_aggregated_province', 'pois_aggregated_city', 'pois_aggregated_district'
    ];

    for (const table of tables) {
        try {
            const count = db.prepare(`SELECT COUNT(*) as c FROM ${table}`).get().c;
            console.log(`  ${table}: ${count.toLocaleString()} 条`);
        } catch (e) {
            // 表不存在
        }
    }

    // 文件大小
    const stats = fs.statSync(dbPath);
    console.log(`\n📦 数据库大小: ${(stats.size / 1024 / 1024).toFixed(1)}MB`);
}

// 执行导入
try {
    db.exec('BEGIN TRANSACTION');

    importBoundaries();
    importCities();
    importCells();
    importPOIs();
    createAggregationViews();

    db.exec('COMMIT');
    printStats();

    console.log('\n✅ 数据导入完成!');
} catch (error) {
    db.exec('ROLLBACK');
    console.error('\n❌ 导入失败:', error.message);
    throw error;
} finally {
    db.close();
}
