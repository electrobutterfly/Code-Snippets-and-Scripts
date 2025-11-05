// config.js
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

module.exports = {
    // Input files
    inputFiles: {
        af: './data/raw/wdpa_af.geojson', //Africa
        as: './data/raw/wdpa_as.geojson', //Asia & Pacific
        eu: './data/raw/wdpa_eu.geojson', //Europe
        na: './data/raw/wdpa_na.geojson', //North America
        wa: './data/raw/wdpa_wa.geojson', //West Asia
        sa: './data/raw/wdpa_wa.geojson'  //Latin America & Caribbean
    },
    
    // Output settings
    output: {
        chunks: './data/chunks/',
        featuresPerChunk: 50 // Adjust based on feature complexity
    },

    // Reporting settings
    reporting: {
        outputType: 'html', // 'console' or 'html'
        htmlOutputFile: './processing-report.html',
        serverPort: 8080,

        colors: {
            background: '#2b2b2b',
            text: '#e0e0e0',
            tableHeader: '#3c3c3c',
            tableRow: '#363636',
            tableRowAlt: '#404040',
            accent: '#4c8ce0'
        }
    }
};
