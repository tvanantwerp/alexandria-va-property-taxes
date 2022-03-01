import axios from 'axios';
import * as fs from 'fs';
import { JSDOM } from 'jsdom';
import * as path from 'path';

export interface Address {
  streetNumber?: string;
  streetName: string;
}

export const BASE_URL = 'https://realestate.alexandriava.gov/';

export function getPropertyURI({ streetNumber = '', streetName }: Address) {
  return `${BASE_URL}index.php?StreetNumber=${streetNumber}&StreetName=${streetName}&UnitNo=&Search=Search`;
}

export async function fetchPageData(URI: string, ignoreCache = false) {
  if (
    !ignoreCache &&
    fs.existsSync(
      path.resolve(
        __dirname,
        `../../../.cache/${Buffer.from(URI).toString('base64')}.txt`,
      ),
    )
  ) {
    console.log(`I read ${URI} from cache`);
    const HTMLData = fs.readFileSync(
      path.resolve(
        __dirname,
        `../../../.cache/${Buffer.from(URI).toString('base64')}.txt`,
      ),
      { encoding: 'utf8' },
    );
    const dom = new JSDOM(HTMLData);
    return dom.window.document;
  } else {
    console.log(`I fetched ${URI} fresh`);
    const HTMLData = await axios.get(URI);
    if (!ignoreCache) {
      fs.writeFileSync(
        path.resolve(
          __dirname,
          `../../../.cache/${Buffer.from(URI).toString('base64')}.txt`,
        ),
        HTMLData.data,
        { encoding: 'utf8' },
      );
    }
    const dom = new JSDOM(HTMLData.data);
    return dom.window.document;
  }
}
