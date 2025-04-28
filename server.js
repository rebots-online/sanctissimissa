import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Define the directory to serve files from
const PUBLIC_DIR = path.join(__dirname, 'public');
const INDEX_HTML = path.join(__dirname, 'index.html');

const server = http.createServer((req, res) => {
  console.log(`Request received: ${req.url}`);
  
  // Serve the index.html for the root path
  if (req.url === '/' || req.url === '/index.html') {
    fs.readFile(INDEX_HTML, (err, content) => {
      if (err) {
        res.writeHead(500);
        res.end(`Error loading index.html: ${err.message}`);
        return;
      }
      
      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end(content, 'utf-8');
    });
    return;
  }
  
  // Serve files from the public directory
  if (req.url.startsWith('/')) {
    const filePath = path.join(
      req.url.startsWith('/public/') 
        ? __dirname 
        : PUBLIC_DIR, 
      req.url.startsWith('/public/') 
        ? req.url.substring(1) 
        : req.url
    );
    
    fs.readFile(filePath, (err, content) => {
      if (err) {
        console.error(`Error reading file ${filePath}:`, err);
        
        // If the file doesn't exist, try serving index.html for SPA routing
        if (err.code === 'ENOENT') {
          fs.readFile(INDEX_HTML, (indexErr, indexContent) => {
            if (indexErr) {
              res.writeHead(500);
              res.end(`Error loading index.html: ${indexErr.message}`);
              return;
            }
            
            res.writeHead(200, { 'Content-Type': 'text/html' });
            res.end(indexContent, 'utf-8');
          });
          return;
        }
        
        res.writeHead(500);
        res.end(`Error loading ${req.url}: ${err.message}`);
        return;
      }
      
      // Set the content type based on the file extension
      const ext = path.extname(filePath);
      let contentType = 'text/plain';
      
      switch (ext) {
        case '.html':
          contentType = 'text/html';
          break;
        case '.js':
          contentType = 'text/javascript';
          break;
        case '.css':
          contentType = 'text/css';
          break;
        case '.json':
          contentType = 'application/json';
          break;
        case '.png':
          contentType = 'image/png';
          break;
        case '.jpg':
          contentType = 'image/jpg';
          break;
        case '.svg':
          contentType = 'image/svg+xml';
          break;
        case '.wasm':
          contentType = 'application/wasm';
          break;
        case '.sqlite':
          contentType = 'application/x-sqlite3';
          break;
      }
      
      res.writeHead(200, { 'Content-Type': contentType });
      res.end(content, 'utf-8');
    });
    return;
  }
  
  // Handle 404
  res.writeHead(404);
  res.end('Not found');
});

const PORT = 3000;
server.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}/`);
});
