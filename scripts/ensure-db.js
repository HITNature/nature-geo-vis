import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import https from 'https';
import http from 'http';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dbPath = process.env.DB_PATH || path.join(__dirname, '..', 'data', 'geodata.db');

function download(url, dest, maxRedirects = 5) {
    return new Promise((resolve, reject) => {
        if (maxRedirects <= 0) return reject(new Error('Too many redirects'));

        const client = url.startsWith('https') ? https : http;
        const req = client.get(url, { timeout: 300_000 }, (res) => {
            if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
                console.log(`[ensure-db] 重定向 → ${res.headers.location.substring(0, 80)}...`);
                res.resume();
                return resolve(download(res.headers.location, dest, maxRedirects - 1));
            }

            if (res.statusCode !== 200) {
                res.resume();
                return reject(new Error(`HTTP ${res.statusCode}`));
            }

            const totalBytes = parseInt(res.headers['content-length'], 10) || 0;
            let downloaded = 0;
            let lastLog = 0;

            fs.mkdirSync(path.dirname(dest), { recursive: true });
            const file = fs.createWriteStream(dest);

            res.on('data', (chunk) => {
                downloaded += chunk.length;
                const now = Date.now();
                if (now - lastLog > 3000) {
                    const pct = totalBytes ? ((downloaded / totalBytes) * 100).toFixed(1) : '?';
                    const mb = (downloaded / 1024 / 1024).toFixed(1);
                    console.log(`[ensure-db] 下载中... ${mb}MB (${pct}%)`);
                    lastLog = now;
                }
            });

            res.pipe(file);
            file.on('finish', () => {
                file.close();
                resolve();
            });
            file.on('error', (err) => {
                fs.unlink(dest, () => {});
                reject(err);
            });
        });

        req.on('error', reject);
        req.on('timeout', () => {
            req.destroy();
            reject(new Error('Download timed out'));
        });
    });
}

async function main() {
    if (fs.existsSync(dbPath)) {
        const stats = fs.statSync(dbPath);
        const sizeMB = (stats.size / 1024 / 1024).toFixed(1);
        console.log(`[ensure-db] geodata.db 已存在 (${sizeMB}MB)，跳过下载`);
        return;
    }

    const url = process.env.GEODATA_DB_URL;
    if (!url) {
        console.error('[ensure-db] 错误: 未设置 GEODATA_DB_URL 环境变量');
        process.exit(1);
    }

    console.log(`[ensure-db] geodata.db 不存在，开始下载...`);
    console.log(`[ensure-db] 目标路径: ${dbPath}`);
    console.log(`[ensure-db] 来源: ${url}`);

    const start = Date.now();
    await download(url, dbPath);
    const elapsed = ((Date.now() - start) / 1000).toFixed(1);

    const stats = fs.statSync(dbPath);
    const sizeMB = (stats.size / 1024 / 1024).toFixed(1);
    console.log(`[ensure-db] 下载完成 (${sizeMB}MB, ${elapsed}s)`);
}

main().catch((err) => {
    console.error(`[ensure-db] 失败: ${err.message}`);
    process.exit(1);
});
