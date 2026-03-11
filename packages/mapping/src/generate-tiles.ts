import { exec } from 'child_process';
import { existsSync } from 'fs';
import { join } from 'path';
import { promisify } from 'util';

const execAsync = promisify(exec);

const DATA_DIR = join(__dirname, '../../../data');
const GEOJSON_FILE = join(DATA_DIR, 'alexandria-parcels.geojson');
const TILES_FILE = join(DATA_DIR, 'alexandria-parcels.mbtiles');

async function generateTiles() {
  if (!existsSync(GEOJSON_FILE)) {
    console.error('GeoJSON file not found. Run "yarn download" first.');
    process.exit(1);
  }

  if (existsSync(TILES_FILE)) {
    console.log('Tiles file already exists at:', TILES_FILE);
    console.log('Delete it to regenerate.');
    return;
  }

  console.log('Generating vector tiles with tippecanoe...');
  console.log('This may take a few minutes...\n');

  try {
    // Check if tippecanoe is installed
    await execAsync('which tippecanoe');
  } catch {
    console.error('Error: tippecanoe is not installed.');
    console.error('\nInstall it with:');
    console.error('  macOS: brew install tippecanoe');
    console.error('  Linux: https://github.com/felt/tippecanoe#installation');
    process.exit(1);
  }

  try {
    const command = [
      'tippecanoe',
      '-o', TILES_FILE,
      '--drop-densest-as-needed', // Drop features when tile is too dense
      '--extend-zooms-if-still-dropping', // Add zoom levels if needed
      '-Z8', // Minimum zoom level
      '-z14', // Maximum zoom level
      '--layer=parcels',
      '--name="Alexandria Parcels"',
      '--attribution="City of Alexandria, VA"',
      GEOJSON_FILE,
    ].join(' ');

    console.log('Running:', command, '\n');

    const { stdout, stderr } = await execAsync(command, {
      maxBuffer: 1024 * 1024 * 100, // 100MB buffer
    });

    if (stdout) console.log(stdout);
    if (stderr) console.error(stderr);

    console.log('\nVector tiles generated successfully!');
    console.log('File saved to:', TILES_FILE);
    console.log('\nNext steps:');
    console.log('1. Start the tile server: yarn serve');
    console.log('2. Open the viewer: yarn viewer');
  } catch (error) {
    console.error('Error generating tiles:', error);
    throw error;
  }
}

generateTiles();
