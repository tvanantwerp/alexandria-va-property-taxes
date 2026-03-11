import axios from 'axios';
import { createWriteStream, existsSync, statSync } from 'fs';
import { mkdir } from 'fs/promises';
import { join } from 'path';
import { pipeline } from 'stream/promises';

const PARCELS_URL =
  'https://hub.arcgis.com/api/v3/datasets/ab8f3a147ddc47deb6d82c5afda65708_0/downloads/data?format=geojson&spatialRefId=4326&where=1%3D1';

const DATA_DIR = join(__dirname, '../../../data');
const PARCELS_FILE = join(DATA_DIR, 'alexandria-parcels.geojson');

async function downloadParcels() {
  // Check if file already exists
  if (existsSync(PARCELS_FILE)) {
    console.log('Parcels file already exists at:', PARCELS_FILE);
    console.log('Skipping download. Delete the file to re-download.');
    return;
  }

  console.log('Downloading Alexandria parcels GeoJSON...');
  console.log('URL:', PARCELS_URL);

  try {
    // Ensure data directory exists
    await mkdir(DATA_DIR, { recursive: true });

    // Download file
    const response = await axios({
      method: 'GET',
      url: PARCELS_URL,
      responseType: 'stream',
    });

    // Stream to file
    await pipeline(response.data, createWriteStream(PARCELS_FILE));

    // Show file size
    const geojsonSize = statSync(PARCELS_FILE).size;
    console.log('Download complete!');
    console.log(`File size: ${(geojsonSize / 1024 / 1024).toFixed(2)} MB`);
    console.log('File saved to:', PARCELS_FILE);
  } catch (error) {
    console.error('Error downloading parcels file:', error);
    throw error;
  }
}

downloadParcels();
