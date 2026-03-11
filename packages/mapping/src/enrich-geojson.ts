import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

const DATA_DIR = join(__dirname, '../../../data');
const GEOJSON_FILE = join(DATA_DIR, 'alexandria-parcels.geojson');
const ASSESSMENT_FILE = join(__dirname, '../public/assessment-changes.json');
const OUTPUT_FILE = join(DATA_DIR, 'alexandria-parcels-enriched.geojson');

console.log('Loading GeoJSON...');
const geojson = JSON.parse(readFileSync(GEOJSON_FILE, 'utf-8'));

console.log('Loading assessment data...');
const assessments = JSON.parse(readFileSync(ASSESSMENT_FILE, 'utf-8'));

console.log(`Processing ${geojson.features.length} features...`);

let matchedCount = 0;
let unmatchedCount = 0;

geojson.features.forEach((feature: any) => {
  const accountNo = feature.properties.ACCOUNTNO?.toString();

  if (accountNo && assessments[accountNo]) {
    const data = assessments[accountNo];
    feature.properties.assessment_change = data.percentChange;
    feature.properties.assessment_recent_year = data.recentYear;
    feature.properties.assessment_recent_total = data.recentTotal;
    feature.properties.assessment_previous_year = data.previousYear;
    feature.properties.assessment_previous_total = data.previousTotal;
    matchedCount++;
  } else {
    feature.properties.assessment_change = null;
    unmatchedCount++;
  }
});

console.log(`Matched: ${matchedCount} parcels`);
console.log(`Unmatched: ${unmatchedCount} parcels`);

console.log('Writing enriched GeoJSON...');
writeFileSync(OUTPUT_FILE, JSON.stringify(geojson));

console.log(`Enriched GeoJSON saved to: ${OUTPUT_FILE}`);
console.log('\nNext steps:');
console.log('1. Generate tiles from enriched GeoJSON:');
console.log('   Update generate-tiles.ts to use alexandria-parcels-enriched.geojson');
console.log('2. Regenerate vector tiles');
console.log('3. Convert to PMTiles');
