import axios from 'axios';
import { existsSync, writeFileSync } from 'fs';
import { readFile } from 'fs/promises';
import http from 'http';
import https from 'https';
import { JSDOM } from 'jsdom';
import * as path from 'path';

export interface Address {
  streetNumber?: string;
  streetName: string;
}

let count = 0;

export const BASE_URL = 'https://realestate.alexandriava.gov/';

export function getPropertyURI({ streetNumber = '', streetName }: Address) {
  return `${BASE_URL}index.php?StreetNumber=${streetNumber}&StreetName=${streetName}&UnitNo=&Search=Search`;
}

/**
 * Validates that a cached page has actual data, not just empty structure
 * Checks for critical fields that must have values for a valid property page
 */
function validateCachedPage(doc: Document): boolean {
  // Check that we have the main content container
  const mainContent = doc.querySelector('#coa_rea_main');
  if (!mainContent) {
    console.log('Cache validation failed: No main content container');
    return false;
  }

  // Check that we have data headers (invalid accounts have no dataheaders at all)
  const dataHeaders = doc.querySelectorAll('span.dataheader, div.dataheader');
  if (dataHeaders.length === 0) {
    console.log('Cache validation failed: No data headers found (invalid account)');
    return false;
  }

  // Check that critical fields have actual values
  const criticalFields = ['Primary Property Class', 'Study Group', 'Account Number'];

  for (const fieldName of criticalFields) {
    let found = false;
    let hasValue = false;

    for (const header of dataHeaders) {
      const headerText = header.textContent?.trim().replace(/:$/, '');
      if (headerText === fieldName) {
        found = true;
        const valueElement = header.nextElementSibling;
        const value = valueElement?.textContent?.trim();

        if (value && value.length > 0) {
          hasValue = true;
          break;
        }
      }
    }

    if (!found) {
      console.log(`Cache validation failed: Missing field "${fieldName}"`);
      return false;
    }

    if (!hasValue) {
      console.log(`Cache validation failed: Field "${fieldName}" has no value`);
      return false;
    }
  }

  return true;
}

export async function fetchPageData(URI: string, ignoreCache = false) {
  console.log(`Getting data for ${URI}...`);
  const cachePath = path.resolve(
    __dirname,
    `../../../.cache/${Buffer.from(URI).toString('base64')}.txt`,
  );

  if (!ignoreCache && existsSync(cachePath)) {
    console.log(`I read ${URI} from cache`);
    const data = await readFile(cachePath, { encoding: 'utf8' });
    const dom = new JSDOM(data);
    const doc = dom.window.document;

    // Validate the cached page has actual data
    if (validateCachedPage(doc)) {
      console.log(`Cache validation passed for ${URI}`);
      return doc;
    } else {
      console.log(`Cache validation failed for ${URI}, refetching...`);
      // Fall through to fetch fresh data
    }
  }

  // Fetch fresh data (either no cache or cache validation failed)
  {
    count++;
    console.log(`Fetch ${count}: I fetched ${URI} fresh`);
    const HTMLData = await axios
      .get(URI, {
        httpAgent: new http.Agent({ keepAlive: true }),
        httpsAgent: new https.Agent({ keepAlive: true }),
      })
      .then(async res => {
        await sleep(300);
        return res.data;
      })
      .catch(err => console.error(err));

    // Always save to cache (overwrites invalid cached data)
    if (!ignoreCache && HTMLData) {
      writeFileSync(cachePath, HTMLData, { encoding: 'utf8' });
    }

    const dom = new JSDOM(HTMLData);
    return dom.window.document;
  }
}

export function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
