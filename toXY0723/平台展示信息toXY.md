### 城市层级 (city_level)

| 类型划分 | 名称 | 属性 | 属性表中的列名 | 备注 |
| :--- | :--- | :--- | :--- | :--- |
| **人口** | 人口数量（单位：人） | 2010 年的值 | ba_wpop_2010 | 整数 |
| | | 2020 年的值 | ba_wpop_2020 | 整数 |
| | | 变化值 | wpop_change | 整数 |
| | | 变化率 | wpop_changeR | 百分数，保留小数点后两位 |
| | PSAP 的数量（单位：人） | 2010 年的值 | pop_2010_6_11 | 整数 |
| | | 2020 年的值 | pop_2020_6_11 | 整数 |
| | | 变化值 | pop_6_11_change | 整数 |
| | | 变化率 | pop_6_11_changeR | 百分数，保留小数点后两位 |
| | JSAP 的数量（单位：人） | 2010 年的值 | pop_2010_12_14 | 整数 |
| | | 2020 年的值 | pop_2020_12_14 | 整数 |
| | | 变化值 | pop_12_14_change | 整数 |
| | | 变化率 | pop_12_14_changeR | 百分数，保留小数点后两位 |
| **基础教育设施** | **小学** - 数量（单位：个） | 2010 年的值 | PS_2010_count | 整数 |
| | | 2020 年的值 | PS_2020_count | 整数 |
| | | 变化值 | PS_count_change | 整数 |
| | | 变化率 | PS_count_changeR | 百分数，保留小数点后两位 |
| | **小学** - 可达距离（单位：米） | 2010 年的值 | ED_2010_PSchool | 小数，保留小数点后两位 |
| | | 2020 年的值 | ED_2020_PSchool | 小数，保留小数点后两位 |
| | | 变化值 | ED_PS_change | 小数，保留小数点后两位 |
| | | 变化率 | ED_PS_changeR | 百分数，保留小数点后两位 |
| | **小学** - 平均 PLS（单位：人） | 2010 年的值 | ba_PS_2010_survice_pop_perscl | 小数，保留小数点后两位 |
| | | 2020 年的值 | ba_PS_2020_survice_pop_perscl | 小数，保留小数点后两位 |
| | | 变化值 | ba_PS_survice_pop_perscl_chan | 小数，保留小数点后两位 |
| | | 变化率 | ba_PS_survice_pop_perscl_chaR | 百分数，保留小数点后两位 |
| | **初中** - 数量（单位：个） | 2010 年的值 | JS_2010_count | 整数 |
| | | 2020 年的值 | JS_2020_count | 整数 |
| | | 变化值 | JS_count_change | 整数 |
| | | 变化率 | JS_count_changeR | 百分数，保留小数点后两位 |
| | **初中** - 可达距离（单位：米） | 2010 年的值 | ED_2010_JSchool | 小数，保留小数点后两位 |
| | | 2020 年的值 | ED_2020_JSchool | 小数，保留小数点后两位 |
| | | 变化值 | ED_JS_change | 小数，保留小数点后两位 |
| | | 变化率 | ED_JS_changeR | 百分数，保留小数点后两位 |
| | **初中** - 平均 PLS（单位：人） | 2010 年的值 | ba_JS_2010_survice_pop_perscl | 小数，保留小数点后两位 |
| | | 2020 年的值 | ba_JS_2020_survice_pop_perscl | 小数，保留小数点后两位 |
| | | 变化值 | ba_JS_survice_pop_perscl_chan | 小数，保留小数点后两位 |
| | | 变化率 | ba_JS_survice_pop_perscl_chaR | 百分数，保留小数点后两位 |

---

### POI 层面

