/**
 * Raw Data Conversion Script
 * 
 * This script converts the GeoJSON files from raw-data/ to data/,
 * reprojecting coordinates as needed:
 * 
 * Input files (raw-data/):
 *   - china_pl.geojson  (EPSG:4490 CGCS2000) -> boundaries.geojson (WGS84)
 *   - china_pg.geojson  (EPSG:4490 CGCS2000) -> cities.geojson (WGS84)
 *   - china_cell.geojson (EPSG:32649 UTM 49N) -> cells.geojson (WGS84)
 * 
 * CGCS2000 (EPSG:4490) is nearly identical to WGS84 for most practical purposes,
 * so we'll just copy the coordinates. UTM Zone 49N needs full reprojection.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import proj4 from 'proj4';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rawDir = path.join(__dirname, '..', 'raw-data');
const dataDir = path.join(__dirname, '..', 'data');

// Define coordinate systems
// EPSG:32649 - WGS 84 / UTM zone 49N
const utm49n = '+proj=utm +zone=49 +datum=WGS84 +units=m +no_defs +type=crs';
// WGS84
const wgs84 = '+proj=longlat +datum=WGS84 +no_defs +type=crs';

/**
 * Convert coordinates from source CRS to WGS84
 */
function convertCoordinates(coords, srcProj) {
    if (!srcProj) {
        // CGCS2000 - just pass through (nearly identical to WGS84)
        return coords;
    }

    // Handle different geometry types
    if (typeof coords[0] === 'number') {
        // Point: [x, y]
        const [lng, lat] = proj4(srcProj, wgs84, coords);
        return [lng, lat];
    } else if (typeof coords[0][0] === 'number') {
        // LineString or Polygon ring: [[x, y], ...]
        return coords.map(coord => {
            const [lng, lat] = proj4(srcProj, wgs84, coord);
            return [lng, lat];
        });
    } else if (typeof coords[0][0][0] === 'number') {
        // Polygon or MultiLineString: [[[x, y], ...], ...]
        return coords.map(ring =>
            ring.map(coord => {
                const [lng, lat] = proj4(srcProj, wgs84, coord);
                return [lng, lat];
            })
        );
    } else {
        // MultiPolygon: [[[[x, y], ...], ...], ...]
        return coords.map(polygon =>
            polygon.map(ring =>
                ring.map(coord => {
                    const [lng, lat] = proj4(srcProj, wgs84, coord);
                    return [lng, lat];
                })
            )
        );
    }
}

/**
 * Convert a GeoJSON feature's geometry
 */
function convertGeometry(geometry, srcProj) {
    if (!geometry || !geometry.coordinates) return geometry;

    return {
        type: geometry.type,
        coordinates: convertCoordinates(geometry.coordinates, srcProj)
    };
}

/**
 * Process a GeoJSON file and convert coordinates
 */
function processGeoJSON(inputPath, outputPath, srcProj, name) {
    console.log(`\n📂 Processing ${name}...`);
    console.log(`   Input: ${inputPath}`);

    const startTime = Date.now();

    // Read input file
    const inputSize = fs.statSync(inputPath).size;
    console.log(`   File size: ${(inputSize / 1024 / 1024).toFixed(2)} MB`);

    let geojson;
    try {
        console.log(`   Reading file...`);
        const content = fs.readFileSync(inputPath, 'utf-8');
        console.log(`   Parsing JSON...`);
        geojson = JSON.parse(content);
    } catch (e) {
        console.error(`   ❌ Error reading file: ${e.message}`);
        return;
    }

    const featureCount = geojson.features ? geojson.features.length : 0;
    console.log(`   Features: ${featureCount.toLocaleString()}`);

    if (srcProj) {
        console.log(`   Converting coordinates (${srcProj ? 'UTM->WGS84' : 'CGCS2000->WGS84'})...`);

        // Process features in batches for progress reporting
        const batchSize = 10000;
        for (let i = 0; i < geojson.features.length; i++) {
            geojson.features[i].geometry = convertGeometry(
                geojson.features[i].geometry,
                srcProj
            );

            if ((i + 1) % batchSize === 0 || i === geojson.features.length - 1) {
                process.stdout.write(`\r   Progress: ${i + 1}/${featureCount} features (${((i + 1) / featureCount * 100).toFixed(1)}%)`);
            }
        }
        console.log(''); // New line after progress
    } else {
        console.log(`   CGCS2000 is compatible with WGS84 - copying as-is`);
    }

    // Remove CRS specification (we're now in WGS84)
    delete geojson.crs;

    // Write output
    console.log(`   Writing output...`);
    fs.writeFileSync(outputPath, JSON.stringify(geojson));

    const outputSize = fs.statSync(outputPath).size;
    const elapsed = Date.now() - startTime;

    console.log(`   ✅ Done in ${(elapsed / 1000).toFixed(1)}s`);
    console.log(`   Output: ${outputPath}`);
    console.log(`   Output size: ${(outputSize / 1024 / 1024).toFixed(2)} MB`);

    return featureCount;
}

// Main execution
console.log('='.repeat(60));
console.log('Raw Data Conversion - Converting to WGS84');
console.log('='.repeat(60));

const stats = {};

// 1. Convert boundaries (china_pl.geojson -> boundaries.geojson)
// EPSG:4490 CGCS2000 - practically identical to WGS84
const boundariesInput = path.join(rawDir, 'china_pl.geojson');
const boundariesOutput = path.join(dataDir, 'boundaries.geojson');
if (fs.existsSync(boundariesInput)) {
    stats.boundaries = processGeoJSON(boundariesInput, boundariesOutput, null, 'Boundaries (国境线)');
} else {
    console.log('\n⚠️  china_pl.geojson not found in raw-data/');
}

// 2. Convert cities (china_pg.geojson -> cities.geojson)
// EPSG:4490 CGCS2000 - practically identical to WGS84
const citiesInput = path.join(rawDir, 'china_pg.geojson');
const citiesOutput = path.join(dataDir, 'cities.geojson');
if (fs.existsSync(citiesInput)) {
    stats.cities = processGeoJSON(citiesInput, citiesOutput, null, 'Cities (行政区划)');
} else {
    console.log('\n⚠️  china_pg.geojson not found in raw-data/');
}

// 3. Convert cells (china_cell.geojson -> cells.geojson)
// EPSG:32649 UTM Zone 49N - needs reprojection to WGS84
const cellsInput = path.join(rawDir, 'china_cell.geojson');
const cellsOutput = path.join(dataDir, 'cells.geojson');
if (fs.existsSync(cellsInput)) {
    stats.cells = processGeoJSON(cellsInput, cellsOutput, utm49n, 'Cells (网格数据)');
} else {
    console.log('\n⚠️  china_cell.geojson not found in raw-data/');
}

// Summary
console.log('\n' + '='.repeat(60));
console.log('Conversion Summary');
console.log('='.repeat(60));
Object.entries(stats).forEach(([layer, count]) => {
    console.log(`  ${layer}: ${count?.toLocaleString() || 0} features`);
});
console.log('\n✨ All conversions complete!\n');
