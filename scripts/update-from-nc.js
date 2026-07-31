/**
 * 从根目录 geodatabase.db 更新本地 GeoJSON
 *
 * 用法：先用新库覆盖根目录 geodatabase.db，再执行
 *   npm run update-from-nc
 *
 * 策略：
 * - GCs_level / city_level：几何仍是 ESRI Shape blob
 *   → 复用现有 cells_chunks / cities.geojson 几何，按 OBJECTID 合并新属性
 * - JS_POI_level / PS_POI_level：有明文 lon/lat，直接导出
 *   → JS 保留旧 pois 的省市区字段（新库 JS 表无行政字段）
 * - boundaries：新库若无国境线表，沿用现有 boundaries.geojson
 */

import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.join(__dirname, '..');
const dataDir = path.join(rootDir, 'data');
const ncPath = path.join(rootDir, 'geodatabase.db');

if (!fs.existsSync(ncPath)) {
    console.error('找不到源库:', ncPath);
    console.error('请先将新的 .geodatabase 覆盖到项目根目录 geodatabase.db');
    process.exit(1);
}

const db = new Database(ncPath, { readonly: true });

// 加载省市英文名称映射（city_level0727）；若反馈库缺失则回退到已有 cities.geojson
const feedbackDbPath = path.join(rootDir, 'temp_0727意见反馈', 'latest.geodatabase');
const cityToEn = new Map();
const provinceToEn = new Map();
const districtToEn = new Map();

if (fs.existsSync(feedbackDbPath)) {
    const feedbackDb = new Database(feedbackDbPath, { readonly: true });
    try {
        const rows = feedbackDb.prepare(`SELECT name, province, city_EN, Province_EN FROM city_level0727`).all();
        for (const r of rows) {
            cityToEn.set(r.name, { city_EN: r.city_EN, Province_EN: r.Province_EN });
            provinceToEn.set(r.province, r.Province_EN);
        }
        console.log(`  成功从 latest.geodatabase 加载了 ${cityToEn.size} 个省市英文名称映射`);
    } catch (err) {
        console.error('读取 city_level0727 失败:', err);
    } finally {
        feedbackDb.close();
    }
} else {
    console.warn('⚠️ 警告: 找不到反馈数据库:', feedbackDbPath);
    const citiesPath = path.join(dataDir, 'cities.geojson');
    if (fs.existsSync(citiesPath)) {
        const cities = JSON.parse(fs.readFileSync(citiesPath, 'utf-8'));
        for (const f of cities.features || []) {
            const p = f.properties || {};
            const name = p.name || p.city;
            if (name && p.city_EN) {
                cityToEn.set(name, { city_EN: p.city_EN, Province_EN: p.province_EN || '' });
            }
            if (p.province && p.province_EN) {
                provinceToEn.set(p.province, p.province_EN);
            }
        }
        console.log(`  回退：从 cities.geojson 加载了 ${cityToEn.size} 个省市英文名称映射`);
    }
}

// 区县英文名：来自客户交付的 china_country_EN.name_EN
const districtEnDbPath = path.join(rootDir, 'temp', 'NCtoXY0728.geodatabase');
if (fs.existsSync(districtEnDbPath)) {
    const districtDb = new Database(districtEnDbPath, { readonly: true });
    try {
        const rows = districtDb.prepare(`SELECT name, name_EN FROM china_country_EN WHERE name_EN IS NOT NULL AND name_EN != ''`).all();
        for (const r of rows) {
            districtToEn.set(r.name, r.name_EN);
        }
        console.log(`  成功从 NCtoXY0728.geodatabase 加载了 ${districtToEn.size} 个区县英文名称映射`);
    } catch (err) {
        console.error('读取 china_country_EN 失败:', err);
    } finally {
        districtDb.close();
    }
} else {
    console.warn('⚠️ 警告: 找不到区县英文库:', districtEnDbPath);
}

function loadJson(filePath) {
    return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
}

