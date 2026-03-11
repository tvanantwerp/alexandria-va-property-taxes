# Alexandria Property Mapping

Generate PMTiles files for static hosting of Alexandria, VA property parcels with assessment data.

## Prerequisites

Install required tools:

```bash
# macOS
brew install tippecanoe

# Install PMTiles CLI globally
npm install -g pmtiles

# Linux - see https://github.com/felt/tippecanoe#installation
```

## Overview

This package generates map tiles from Alexandria's parcel data enriched with property tax assessment information. The output is a single PMTiles file that can be hosted statically (no backend server required).

**Data flow:**
```
1. Download parcel GeoJSON from Alexandria GIS
2. Extract assessment changes from your database
3. Enrich GeoJSON with assessment data
4. Generate MBTiles with tippecanoe
5. Convert to PMTiles for static hosting
```

## Usage

After you've finished scraping and populating the database in the other packages, follow these steps:

### 1. Download Parcel Data

Download the parcel boundaries from Alexandria's GIS portal:

```bash
yarn download
```

This downloads `data/alexandria-parcels.geojson` (~133 MB) containing parcel geometries, addresses, and account numbers.

### 2. Generate Assessment Data

Extract assessment changes from your database:

```bash
yarn generate-assessment-data
```

This queries the SQLite database and generates `public/assessment-changes.json` with:
- Recent and previous year assessments
- Percent change calculations
- Total assessed values

**Note:** Requires the database at `packages/database/prisma/prisma/dev.db` to be populated with scraped data.

### 3. Enrich GeoJSON

Merge assessment data into the parcel GeoJSON:

```bash
yarn enrich-geojson
```

This creates `data/alexandria-parcels-enriched.geojson` with assessment properties added to each parcel.

### 4. Generate Vector Tiles

Create an MBTiles file using tippecanoe:

```bash
yarn generate-tiles
```

This processes the enriched GeoJSON and creates `data/alexandria-parcels-enriched.mbtiles` (~20-40 MB). Takes 2-5 minutes.

**Zoom levels:** 8-14 (city level to individual parcels)

### 5. Convert to PMTiles

Convert MBTiles to PMTiles format for static hosting:

```bash
yarn convert-pmtiles
```

This creates `data/alexandria-parcels-enriched.pmtiles` ready for deployment.

### All-in-One Script

Run all tile preparation steps in sequence:

```bash
yarn prep-map-tiles
```

This is equivalent to running steps 2-5 above.

## Local Development

View the map locally during development:

```bash
yarn serve
```

This starts a development server at `http://localhost:3000` that serves:
- The HTML map viewers from `public/`
- The PMTiles files from `data/`
- Supports HTTP range requests for PMTiles

Available viewers:
- `http://localhost:3000/index-assessments.html` - Map with assessment data (default)
- `http://localhost:3000/index-pmtiles.html` - Basic PMTiles viewer
- `http://localhost:3000/index.html` - Standard viewer

## Deployment

PMTiles files can be hosted on any static file host that supports HTTP range requests (most do):

- Vercel
- Netlify
- Cloudflare Pages
- AWS S3
- GitHub Pages
- Any CDN

Simply upload the `.pmtiles` file and configure your map viewer to load it via the PMTiles protocol.

## How It Works

### Vector Tiles

Instead of loading the entire 133 MB GeoJSON file, vector tiles allow:
- **On-demand loading:** Only tiles in viewport are fetched
- **Zoom-based detail:** More detail at higher zoom levels
- **Binary format:** Protobuf (PBF) is much smaller than JSON
- **Range requests:** PMTiles uses HTTP range requests to fetch only needed tile data

### Performance

- **Initial load:** ~1-2 MB (only visible tiles)
- **Zoom/pan:** 10-100 KB per action
- **Total file size:** 133 MB GeoJSON → 20-40 MB PMTiles
- **No backend:** Served as a static file

### Assessment Data

Each parcel in the enriched tiles includes:
- `assessment_change` - Percent change between most recent years
- `assessment_recent_year` - Most recent assessment year
- `assessment_recent_total` - Most recent total assessment
- `assessment_previous_year` - Previous assessment year
- `assessment_previous_total` - Previous total assessment

Properties without sufficient assessment history have `null` values.

## Files

### Scripts
- `src/download-parcels.ts` - Download parcel GeoJSON from Alexandria GIS
- `src/generate-assessment-data-sqlite.ts` - Extract assessment changes from database
- `src/enrich-geojson.ts` - Merge assessment data into GeoJSON
- `src/generate-tiles.ts` - Generate MBTiles with tippecanoe
- `src/convert-to-pmtiles.ts` - Convert to PMTiles format
- `src/serve.ts` - Local development server

### Data Files
- `data/alexandria-parcels.geojson` - Raw parcel boundaries and properties
- `public/assessment-changes.json` - Assessment change data from database
- `data/alexandria-parcels-enriched.geojson` - Parcels with assessment data
- `data/alexandria-parcels-enriched.mbtiles` - Vector tiles (intermediate format)
- `data/alexandria-parcels-enriched.pmtiles` - Final output for deployment

## Troubleshooting

**"tippecanoe is not installed"**
```bash
brew install tippecanoe
```

**"pmtiles CLI is not installed"**
```bash
npm install -g pmtiles
```

**"MBTiles file not found"**
Run the steps in order - each step depends on the previous one.

**"Database not found"**
Make sure you've run the scraper and loaded data into the database first (see main README).
