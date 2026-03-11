import MBTiles from '@mapbox/mbtiles';
import { mkdirSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';
import { promisify } from 'util';

const DATA_DIR = join(__dirname, '../../../data');
const TILES_FILE = join(DATA_DIR, 'alexandria-parcels.mbtiles');
const OUTPUT_DIR = join(__dirname, '../public/tiles');

async function extractTiles() {
  if (!existsSync(TILES_FILE)) {
    console.error('MBTiles file not found. Run "yarn generate-tiles" first.');
    process.exit(1);
  }

  console.log('Extracting tiles to individual files...');
  console.log('This may take a few minutes...\n');

  // Create output directory
  mkdirSync(OUTPUT_DIR, { recursive: true });

  // Open MBTiles
  const mbtiles: any = await new Promise((resolve, reject) => {
    new MBTiles(TILES_FILE, (err: Error, tiles: any) => {
      if (err) reject(err);
      else resolve(tiles);
    });
  });

  // Get all tiles
  const getTile = promisify(mbtiles.getTile.bind(mbtiles));
  const getInfo = promisify(mbtiles.getInfo.bind(mbtiles));

  const info = await getInfo();
  console.log('MBTiles info:', info);
  console.log();

  let tileCount = 0;
  let errorCount = 0;

  // Iterate through all possible tiles
  for (let z = info.minzoom; z <= info.maxzoom; z++) {
    const zDir = join(OUTPUT_DIR, z.toString());
    mkdirSync(zDir, { recursive: true });

    // Calculate tile range for this zoom level
    const numTiles = Math.pow(2, z);

    for (let x = 0; x < numTiles; x++) {
      const xDir = join(zDir, x.toString());
      let xDirCreated = false;

      for (let y = 0; y < numTiles; y++) {
        try {
          const tile = await getTile(z, x, y);

          if (!xDirCreated) {
            mkdirSync(xDir, { recursive: true });
            xDirCreated = true;
          }

          const tilePath = join(xDir, `${y}.pbf`);
          writeFileSync(tilePath, tile);
          tileCount++;

          if (tileCount % 100 === 0) {
            process.stdout.write(`\rExtracted ${tileCount} tiles...`);
          }
        } catch (err: any) {
          if (err.message !== 'Tile does not exist') {
            errorCount++;
            console.error(`\nError extracting tile ${z}/${x}/${y}:`, err.message);
          }
          // Skip non-existent tiles (normal for sparse datasets)
        }
      }
    }
  }

  console.log(`\n\nExtraction complete!`);
  console.log(`Total tiles extracted: ${tileCount}`);
  if (errorCount > 0) {
    console.log(`Errors encountered: ${errorCount}`);
  }
  console.log(`Output directory: ${OUTPUT_DIR}`);
  console.log('\nYou can now serve the public/ directory statically.');
  console.log('No backend server needed!');
}

extractTiles().catch(console.error);
