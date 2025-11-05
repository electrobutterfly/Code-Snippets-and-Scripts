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

class BlinkingMessage {
    constructor() {
        this.interval = null;
        this.isVisible = true;
        this.message = 'Please wait';
    }

    start() {
        process.stdout.write('🔍 File inspection in progress... ');
        this.interval = setInterval(() => {
            if (this.isVisible) {
                process.stdout.write('\x1b[36m' + this.message + '\x1b[0m'); // Cyan color
            } else {
                process.stdout.write('\x1b[90m' + ' '.repeat(this.message.length) + '\x1b[0m'); // Gray spaces
            }
            process.stdout.write('\r🔍 File inspection in progress... ');
            this.isVisible = !this.isVisible;
        }, 500);
    }

    stop(finalMessage = '') {
        if (this.interval) {
            clearInterval(this.interval);
            this.interval = null;
            // Clear the blinking line and write final message
            process.stdout.write('\r' + ' '.repeat(60) + '\r');
            if (finalMessage) {
                console.log(finalMessage);
            }
        }
    }
}

class HTMLReporter {
    constructor(config) {
        this.config = config;
        this.reportData = {
            regions: [],
            totalFeatures: 0,
            totalSizeGB: 0,
            startTime: new Date(),
            endTime: null
        };
        
        // Ensure reports directory exists
        this.reportsDir = path.join(__dirname, './data/reports');
        if (!fs.existsSync(this.reportsDir)) {
            fs.mkdirSync(this.reportsDir, { recursive: true });
        }
    }

