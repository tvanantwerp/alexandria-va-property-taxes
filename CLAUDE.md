# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a data collection and analysis project for Alexandria, VA property tax records. It scrapes public property assessment data from the city government website, stores it in a database, and makes it queryable. The data is legally public under Virginia Code § 58.1-3122.2.

## Workspace Structure

This is a Yarn workspace monorepo with two packages:

- **packages/scraper**: Web scraper that downloads property tax data from Alexandria city government
- **packages/database**: Prisma-based SQLite database with GraphQL API for querying the data

Data flows: scraper → JSON files in `/data` directory → database loader → SQLite database

## Development Commands

### Running the Scraper

```bash
# Run the scraper (starts from root)
yarn scrape

# This internally runs:
cd packages/scraper && ts-node ./src/index.ts
```

The scraper:
1. Fetches account numbers for all properties (or loads from cache at `data/accounts.json`)
2. Fetches detailed property data for each account (5 concurrent requests)
3. Saves results to `data/properties.json`, `data/groups.json`, and `data/types.json`
4. Uses file-based caching in `.cache/` directory (base64-encoded URLs as filenames)

### Database Operations

```bash
# Complete database rebuild pipeline
yarn db

# Individual steps:
cd packages/database
npm run db:deleteDatabase  # Delete SQLite database
npm run db:prepDatabase    # Run Prisma schema sync
npm run db:loadData        # Load data from JSON files

# Export data from database
npm run exportData

# Start GraphQL development server
npm run dev
```

### Linting and Formatting

```bash
# Lint TypeScript files
npx eslint --cache --fix --ignore-path .gitignore "**/*.{js,ts,jsx,tsx}"

# Format code
npx prettier --write --ignore-path .gitignore "**/*.+(js|ts|jsx|tsx|json)"
```

Pre-commit hooks (husky + lint-staged) automatically run linting and formatting on staged files.

## Architecture

### Scraper Architecture

**Entry point**: `packages/scraper/src/index.ts`

The scraper uses a caching strategy to avoid re-fetching data:

1. **Account collection** (`accounts.ts`):
   - Searches all street names (from `streets.ts`) using city search tool
   - Parses pagination to collect all account numbers
   - Uses `@supercharge/promise-pool` for concurrent requests (concurrency: 5)

2. **Property details** (`properties.ts`):
   - Fetches individual property pages by account number
   - Parses HTML using jsdom to extract structured data
   - Uses regex and DOM queries to extract fields (lot size, year built, assessments, sales, etc.)
   - **Important**: Returns `undefined` for SUB-PARCEL properties and invalid accounts (no data headers)

3. **Caching layer** (`util.ts`):
   - Caches all fetched pages as base64-encoded filenames in `.cache/`
   - **Cache validation**: Re-fetches pages missing critical fields (Primary Property Class, Study Group, Account Number)
   - Adds 300ms delay between fresh fetches to avoid overwhelming the server
   - Uses axios with keep-alive HTTP agents for connection reuse

### Database Architecture

**Schema**: `packages/database/prisma/schema.prisma`

Data model:
- `Property` (main entity): account, address, owner, physical attributes, relations to assessments/sales
- `Assessment`: historical property value assessments (many per property)
- `Sale`: transaction history with grantee/grantor (many per property)
- `StudyGroup`: groups properties by assessment category
- `PropertyType`: categorizes properties (residential, commercial, etc.)

**Loading pipeline** (`prisma/loadData.ts`):
- Reads `data/properties.json`
- Creates Property records with nested assessments and sales
- Uses `connectOrCreate` for StudyGroup and PropertyType relations

**Querying** (`prisma/findResident.ts`):
- Command-line tool to search properties by owner name
- Falls back to searching Sale records if no direct owner match

The database uses SQLite (`prisma/dev.db`) for simplicity and portability.

## Key Implementation Details

### Property Data Extraction

Property details are extracted via two methods:

1. **Label-based extraction**: `getDataByLabel()` finds adjacent sibling elements to data headers
2. **Regex extraction**: Used for fields like lot size, year built, baths (more reliable for some fields)

Error handling: Invalid accounts (no data headers) are logged and skipped, not treated as errors.

### Rate Limiting and Caching

The scraper implements multiple strategies to be respectful:
- 300ms delay between fresh fetches
- File-based cache to avoid re-fetching
- Cache validation to detect incomplete/stale data
- Concurrency limit of 5 simultaneous requests
- HTTP keep-alive to reuse connections

### Data Validation

Recent improvements include cache validation that checks for:
- Presence of main content container
- Existence of data headers (invalid accounts have none)
- Values for critical fields (Primary Property Class, Study Group, Account Number)

This prevents using cached pages that loaded incorrectly or represent invalid accounts.
