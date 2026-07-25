# NCtoXY0721 数据映射（2026-07）

源文件：`toXY0723/NCtoXY0721.geodatabase`  
需求说明：`toXY0723/平台展示信息toXY.md`

## 表映射

| 新表 | 旧表 / 用途 | 行数 | 处理方式 |
| :--- | :--- | ---: | :--- |
| `GCs_level` | `China_city_cell`（网格） | 177610 | 按 OBJECTID 合并属性到 `cells_chunks/` |
| `city_level` | `China_city_pg`（行政区） | 355 | 按 OBJECTID 合并属性到 `cities.geojson` |
| `JS_POI_level` | `China_city_POI_JS2020` | 32231 | 明文坐标导出 → `pois.geojson`（行政字段从旧 POI 合并） |
| `PS_POI_level` | （新增小学 POI） | 46213 | 导出 → `pois_ps.geojson` |
| — | `China_city_pl`（国境线） | — | 新库无此表，继续用现有 `boundaries.geojson` |

## 更新命令

```bash
npm run update-from-nc   # 合并属性 / 导出 POI
npm run import-data      # 重建 data/geodata.db
```

## 注意

- OBJECTID 与旧库大体 1:1 对齐，几何复用现有 GeoJSON，无需重新 ArcGIS 导出。
- 已知少量漂移：网格有 8 个 OID 在新旧库互不重叠；城市有 12 个 OID 不重叠（未合并到的要素保留旧属性）。
- 大文件仍不进 Git：`geodata.db`、`cells_chunks/`、`cells.geojson` 等；`pois.geojson` / `pois_ps.geojson` / `cities.geojson` 可进仓库。
- 上线需重新上传 GitHub Release，并设 `FORCE_DB_DOWNLOAD=true` 刷新 Railway Volume。