function writeJson(filePath, data) {
    fs.writeFileSync(filePath, JSON.stringify(data));
    console.log(`  写入 ${path.relative(rootDir, filePath)}`);
}

/** GCs_level → cells_chunks（按 OBJECTID 合并属性，保留几何） */
function updateCells() {
    console.log('\n📦 更新网格 GCs_level → cells_chunks...');
    
    // 获取正确的城市-省份映射，用于修正网格数据中错误的省份字段
    const cityRows = db.prepare(`SELECT name, province FROM city_level`).all();
    const cityToProvince = new Map(cityRows.map((r) => [r.name, r.province]));

    const rows = db.prepare(`
        SELECT OBJECTID, city, country, province, City_name_EN, City_code, city_type, city_country,
               wpop_2010_corrected, wpop_2020_corrected, wpop_change, wpop_change_ratio,
               pop2010_6_11_corrected, pop2020_6_11_corrected, pop_6_11_change, pop_6_11_change_ratio,
               pop2010_12_14_corrected, pop2020_12_14_corrected, pop_12_14_change, pop_12_14_change_ratio,
               ED_2010_PSchool, ED_2020_PSchool, ED_PS_change, ED_PS_change_ratio,
               ED_2010_JSchool, ED_2020_JSchool, ED_JS_change, ED_JS_change_ratio,
               PS_2010_count, PS_2020_count, PS_count_change, PS_count_change_ratio,
               JS_2010_count, JS_2020_count, JS_count_change, JS_count_change_ratio
        FROM GCs_level
    `).all();

    const byId = new Map(rows.map((r) => [r.OBJECTID, r]));
    const chunksDir = path.join(dataDir, 'cells_chunks');
    const indexPath = path.join(chunksDir, '_index.json');
    if (!fs.existsSync(indexPath)) {
        throw new Error('缺少 data/cells_chunks/_index.json，无法复用几何');
    }

    const index = loadJson(indexPath);
    let updated = 0;
    let missing = 0;

    for (const chunk of index.chunks) {
        const chunkPath = path.join(chunksDir, chunk.filename);
        const geo = loadJson(chunkPath);
        for (const f of geo.features) {
            const id = f.properties?.OBJECTID ?? f.properties?.id;
            const row = byId.get(id);
            if (!row) {
                missing++;
                continue;
            }
            // 保留几何，替换属性为新库字段（并提供前端兼容别名）
            const correctProvince = cityToProvince.get(row.city) || row.province;
            const cityEnInfo = cityToEn.get(row.city) || {};
            const provEnInfo = provinceToEn.get(correctProvince) || cityEnInfo.Province_EN || '';
            f.properties = {
                OBJECTID: row.OBJECTID,
                id: row.OBJECTID,
                city: row.city,
                city_EN: cityEnInfo.city_EN || row.City_name_EN || '',
                country: row.country,
                province: correctProvince,
                province_EN: provEnInfo || '',
                City_name_EN: row.City_name_EN,
                City_code: row.City_code,
                city_type: row.city_type,
                city_country: row.city_country,
                wpop_2010_corrected: row.wpop_2010_corrected,
                wpop_2020_corrected: row.wpop_2020_corrected,
                wpop_change: row.wpop_change,
                wpop_change_ratio: row.wpop_change_ratio,
                pop2010_6_11_corrected: row.pop2010_6_11_corrected,
                pop2020_6_11_corrected: row.pop2020_6_11_corrected,
                pop_6_11_change: row.pop_6_11_change,
                pop_6_11_change_ratio: row.pop_6_11_change_ratio,
                pop2010_12_14_corrected: row.pop2010_12_14_corrected,
                pop2020_12_14_corrected: row.pop2020_12_14_corrected,
                pop_12_14_change: row.pop_12_14_change,
                pop_12_14_change_ratio: row.pop_12_14_change_ratio,
                ED_2010_PSchool: row.ED_2010_PSchool,
                ED_2020_PSchool: row.ED_2020_PSchool,
                ED_PS_change: row.ED_PS_change,
                ED_PS_change_ratio: row.ED_PS_change_ratio,
                ED_2010_JSchool: row.ED_2010_JSchool,
                ED_2020_JSchool: row.ED_2020_JSchool,
                ED_JS_change: row.ED_JS_change,
                ED_JS_change_ratio: row.ED_JS_change_ratio,
                PS_2010_count: row.PS_2010_count,
                PS_2020_count: row.PS_2020_count,
                PS_count_change: row.PS_count_change,
                PS_count_change_ratio: row.PS_count_change_ratio,
                JS_2010_count: row.JS_2010_count,
                JS_2020_count: row.JS_2020_count,
                JS_count_change: row.JS_count_change,
                JS_count_change_ratio: row.JS_count_change_ratio,
                // 兼容现有后端/前端小写别名
                ed_ps_change: row.ED_PS_change,
                ed_js_change: row.ED_JS_change,
            };
            updated++;
        }
        writeJson(chunkPath, geo);
    }

    console.log(`  ✅ 网格属性更新 ${updated}，未匹配 ${missing}（源表 ${rows.length}）`);
}

