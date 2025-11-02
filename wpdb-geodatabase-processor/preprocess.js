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

// ES module equivalent of __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
const config = {
    // Input files
    inputFiles: {
        af: './data/raw/wdpa_af.geojson',
        as: './data/raw/wdpa_as.geojson', 
        eu: './data/raw/wdpa_eu.geojson',
        na: './data/raw/wdpa_na.geojson',
        wa: './data/raw/wdpa_wa.geojson'
    },
    
    // Output settings
    output: {
        chunks: './data/processed/chunks/',
        tiles: './data/tiles/',
        maxChunkSize: 50000, // 50KB per chunk
        featuresPerChunk: 50 // Adjust based on feature complexity
    },
    
    // Tile settings
    tileSettings: {
        minZoom: 0,
        maxZoom: 14,
        maxTileSize: 500000 // 500KB max per tile
    }
};

class GeoJSONProcessor {
    constructor(region, options = {}) {
        this.region = region;
        this.featureCount = 0;
        this.currentChunk = [];
        this.chunkIndex = 0;
        this.options = options;
    }

    processFeature(feature) {
        this.featureCount++;
        
        // Optimize the feature
        const optimizedFeature = this.optimizeFeature(feature);
        this.currentChunk.push(optimizedFeature);

        // Write chunk if it reaches size limit
        if (this.currentChunk.length >= config.output.featuresPerChunk) {
            this.writeChunk();
        }
    }

    finish() {
        if (this.currentChunk.length > 0) {
            this.writeChunk();
        }
        console.log(`Processed ${this.featureCount} features for ${this.region}`);
    }

    optimizeFeature(feature) {
        return {
            type: 'Feature',
            geometry: this.simplifyGeometry(feature.geometry),
            properties: this.optimizeProperties(feature.properties),
            id: feature.id || `${this.region}_${this.featureCount}`
        };
    }

    simplifyGeometry(geometry) {
        if (!geometry || !geometry.coordinates) return geometry;
        
        const simplifyCoordinates = (coords) => {
            return coords.map(coord => 
                Array.isArray(coord[0]) ? simplifyCoordinates(coord) : 
                [Math.round(coord[0] * 100000) / 100000, Math.round(coord[1] * 100000) / 100000]
            );
        };

        return {
            type: geometry.type,
            coordinates: simplifyCoordinates(geometry.coordinates)
        };
    }

    optimizeProperties(properties) {
        // Keep only essential properties
        const essential = {};
        
        // WDPA core fields
        if (properties.NAME) essential.name = properties.NAME;
        if (properties.DESIG) essential.designation = properties.DESIG;
        if (properties.DESIG_ENG) essential.designation_en = properties.DESIG_ENG;
        if (properties.IUCN_CAT) essential.iucn_category = properties.IUCN_CAT;
        if (properties.ISO3) essential.country = properties.ISO3;
        if (properties.REP_AREA) essential.area = properties.REP_AREA;
        if (properties.WDPAID) essential.wdpaid = properties.WDPAID;
        if (properties.MARINE) essential.marine = properties.MARINE;
        
        return essential;
    }

    writeChunk() {
        const chunk = {
            type: 'FeatureCollection',
            features: this.currentChunk,
            metadata: {
                region: this.region,
                chunk: this.chunkIndex,
                totalFeatures: this.currentChunk.length
            }
        };

        const filename = `${this.region}_chunk_${this.chunkIndex}.json`;
        const filepath = path.join(config.output.chunks, filename);
        
        // Ensure directory exists
        const dir = path.dirname(filepath);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        
        fs.writeFileSync(filepath, JSON.stringify(chunk));
        
        console.log(`Written chunk ${this.chunkIndex} for ${this.region} with ${this.currentChunk.length} features`);
        
        this.currentChunk = [];
        this.chunkIndex++;
    }
}

// Process a single region
async function processRegion(regionCode) {
    console.log(`Processing ${regionCode}...`);
    
    const inputFile = config.inputFiles[regionCode];
    if (!fs.existsSync(inputFile)) {
        console.log(`File not found: ${inputFile}`);
        return;
    }

    // Create output directory
    if (!fs.existsSync(config.output.chunks)) {
        fs.mkdirSync(config.output.chunks, { recursive: true });
    }

    const processor = new GeoJSONProcessor(regionCode);
    server-preprocess
    try {
        // Read and process the file in chunks to avoid memory issues
        const stream = fs.createReadStream(inputFile, { 
            encoding: 'utf8',
            highWaterMark: 64 * 1024 // 64KB chunks
        });
        
        let buffer = '';
        let featureCount = 0;

        for await (const chunk of stream) {
            buffer += chunk;
            const lines = buffer.split('\n');
            buffer = lines.pop() || ''; // Keep incomplete line

            for (const line of lines) {
                const trimmed = line.trim();
                if (trimmed.startsWith('{"type":"Feature"')) {
                    try {
                        // Remove trailing comma if present
                        const cleanLine = trimmed.replace(/,$/, '');
                        const feature = JSON.parse(cleanLine);
                        processor.processFeature(feature);
                        featureCount++;
                        
                        // Progress indicator
                        if (featureCount % 1000 === 0) {
                            console.log(`Processed ${featureCount} features for ${regionCode}...`);
                        }
                    } catch (e) {
                        console.log('Error parsing feature:', e.message, 'Line:', trimmed.substring(0, 100));
                    }
                }
            }
        }

        // Process any remaining buffer
        if (buffer.trim()) {
            try {
                const feature = JSON.parse(buffer.trim().replace(/,$/, ''));
                processor.processFeature(feature);
                featureCount++;
            } catch (e) {
                console.log('Error parsing final feature:', e.message);
            }
        }

        processor.finish();
        console.log(`Finished processing ${regionCode}. Total features: ${featureCount}`);
        
    } catch (error) {
        console.error(`Error processing ${regionCode}:`, error);
    }
}

// Process all regions
async function processAllRegions() {
    const regions = Object.keys(config.inputFiles);
    
    console.log('Starting GeoJSON preprocessing...');
    console.log('Regions to process:', regions);
    
    for (const region of regions) {
        await processRegion(region);
    }
    
    console.log('All regions processed!');
}

// Run if called directly
if (process.argv[1] === fileURLToPath(import.meta.url)) {
    processAllRegions().catch(console.error);
}

export { processAllRegions, processRegion, GeoJSONProcessor };
