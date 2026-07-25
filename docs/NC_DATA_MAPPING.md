# geodatabase 表字段映射（2026-07 NC 数据）

源文件约定：项目根目录 **`geodatabase.db`**（gitignore）。  
需求方临时交付目录不要入库；收到新库后覆盖到 `geodatabase.db` 即可。

## 表映射

| 新表 | 旧表 / 用途 | 行数约 | 处理方式 |
| :--- | :--- | ---: | :--- |
| `GCs_level` | `China_city_cell`（网格） | 177610 | 按 OBJECTID 合并属性到 `cells_chunks/` |
| `city_level` | `China_city_pg`（行政区） | 355 | 按 OBJECTID 合并属性到 `cities.geojson` |
| `JS_POI_level` | `China_city_POI_JS2020` | 32231 | 明文坐标 → `pois.geojson`（行政字段可从旧 POI 合并） |
| `PS_POI_level` | （新增小学 POI） | 46213 | 导出 → `pois_ps.geojson` |
| — | `China_city_pl`（国境线） | — | 新库若无此表，继续用现有 `boundaries.geojson` |

## 更新命令

```bash
# 1. 用新库覆盖根目录 geodatabase.db（本地操作，不提交）
# 2. 合并属性 / 导出 POI
npm run update-from-nc
# 3. 重建运行库
npm run import-data
```

## 注意

- OBJECTID 与旧库大体对齐时，几何可复用现有 GeoJSON，无需重新 ArcGIS 导出。
- 若存在少量 OID 漂移，未匹配要素会保留旧属性或无法导入。
- `data/geodata.db`、`cells_chunks/` 等大文件仍不进 Git；上线需更新 GitHub Release + Railway Volume。
