/////////////////////////////////////////////////////////
// server.js
// Copyright (c) 2025 Klaus Simon
// https://github.com/electrobutterfly
// github@electrobutterfly.com
// This script is licensed under the MIT License.
// Full license text: https://opensource.org/licenses/MIT
/////////////////////////////////////////////////////////

const http = require('http');
const https = require('https');
const fs = require('fs');
const url = require('url');

// Create a server
function createServer() {
  const server = http.createServer(handleRequest);
  
  function handleRequest(req, res) {
    // Set CORS headers for all responses
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
    
    // Handle preflight requests
    if (req.method === 'OPTIONS') {
      res.statusCode = 200;
      res.end();
      return;
    }
    
    const parsedUrl = url.parse(req.url, true);
    
    // Handle /raw endpoint
    if (parsedUrl.pathname === '/raw' && parsedUrl.query.url) {
      handleRawRequest(req, res, parsedUrl.query.url);
    } 
    // Handle root path with url parameter (backward compatibility)
    else if (parsedUrl.pathname === '/' && parsedUrl.query.url) {
      handleRawRequest(req, res, parsedUrl.query.url);
    }
    // Handle standard CORS Anywhere behavior (path as URL)
    else if (parsedUrl.pathname !== '/' && parsedUrl.pathname !== '/raw') {
      handleStandardProxy(req, res);
    }
    else {
      res.statusCode = 400;
      res.end('Usage: /raw?url=URL or /URL');
    }
  }
  
  function handleRawRequest(req, res, targetUrl) {
    try {
      const parsedTarget = new URL(targetUrl);
      
      const options = {
        hostname: parsedTarget.hostname,
        port: parsedTarget.port || (parsedTarget.protocol === 'https:' ? 443 : 80),
        path: parsedTarget.pathname + parsedTarget.search + (parsedTarget.hash || ''),
        method: req.method,
        headers: { ...req.headers }
      };
      
      // Remove host header to avoid issues
      delete options.headers.host;
      // Remove origin and referer to avoid CORS issues on target server
      delete options.headers.origin;
      delete options.headers.referer;
      
      const protocol = parsedTarget.protocol === 'https:' ? https : http;
      
      const proxyReq = protocol.request(options, (proxyRes) => {
        // Forward status code
        res.statusCode = proxyRes.statusCode || 200;
        
        // Forward headers (but set CORS headers)
        Object.keys(proxyRes.headers).forEach(key => {
          if (key.toLowerCase() !== 'access-control-allow-origin') {
            res.setHeader(key, proxyRes.headers[key]);
          }
        });
        
        // Stream the raw data
        proxyRes.pipe(res);
      });
      
      proxyReq.on('error', (err) => {
        console.error('Proxy error:', err);
        res.statusCode = 500;
        res.end('Error fetching URL: ' + err.message);
      });
      
      // Set timeout
      proxyReq.setTimeout(30000, () => {
        proxyReq.destroy();
        res.statusCode = 504;
        res.end('Request timeout');
      });
      
      // Forward request body for POST requests
      if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method) && req.headers['content-length'] !== '0') {
        req.pipe(proxyReq);
      } else {
        proxyReq.end();
      }
      
    } catch (err) {
      res.statusCode = 400;
      res.end('Invalid URL: ' + err.message);
    }
  }
  
  function handleStandardProxy(req, res) {
    // This handles the standard CORS Anywhere behavior
    // where the URL is provided as a path
    const targetUrl = req.url.slice(1); // Remove leading slash
    
    if (!targetUrl) {
      res.statusCode = 400;
      res.end('Provide a URL as a path: /https://example.com');
      return;
    }
    
    // Add protocol if missing
    const fullUrl = targetUrl.includes('://') ? targetUrl : `https://${targetUrl}`;
    handleRawRequest(req, res, fullUrl);
  }
  
  return server;
}

// Create and start HTTP server
const httpServer = createServer();
const HTTP_PORT = process.env.PORT || 8080;
httpServer.listen(HTTP_PORT, '0.0.0.0', () => {
  console.log(`CORS server running on http://0.0.0.0:${HTTP_PORT}`);
  console.log('Usage:');
  console.log(`  http://localhost:${HTTP_PORT}/raw?url=URL`);
  console.log(`  http://localhost:${HTTP_PORT}/URL`);
});