/** 
 * city_level → cities.geojson 
 * 
 * ⚠️ 避坑指南/关键逻辑：
 * 绝不能使用 OBJECTID 进行对齐！因为新旧地理数据库中，部分城市的 OBJECTID 发生了错位漂移。
 * 例如：旧 geo 中 OBJECTID: 105 对应绥化市，而新库中该 ID 对应丹东市，若按 ID 对齐会导致严重的边界与属性错乱。
 * 解决方案：改用唯一的“城市名称 (name)”作为主键进行对齐，确保属性完美套在正确的空间几何上。
 */
function updateCities() {
    console.log('\n📦 更新城市 city_level → cities.geojson...');
    const rows = db.prepare(`SELECT * FROM city_level`).all();
    const byName = new Map(rows.map((r) => [r.name, r]));
    const citiesPath = path.join(dataDir, 'cities.geojson');
    const geo = loadJson(citiesPath);
    let updated = 0;
    let missing = 0;

    for (const f of geo.features) {
        const name = f.properties?.name || f.properties?.city;
        const row = byName.get(name);
        if (!row) {
            missing++;
            continue;
        }
        const { Shape, ...attrs } = row;
        const cityEnInfo = cityToEn.get(name) || {};
        const provEnInfo = provinceToEn.get(row.province) || cityEnInfo.Province_EN || '';
        f.properties = {
            ...attrs,
            id: row.OBJECTID,
            OBJECTID: row.OBJECTID,
            // 兼容旧 name / city 读取
            city: row.name,
            city_EN: cityEnInfo.city_EN || row.City_name_EN || '',
            province_EN: provEnInfo || '',
        };
        updated++;
    }

    writeJson(citiesPath, geo);
    console.log(`  ✅ 城市属性更新 ${updated}/${rows.length}，未匹配 ${missing}`);
}

/** 
 * JS_POI_level + 旧行政字段 → pois.geojson 
 * 
 * ⚠️ 避坑指南：
 * 同样为了避免 OBJECTID 漂移导致学校的省市区行政字段归属错误，
 * 这里也改为使用“学校名称 (name)”作为主键与旧 pois.geojson 进行对齐合并。
 */
