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

export async function fetchPageData(URI: string, ignoreCache = false) {
  console.log(`Getting data for ${URI}...`);
  if (
    !ignoreCache &&
    existsSync(
      path.resolve(
        __dirname,
        `../../../.cache/${Buffer.from(URI).toString('base64')}.txt`,
      ),
    )
  ) {
    console.log(`I read ${URI} from cache`);
    const data = await readFile(
      path.resolve(
        __dirname,
        `../../../.cache/${Buffer.from(URI).toString('base64')}.txt`,
      ),
      { encoding: 'utf8' },
    );
    const dom = new JSDOM(data);
    return dom.window.document;
  } else {
    count++;
    console.log(`Fetch ${count}: I fetched ${URI} fresh`);
    const HTMLData = await axios
      .get(URI, {
        httpAgent: new http.Agent({ keepAlive: true }),
        httpsAgent: new https.Agent({ keepAlive: true }),
      })
      .then(res => {
        sleep(300);
        return res.data;
      })
      .catch(err => console.error(err));
    if (!ignoreCache) {
      writeFileSync(
        path.resolve(
          __dirname,
          `../../../.cache/${Buffer.from(URI).toString('base64')}.txt`,
        ),
        HTMLData,
        { encoding: 'utf8' },
      );
    }
    const dom = new JSDOM(HTMLData);
    return dom.window.document;
  }
}

export function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