// Optional: Create HTTPS server if certificates exist
function createHttpsServer() {
  try {
    // Try common certificate paths
    const certPaths = [
      '/usr/local/lib/node_modules/cors-anywhere/server.key',
      './server.key',
      './certs/server.key'
    ];
    
    const keyPath = certPaths.find(path => fs.existsSync(path));
    const certPath = keyPath ? keyPath.replace('.key', '.cert') : null;
    
    if (keyPath && certPath && fs.existsSync(certPath)) {
      const serverOptions = {
        key: fs.readFileSync(keyPath),
        cert: fs.readFileSync(certPath)
      };

      const httpsServer = https.createServer(serverOptions, (req, res) => {
        const parsedUrl = url.parse(req.url, true);
        
        // Set CORS headers
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
        
        // Handle preflight requests
        if (req.method === 'OPTIONS') {
          res.statusCode = 200;
          res.end();
          return;
        }
        
        // Handle /raw endpoint
        if (parsedUrl.pathname === '/raw' && parsedUrl.query.url) {
          handleRawRequest(req, res, parsedUrl.query.url);
        } 
        // Handle standard proxy
        else if (parsedUrl.pathname !== '/' && parsedUrl.pathname !== '/raw') {
          handleStandardProxy(req, res);
        }
        else {
          res.statusCode = 400;
          res.end('Usage: /raw?url=URL or /URL');
        }
      });

      const HTTPS_PORT = process.env.HTTPS_PORT || 8443;
      httpsServer.listen(HTTPS_PORT, '0.0.0.0', () => {
        console.log(`CORS server running on https://0.0.0.0:${HTTPS_PORT}`);
      });
      
      return httpsServer;
    } else {
      console.log('HTTPS certificates not found. HTTPS server not started.');
      return null;
    }
  } catch (error) {
    console.log('HTTPS not available:', error.message);
    return null;
  }
}

// Reuse the same functions for HTTPS
function handleRawRequest(req, res, targetUrl) {
  try {
    const parsedTarget = new URL(targetUrl);
    
    const options = {
      hostname: parsedTarget.hostname,
      port: parsedTarget.port || (parsedTarget.protocol === 'https:' ? 443 : 80),
      path: parsedTarget.pathname + parsedTarget.search + (parsedTarget.hash || ''),
      method: req.method,
      headers: { ...req.headers }
    };
    
    delete options.headers.host;
    delete options.headers.origin;
    delete options.headers.referer;
    
    const protocol = parsedTarget.protocol === 'https:' ? https : http;
    
    const proxyReq = protocol.request(options, (proxyRes) => {
      res.statusCode = proxyRes.statusCode || 200;
      Object.keys(proxyRes.headers).forEach(key => {
        if (key.toLowerCase() !== 'access-control-allow-origin') {
          res.setHeader(key, proxyRes.headers[key]);
        }
      });
      proxyRes.pipe(res);
    });
    
    proxyReq.on('error', (err) => {
      console.error('Proxy error:', err);
      res.statusCode = 500;
      res.end('Error fetching URL: ' + err.message);
    });
    
    proxyReq.setTimeout(30000, () => {
      proxyReq.destroy();
      res.statusCode = 504;
      res.end('Request timeout');
    });
    
    if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method) && req.headers['content-length'] !== '0') {
      req.pipe(proxyReq);
    } else {
      proxyReq.end();
    }
    
  } catch (err) {
    res.statusCode = 400;
    res.end('Invalid URL: ' + err.message);
  }
}

function handleStandardProxy(req, res) {
  const targetUrl = req.url.slice(1);
  if (!targetUrl) {
    res.statusCode = 400;
    res.end('Provide a URL as a path: /https://example.com');
    return;
  }
  const fullUrl = targetUrl.includes('://') ? targetUrl : `https://${targetUrl}`;
  handleRawRequest(req, res, fullUrl);
}

// Create HTTPS server if certificates are available
createHttpsServer();