    generateHTML() {
        const colors = this.config.reporting.colors;
        const licenseText = `// @copyright (c) 2025 Klaus Simon
// @license Custom Attribution-NonCommercial Sale License
// For commercial licensing: mini5propilot@gmail.com`;

        const processingTime = this.reportData.endTime ? 
            ((this.reportData.endTime - this.reportData.startTime) / 1000).toFixed(1) + 's' : 
            'In progress';

        let regionsHTML = '';
        this.reportData.regions.forEach(region => {
            let geometryTypesHTML = '';
            Object.entries(region.geometryTypes).forEach(([type, count]) => {
                geometryTypesHTML += `${type}: ${count}<br>`;
            });

            let wdpaidStatsHTML = `Total: ${region.wdpaidStats.total}<br>Unique: ${region.wdpaidStats.unique}`;
            
            let iucnStatsHTML = '';
            Object.entries(region.iucnStats).forEach(([category, count]) => {
                iucnStatsHTML += `${category}: ${count}<br>`;
            });

            let propertiesHTML = region.sampleProperties.slice(0, 8).join('<br>');
            if (region.sampleProperties.length > 8) {
                propertiesHTML += '<br>...';
            }

            regionsHTML += `
                <tr>
                    <td><strong>${region.code.toUpperCase()}</strong></td>
                    <td>${region.sizeGB.toFixed(2)} GB</td>
                    <td>${region.featureCount.toLocaleString()}</td>
                    <td class="geometry-types">${geometryTypesHTML}</td>
                    <td class="stats">${wdpaidStatsHTML}</td>
                    <td class="stats">${iucnStatsHTML}</td>
                    <td>Avg: ${region.avgCoordinatesPerFeature}<br>Max: ${region.maxCoordinatesPerFeature}</td>
                    <td class="properties-list">${propertiesHTML}</td>
                </tr>
            `;
        });

        return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>WPDB GeoDatabase Processor - File Inspection Report</title>
    
    <!-- Google Analytics -->
    <script async src="https://www.googletagmanager.com/gtag/js?id=G-955THDBF7S"></script>
    <script>
      window.dataLayer = window.dataLayer || [];
      function gtag(){dataLayer.push(arguments);}
      gtag('js', new Date());
      gtag('config', 'G-955THDBF7S', {
        page_title: 'WPDB File Inspection Report',
        page_location: window.location.href
      });
      
      // Track custom event for report generation
        gtag('event', 'report_viewed', {
        'event_category': 'file_inspection',
        'event_label': '${this.reportData.startTime.toLocaleString()}',
     // 'regions_count': ${this.reportData.regions.length},
     // 'total_features': ${this.reportData.totalFeatures},
     // 'total_size_gb': ${this.reportData.totalSizeGB.toFixed(2)}
      });
    </script>

    <style>
        body {
            background-color: ${colors.background};
            color: ${colors.text};
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            margin: 0;
            padding: 20px;
            line-height: 1.6;
        }
        .container {
            max-width: 1400px;
            margin: 0 auto;
        }
        .header {
            text-align: center;
            margin-bottom: 30px;
            padding-bottom: 20px;
            border-bottom: 2px solid ${colors.accent};
        }
        .summary {
            background: ${colors.tableHeader};
            padding: 20px;
            border-radius: 8px;
            margin-bottom: 30px;
        }
        .summary-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 15px;
            margin-top: 15px;
        }
        .summary-item {
            text-align: center;
            padding: 15px;
            background: ${colors.tableRow};
            border-radius: 5px;
        }
        .summary-value {
            font-size: 24px;
            font-weight: bold;
            color: ${colors.accent};
        }
        table {
            width: 100%;
            border-collapse: collapse;
            margin: 20px 0;
            background: ${colors.tableHeader};
            font-size: 0.9em;
        }
        th {
            background: ${colors.tableHeader};
            padding: 12px 10px;
            text-align: left;
            border-bottom: 2px solid ${colors.accent};
        }
        td {
            padding: 10px 8px;
            border-bottom: 1px solid ${colors.background};
            vertical-align: top;
        }
        tr:nth-child(even) {
            background: ${colors.tableRow};
        }
        tr:nth-child(odd) {
            background: ${colors.tableRowAlt};
        }
        .geometry-types, .stats {
            font-size: 0.85em;
            color: #aaa;
        }
        .properties-list {
            font-size: 0.8em;
            color: #ccc;
            max-height: 100px;
            overflow-y: auto;
        }
        .timestamp {
            color: #888;
            font-size: 0.9em;
        }
        .license {
            margin-top: 40px;
            padding: 20px;
            background: ${colors.tableHeader};
            border-radius: 5px;
            font-family: monospace;
            white-space: pre-wrap;
            font-size: 0.8em;
            color: #888;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🔍 WPDB GeoDatabase File Inspector</h1>
            <p>Inspection Report - ${this.reportData.startTime.toLocaleString()}</p>
        </div>

        <div class="summary">
            <h2>📊 Inspection Summary</h2>
            <div class="summary-grid">
                <div class="summary-item">
                    <div class="summary-label">Total Regions</div>
                    <div class="summary-value">${this.reportData.regions.length}</div>
                </div>
                <div class="summary-item">
                    <div class="summary-label">Total Features</div>
                    <div class="summary-value">${this.reportData.totalFeatures.toLocaleString()}</div>
                </div>
                <div class="summary-item">
                    <div class="summary-label">Total Size</div>
                    <div class="summary-value">${this.reportData.totalSizeGB.toFixed(2)} GB</div>
                </div>
                <div class="summary-item">
                    <div class="summary-label">Processing Time</div>
                    <div class="summary-value">${processingTime}</div>
                </div>
            </div>
        </div>

        <h2>📋 Region Details</h2>
        <table>
            <thead>
                <tr>
                    <th>Region</th>
                    <th>File Size</th>
                    <th>Features</th>
                    <th>Geometry Types</th>
                    <th>WDPAID</th>
                    <th>IUCN Categories</th>
                    <th>Coordinates</th>
                    <th>Sample Properties</th>
                </tr>
            </thead>
            <tbody>
                ${regionsHTML}
            </tbody>
        </table>

        <div class="license">
${licenseText}
        </div>
    </div>
</body>
</html>`;
    }

    addRegionData(regionData) {
        this.reportData.regions.push(regionData);
        this.reportData.totalFeatures += regionData.featureCount;
        this.reportData.totalSizeGB += regionData.sizeGB;
    }

    finalizeReport() {
        this.reportData.endTime = new Date();
    }

    saveReport() {
        const html = this.generateHTML();
        const outputPath = path.join(this.reportsDir, 'inspection-report.html');
        fs.writeFileSync(outputPath, html);
        return outputPath;
    }

    async startServer(reportPath) {
        const { default: http } = await import('http');
        const server = http.createServer((req, res) => {
            if (req.url === '/') {
                const html = fs.readFileSync(reportPath, 'utf8');
                res.writeHead(200, { 'Content-Type': 'text/html' });
                res.end(html);
            } else {
                res.writeHead(404);
                res.end('Not found');
            }
        });

        server.listen(this.config.reporting.serverPort + 1, () => {
            console.log(`🌐 Inspection report server running at: http://localhost:${this.config.reporting.serverPort + 1}`);
            console.log('   Press Ctrl+C to stop the server');
        });

        return server;
    }
}

