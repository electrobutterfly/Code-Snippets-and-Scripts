# tile-generator.js
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

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const config = {
    output: {
        chunks: './data/processed/chunks/'
    }
};

class TileGenerator {
    constructor() {
        this.tileIndex = new Map();
    }

    // Create spatial index for quick lookup
    createSpatialIndex(region) {
        const chunks = this.loadRegionChunks(region);
        const index = [];
        
        chunks.forEach((chunk, chunkIndex) => {
            chunk.features.forEach((feature, featureIndex) => {
                const bounds = this.calculateBounds(feature.geometry);
                index.push({
                    region,
                    chunk: chunkIndex,
                    feature: featureIndex,
                    bounds: bounds
                });
            });
        });
        
        this.tileIndex.set(region, index);
        return index;
    }

    loadRegionChunks(region) {
        const chunks = [];
        const chunkDir = config.output.chunks;
        
        let chunkIndex = 0;
        while (true) {
            const filename = `${region}_chunk_${chunkIndex}.json`;
            const filepath = path.join(chunkDir, filename);
            
            if (!fs.existsSync(filepath)) break;
            
            const data = JSON.parse(fs.readFileSync(filepath, 'utf8'));
            chunks.push(data);
            chunkIndex++;
        }
        
        return chunks;
    }

    calculateBounds(geometry) {
        const coords = this.extractCoordinates(geometry);
        const lats = coords.map(c => c[1]);
        const lngs = coords.map(c => c[0]);
        
        return {
            minLng: Math.min(...lngs),
            minLat: Math.min(...lats),
            maxLng: Math.max(...lngs),
            maxLat: Math.max(...lats)
        };
    }

    extractCoordinates(geometry) {
        if (!geometry || !geometry.coordinates) return [];
        
        const extract = (coords) => {
            if (Array.isArray(coords[0]) && Array.isArray(coords[0][0])) {
                return coords.flatMap(extract);
            } else if (Array.isArray(coords[0])) {
                return coords;
            }
            return [coords];
        };
        
        return extract(geometry.coordinates);
    }

    // Get features for a specific map tile
    getFeaturesForTile(region, bounds, zoom) {
        const index = this.tileIndex.get(region) || this.createSpatialIndex(region);
        
        const features = index
            .filter(item => this.boundsIntersect(item.bounds, bounds))
            .map(item => {
                const chunk = this.loadRegionChunks(region)[item.chunk];
                return chunk.features[item.feature];
            });
        
        return this.simplifyFeaturesForZoom(features, zoom);
    }

    boundsIntersect(b1, b2) {
        return !(b2.minLng > b1.maxLng || 
                 b2.maxLng < b1.minLng || 
                 b2.minLat > b1.maxLat || 
                 b2.maxLat < b1.minLat);
    }

    simplifyFeaturesForZoom(features, zoom) {
        // More simplification at lower zoom levels
        const simplificationLevel = Math.max(0, 14 - zoom) / 14;
        
        return features.map(feature => ({
            ...feature,
            geometry: this.simplifyGeometryForZoom(feature.geometry, simplificationLevel)
        }));
    }

    simplifyGeometryForZoom(geometry, factor) {
        // Implement geometry simplification based on zoom level
        // This is a simplified version - consider using proper simplification algorithms
        return geometry;
    }
}

export default TileGenerator;
