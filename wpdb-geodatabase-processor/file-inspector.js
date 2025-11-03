// file-inspector.js
// @copyright     (c) 2025 Klaus Simon
// @license       Custom Attribution-NonCommercial Sale License
// @description   Part of the wpdb-geodatabase-processor Project
// 
// Permission is granted to use, modify, and distribute this script
// for any purpose except commercial sale without explicit permission.
// Attribution must be retained in all copies.
// 
// For commercial licensing: mini5propilot@gmail.com
// Full license: LICENSE file in repository
/////////////////////////////////////////////////////////////////////
/////////////////////////////////////////////////////////////////////

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import readline from 'readline';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('📁 Current directory:', __dirname);

// Import configuration from config.js
let config;
try {
    console.log('🔄 Loading config...');
    const configModule = await import('./config.js');
    config = configModule.default;
    console.log('✅ Config loaded successfully');
    console.log('📋 Available regions:', Object.keys(config.inputFiles));
} catch (error) {
    console.error('💥 Fatal error loading config:', error);
    process.exit(1);
}

class FileInspector {
    constructor() {
        this.stats = new Map();
    }

    async inspectRegion(regionCode) {
        console.log(`\n🔍 Inspecting ${regionCode}...`);
        
        // Resolve path relative to the current script directory
        const filePath = path.resolve(__dirname, config.inputFiles[regionCode]);
        console.log(`   Looking for file: ${filePath}`);
        
        if (!fs.existsSync(filePath)) {
            console.log(`❌ File not found: ${filePath}`);
            // Check if directory exists
            const dir = path.dirname(filePath);
            if (!fs.existsSync(dir)) {
                console.log(`❌ Directory not found: ${dir}`);
            } else {
                console.log(`✅ Directory exists: ${dir}`);
                console.log(`📂 Files in directory:`, fs.readdirSync(dir));
            }
            return null;
        }

        const stats = fs.statSync(filePath);
        console.log(`   Size: ${(stats.size / 1024 / 1024 / 1024).toFixed(2)} GB`);

        return new Promise((resolve, reject) => {
            const fileStream = fs.createReadStream(filePath, { 
                encoding: 'utf8',
                highWaterMark: 64 * 1024 // 64KB chunks to avoid memory issues
            });

            const rl = readline.createInterface({
                input: fileStream,
                crlfDelay: Infinity
            });

            let totalLines = 0;
            let featureCount = 0;
            let inFeatures = false;
            let currentFeature = '';
            let braceDepth = 0;
            let geometryTypes = new Map();
            let propertySample = new Set();
            let maxCoordinates = 0;
            let totalCoordinates = 0;

            console.log('   Scanning file...');

            rl.on('line', (line) => {
                totalLines++;

                // Check for features array start
                if (line.includes('"features":') && line.includes('[')) {
                    inFeatures = true;
                    return;
                }

                if (!inFeatures) {
                    // Sample properties before features section
                    if (line.includes(':')) {
                        const match = line.match(/"([^"]+)":/);
                        if (match) {
                            propertySample.add(match[1]);
                        }
                    }
                    return;
                }

                // Check for features array end
                if (line.trim() === ']' || line.trim() === '],' || line.trim() === ']}') {
                    inFeatures = false;
                    return;
                }

                // Parse features line by line to avoid huge string creation
                for (let i = 0; i < line.length; i++) {
                    const char = line[i];

                    if (char === '{' && braceDepth === 0) {
                        currentFeature = '{';
                        braceDepth = 1;
                    } else if (char === '{' && braceDepth > 0) {
                        currentFeature += char;
                        braceDepth++;
                    } else if (char === '}' && braceDepth > 0) {
                        currentFeature += char;
                        braceDepth--;
                        
                        if (braceDepth === 0) {
                            try {
                                let cleanFeature = currentFeature;
                                if (cleanFeature.endsWith(',')) {
                                    cleanFeature = cleanFeature.slice(0, -1);
                                }
                                
                                // Process feature without creating huge strings
                                this.processFeatureChunk(
                                    cleanFeature, 
                                    geometryTypes, 
                                    propertySample,
                                    (coordsCount) => {
                                        maxCoordinates = Math.max(maxCoordinates, coordsCount);
                                        totalCoordinates += coordsCount;
                                    }
                                );
                                
                                featureCount++;
                                
                                // Progress reporting
                                if (featureCount % 10000 === 0) {
                                    console.log(`   Processed ${featureCount} features...`);
                                }
                                
                            } catch (error) {
                                // Skip parse errors
                            }
                            
                            // Clear current feature to prevent memory buildup
                            currentFeature = '';
                            
                            // Force garbage collection if available
                            if (global.gc && featureCount % 10000 === 0) {
                                global.gc();
                            }
                        }
                    } else if (braceDepth > 0) {
                        // Limit feature size to prevent huge string creation - WORKAROUND FOR STRING LENGTH ERROR
                        if (currentFeature.length < 10000000) { // 10MB limit per feature
                            currentFeature += char;
                        } else {
                            // If feature is too large, reset and skip it to avoid string length error
                            currentFeature = '';
                            braceDepth = 0;
                        }
                    }
                }

                // Memory management for very large files
                if (totalLines % 100000 === 0) {
                    console.log(`   Read ${totalLines} lines, found ${featureCount} features...`);
                }
            });

            rl.on('close', () => {
                const result = {
                    region: regionCode,
                    sizeGB: stats.size / 1024 / 1024 / 1024,
                    totalLines,
                    featureCount,
                    geometryTypes: Object.fromEntries(geometryTypes),
                    sampleProperties: Array.from(propertySample).slice(0, 20),
                    avgCoordinatesPerFeature: featureCount > 0 ? Math.round(totalCoordinates / featureCount) : 0,
                    maxCoordinatesPerFeature: maxCoordinates
                };

                this.stats.set(regionCode, result);
                
                console.log(`✅ ${regionCode}: ${featureCount} features, ${result.geometryTypes.Feature || 0} geometries`);
                console.log(`   Geometry types:`, result.geometryTypes);
                console.log(`   Sample properties:`, result.sampleProperties.slice(0, 10));
                console.log(`   Avg coordinates: ${result.avgCoordinatesPerFeature}`);
                
                resolve(result);
            });

            rl.on('error', (error) => {
                reject(error);
            });
        });
    }

    processFeatureChunk(featureString, geometryTypes, propertySample, coordinateCallback) {
        try {
            const feature = JSON.parse(featureString);
            
            // Count geometry type
            if (feature.geometry && feature.geometry.type) {
                const type = feature.geometry.type;
                geometryTypes.set(type, (geometryTypes.get(type) || 0) + 1);
            }
            
            // Sample properties
            if (feature.properties) {
                Object.keys(feature.properties).forEach(prop => {
                    if (propertySample.size < 50) { // Limit sample size
                        propertySample.add(prop);
                    }
                });
            }
            
            // Count coordinates (without creating huge strings)
            const coordCount = this.countCoordinatesSafely(feature.geometry);
            coordinateCallback(coordCount);
            
        } catch (error) {
            // Skip invalid features
        }
    }

    countCoordinatesSafely(geometry) {
        if (!geometry || !geometry.coordinates) return 0;
        
        let count = 0;
        const stack = [geometry.coordinates];
        
        while (stack.length > 0) {
            const current = stack.pop();
            
            if (Array.isArray(current)) {
                if (Array.isArray(current[0])) {
                    // Nested array - push all elements
                    for (let i = 0; i < current.length; i++) {
                        stack.push(current[i]);
                    }
                } else if (typeof current[0] === 'number') {
                    // Coordinate pair - count it
                    count++;
                }
            }
        }
        
        return count;
    }

    async inspectAllRegions() {
        console.log('🔍 Inspecting all region files...\n');
        
        const regions = Object.keys(config.inputFiles);
        let totalFeatures = 0;
        let totalSizeGB = 0;

        for (const region of regions) {
            console.log(`\n=== Processing ${region} ===`);
            const result = await this.inspectRegion(region);
            if (result) {
                totalFeatures += result.featureCount;
                totalSizeGB += result.sizeGB;
            }
            console.log(`=== Finished ${region} ===`);
        }

        console.log('\n📊 SUMMARY:');
        console.log(`   Total features: ${totalFeatures.toLocaleString()}`);
        console.log(`   Total size: ${totalSizeGB.toFixed(2)} GB`);
        console.log(`   Regions: ${regions.join(', ')}`);

        return this.stats;
    }

    generateReport() {
        console.log('\n📋 DETAILED REPORT:');
        for (const [region, stats] of this.stats) {
            console.log(`\n--- ${region.toUpperCase()} ---`);
            console.log(`   Size: ${stats.sizeGB.toFixed(2)} GB`);
            console.log(`   Features: ${stats.featureCount.toLocaleString()}`);
            console.log(`   Geometry types:`, stats.geometryTypes);
            console.log(`   Coordinates: avg ${stats.avgCoordinatesPerFeature}, max ${stats.maxCoordinatesPerFeature}`);
        }
    }
}

// Command line interface
async function main() {
    console.log('🚀 Starting file inspection...');
    const inspector = new FileInspector();
    
    try {
        if (process.argv.includes('--region')) {
            const regionIndex = process.argv.indexOf('--region') + 1;
            const regionCode = process.argv[regionIndex];
            
            if (regionCode && config.inputFiles[regionCode]) {
                console.log(`🎯 Processing specific region: ${regionCode}`);
                await inspector.inspectRegion(regionCode);
                inspector.generateReport();
            } else {
                console.log('❌ Invalid region. Use: --region wa|af|as|na|eu,sa');
            }
        } else {
            console.log('🔍 Processing all regions...');
            await inspector.inspectAllRegions();
            inspector.generateReport();
        }
    } catch (error) {
        console.error('❌ Inspection failed:', error);
    }
    
    console.log('🏁 File inspection completed');
}

// Run the main function immediately
console.log('📝 Starting main execution...');
main().catch(console.error);

export default FileInspector;