class FileInspector {
    constructor(config) {
        this.config = config;
        this.stats = new Map();
        this.htmlReporter = new HTMLReporter(config);
        this.blinkingMessage = new BlinkingMessage();
        
        // Ensure reports directory exists
        this.reportsDir = path.join(__dirname, './data/reports');
        if (!fs.existsSync(this.reportsDir)) {
            fs.mkdirSync(this.reportsDir, { recursive: true });
        }
    }

    async inspectRegion(regionCode) {
        if (this.config.reporting.outputType === 'html') {
            process.stdout.write(`   Processing ${regionCode}... `);
        } else {
            console.log(`\n🔍 Inspecting ${regionCode}...`);
        }
        
        // Resolve path relative to the current script directory
        const filePath = path.resolve(__dirname, this.config.inputFiles[regionCode]);
        
        if (!fs.existsSync(filePath)) {
            if (this.config.reporting.outputType === 'html') {
                console.log('❌ File not found');
            } else {
                console.log(`❌ File not found: ${filePath}`);
            }
            return null;
        }

        const stats = fs.statSync(filePath);
        const sizeGB = stats.size / 1024 / 1024 / 1024;

        if (this.config.reporting.outputType !== 'html') {
            console.log(`   Looking for file: ${filePath}`);
            console.log(`   Size: ${sizeGB.toFixed(2)} GB`);
        }

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
            let wdpaidSet = new Set();
            let iucnStats = new Map();

            if (this.config.reporting.outputType !== 'html') {
                console.log('   Scanning file...');
            }

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
                                    wdpaidSet,
                                    iucnStats,
                                    (coordsCount) => {
                                        maxCoordinates = Math.max(maxCoordinates, coordsCount);
                                        totalCoordinates += coordsCount;
                                    }
                                );
                                
                                featureCount++;
                                
                                // Progress reporting only for console mode
                                if (this.config.reporting.outputType !== 'html' && featureCount % 10000 === 0) {
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

                // Memory management for very large files - only in console mode
                if (this.config.reporting.outputType !== 'html' && totalLines % 100000 === 0) {
                    console.log(`   Read ${totalLines} lines, found ${featureCount} features...`);
                }
            });

            rl.on('close', () => {
                const result = {
                    code: regionCode,
                    sizeGB: sizeGB,
                    totalLines,
                    featureCount,
                    geometryTypes: Object.fromEntries(geometryTypes),
                    wdpaidStats: {
                        total: featureCount,
                        unique: wdpaidSet.size
                    },
                    iucnStats: Object.fromEntries(iucnStats),
                    sampleProperties: Array.from(propertySample).slice(0, 20),
                    avgCoordinatesPerFeature: featureCount > 0 ? Math.round(totalCoordinates / featureCount) : 0,
                    maxCoordinatesPerFeature: maxCoordinates
                };

                this.stats.set(regionCode, result);
                this.htmlReporter.addRegionData(result);
                
                if (this.config.reporting.outputType === 'html') {
                    console.log(`✓ ${featureCount.toLocaleString()} features`);
                } else {
                    console.log(`✅ ${regionCode}: ${featureCount} features`);
                    console.log(`   Geometry types:`, result.geometryTypes);
                    console.log(`   WDPAID: ${result.wdpaidStats.unique} unique out of ${result.wdpaidStats.total} total`);
                    console.log(`   IUCN categories:`, result.iucnStats);
                    console.log(`   Avg coordinates: ${result.avgCoordinatesPerFeature}`);
                }
                
                resolve(result);
            });

            rl.on('error', (error) => {
                reject(error);
            });
        });
    }

    processFeatureChunk(featureString, geometryTypes, propertySample, wdpaidSet, iucnStats, coordinateCallback) {
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

                // Track WDPAID
                if (feature.properties.WDPAID) {
                    wdpaidSet.add(String(feature.properties.WDPAID));
                }

                // Track IUCN categories
                if (feature.properties.IUCN_CAT) {
                    const iucnCat = String(feature.properties.IUCN_CAT);
                    iucnStats.set(iucnCat, (iucnStats.get(iucnCat) || 0) + 1);
                }
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
        if (this.config.reporting.outputType === 'html') {
            console.log('🔍 File inspection in progress... Please wait');
        } else {
            // Start blinking message for console mode
            this.blinkingMessage.start();
        }
        
        const regions = Object.keys(this.config.inputFiles);
        let totalFeatures = 0;
        let totalSizeGB = 0;

        for (const region of regions) {
            if (this.config.reporting.outputType !== 'html') {
                console.log(`\n=== Processing ${region} ===`);
            }
            const result = await this.inspectRegion(region);
            if (result) {
                totalFeatures += result.featureCount;
                totalSizeGB += result.sizeGB;
            }
            if (this.config.reporting.outputType !== 'html') {
                console.log(`=== Finished ${region} ===`);
            }
        }

        if (this.config.reporting.outputType !== 'html') {
            // Stop blinking message and show summary
            this.blinkingMessage.stop('✅ File inspection completed!');
            console.log('\n📊 SUMMARY:');
            console.log(`   Total features: ${totalFeatures.toLocaleString()}`);
            console.log(`   Total size: ${totalSizeGB.toFixed(2)} GB`);
            console.log(`   Regions: ${regions.join(', ')}`);
        }

        return this.stats;
    }

    async generateReport() {
        this.htmlReporter.finalizeReport();
        
        if (this.config.reporting.outputType === 'html') {
            const reportPath = this.htmlReporter.saveReport();
            console.log(`📊 HTML report saved: ${reportPath}`);
            await this.htmlReporter.startServer(reportPath);
        } else {
            // For console mode, start server after stopping blinking message
            const reportPath = this.htmlReporter.saveReport();
            console.log(`📊 Report saved: ${reportPath}`);
            await this.htmlReporter.startServer(reportPath);
        }
    }

    generateConsoleReport() {
        if (this.config.reporting.outputType !== 'html') {
            console.log('\n📋 DETAILED REPORT:');
            console.log('='.repeat(100));
            
            for (const [region, stats] of this.stats) {
                console.log(`\n--- ${region.toUpperCase()} ---`);
                console.log(`   Size: ${stats.sizeGB.toFixed(2)} GB`);
                console.log(`   Features: ${stats.featureCount.toLocaleString()}`);
                console.log(`   Geometry types:`);
                Object.entries(stats.geometryTypes).forEach(([type, count]) => {
                    console.log(`     - ${type}: ${count}`);
                });
                console.log(`   WDPAID: ${stats.wdpaidStats.unique} unique out of ${stats.wdpaidStats.total} total`);
                console.log(`   IUCN categories:`);
                Object.entries(stats.iucnStats).forEach(([category, count]) => {
                    console.log(`     - ${category}: ${count}`);
                });
                console.log(`   Coordinates: avg ${stats.avgCoordinatesPerFeature}, max ${stats.maxCoordinatesPerFeature}`);
                console.log(`   Sample properties: ${stats.sampleProperties.slice(0, 10).join(', ')}`);
            }
            
            console.log('\n' + '='.repeat(100));
        }
    }
}

