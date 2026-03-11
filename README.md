# Understanding Property Taxes in Alexandria, VA

This project collects and analyzes property tax data for properties in Alexandria, VA. It combines parcel mapping data with detailed property assessment information.

## Data Sources

### Parcel/Address Data

Parcel geometries and basic property information come from the City of Alexandria's GIS Division's [GIS Open Data Portal](http://cityofalexandria-alexgis.opendata.arcgis.com/).

- [Parcel data from Alexandria GIS](https://cityofalexandria-alexgis.opendata.arcgis.com/maps/alexandria-parcels)
- [API Documentation](https://cityofalexandria-alexgis.opendata.arcgis.com/datasets/AlexGIS::alexandria-parcels/api)

### Property Tax Assessment Data

Detailed property assessment data is downloaded and parsed from the [Alexandria Real Estate Assessment Search](https://realestate.alexandriava.gov/index.php?action=address) provided by the Alexandria city government. Under Virginia law, these records are public information. Display of this information on the Internet is specifically authorized by the [Code of Virginia § 58.1-3122.2](https://law.lis.virginia.gov/vacode/58.1-3122.2/).

## Getting Started

### Order of Operations

To collect and build the complete dataset, follow these steps in order:

1. **Download Parcel Data**
   ```bash
   cd packages/mapping
   yarn download
   ```
   This downloads the Alexandria parcels GeoJSON file containing parcel boundaries and account numbers to `data/alexandria-parcels.geojson`.

2. **Scrape Property Assessment Data**
   ```bash
   yarn scrape
   ```
   This uses the account numbers from the GeoJSON to fetch detailed property tax assessment data from the city website. The scraper:
   - Extracts account numbers from the GeoJSON file
   - Fetches detailed property data for each account (5 concurrent requests)
   - Saves results to `data/properties.json`, `data/groups.json`, and `data/types.json`
   - Uses file-based caching in `.cache/` directory to avoid re-fetching data

3. **Load Data into Database**
   ```bash
   yarn db
   ```
   This rebuilds the SQLite database and loads all scraped data. Individual steps:
   ```bash
   cd packages/database
   npm run db:deleteDatabase  # Delete SQLite database
   npm run db:prepDatabase    # Run Prisma schema sync
   npm run db:loadData        # Load data from JSON files
   ```

### Development

After loading data, you can:

- Start the GraphQL development server:
  ```bash
  cd packages/database
  npm run dev
  ```

- Export data from database:
  ```bash
  cd packages/database
  npm run exportData
  ```

## Project Structure

See [CLAUDE.md](./CLAUDE.md) for detailed technical documentation about the codebase architecture and development workflows.