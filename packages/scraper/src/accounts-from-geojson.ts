import { existsSync, readFileSync } from 'fs';
import { resolve } from 'path';

interface ParcelProperties {
  ACCOUNTNO: string;
  [key: string]: unknown;
}

interface ParcelFeature {
  type: 'Feature';
  properties: ParcelProperties;
  geometry: unknown;
}

interface ParcelGeoJSON {
  type: 'FeatureCollection';
  features: ParcelFeature[];
}

const GEOJSON_PATH = resolve(__dirname, '../../../data/alexandria-parcels.geojson');

/**
 * Extracts unique account numbers from the Alexandria parcels GeoJSON file.
 * @returns Array of account numbers as strings
 * @throws Error if GeoJSON file doesn't exist
 */
export function getAccountNumbersFromGeoJSON(): string[] {
  if (!existsSync(GEOJSON_PATH)) {
    throw new Error(
      `GeoJSON file not found at ${GEOJSON_PATH}. Run 'yarn download' from packages/mapping first.`
    );
  }

  console.log('Reading account numbers from GeoJSON...');

  const geojsonData = readFileSync(GEOJSON_PATH, { encoding: 'utf8' });
  const geojson = JSON.parse(geojsonData) as ParcelGeoJSON;

  const accountNumbers = geojson.features
    .map(feature => feature.properties.ACCOUNTNO)
    .filter((account): account is string => !!account); // Filter out null/undefined

  // Remove duplicates using Set
  const uniqueAccounts = [...new Set(accountNumbers)];

  console.log(`Found ${uniqueAccounts.length} unique account numbers in GeoJSON`);

  return uniqueAccounts;
}
