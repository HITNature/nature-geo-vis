import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { displayFields, poiDisplayFields, zoomConfig, serverConfig } from './config.js';
import geojsonvt from 'geojson-vt';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dataDir = path.join(__dirname, '..', 'data');

const app = express();
app.use(cors({ origin: serverConfig.corsOrigin }));
app.use(express.json());

// 缓存加载的 GeoJSON 数据
let boundariesData = null;
let citiesData = null;
let cellsData = null;
let poisData = null;

// Tile indexes
let cellsIndex = null;
let poisIndex = null;

function loadData() {
    console.log('Loading GeoJSON data...');

    try {
        boundariesData = JSON.parse(fs.readFileSync(path.join(dataDir, 'boundaries.geojson'), 'utf-8'));
        console.log(`  Loaded ${boundariesData.features.length} boundary lines`);
    } catch (e) {
        console.warn('  boundaries.geojson not found');
        boundariesData = { type: 'FeatureCollection', features: [] };
    }

    try {
        citiesData = JSON.parse(fs.readFileSync(path.join(dataDir, 'cities.geojson'), 'utf-8'));
        console.log(`  Loaded ${citiesData.features.length} cities`);
    } catch (e) {
        console.warn('  cities.geojson not found');
        citiesData = { type: 'FeatureCollection', features: [] };
    }

    try {
        cellsData = JSON.parse(fs.readFileSync(path.join(dataDir, 'cells.geojson'), 'utf-8'));
        console.log(`  Loaded ${cellsData.features.length} cells`);
    } catch (e) {
        console.warn('  cells.geojson not found');
        cellsData = { type: 'FeatureCollection', features: [] };
    }

        try {
            poisData = JSON.parse(fs.readFileSync(path.join(dataDir, 'pois.geojson'), 'utf-8'));
            console.log(`  Loaded ${poisData.features.length} POIs`);
        } catch (e) {
            console.warn('  pois.geojson not found');
            poisData = { type: 'FeatureCollection', features: [] };
        }

        // Initialize tile indexes
        console.log('  Indexing data for tiles...');
        cellsIndex = geojsonvt(cellsData, { maxZoom: 20, indexMaxZoom: 5, indexMaxPoints: 100000 });
        poisIndex = geojsonvt(poisData, { maxZoom: 20, indexMaxZoom: 5, indexMaxPoints: 100000 });
        console.log('  Tiling complete.');
}

// 检查点是否在 bbox 内
function pointInBbox(coords, bbox) {
    const [x, y] = coords;
    return x >= bbox[0] && x <= bbox[2] && y >= bbox[1] && y <= bbox[3];
}

// 检查多边形是否与 bbox 相交 (简化版: 检查中心点)
function polygonIntersectsBbox(coords, bbox) {
    if (!coords || !coords[0] || coords[0].length === 0) return false;

    // 计算多边形的边界框
    const ring = coords[0];
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;

    for (const [x, y] of ring) {
        minX = Math.min(minX, x);
        minY = Math.min(minY, y);
        maxX = Math.max(maxX, x);
        maxY = Math.max(maxY, y);
    }

    // 检查两个 bbox 是否相交
    return !(maxX < bbox[0] || minX > bbox[2] || maxY < bbox[1] || minY > bbox[3]);
}

// API: 获取配置
app.get('/api/config', (req, res) => {
    res.json({
        displayFields,
        poiDisplayFields,
        zoomConfig,
    });
});

// API: 获取国境线 (静态数据，总是返回完整数据)
app.get('/api/boundaries', (req, res) => {
    res.json(boundariesData);
});

// API: 获取城市边界
app.get('/api/cities', (req, res) => {
    const { bbox } = req.query;

    if (bbox) {
        const [west, south, east, north] = bbox.split(',').map(Number);
        const filtered = {
            type: 'FeatureCollection',
            features: citiesData.features.filter(f =>
                polygonIntersectsBbox(f.geometry.coordinates, [west, south, east, north])
            ),
        };
        return res.json(filtered);
    }

    res.json(citiesData);
});

// API: 获取网格数据 (支持 bbox 过滤)
app.get('/api/cells', (req, res) => {
    const { bbox, zoom } = req.query;
    const zoomLevel = parseInt(zoom) || 10;

    // 如果缩放级别不够，返回空数据
    if (zoomLevel < zoomConfig.showCells) {
        return res.json({ type: 'FeatureCollection', features: [] });
    }

    if (bbox) {
        const [west, south, east, north] = bbox.split(',').map(Number);
        const filtered = {
            type: 'FeatureCollection',
            features: cellsData.features.filter(f =>
                polygonIntersectsBbox(f.geometry.coordinates, [west, south, east, north])
            ),
        };
        return res.json(filtered);
    }

    res.json(cellsData);
});

// API: 获取单个网格详情
app.get('/api/cell/:id', (req, res) => {
    const id = parseInt(req.params.id);
    const feature = cellsData.features.find(f => f.properties.id === id);

    if (!feature) {
        return res.status(404).json({ error: 'Cell not found' });
    }

    res.json(feature);
});

// API: 获取 POI 数据
app.get('/api/pois', (req, res) => {
    const { bbox, zoom } = req.query;
    const zoomLevel = parseInt(zoom) || 10;

    if (zoomLevel < zoomConfig.showPOIs) {
        return res.json({ type: 'FeatureCollection', features: [] });
    }

    if (bbox) {
        const [west, south, east, north] = bbox.split(',').map(Number);
        const filtered = {
            type: 'FeatureCollection',
            features: poisData.features.filter(f =>
                pointInBbox(f.geometry.coordinates, [west, south, east, north])
            ),
        };
        return res.json(filtered);
    }

    res.json(poisData);
});

// API: 获取瓦片数据
app.get('/api/tiles/:layer/:z/:x/:y.json', (req, res) => {
    const { layer, z, x, y } = req.params;
    const zoom = parseInt(z);
    const tileX = parseInt(x);
    const tileY = parseInt(y);

    let index = null;
    if (layer === 'cells') index = cellsIndex;
    else if (layer === 'pois') index = poisIndex;

    if (!index) {
        return res.status(404).json({ error: 'Layer not found' });
    }

    const tile = index.getTile(zoom, tileX, tileY);

    if (!tile) {
        return res.json({ type: 'FeatureCollection', features: [] });
    }

    // Convert geojson-vt tile to standard GeoJSON
    const features = tile.features.map(f => {
        let geometryType;
        if (f.type === 1) geometryType = 'Point';
        else if (f.type === 2) geometryType = 'LineString';
        else if (f.type === 3) geometryType = 'Polygon';

        return {
            type: 'Feature',
            geometry: {
                type: geometryType,
                coordinates: f.geometry
            },
            properties: f.tags
        };
    });

    res.json({
        type: 'FeatureCollection',
        features: features
    });
});

// 启动服务器
loadData();

app.listen(serverConfig.port, () => {
    console.log(`\n🚀 Server running at http://localhost:${serverConfig.port}`);
    console.log(`\nAPI Endpoints:`);
    console.log(`  GET /api/config           - 获取配置`);
    console.log(`  GET /api/boundaries       - 获取国境线`);
    console.log(`  GET /api/cities?bbox=     - 获取城市边界`);
    console.log(`  GET /api/cells?bbox=&zoom=  - 获取网格数据`);
    console.log(`  GET /api/cell/:id         - 获取网格详情`);
    console.log(`  GET /api/pois?bbox=&zoom=   - 获取 POI 数据`);
});
