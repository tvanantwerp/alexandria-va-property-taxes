import {ensureFileSync} from 'std/fs/ensure_file.ts';
import {DOMParser} from 'deno_dom';
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
    ensureFileSync(
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
    const HTMLData = await (await fetch(URI, {keepalive: true})).text();
    if (!ignoreCache) {
      Deno.writeTextFileSync(
        path.resolve(
          __dirname,
          `../../../.cache/${Buffer.from(URI).toString('base64')}.txt`,
        ),
        HTMLData.data,
        { encoding: 'utf8' },
      );
    }
    const dom = new DOMParser(HTMLData);
    return dom.window.document;
  }
}

export function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
