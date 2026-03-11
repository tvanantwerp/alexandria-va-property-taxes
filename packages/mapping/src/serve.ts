import { createServer } from 'http';
import { readFile } from 'fs/promises';
import { existsSync } from 'fs';
import { join, extname } from 'path';

const PORT = 3000;
const PUBLIC_DIR = join(__dirname, '../public');
const DATA_DIR = join(__dirname, '../../../data');

const MIME_TYPES: Record<string, string> = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.pmtiles': 'application/vnd.pmtiles',
  '.mbtiles': 'application/x-sqlite3',
  '.geojson': 'application/geo+json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
};

const server = createServer(async (req, res) => {
  // Enable CORS for local development
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Range');
  res.setHeader('Access-Control-Expose-Headers', 'Content-Length, Content-Range, Accept-Ranges');

  // Disable caching for development
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  let filePath = req.url || '/';

  // Default to index.html
  if (filePath === '/') {
    filePath = '/index-assessments.html';
  }

  // Try public directory first
  let fullPath = join(PUBLIC_DIR, filePath);
  let isPublic = true;

  // If not in public, try data directory (for .pmtiles, .geojson, etc.)
  if (!existsSync(fullPath)) {
    fullPath = join(DATA_DIR, filePath);
    isPublic = false;
  }

  try {
    if (!existsSync(fullPath)) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('404 Not Found');
      return;
    }

    const ext = extname(fullPath);
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';

    // Handle range requests for PMTiles
    const rangeHeader = req.headers.range;
    if (rangeHeader && ext === '.pmtiles') {
      const fileBuffer = await readFile(fullPath);
      const fileSize = fileBuffer.length;

      const parts = rangeHeader.replace(/bytes=/, '').split('-');
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
      const chunkSize = end - start + 1;
      const chunk = fileBuffer.slice(start, end + 1);

      res.writeHead(206, {
        'Content-Range': `bytes ${start}-${end}/${fileSize}`,
        'Accept-Ranges': 'bytes',
        'Content-Length': chunkSize,
        'Content-Type': contentType,
      });
      res.end(chunk);
    } else {
      // Normal file serving
      const content = await readFile(fullPath);
      res.writeHead(200, {
        'Content-Type': contentType,
        'Content-Length': content.length,
        'Accept-Ranges': 'bytes',
      });
      res.end(content);
    }
  } catch (error) {
    console.error('Error serving file:', error);
    res.writeHead(500, { 'Content-Type': 'text/plain' });
    res.end('500 Internal Server Error');
  }
});

server.listen(PORT, () => {
  console.log(`Development server running at http://localhost:${PORT}`);
  console.log('\nAvailable viewers:');
  console.log(`  http://localhost:${PORT}/index-assessments.html`);
  console.log(`  http://localhost:${PORT}/index-pmtiles.html`);
  console.log(`  http://localhost:${PORT}/index.html`);
  console.log('\nServing files from:');
  console.log(`  ${PUBLIC_DIR}`);
  console.log(`  ${DATA_DIR}`);
  console.log('\nPress Ctrl+C to stop');
});
