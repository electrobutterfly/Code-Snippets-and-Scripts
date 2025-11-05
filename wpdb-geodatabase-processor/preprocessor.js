// preprocessor.js
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
import http from 'http';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Import configuration from config.js
const config = (await import('./config.js')).default;

class BlinkingMessage {
    constructor() {
        this.interval = null;
        this.isVisible = true;
        this.message = 'Please wait';
    }

    start() {
        process.stdout.write('🔨 Processing in progress... ');
        this.interval = setInterval(() => {
            if (this.isVisible) {
                process.stdout.write('\x1b[36m' + this.message + '\x1b[0m'); // Cyan color
            } else {
                process.stdout.write('\x1b[90m' + ' '.repeat(this.message.length) + '\x1b[0m'); // Gray spaces
            }
            process.stdout.write('\r🔨 Processing in progress... ');
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
    constructor() {
        this.reportData = {
            regions: [],
            totalFeatures: 0,
            totalChunks: 0,
            totalWrittenMB: 0,
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
        const colors = config.reporting.colors;
        const licenseText = `// @copyright (c) 2025 Klaus Simon
// @license Custom Attribution-NonCommercial Sale License
// For commercial licensing: mini5propilot@gmail.com`;

        const processingTime = this.reportData.endTime ? 
            ((this.reportData.endTime - this.reportData.startTime) / 1000).toFixed(1) + 's' : 
            'In progress';

        let regionsHTML = '';
        this.reportData.regions.forEach(region => {
            let chunksHTML = '';
            region.largestChunks.forEach(chunk => {
                chunksHTML += `${(chunk.sizeMB).toFixed(1)}MB (${chunk.features} features)<br>`;
            });
            
            // Add total written for this region
            chunksHTML += `<br><strong>Total: ${region.totalWrittenMB.toFixed(1)} MB</strong>`;
            
            regionsHTML += `
                <tr>
                    <td><strong>${region.code.toUpperCase()}</strong></td>
                    <td>${(region.rawSizeMB).toFixed(2)} MB</td>
                    <td>${region.featureCount.toLocaleString()}</td>
                    <td>${region.chunkCount}</td>
                    <td>${region.processingTime}</td>
                    <td class="chunk-list">${chunksHTML}</td>
                </tr>
            `;
        });

        return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>WPDB GeoDatabase Processor - Processing Report</title>
    
    <!-- Google Analytics -->
    <script async src="https://www.googletagmanager.com/gtag/js?id=G-955THDBF7S"></script>
    <script>
      window.dataLayer = window.dataLayer || [];
      function gtag(){dataLayer.push(arguments);}
      gtag('js', new Date());
      gtag('config', 'G-955THDBF7S', {
        page_title: 'WPDB Processing Report',
        page_location: window.location.href
      });
      
      // Track custom event for report generation
      gtag('event', 'report_viewed', {
        'event_category': 'data_processing',
        'event_label': '${this.reportData.startTime.toLocaleString()}',
     // 'regions_count': ${this.reportData.regions.length},
     // 'total_features': ${this.reportData.totalFeatures},
     // 'total_chunks': ${this.reportData.totalChunks},
     // 'total_data_written_mb': ${this.reportData.totalWrittenMB.toFixed(1)}
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
            max-width: 1200px;
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
        }
        th {
            background: ${colors.tableHeader};
            padding: 15px;
            text-align: left;
            border-bottom: 2px solid ${colors.accent};
        }
        td {
            padding: 12px 15px;
            border-bottom: 1px solid ${colors.background};
        }
        tr:nth-child(even) {
            background: ${colors.tableRow};
        }
        tr:nth-child(odd) {
            background: ${colors.tableRowAlt};
        }
        .chunk-list {
            font-size: 0.9em;
            color: #aaa;
        }
        .chunk-list strong {
            color: ${colors.accent};
            font-size: 0.95em;
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
            <h1>🌍 WPDB GeoDatabase Processor</h1>
            <p>Processing Report - ${this.reportData.startTime.toLocaleString()}</p>
        </div>

        <div class="summary">
            <h2>📊 Processing Summary</h2>
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
                    <div class="summary-label">Total Chunks</div>
                    <div class="summary-value">${this.reportData.totalChunks}</div>
                </div>
                <div class="summary-item">
                    <div class="summary-label">Total Data Written</div>
                    <div class="summary-value">${this.reportData.totalWrittenMB.toFixed(1)} MB</div>
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
                    <th>Raw File Size</th>
                    <th>Features Found</th>
                    <th>Chunks Created</th>
                    <th>Processing Time</th>
                    <th>Largest Chunks & Total Written</th>
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
        this.reportData.totalChunks += regionData.chunkCount;
        this.reportData.totalWrittenMB += regionData.totalWrittenMB;
    }

    finalizeReport() {
        this.reportData.endTime = new Date();
    }

    saveReport() {
        const html = this.generateHTML();
        const outputPath = path.join(this.reportsDir, 'processing-report.html');
        fs.writeFileSync(outputPath, html);
        return outputPath;
    }

    startServer(reportPath) {
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

        server.listen(config.reporting.serverPort, () => {
            console.log(`🌐 Report server running at: http://localhost:${config.reporting.serverPort}`);
            console.log('   Press Ctrl+C to stop the server');
        });

        return server;
    }

    generateReport() {
        this.finalizeReport();
        const reportPath = this.saveReport();
        
        if (config.reporting.outputType === 'html') {
            console.log(`📊 HTML report saved: ${reportPath}`);
            this.startServer(reportPath);
        } else {
            console.log(`📊 Report saved: ${reportPath}`);
            this.startServer(reportPath);
        }
    }
}

class MemorySafeProcessor {
    constructor() {
        this.currentChunk = [];
        this.chunkIndex = 0;
        this.featureCount = 0;
        this.chunkSizes = [];
        this.regionStartTime = null;
        this.htmlReporter = new HTMLReporter();
        this.blinkingMessage = new BlinkingMessage();
        this.totalWrittenMB = 0;
    }

    // Simple optimization - just reduce precision
    optimizeFeature(feature) {
        if (!feature.geometry) return null;

        // Reduce coordinate precision
        const simplifyCoords = (coords) => {
            if (Array.isArray(coords[0]) && Array.isArray(coords[0][0])) {
                return coords.map(ring => simplifyCoords(ring));
            } else if (Array.isArray(coords[0])) {
                return coords.map(coord => [
                    Math.round(coord[0] * 100000) / 100000,
                    Math.round(coord[1] * 100000) / 100000
                ]);
            }
            return coords;
        };

        return {
            type: 'Feature',
            geometry: {
                type: feature.geometry.type,
                coordinates: simplifyCoords(feature.geometry.coordinates)
            },
            properties: {
                name: String(feature.properties?.NAME || '').substring(0, 100),
                designation: String(feature.properties?.DESIG || '').substring(0, 50),
                iucn: String(feature.properties?.IUCN_CAT || ''),
                country: String(feature.properties?.ISO3 || ''),
                area: Number(feature.properties?.REP_AREA || 0),
                wdpaid: String(feature.properties?.WDPAID || '')
            }
        };
    }

    writeChunk(regionCode, outputDir) {
        if (this.currentChunk.length === 0) return;

        const chunkData = {
            type: 'FeatureCollection',
            features: this.currentChunk,
            metadata: {
                region: regionCode,
                chunk: this.chunkIndex,
                count: this.currentChunk.length
            }
        };

        const filename = `chunk_${this.chunkIndex}.json`;
        const filepath = path.join(outputDir, filename);
        
        const chunkContent = JSON.stringify(chunkData);
        fs.writeFileSync(filepath, chunkContent);
        
        const sizeKB = Buffer.byteLength(chunkContent) / 1024;
        const sizeMB = sizeKB / 1024;
        this.totalWrittenMB += sizeMB;
        
        // Track chunk size for reporting
        this.chunkSizes.push({
            sizeMB: sizeMB,
            features: this.currentChunk.length
        });
        
        if (config.reporting.outputType !== 'html') {
            console.log(`   Wrote ${filename} (${this.currentChunk.length} features, ${sizeKB.toFixed(1)}KB)`);
        }
        
        // Clear memory immediately
        this.currentChunk = [];
        this.chunkIndex++;
    }

    async processRegion(regionCode) {
        if (config.reporting.outputType === 'html') {
            process.stdout.write(`   Processing ${regionCode}... `);
        } else {
            console.log(`\n🔨 Processing ${regionCode}...`);
        }
        
        this.regionStartTime = Date.now();
        this.chunkSizes = [];
        this.totalWrittenMB = 0;
        
        const inputFile = path.join(__dirname, config.inputFiles[regionCode]);
        if (!fs.existsSync(inputFile)) {
            if (config.reporting.outputType === 'html') {
                console.log('❌ File not found');
            } else {
                console.log(`❌ File not found: ${inputFile}`);
            }
            return 0;
        }

        const stats = fs.statSync(inputFile);
        const rawSizeMB = stats.size / 1024 / 1024;

        if (config.reporting.outputType !== 'html') {
            console.log(`   Size: ${rawSizeMB.toFixed(2)} MB`);
        }

        const outputDir = path.join(__dirname, config.output.chunks, regionCode);
        if (!fs.existsSync(outputDir)) {
            fs.mkdirSync(outputDir, { recursive: true });
        }

        // Reset counters for new region
        this.currentChunk = [];
        this.chunkIndex = 0;
        this.featureCount = 0;

        return new Promise((resolve, reject) => {
            const fileStream = fs.createReadStream(inputFile, { 
                encoding: 'utf8',
                highWaterMark: 64 * 1024 // 64KB chunks
            });

            const rl = readline.createInterface({
                input: fileStream,
                crlfDelay: Infinity
            });

            let inFeatures = false;
            let currentFeature = '';
            let braceDepth = 0;
            let lineCount = 0;

            if (config.reporting.outputType !== 'html') {
                console.log('   Reading features...');
            }

            rl.on('line', (line) => {
                lineCount++;
                const trimmed = line.trim();

                if (trimmed.includes('"features":') && trimmed.includes('[')) {
                    inFeatures = true;
                    return;
                }

                if (!inFeatures) return;

                if (trimmed === ']' || trimmed === '],' || trimmed === ']}') {
                    inFeatures = false;
                    // Write final chunk
                    this.writeChunk(regionCode, outputDir);
                    return;
                }

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
                            try {
                                let cleanFeature = currentFeature;
                                if (cleanFeature.endsWith(',')) {
                                    cleanFeature = cleanFeature.slice(0, -1);
                                }
                                
                                const feature = JSON.parse(cleanFeature);
                                if (feature.type === 'Feature' && feature.geometry) {
                                    const optimized = this.optimizeFeature(feature);
                                    if (optimized) {
                                        this.currentChunk.push(optimized);
                                        this.featureCount++;

                                        // Write chunk when full and clear memory
                                        if (this.currentChunk.length >= config.output.featuresPerChunk) {
                                            this.writeChunk(regionCode, outputDir);
                                        }
                                    }
                                }
                            } catch (error) {
                                // Skip parse errors
                            }
                            currentFeature = '';
                        }
                    } else if (braceDepth > 0) {
                        currentFeature += char;
                    }
                }

                // Progress and memory management - only in console mode
                if (config.reporting.outputType !== 'html' && lineCount % 50000 === 0) {
                    console.log(`   Read ${lineCount} lines, processed ${this.featureCount} features...`);
                    
                    // Force garbage collection if available
                    if (global.gc) {
                        global.gc();
                    }
                }
            });

            rl.on('close', () => {
                const processingTime = ((Date.now() - this.regionStartTime) / 1000).toFixed(1) + 's';
                
                // Get top 5 largest chunks
                const largestChunks = [...this.chunkSizes]
                    .sort((a, b) => b.sizeMB - a.sizeMB)
                    .slice(0, 5);
                
                // Add to HTML report
                this.htmlReporter.addRegionData({
                    code: regionCode,
                    rawSizeMB: rawSizeMB,
                    featureCount: this.featureCount,
                    chunkCount: this.chunkIndex,
                    processingTime: processingTime,
                    largestChunks: largestChunks,
                    totalWrittenMB: this.totalWrittenMB
                });
                
                if (config.reporting.outputType === 'html') {
                    console.log(`✓ ${this.featureCount.toLocaleString()} features in ${this.chunkIndex} chunks (${this.totalWrittenMB.toFixed(1)} MB written)`);
                } else {
                    console.log(`✅ ${regionCode}: ${this.featureCount} features in ${this.chunkIndex} chunks (${this.totalWrittenMB.toFixed(1)} MB written, ${processingTime})`);
                }
                
                resolve(this.featureCount);
            });

            rl.on('error', (error) => {
                reject(error);
            });
        });
    }

    async processAllRegions() {
        if (config.reporting.outputType === 'html') {
            console.log('🔨 Processing in HTML mode... Please wait');
        } else {
            // Start blinking message for console mode
            this.blinkingMessage.start();
        }
        
        const regions = Object.keys(config.inputFiles);
        let totalFeatures = 0;

        for (const region of regions) {
            if (config.reporting.outputType !== 'html') {
                console.log(`\n=== Processing ${region} ===`);
            }
            const count = await this.processRegion(region);
            totalFeatures += count;
            if (config.reporting.outputType !== 'html') {
                console.log(`=== Finished ${region} ===`);
            }
        }

        if (config.reporting.outputType !== 'html') {
            // Stop blinking message and show summary
            this.blinkingMessage.stop('✅ All regions processed!');
            console.log(`\n🎉 All regions done: ${totalFeatures} total features`);
        }

        return totalFeatures;
    }

    generateReport() {
        this.htmlReporter.generateReport();
    }
}

// Process specific region if specified
async function processSpecificRegion(regionCode) {
    const processor = new MemorySafeProcessor();
    
    // Set smaller chunk size for huge files
    if (['as', 'na', 'eu'].includes(regionCode)) {
        config.output.featuresPerChunk = 25;
    }
    
    if (config.reporting.outputType !== 'html') {
        processor.blinkingMessage.start();
    }
    
    await processor.processRegion(regionCode);
    
    if (config.reporting.outputType !== 'html') {
        processor.blinkingMessage.stop('✅ Region processing completed!');
    }
    
    processor.generateReport();
}

// Process all regions
async function processAllRegions() {
    const processor = new MemorySafeProcessor();
    
    try {
        await processor.processAllRegions();
        processor.generateReport();
    } catch (error) {
        if (config.reporting.outputType !== 'html') {
            processor.blinkingMessage.stop('❌ Processing failed!');
        }
        console.error('❌ Error:', error);
    }
}

// Run with command line arguments
if (process.argv.includes('--region')) {
    const regionIndex = process.argv.indexOf('--region') + 1;
    const regionCode = process.argv[regionIndex];
    
    if (regionCode && config.inputFiles[regionCode]) {
        if (config.reporting.outputType !== 'html') {
            console.log(`🎯 Processing specific region: ${regionCode}`);
        }
        processSpecificRegion(regionCode).catch(console.error);
    } else {
        console.log('❌ Invalid region. Use: --region af|as|eu|na|wa|sa');
    }
} else {
    // Run normally - process ALL regions
    if (config.reporting.outputType !== 'html') {
        console.log('🚀 Processing ALL regions...');
    }
    processAllRegions().catch(console.error);
}
