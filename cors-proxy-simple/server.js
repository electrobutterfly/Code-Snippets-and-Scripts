/////////////////////////////////////////////////////////
// server.js
// Copyright (c) 2025 Klaus Simon
// https://github.com/electrobutterfly
// github@electrobutterfly.com
// This script is licensed under the MIT License.
// Full license text: https://opensource.org/licenses/MIT
/////////////////////////////////////////////////////////

const corsAnywhere = require('cors-anywhere');
const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');

const corsServer = corsAnywhere.createServer({
  originWhitelist: [],
  requireHeader: [],
  removeHeaders: ['cookie', 'cookie2']
});

// HTTP server (port 8080)
http.createServer((req, res) => {
  corsServer.emit('request', req, res);
}).listen(8080, '0.0.0.0', () => {
  console.log('CORS Anywhere HTTP running on http://0.0.0.0:8080');
});

// HTTPS server (port 8443) - only if certificates exist
try {
  const serverOptions = {
    key: fs.readFileSync(path.join(__dirname, 'server.key')),
    cert: fs.readFileSync(path.join(__dirname, 'server.cert'))
  };

  https.createServer(serverOptions, (req, res) => {
    corsServer.emit('request', req, res);
  }).listen(8443, '0.0.0.0', () => {
    console.log('CORS Anywhere HTTPS running on https://0.0.0.0:8443');
  });
} catch (error) {
  console.log('HTTPS not available - missing certificates');
}
