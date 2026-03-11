import express from 'express';
import MBTiles from '@mapbox/mbtiles';
import { join } from 'path';
import { promisify } from 'util';
import cors from 'cors';

const DATA_DIR = join(__dirname, '../../../data');
const TILES_FILE = join(DATA_DIR, 'alexandria-parcels.mbtiles');
const PORT = 3001;

const app = express();
app.use(cors());

let mbtiles: any;

// Initialize MBTiles
const initMBTiles = promisify((callback: any) => {
  new MBTiles(TILES_FILE, (err: Error, tiles: any) => {
    if (err) return callback(err);
    mbtiles = tiles;
    callback(null);
  });
});

// Serve tile endpoint
app.get('/tiles/:z/:x/:y.pbf', async (req, res) => {
  const { z, x, y } = req.params;

  const getTile = promisify(mbtiles.getTile.bind(mbtiles));

  try {
    const tile = await getTile(Number(z), Number(x), Number(y));
    res.set('Content-Type', 'application/x-protobuf');
    res.set('Content-Encoding', 'gzip');
    res.send(tile);
  } catch (err: any) {
    if (err.message === 'Tile does not exist') {
      res.status(404).send('Tile not found');
    } else {
      res.status(500).send('Error retrieving tile');
    }
  }
});

// Serve metadata
app.get('/tiles/metadata', async (req, res) => {
  const getInfo = promisify(mbtiles.getInfo.bind(mbtiles));
  try {
    const info = await getInfo();
    res.json(info);
  } catch (err) {
    res.status(500).send('Error retrieving metadata');
  }
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

async function start() {
  try {
    await initMBTiles();
    app.listen(PORT, () => {
      console.log(`Tile server running at http://localhost:${PORT}`);
      console.log(`Tiles: http://localhost:${PORT}/tiles/{z}/{x}/{y}.pbf`);
      console.log(`Metadata: http://localhost:${PORT}/tiles/metadata`);
    });
  } catch (error) {
    console.error('Failed to start tile server:', error);
    process.exit(1);
  }
}

start();
