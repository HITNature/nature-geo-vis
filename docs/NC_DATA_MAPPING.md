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

## 注意与避坑指南 (Pitfalls & Best Practices)

- **ID 漂移问题 (OBJECTID Mismatch)**：
  - **现象**：新旧地理数据库中，部分要素的 `OBJECTID` 发生了漂移错位。例如旧 `cities.geojson` 中 `OBJECTID: 105` 对应黑龙江省**绥化市**，而新库中该 ID 对应辽宁省**丹东市**。
  - **后果**：如果使用 `OBJECTID` 匹配属性，会导致“张冠李戴”，即丹东市的属性数据被强行套在绥化市的几何边界上，导致地图悬停 Tooltip 标签及详情数据完全错乱。
  - **解决方案**：在 `update-from-nc.js` 脚本中，更新城市（`updateCities`）和初中 POI（`updateJsPois`）时，**必须统一使用唯一的“名称 (name)”作为主键进行匹配对齐**，绝不能依赖 `OBJECTID`。
- `data/geodata.db`、`cells_chunks/` 等大文件仍不进 Git；上线需更新 GitHub Release + Railway Volume。
- **地图底图微调**：
  - 默认使用的是 CARTO 的 `dark_all` 底图。为了提升边界和道路的辨识度，我们在前端对瓦片层应用了 CSS 滤镜（`.dark-map-tiles { filter: brightness(1.35) contrast(1.05) saturate(0.95); }`），这比直接切换到浅色底图更能保持白字和红绿网格的对比度。
- **Tooltip 渲染健壮性**：
  - 前端渲染城市 Tooltip 时，必须对 `name` 进行非空和 `'未知区域'` 的校验，若不符合条件则不绑定 Tooltip，避免脏数据导致悬停标签异常。
- **搜索框交互优化**：
  - 搜索框（`SearchBox`）已被移至左下角图例卡片（`Legend`）内部，避免与顶部标题重叠。
  - 搜索框选中列表项后，会通过 `isSelectingRef` 标记暂时拦截下一次自动防抖搜索，避免输入框文字更新再次触发冗余 API 请求。
