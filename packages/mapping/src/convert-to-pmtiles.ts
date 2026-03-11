import { exec } from 'child_process';
import { existsSync } from 'fs';
import { join } from 'path';
import { promisify } from 'util';

const execAsync = promisify(exec);

const DATA_DIR = join(__dirname, '../../../data');
const MBTILES_FILE = join(DATA_DIR, 'alexandria-parcels.mbtiles');
const PMTILES_FILE = join(DATA_DIR, 'alexandria-parcels.pmtiles');

async function convertToPMTiles() {
  if (!existsSync(MBTILES_FILE)) {
    console.error('MBTiles file not found. Run "yarn generate-tiles" first.');
    process.exit(1);
  }

  if (existsSync(PMTILES_FILE)) {
    console.log('PMTiles file already exists at:', PMTILES_FILE);
    console.log('Delete it to regenerate.');
    return;
  }

  console.log('Converting MBTiles to PMTiles...');

  try {
    // Check if pmtiles CLI is installed
    await execAsync('which pmtiles');
  } catch {
    console.error('Error: pmtiles CLI is not installed.');
    console.error('\nInstall it with:');
    console.error('  npm install -g pmtiles');
    console.error('  OR download from: https://github.com/protomaps/go-pmtiles/releases');
    process.exit(1);
  }

  try {
    const command = `pmtiles convert ${MBTILES_FILE} ${PMTILES_FILE}`;

    console.log('Running:', command, '\n');

    const { stdout, stderr } = await execAsync(command);

    if (stdout) console.log(stdout);
    if (stderr) console.error(stderr);

    console.log('\nConversion complete!');
    console.log('File saved to:', PMTILES_FILE);
    console.log('\nYou can now:');
    console.log('1. Copy this file to your static hosting (Vercel, Netlify, S3, etc.)');
    console.log('2. Update the viewer to use PMTiles protocol');
    console.log('3. No backend server needed!');
  } catch (error) {
    console.error('Error converting to PMTiles:', error);
    throw error;
  }
}

convertToPMTiles();
