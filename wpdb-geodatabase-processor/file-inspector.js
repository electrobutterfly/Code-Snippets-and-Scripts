#
# @copyright     (c) 2025 Klaus Simon
# @license       Custom Attribution-NonCommercial Sale License
# @description   Part of the wpdb-geodatabase-processor Project.
#                Simple inspector to understand the file format
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
import { fileURLToPath } from 'url';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const files = {
        af: './data/raw/wdpa_af.geojson',
        as: './data/raw/wdpa_as.geojson', 
        eu: './data/raw/wdpa_eu.geojson',
        na: './data/raw/wdpa_na.geojson',
        wa: './data/raw/wdpa_wa.geojson'
};

async function inspectFiles() {
    for (const [region, filePath] of Object.entries(files)) {
        console.log(`\n=== Inspecting ${region} ===`);
        
        if (!fs.existsSync(filePath)) {
            console.log(`❌ File not found: ${filePath}`);
            continue;
        }

        try {
            // Read first 10KB to understand structure
            const data = fs.readFileSync(filePath, 'utf8', 0, 10240);
            console.log(`File size: ${(fs.statSync(filePath).size / 1024 / 1024).toFixed(2)} MB`);
            console.log(`First 500 chars: ${data.substring(0, 500)}`);
            console.log(`Type: ${data.includes('FeatureCollection') ? 'FeatureCollection' : data.includes('"type":"Feature"') ? 'Feature' : 'Unknown'}`);
            
            // Try to count features roughly
            const featureCount = (data.match(/"type":"Feature"/g) || []).length;
            console.log(`Approx features in sample: ${featureCount}`);
            
        } catch (error) {
            console.log(`Error: ${error.message}`);
        }
    }
}

inspectFiles();
