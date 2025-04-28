import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;

// Log all requests
app.use((req, res, next) => {
  console.log(`Request received: ${req.url}`);
  next();
});

// Serve static files from the public directory
app.use(express.static(path.join(__dirname, 'public')));

// Serve the index.html for all routes (for SPA routing)
app.get('/', (req, res) => {
  const indexPath = path.join(__dirname, 'index.html');
  console.log(`Serving index.html from: ${indexPath}`);

  // Check if the file exists
  if (fs.existsSync(indexPath)) {
    res.sendFile(indexPath);
  } else {
    res.status(404).send(`File not found: ${indexPath}`);
  }
});

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}/`);
});
