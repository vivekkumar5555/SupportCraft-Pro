const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 8080;

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

  let filePath = req.url === '/' ? '/loader.js' : req.url;
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

server.listen(PORT, () => {
  console.log(`\n🚀 Widget Server Running!`);
  console.log(`📍 http://localhost:${PORT}`);
  console.log(`📍 Loader: http://localhost:${PORT}/loader.js`);
  console.log(`📍 Widget: http://localhost:${PORT}/build/widget.js\n`);
});
