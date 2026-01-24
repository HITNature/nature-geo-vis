/**
 * 生成模拟数据用于开发测试
 * 在真实数据导出后可删除此文件
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dataDir = path.join(__dirname, '..', 'data');

// 确保 data 目录存在
if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
}

// 中国主要城市坐标 (用于生成模拟数据)
const cities = [
    { name: '北京市', province: '北京市', name_en: 'Beijing', center: [116.4, 39.9] },
    { name: '上海市', province: '上海市', name_en: 'Shanghai', center: [121.5, 31.2] },
    { name: '广州市', province: '广东省', name_en: 'Guangzhou', center: [113.3, 23.1] },
    { name: '深圳市', province: '广东省', name_en: 'Shenzhen', center: [114.1, 22.5] },
    { name: '成都市', province: '四川省', name_en: 'Chengdu', center: [104.1, 30.7] },
    { name: '杭州市', province: '浙江省', name_en: 'Hangzhou', center: [120.2, 30.3] },
    { name: '武汉市', province: '湖北省', name_en: 'Wuhan', center: [114.3, 30.6] },
    { name: '西安市', province: '陕西省', name_en: "Xi'an", center: [108.9, 34.3] },
    { name: '南京市', province: '江苏省', name_en: 'Nanjing', center: [118.8, 32.1] },
    { name: '重庆市', province: '重庆市', name_en: 'Chongqing', center: [106.5, 29.5] },
];

// 生成城市边界多边形 (简化的矩形)
function generateCityPolygon(center, size = 0.5) {
    const [cx, cy] = center;
    return [
        [cx - size, cy - size],
        [cx + size, cy - size],
        [cx + size, cy + size],
        [cx - size, cy + size],
        [cx - size, cy - size], // 闭合
    ];
}

// 生成城市 GeoJSON
function generateCities() {
    const features = cities.map((city, i) => ({
        type: 'Feature',
        properties: {
            id: i + 1,
            name: city.name,
            province: city.province,
            name_en: city.name_en,
        },
        geometry: {
            type: 'Polygon',
            coordinates: [generateCityPolygon(city.center, 0.8)],
        },
    }));

    return { type: 'FeatureCollection', features };
}

// 生成网格 GeoJSON
function generateCells() {
    const features = [];
    let id = 1;

    for (const city of cities) {
        const [cx, cy] = city.center;
        const gridSize = 0.05; // 网格大小 (约5km)
        const gridCount = 8; // 每个城市 8x8 网格

        for (let i = 0; i < gridCount; i++) {
            for (let j = 0; j < gridCount; j++) {
                const x = cx - 0.2 + i * gridSize;
                const y = cy - 0.2 + j * gridSize;

                features.push({
                    type: 'Feature',
                    properties: {
                        id: id++,
                        city: city.name,
                        province: city.province,
                        city_en: city.name_en,
                        PS_2010_count: Math.floor(Math.random() * 10),
                        PS_2020_count: Math.floor(Math.random() * 12),
                        JS_2010_count: Math.floor(Math.random() * 5),
                        JS_2020_count: Math.floor(Math.random() * 7),
                    },
                    geometry: {
                        type: 'Polygon',
                        coordinates: [[
                            [x, y],
                            [x + gridSize, y],
                            [x + gridSize, y + gridSize],
                            [x, y + gridSize],
                            [x, y],
                        ]],
                    },
                });
            }
        }
    }

    return { type: 'FeatureCollection', features };
}

// 生成 POI GeoJSON
function generatePOIs() {
    const features = [];
    let id = 1;

    for (const city of cities) {
        const [cx, cy] = city.center;
        const poiCount = 20;

        for (let i = 0; i < poiCount; i++) {
            const x = cx + (Math.random() - 0.5) * 0.4;
            const y = cy + (Math.random() - 0.5) * 0.4;

            features.push({
                type: 'Feature',
                properties: {
                    id: id++,
                    name: `${city.name}第${i + 1}中学`,
                    type: '中等教育',
                    address: `${city.name}某区某路${Math.floor(Math.random() * 100)}号`,
                    city: city.name,
                },
                geometry: {
                    type: 'Point',
                    coordinates: [x, y],
                },
            });
        }
    }

    return { type: 'FeatureCollection', features };
}

// 写入文件
console.log('Generating synthetic data for development...\n');

const citiesData = generateCities();
fs.writeFileSync(path.join(dataDir, 'cities.geojson'), JSON.stringify(citiesData));
console.log(`  Generated ${citiesData.features.length} cities`);

const cellsData = generateCells();
fs.writeFileSync(path.join(dataDir, 'cells.geojson'), JSON.stringify(cellsData));
console.log(`  Generated ${cellsData.features.length} cells`);

const poisData = generatePOIs();
fs.writeFileSync(path.join(dataDir, 'pois.geojson'), JSON.stringify(poisData));
console.log(`  Generated ${poisData.features.length} POIs`);

console.log('\nSynthetic data generated successfully!');
console.log('Note: Replace with real data using scripts/export_arcpy.py');
