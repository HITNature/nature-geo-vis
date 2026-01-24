import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.join(__dirname, '..');
const dataDir = path.join(rootDir, 'data');

// Ensure data directory exists
if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
}

const db = new Database(path.join(rootDir, 'geodatabase.db'), { readonly: true });

// ESRI geodatabase stores geometry as binary blob
// We need to extract coordinates from the blob format
function parseGeometryBlob(blob) {
    if (!blob || blob.length === 0) return null;

    try {
        // ESRI ST_Geometry format parsing
        // The blob contains envelope + geometry data
        const buffer = Buffer.from(blob);

        // Skip header (varies by geometry type)
        // For polygons: read ring structure
        // This is a simplified parser - may need adjustment based on actual data

        // Try to find coordinate patterns (pairs of doubles)
        const coords = [];
        let offset = 0;

        // Skip initial header bytes (typically 27-40 bytes for ESRI format)
        offset = 40;

        while (offset + 16 <= buffer.length) {
            const x = buffer.readDoubleLE(offset);
            const y = buffer.readDoubleLE(offset + 8);

            // Validate as WGS84 coordinates for China
            if (x >= 70 && x <= 140 && y >= 15 && y <= 55) {
                coords.push([x, y]);
            }
            offset += 16;
        }

        return coords.length > 0 ? coords : null;
    } catch (e) {
        return null;
    }
}

function convertBoundaries() {
    console.log('Converting boundaries (China_city_pl)...');

    const rows = db.prepare(`
    SELECT OBJECTID, name, gb, geom_type, Shape
    FROM China_city_pl
  `).all();

    const features = [];

    for (const row of rows) {
        const coords = parseGeometryBlob(row.Shape);
        if (coords && coords.length >= 2) {
            // China_city_pl 是国境线，可能是 LineString 或 MultiLineString
            features.push({
                type: 'Feature',
                properties: {
                    id: row.OBJECTID,
                    name: row.name,
                    gb: row.gb,
                    geom_type: row.geom_type
                },
                geometry: {
                    type: 'LineString',
                    coordinates: coords
                }
            });
        }
    }

    const geojson = {
        type: 'FeatureCollection',
        features
    };

    fs.writeFileSync(
        path.join(dataDir, 'boundaries.geojson'),
        JSON.stringify(geojson)
    );

    console.log(`  Converted ${features.length} boundary lines`);
}

function convertCities() {
    console.log('Converting cities...');

    const rows = db.prepare(`
    SELECT OBJECTID, name, province, City_name_EN, Shape
    FROM China_city_pg
  `).all();

    const features = [];

    for (const row of rows) {
        const coords = parseGeometryBlob(row.Shape);
        if (coords && coords.length >= 4) {
            features.push({
                type: 'Feature',
                properties: {
                    id: row.OBJECTID,
                    name: row.name,
                    province: row.province,
                    name_en: row.City_name_EN
                },
                geometry: {
                    type: 'Polygon',
                    coordinates: [coords]
                }
            });
        }
    }

    const geojson = {
        type: 'FeatureCollection',
        features
    };

    fs.writeFileSync(
        path.join(dataDir, 'cities.geojson'),
        JSON.stringify(geojson)
    );

    console.log(`  Converted ${features.length} cities`);
}

function convertCells() {
    console.log('Converting cells...');

    // 只选择需求中要求的字段
    const rows = db.prepare(`
    SELECT
      OBJECTID, city, province, City_name_EN,
      wpop_change, pop_6_11_change, pop_12_14_change,
      ED_PS_change, ED_JS_change,
      Shape
    FROM China_city_cell
  `).all();

    const features = [];

    for (const row of rows) {
        const coords = parseGeometryBlob(row.Shape);
        if (coords && coords.length >= 4) {
            features.push({
                type: 'Feature',
                properties: {
                    id: row.OBJECTID,
                    city: row.city,
                    province: row.province,
                    city_en: row.City_name_EN,
                    wpop_change: row.wpop_change,
                    pop_6_11_change: row.pop_6_11_change,
                    pop_12_14_change: row.pop_12_14_change,
                    ed_ps_change: row.ED_PS_change,
                    ed_js_change: row.ED_JS_change
                },
                geometry: {
                    type: 'Polygon',
                    coordinates: [coords]
                }
            });
        }
    }

    const geojson = {
        type: 'FeatureCollection',
        features
    };

    fs.writeFileSync(
        path.join(dataDir, 'cells.geojson'),
        JSON.stringify(geojson)
    );

    console.log(`  Converted ${features.length} cells`);
}

function convertPOIs() {
    console.log('Converting POIs...');

    // 只提取需求中要求的 name 和 ave_survice_pop_change 字段
    const rows = db.prepare(`
    SELECT
      OBJECTID, name, cityname,
      ave_survice_pop_change,
      wgs84lon, wgs84lat
    FROM China_city_POI_JS2020
    WHERE wgs84lon IS NOT NULL AND wgs84lat IS NOT NULL
  `).all();

    const features = rows.map(row => ({
        type: 'Feature',
        properties: {
            id: row.OBJECTID,
            name: row.name,
            city: row.cityname,
            survive_pop_change: row.ave_survice_pop_change
        },
        geometry: {
            type: 'Point',
            coordinates: [row.wgs84lon, row.wgs84lat]
        }
    }));

    const geojson = {
        type: 'FeatureCollection',
        features
    };

    fs.writeFileSync(
        path.join(dataDir, 'pois.geojson'),
        JSON.stringify(geojson)
    );

    console.log(`  Converted ${features.length} POIs`);
}

// Run conversions
console.log('Starting geodatabase conversion...\n');
convertBoundaries();
convertCities();
convertCells();
convertPOIs();
console.log('\nConversion complete!');

db.close();
