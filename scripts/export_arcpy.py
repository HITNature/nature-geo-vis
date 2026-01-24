# -*- coding: utf-8 -*-
"""
ArcPy 导出脚本 - 请在 ArcGIS Pro 的 Python 环境中运行此脚本
将 geodatabase 中的数据导出为 GeoJSON 格式

使用方法:
1. 打开 ArcGIS Pro
2. 打开 Python 窗口 (View > Python)
3. 运行此脚本，或在命令行使用 ArcGIS Pro 的 Python:
   "C:\Program Files\ArcGIS\Pro\bin\Python\envs\arcgispro-py3\python.exe" export_arcpy.py
"""

import arcpy
import json
import os

# 配置路径 - 请根据实际情况修改
# Windows 用户请使用: r"C:\path\to\geodatabase.db"
# Mac/Linux 用户请使用: "../geodatabase.db"
GEODATABASE_PATH = r"../geodatabase.db"  # 修改为实际路径
OUTPUT_DIR = r"../data"  # 输出目录

# 确保输出目录存在
if not os.path.exists(OUTPUT_DIR):
    os.makedirs(OUTPUT_DIR)

def export_to_geojson(feature_class, output_name, fields=None):
    """导出要素类为 GeoJSON"""
    print(f"Exporting {feature_class}...")
    
    temp_json = os.path.join(OUTPUT_DIR, f"{output_name}_temp.json")
    final_json = os.path.join(OUTPUT_DIR, f"{output_name}.geojson")
    
    # 使用 arcpy 导出为 JSON
    arcpy.conversion.FeaturesToJSON(
        in_features=feature_class,
        out_json_file=temp_json,
        format_json="NOT_FORMATTED",
        include_z_values="NO_Z_VALUES",
        include_m_values="NO_M_VALUES",
        geoJSON="GEOJSON"
    )
    
    # 如果需要过滤字段
    if fields:
        with open(temp_json, 'r', encoding='utf-8') as f:
            data = json.load(f)
        
        for feature in data.get('features', []):
            props = feature.get('properties', {})
            filtered = {k: v for k, v in props.items() if k in fields}
            feature['properties'] = filtered
        
        with open(final_json, 'w', encoding='utf-8') as f:
            json.dump(data, f, ensure_ascii=False)
        os.remove(temp_json)
    else:
        os.rename(temp_json, final_json)
    
    print(f"  Exported to {final_json}")

# 设置工作空间
arcpy.env.workspace = GEODATABASE_PATH

# 导出国境线 (China_city_pl)
export_to_geojson(
    "China_city_pl",
    "boundaries",
    fields=['OBJECTID', 'name', 'gb', 'geom_type']
)

# 导出城市边界 (China_city_pg)
export_to_geojson(
    "China_city_pg",
    "cities",
    fields=['OBJECTID', 'name', 'province', 'City_name_EN']
)

# 导出网格数据 (China_city_cell) - 根据最新需求更新字段
export_to_geojson(
    "China_city_cell",
    "cells",
    fields=[
        'OBJECTID', 'city', 'province', 'City_name_EN',
        'wpop_change', 'pop_6_11_change', 'pop_12_14_change',
        'ED_PS_change', 'ED_JS_change'
    ]
)

# 导出 POI 点位 (China_city_POI_JS2020) - 根据最新需求更新字段
export_to_geojson(
    "China_city_POI_JS2020",
    "pois",
    fields=['OBJECTID', 'name', 'cityname', 'ave_survice_pop_change']
)

print("\nExport complete!")
