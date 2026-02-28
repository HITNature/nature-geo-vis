#!/bin/bash
# 确保 geodata.db 存在
# 如果 Railway Volume 已挂载且 db 存在，直接跳过
# 如果 Volume 是空的（首次部署），从 GitHub Release 下载

DB_PATH="${DB_PATH:-data/geodata.db}"

if [ -f "$DB_PATH" ]; then
    SIZE=$(du -sh "$DB_PATH" | cut -f1)
    echo "[ensure-db] geodata.db 已存在 ($SIZE)，跳过下载"
    exit 0
fi

if [ -z "$GEODATA_DB_URL" ]; then
    echo "[ensure-db] 错误: 未设置 GEODATA_DB_URL 环境变量"
    echo "[ensure-db] 请在 Railway 控制台添加 GEODATA_DB_URL 指向 geodata.db 下载地址"
    exit 1
fi

echo "[ensure-db] geodata.db 不存在，开始下载..."
echo "[ensure-db] 来源: $GEODATA_DB_URL"

mkdir -p "$(dirname "$DB_PATH")"

curl -L --progress-bar -o "$DB_PATH" "$GEODATA_DB_URL"

if [ $? -ne 0 ]; then
    echo "[ensure-db] 下载失败！"
    rm -f "$DB_PATH"
    exit 1
fi

SIZE=$(du -sh "$DB_PATH" | cut -f1)
echo "[ensure-db] 下载完成 ($SIZE)"
