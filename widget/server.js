const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 8080;

const server = http.createServer((req, res) => {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', '*');
  
  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  // Strip query string (e.g. ?v=1.0.0) before resolving path
  const urlPath = req.url.split('?')[0];
  let filePath = urlPath === '/' ? '/loader.js' : urlPath;
  filePath = path.join(__dirname, filePath);
  filePath = path.normalize(filePath);

  // Security: prevent directory traversal
  if (!filePath.startsWith(path.normalize(__dirname))) {
    res.writeHead(403);
    res.end('Forbidden');
    return;
  }

  fs.readFile(filePath, (err, data) => {
    if (err) {
      console.log(`❌ 404: ${req.url}`);
      res.writeHead(404);
      res.end('Not Found');
      return;
    }

    const ext = path.extname(filePath);
    const mimeTypes = {
      '.js': 'application/javascript',
      '.html': 'text/html',
      '.css': 'text/css'
    };

    // Prevent 304 / aggressive caching so widget and loader updates are always fetched
    const cacheControl = 'no-cache, no-store, must-revalidate';
    const headers = {
      'Content-Type': mimeTypes[ext] || 'text/plain',
      'Cache-Control': cacheControl,
      'Pragma': 'no-cache',
      'Expires': '0',
    };

    res.writeHead(200, headers);
    res.end(data);
    console.log(`✅ 200: ${req.url}`);
  });
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`\n🚀 Widget Server Running!`);
  console.log(`📍 http://0.0.0.0:${PORT}`);
  console.log(`📍 Loader: http://0.0.0.0:${PORT}/loader.js`);
  console.log(`📍 Widget: http://0.0.0.0:${PORT}/build/widget.js\n`);
});
