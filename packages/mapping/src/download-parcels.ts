import axios from 'axios';
import { createWriteStream, existsSync, statSync } from 'fs';
import { mkdir, readFile, writeFile } from 'fs/promises';
import { dirname, join } from 'path';
import { pipeline } from 'stream/promises';
import { topology } from 'topojson-server';

const PARCELS_URL =
  'https://hub.arcgis.com/api/v3/datasets/ab8f3a147ddc47deb6d82c5afda65708_0/downloads/data?format=geojson&spatialRefId=4326&where=1%3D1';

const DATA_DIR = join(__dirname, '../../../data');
const PARCELS_FILE = join(DATA_DIR, 'alexandria-parcels.geojson');
const TOPOJSON_FILE = join(DATA_DIR, 'alexandria-parcels.topojson');

async function convertToTopoJSON() {
  console.log('\nConverting GeoJSON to TopoJSON...');

  try {
    // Read GeoJSON file
    const geojsonData = await readFile(PARCELS_FILE, 'utf-8');
    const geojson = JSON.parse(geojsonData);

    // Convert to TopoJSON
    const topo = topology({ parcels: geojson });

    // Write TopoJSON file
    await writeFile(TOPOJSON_FILE, JSON.stringify(topo));

    // Show file size comparison
    const geojsonSize = statSync(PARCELS_FILE).size;
    const topojsonSize = statSync(TOPOJSON_FILE).size;
    const reduction = ((1 - topojsonSize / geojsonSize) * 100).toFixed(1);

    console.log('Conversion complete!');
    console.log(`GeoJSON size: ${(geojsonSize / 1024 / 1024).toFixed(2)} MB`);
    console.log(
      `TopoJSON size: ${(topojsonSize / 1024 / 1024).toFixed(2)} MB`,
    );
    console.log(`Size reduction: ${reduction}%`);
    console.log('File saved to:', TOPOJSON_FILE);
  } catch (error) {
    console.error('Error converting to TopoJSON:', error);
    throw error;
  }
}

async function downloadParcels() {
  // Check if file already exists
  if (existsSync(PARCELS_FILE)) {
    console.log('Parcels file already exists at:', PARCELS_FILE);
    console.log('Skipping download. Delete the file to re-download.');

    // Convert to TopoJSON if it doesn't exist
    if (!existsSync(TOPOJSON_FILE)) {
      await convertToTopoJSON();
    } else {
      console.log('TopoJSON file already exists at:', TOPOJSON_FILE);
    }
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

    console.log('Download complete!');
    console.log('File saved to:', PARCELS_FILE);

    // Convert to TopoJSON
    await convertToTopoJSON();
  } catch (error) {
    console.error('Error downloading parcels file:', error);
    throw error;
  }
}

downloadParcels();
