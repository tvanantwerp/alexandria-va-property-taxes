# Alexandria Property Mapping

Interactive map viewer for Alexandria, VA property parcels using vector tiles.

## Prerequisites

Install tippecanoe (vector tile generator):

```bash
# macOS
brew install tippecanoe

# Linux - see https://github.com/felt/tippecanoe#installation
```

## Setup

### 1. Download parcel data

```bash
yarn download
```

Downloads GeoJSON from Alexandria's open data portal and converts to TopoJSON.

### 2. Generate vector tiles

```bash
yarn generate-tiles
```

Creates an MBTiles file with zoom levels 8-14. Takes 2-5 minutes.

### 3. Choose Your Deployment Strategy

You have **three options** for serving tiles:

---

## Option A: Static Hosting with PMTiles (Recommended)

**Best for**: Production deployment without a backend

PMTiles is a single file format designed for static hosting. It uses HTTP range requests so the browser only downloads needed tiles.

```bash
# Install PMTiles CLI
npm install -g pmtiles

# Convert MBTiles to PMTiles
yarn convert-pmtiles
```

**Deploy:**
1. Copy `data/alexandria-parcels.pmtiles` to your static host (Vercel, Netlify, S3, GitHub Pages, etc.)
2. Copy `public/index-pmtiles.html` to your host as `index.html`
3. Update the PMTiles URL in the HTML file to point to your hosted `.pmtiles` file

**Pros:**
- No backend server needed
- Single file deployment
- Works with any static host
- Automatic range requests
- CDN-friendly

**Cons:**
- Requires HTTP range request support (most hosts support this)

---

## Option B: Static Hosting with Individual Tile Files

**Best for**: Maximum compatibility with simple static hosts

Extracts tiles into individual `.pbf` files that can be served as static files.

```bash
yarn extract-tiles
```

This creates a `public/tiles/{z}/{x}/{y}.pbf` directory structure.

**Deploy:**
1. Copy the entire `public/` directory to your static host
2. The viewer at `public/index.html` will work automatically

**Pros:**
- Works with any static file host
- No special requirements
- Can be served from `file://` protocol for local testing

**Cons:**
- Creates thousands of individual files
- Takes longer to extract (~5-10 minutes)
- Larger deployment size

---

## Option C: Dynamic Backend Server

**Best for**: Local development and testing

Serves tiles from the MBTiles database on-demand.

```bash
# Terminal 1: Start tile server
yarn serve

# Terminal 2: Start viewer
yarn viewer

# Open http://localhost:3000
```

**Pros:**
- Quick to set up for development
- Single MBTiles file
- Easy to update data

**Cons:**
- Requires a Node.js server
- Not suitable for static hosting
- Needs to handle concurrent requests

---

## Comparison

| Feature | PMTiles | Extracted Files | Backend Server |
|---------|---------|-----------------|----------------|
| Backend required | ❌ | ❌ | ✅ |
| Static hosting | ✅ | ✅ | ❌ |
| Setup time | Fast | Slow | Fast |
| File count | 1 | Thousands | 1 |
| CDN-friendly | ✅ | ✅ | ⚠️ |
| Range requests | Required | Not needed | N/A |

---

## How It Works

### Vector Tiles Approach

Instead of loading a 133 MB GeoJSON file, this uses vector tiles:

- **Tiles**: Map divided into 256x256 pixel tiles at different zoom levels
- **On-demand loading**: Only tiles in current viewport are loaded
- **Zoom-based detail**: Higher zoom = more detail
- **Binary format**: Protobuf (PBF), much more efficient than JSON

### Data Flow

```
GeoJSON (133 MB)
    ↓ tippecanoe
MBTiles (~20-40 MB)
    ↓ (choose one)
    ├─ PMTiles (single file) → Static hosting
    ├─ Extract to files → Static hosting
    └─ Serve via Node.js → Backend server
```

### Performance

- **Initial load**: ~1-2 MB (only visible tiles)
- **Zoom/pan**: 10-100 KB per action
- **Total data**: 133 MB → 20-40 MB
- **Browser memory**: Minimal, tiles unloaded when off-screen

## Map Features

- View entire city at once
- Zoom from city-level to individual parcels
- Click parcels to see property information
- Smooth navigation and panning

## Files

- `src/download-parcels.ts` - Download and convert to TopoJSON
- `src/generate-tiles.ts` - Generate MBTiles with tippecanoe
- `src/convert-to-pmtiles.ts` - Convert to PMTiles format
- `src/extract-tiles.ts` - Extract to individual .pbf files
- `src/serve-tiles.ts` - Express server for MBTiles
- `src/viewer.ts` - Static file server
- `public/index.html` - Viewer for backend server
- `public/index-pmtiles.html` - Viewer for PMTiles
