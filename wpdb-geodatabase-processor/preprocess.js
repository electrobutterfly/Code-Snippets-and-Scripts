# preprocess.js
# @copyright     (c) 2025 Klaus Simon
# @license       Custom Attribution-NonCommercial Sale License
# @description   Part of the wpdb-geodatabase-processor Project
# 
# Permission is granted to use, modify, and distribute this script
# for any purpose except commercial sale without explicit permission.
# Attribution must be retained in all copies.
# 
# For commercial licensing: mini5propilot@gmail.com
# Full license: LICENSE file in repository
#####################################################################
#####################################################################


import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import readline from 'readline';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration - USING YOUR ACTUAL DIRECTORY STRUCTURE
const config = {
    inputFiles: {
        af: './data/raw/wdpa_af.geojson',
        as: './data/raw/wdpa_as.geojson', 
        eu: './data/raw/wdpa_eu.geojson',
        na: './data/raw/wdpa_na.geojson',
        wa: './data/raw/wdpa_wa.geojson'
    },
    output: {
        chunks: './data/processed/chunks/',
        featuresPerChunk: 500
    }
};

class FeatureProcessor {
    constructor(region, outputDir) {
        this.region = region;
        this.outputDir = outputDir;
        this.currentChunk = [];
        this.chunkIndex = 0;
        this.featureCount = 0;
    }

    addFeature(feature) {
        // Basic optimization
        const optimized = {
            type: 'Feature',
            geometry: feature.geometry,
            properties: this.optimizeProperties(feature.properties),
            id: feature.id || `${this.region}_${this.featureCount}`
        };
        
        this.currentChunk.push(optimized);
        this.featureCount++;

        if (this.currentChunk.length >= config.output.featuresPerChunk) {
            this.writeChunk();
        }

        if (this.featureCount % 1000 === 0) {
            console.log(`  Processed ${this.featureCount} features...`);
        }
    }

    optimizeProperties(properties) {
        if (!properties) return {};
        
        const essential = {};
        const fields = ['NAME', 'DESIG', 'DESIG_ENG', 'IUCN_CAT', 'ISO3', 'REP_AREA', 'WDPAID', 'MARINE'];
        
        fields.forEach(field => {
            if (properties[field] !== undefined) {
                essential[field.toLowerCase()] = properties[field];
            }
        });
        
        return essential;
    }

    writeChunk() {
        if (this.currentChunk.length === 0) return;

        const chunkData = {
            type: 'FeatureCollection',
            features: this.currentChunk,
            metadata: {
                region: this.region,
                chunk: this.chunkIndex,
                totalFeatures: this.currentChunk.length
            }
        };

        const filename = `${this.region}_chunk_${this.chunkIndex}.json`;
        const filepath = path.join(this.outputDir, filename);
        
        // Ensure directory exists
        const dir = path.dirname(filepath);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        
        fs.writeFileSync(filepath, JSON.stringify(chunkData));
        console.log(`  ✓ Chunk ${this.chunkIndex}: ${this.currentChunk.length} features`);
        
        this.currentChunk = [];
        this.chunkIndex++;
    }

    finish() {
        if (this.currentChunk.length > 0) {
            this.writeChunk();
        }
        console.log(`✅ ${this.region}: ${this.featureCount} total features in ${this.chunkIndex} chunks`);
    }
}

async function processRegion(regionCode) {
    console.log(`\n🚀 Processing ${regionCode}...`);
    
    const inputFile = config.inputFiles[regionCode];
    console.log(`   Input: ${inputFile}`);
    
    if (!fs.existsSync(inputFile)) {
        console.log(`❌ File not found: ${inputFile}`);
        console.log(`   Current directory: ${process.cwd()}`);
        return;
    }

    const stats = fs.statSync(inputFile);
    console.log(`   Size: ${(stats.size / 1024 / 1024).toFixed(2)} MB`);

    const processor = new FeatureProcessor(regionCode, config.output.chunks);
    const fileStream = fs.createReadStream(inputFile, { encoding: 'utf8' });
    
    const rl = readline.createInterface({
        input: fileStream,
        crlfDelay: Infinity
    });

    let inFeatures = false;
    let currentFeature = '';
    let braceDepth = 0;
    let lineCount = 0;

    for await (const line of rl) {
        lineCount++;
        const trimmed = line.trim();

        // Find features array
        if (trimmed.includes('"features":') && trimmed.includes('[')) {
            inFeatures = true;
            continue;
        }

        if (!inFeatures) continue;

        // Check for end of features array
        if (trimmed === ']' || trimmed === '],' || trimmed === ']}') {
            inFeatures = false;
            continue;
        }

        // Process feature objects
        for (let i = 0; i < trimmed.length; i++) {
            const char = trimmed[i];

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
                    // Complete feature found
                    try {
                        // Remove trailing comma
                        let cleanFeature = currentFeature;
                        if (cleanFeature.endsWith(',')) {
                            cleanFeature = cleanFeature.slice(0, -1);
                        }
                        
                        const feature = JSON.parse(cleanFeature);
                        if (feature.type === 'Feature') {
                            processor.addFeature(feature);
                        }
                    } catch (error) {
                        // Skip invalid features
                    }
                    currentFeature = '';
                }
            } else if (braceDepth > 0) {
                currentFeature += char;
            }
        }

        // Progress for very large files
        if (lineCount % 100000 === 0) {
            console.log(`  Read ${lineCount} lines...`);
        }
    }

    processor.finish();
    return processor.featureCount;
}

async function processAllRegions() {
    console.log('🌈 Starting GeoJSON Processing');
    console.log('==============================\n');
    
    // Create output directory
    if (!fs.existsSync(config.output.chunks)) {
        fs.mkdirSync(config.output.chunks, { recursive: true });
    }

    const regions = Object.keys(config.inputFiles);
    let totalFeatures = 0;

    for (const region of regions) {
        const count = await processRegion(region);
        totalFeatures += count;
    }

    console.log('\n🎉 All regions processed!');
    console.log(`📊 Total features: ${totalFeatures}`);
    console.log(`📁 Output directory: ${config.output.chunks}`);
}

// Run immediately
processAllRegions().catch(error => {
    console.error('💥 Fatal error:', error);
    process.exit(1);
});