| 类型 | 名称 | 文件名称 | 属性表的列名 | 备注 |
| :--- | :--- | :--- | :--- | :--- |
| 小学的 PLS<br>(单位：个) | 2010 年的值 | main.PS_POI_level | ba_PS_survice_pop_2010 | 整数 |
| 小学的 PLS<br>(单位：个) | 2020 年的值 | main.PS_POI_level | ba_PS_survice_pop_2020 | 整数 |
| 小学的 PLS<br>(单位：个) | 变化值 | main.PS_POI_level | survice_pop_change | 整数 |
| 小学的 PLS<br>(单位：个) | 变化率 | main.PS_POI_level | survice_pop_change_R | 百分数，保留小数点后两位 |
| 初中的 PLS<br>(单位：个) | 2010 年的值 | main.JS_POI_level | JS_ave_survice_pop_2010 | 整数 |
| 初中的 PLS<br>(单位：个) | 2020 年的值 | main.JS_POI_level | JS_ave_survice_pop_2020 | 整数 |
| 初中的 PLS<br>(单位：个) | 变化值 | main.JS_POI_level | ave_survice_pop_change | 整数 |
| 初中的 PLS<br>(单位：个) | 变化率 | main.JS_POI_level | ave_survice_pop_change_R | 百分数，保留小数点后两位 |

---

### 空间单元层级 (GCs_level)

| 类型划分 | 名称 | 属性 | 属性表中的列名 | 备注 |
| :--- | :--- | :--- | :--- | :--- |
| 人口 | 人口数量 (单位：人) | 2010 年的值 | wpop_2010_corrected | 整数 |
| 人口 | 人口数量 (单位：人) | 2020 年的值 | wpop_2020_corrected | 整数 |
| 人口 | 人口数量 (单位：人) | 变化值 | wpop_change | 整数 |
| 人口 | 人口数量 (单位：人) | 变化率 | wpop_change_ratio | 百分数，保留小数点后两位 |
| 人口 | PSAP 的数量 (单位：人) | 2010 年的值 | pop2010_6_11_corrected | 整数 |
| 人口 | PSAP 的数量 (单位：人) | 2020 年的值 | pop2020_6_11_corrected | 整数 |
| 人口 | PSAP 的数量 (单位：人) | 变化值 | pop_6_11_change | 整数 |
| 人口 | PSAP 的数量 (单位：人) | 变化率 | pop_6_11_change_ratio | 百分数，保留小数点后两位 |
| 人口 | JSAP 的数量 (单位：人) | 2010 年的值 | pop2010_12_14_corrected | 整数 |
| 人口 | JSAP 的数量 (单位：人) | 2020 年的值 | pop2020_12_14_corrected | 整数 |
| 人口 | JSAP 的数量 (单位：人) | 变化值 | pop_12_14_change | 整数 |
| 人口 | JSAP 的数量 (单位：人) | 变化率 | pop_12_14_change_ratio | 百分数，保留小数点后两位 |
| 基础教育设施 | 小学可达距离 (单位：米) | 2010 年的值 | ED_2010_PSchool | 保留小数点后两位 |
| 基础教育设施 | 小学可达距离 (单位：米) | 2020 年的值 | ED_2020_PSchool | 保留小数点后两位 |
| 基础教育设施 | 小学可达距离 (单位：米) | 变化值 | ED_PS_change | 保留小数点后两位 |
| 基础教育设施 | 小学可达距离 (单位：米) | 变化率 | ED_PS_change_ratio | 百分数，保留小数点后两位 |
| 基础教育设施 | 初中可达距离 (单位：米) | 2010 年的值 | ED_2010_JSchool | 保留小数点后两位 |
| 基础教育设施 | 初中可达距离 (单位：米) | 2020 年的值 | ED_2020_JSchool | 保留小数点后两位 |
| 基础教育设施 | 初中可达距离 (单位：米) | 变化值 | ED_JS_change | 保留小数点后两位 |
| 基础教育设施 | 初中可达距离 (单位：米) | 变化率 | ED_JS_change_ratio | 百分数，保留小数点后两位 |