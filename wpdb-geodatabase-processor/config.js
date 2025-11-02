# config.js
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

module.exports = {
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
        chunks: './data/chunks/',
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