function updateJsPois() {
    console.log('\n📦 更新初中 POI JS_POI_level → pois.geojson...');
    const oldPoisPath = path.join(dataDir, 'pois.geojson');
    const oldByName = new Map();
    if (fs.existsSync(oldPoisPath)) {
        const old = loadJson(oldPoisPath);
        for (const f of old.features) {
            const name = f.properties?.name;
            if (name != null) oldByName.set(name, f.properties);
        }
    }

    const rows = db.prepare(`
        SELECT OBJECTID, name, dtype, wgs84lon, wgs84lat,
               JS_ave_survice_pop_2010, JS_ave_survice_pop_2020,
               ave_survice_pop_change, ave_survice_pop_change_R
        FROM JS_POI_level
        WHERE wgs84lon IS NOT NULL AND wgs84lat IS NOT NULL
    `).all();

    const features = rows.map((row) => {
        const old = oldByName.get(row.name) || {};
        const cityEnInfo = cityToEn.get(old.city) || {};
        const provEnInfo = provinceToEn.get(old.province) || cityEnInfo.Province_EN || '';
        return {
            type: 'Feature',
            properties: {
                id: row.OBJECTID,
                name: row.name,
                dtype: row.dtype,
                poi_type: 'JS',
                province: old.province ?? null,
                province_EN: provEnInfo || null,
                province_code: old.province_code ?? null,
                city: old.city ?? null,
                city_EN: cityEnInfo.city_EN || null,
                city_code: old.city_code ?? null,
                district: old.district ?? null,
                district_EN: (old.district && districtToEn.get(old.district)) || old.district_EN || null,
                district_code: old.district_code ?? null,
                survive_2010_pop: row.JS_ave_survice_pop_2010,
                survive_2020_pop: row.JS_ave_survice_pop_2020,
                survive_pop_change: row.ave_survice_pop_change,
                survive_pop_change_R: row.ave_survice_pop_change_R,
            },
            geometry: {
                type: 'Point',
                coordinates: [row.wgs84lon, row.wgs84lat],
            },
        };
    });

    writeJson(oldPoisPath, { type: 'FeatureCollection', features });
    console.log(`  ✅ 初中 POI ${features.length}（行政字段来自旧 pois 合并）`);
}

/** PS_POI_level → pois_ps.geojson */
function updatePsPois() {
    console.log('\n📦 更新小学 POI PS_POI_level → pois_ps.geojson...');
    const rows = db.prepare(`
        SELECT OBJECTID, name, dtype, pname, cityname, adname, city_type,
               wgs84lon, wgs84lat,
               ba_PS_survice_pop_2010, ba_PS_survice_pop_2020,
               survice_pop_change, survice_pop_change_R
        FROM PS_POI_level
        WHERE wgs84lon IS NOT NULL AND wgs84lat IS NOT NULL
    `).all();

    const features = rows.map((row) => {
        const cityEnInfo = cityToEn.get(row.cityname) || {};
        const provEnInfo = provinceToEn.get(row.pname) || cityEnInfo.Province_EN || '';
        return {
            type: 'Feature',
            properties: {
                id: row.OBJECTID,
                name: row.name,
                dtype: row.dtype,
                poi_type: 'PS',
                province: row.pname,
                province_EN: provEnInfo || null,
                city: row.cityname,
                city_EN: cityEnInfo.city_EN || null,
                district: row.adname,
                district_EN: (row.adname && districtToEn.get(row.adname)) || null,
                city_type: row.city_type,
                survive_2010_pop: row.ba_PS_survice_pop_2010,
                survive_2020_pop: row.ba_PS_survice_pop_2020,
                survive_pop_change: row.survice_pop_change,
                survive_pop_change_R: row.survice_pop_change_R,
            },
            geometry: {
                type: 'Point',
                coordinates: [row.wgs84lon, row.wgs84lat],
            },
        };
    });

    writeJson(path.join(dataDir, 'pois_ps.geojson'), { type: 'FeatureCollection', features });
    console.log(`  ✅ 小学 POI ${features.length}`);
}

console.log('=== 从 geodatabase.db 更新数据 ===');
console.log('源库:', ncPath);
updateCells();
updateCities();
updateJsPois();
updatePsPois();
db.close();
console.log('\n✅ 更新完成。下一步: npm run import-data（会重建 data/geodata.db）');
console.log('提示: boundaries.geojson 未改动（新库无国境线表）');
