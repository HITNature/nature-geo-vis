/**
 * GeoJSON 文件分片脚本
 * 将大的 GeoJSON 文件分割成多个小文件，解决 GitHub 100MB 限制
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dataDir = path.join(__dirname, '..', 'data');

// 每个分片的最大特征数（约 5000 个 feature 约 10-15MB）
const FEATURES_PER_CHUNK = 5000;
// 文件大小阈值（超过此大小才分片，单位：字节）
const SIZE_THRESHOLD = 50 * 1024 * 1024; // 50MB

/**
 * 分割 GeoJSON 文件
 * @param {string} filename - 文件名（不含路径）
 */
function splitGeoJSON(filename) {
    const filepath = path.join(dataDir, filename);

    // 检查文件是否存在
    if (!fs.existsSync(filepath)) {
        console.log(`  跳过: ${filename} 不存在`);
        return;
    }

    // 检查文件大小
    const stats = fs.statSync(filepath);
    const sizeMB = (stats.size / 1024 / 1024).toFixed(1);

    if (stats.size < SIZE_THRESHOLD) {
        console.log(`  跳过: ${filename} (${sizeMB}MB) 小于阈值，无需分片`);
        return;
    }

    console.log(`  处理: ${filename} (${sizeMB}MB)`);

    // 读取并解析 GeoJSON
    const data = JSON.parse(fs.readFileSync(filepath, 'utf-8'));
    const features = data.features || [];
    const totalCount = features.length;

    if (totalCount === 0) {
        console.log(`    警告: ${filename} 没有特征数据`);
        return;
    }

    // 计算分片数量
    const chunkCount = Math.ceil(totalCount / FEATURES_PER_CHUNK);
    console.log(`    共 ${totalCount} 个特征，将分成 ${chunkCount} 个分片`);

    // 创建分片目录
    const baseName = filename.replace('.geojson', '');
    const chunksDir = path.join(dataDir, `${baseName}_chunks`);

    if (!fs.existsSync(chunksDir)) {
        fs.mkdirSync(chunksDir, { recursive: true });
    }

    // 生成分片
    for (let i = 0; i < chunkCount; i++) {
        const start = i * FEATURES_PER_CHUNK;
        const end = Math.min(start + FEATURES_PER_CHUNK, totalCount);
        const chunkFeatures = features.slice(start, end);

        const chunkData = {
            type: 'FeatureCollection',
            features: chunkFeatures,
            _meta: {
                chunk: i + 1,
                totalChunks: chunkCount,
                startIndex: start,
                endIndex: end,
                featureCount: chunkFeatures.length,
                originalFile: filename
            }
        };

        const chunkFilename = `${baseName}_${String(i + 1).padStart(3, '0')}.geojson`;
        const chunkPath = path.join(chunksDir, chunkFilename);

        fs.writeFileSync(chunkPath, JSON.stringify(chunkData));

        const chunkStats = fs.statSync(chunkPath);
        const chunkSizeMB = (chunkStats.size / 1024 / 1024).toFixed(1);
        console.log(`    [${i + 1}/${chunkCount}] ${chunkFilename} (${chunkSizeMB}MB, ${chunkFeatures.length} features)`);
    }

    // 创建索引文件（包含元数据）
    const indexData = {
        originalFile: filename,
        totalFeatures: totalCount,
        chunkCount: chunkCount,
        featuresPerChunk: FEATURES_PER_CHUNK,
        chunks: []
    };

    for (let i = 0; i < chunkCount; i++) {
        const start = i * FEATURES_PER_CHUNK;
        const end = Math.min(start + FEATURES_PER_CHUNK, totalCount);
        indexData.chunks.push({
            index: i + 1,
            filename: `${baseName}_${String(i + 1).padStart(3, '0')}.geojson`,
            startIndex: start,
            endIndex: end,
            featureCount: end - start
        });
    }

    const indexPath = path.join(chunksDir, '_index.json');
    fs.writeFileSync(indexPath, JSON.stringify(indexData, null, 2));
    console.log(`    索引文件: _index.json`);

    // 可选：重命名原文件为备份
    const backupPath = filepath + '.backup';
    if (!fs.existsSync(backupPath)) {
        console.log(`    备份原文件: ${filename}.backup`);
        fs.renameSync(filepath, backupPath);
    }

    console.log(`  ✅ ${filename} 分片完成\n`);
}

/**
 * 合并分片文件（用于恢复）
 * @param {string} chunksDir - 分片目录路径
 * @param {string} outputFile - 输出文件路径
 */
function mergeChunks(chunksDir, outputFile) {
    const indexPath = path.join(chunksDir, '_index.json');

    if (!fs.existsSync(indexPath)) {
        console.error('索引文件不存在');
        return;
    }

    const index = JSON.parse(fs.readFileSync(indexPath, 'utf-8'));
    const allFeatures = [];

    console.log(`合并 ${index.chunkCount} 个分片...`);

    for (const chunk of index.chunks) {
        const chunkPath = path.join(chunksDir, chunk.filename);
        const chunkData = JSON.parse(fs.readFileSync(chunkPath, 'utf-8'));
        allFeatures.push(...chunkData.features);
        console.log(`  [${chunk.index}/${index.chunkCount}] 已合并 ${chunk.featureCount} 个特征`);
    }

    const mergedData = {
        type: 'FeatureCollection',
        features: allFeatures
    };

    fs.writeFileSync(outputFile, JSON.stringify(mergedData));
    console.log(`✅ 合并完成: ${outputFile} (${allFeatures.length} 个特征)`);
}

// 主程序
console.log('=== GeoJSON 分片工具 ===\n');
console.log(`数据目录: ${dataDir}`);
console.log(`分片阈值: ${SIZE_THRESHOLD / 1024 / 1024}MB`);
console.log(`每片特征数: ${FEATURES_PER_CHUNK}\n`);

// 处理所有 GeoJSON 文件
const files = fs.readdirSync(dataDir).filter(f => f.endsWith('.geojson'));

for (const file of files) {
    splitGeoJSON(file);
}

console.log('=== 分片完成 ===');