// Command line interface
async function main() {
    // Import configuration from config.js
    let config;
    try {
        const configModule = await import('./config.js');
        config = configModule.default;
    } catch (error) {
        console.error('💥 Fatal error loading config:', error);
        process.exit(1);
    }

    if (config.reporting.outputType === 'html') {
        console.log('🚀 Starting file inspection in HTML mode...');
    } else {
        console.log('🚀 Starting file inspection...');
    }
    
    const inspector = new FileInspector(config);
    
    try {
        if (process.argv.includes('--region')) {
            const regionIndex = process.argv.indexOf('--region') + 1;
            const regionCode = process.argv[regionIndex];
            
            if (regionCode && config.inputFiles[regionCode]) {
                if (config.reporting.outputType !== 'html') {
                    // Start blinking for single region processing too
                    inspector.blinkingMessage.start();
                    console.log(`🎯 Processing specific region: ${regionCode}`);
                }
                await inspector.inspectRegion(regionCode);
                if (config.reporting.outputType !== 'html') {
                    inspector.blinkingMessage.stop('✅ Region inspection completed!');
                }
                inspector.generateConsoleReport();
                await inspector.generateReport();
            } else {
                console.log('❌ Invalid region. Use: --region wa|af|as|na|eu,sa');
            }
        } else {
            if (config.reporting.outputType !== 'html') {
                console.log('🔍 Processing all regions...');
            }
            await inspector.inspectAllRegions();
            inspector.generateConsoleReport();
            await inspector.generateReport();
        }
    } catch (error) {
        if (config.reporting.outputType !== 'html') {
            inspector.blinkingMessage.stop('❌ Inspection failed!');
        }
        console.error('❌ Inspection failed:', error);
    }
    
    if (config.reporting.outputType === 'html') {
        console.log('🏁 File inspection completed - check the web browser for results');
    } else {
        console.log('🏁 File inspection completed');
    }
}

// Run the main function immediately
main().catch(console.error);

export default FileInspector;
