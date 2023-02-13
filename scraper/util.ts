import { ensureFileSync } from 'std/fs/ensure_file.ts';
import { DOMParser } from 'deno_dom';
import { dirname, resolve } from 'std/path/mod.ts';
import { decode, encode } from 'std/encoding/base64.ts';

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
			resolve(
				dirname,
				`../../../.cache/${decode(URI)}.txt`,
			),
		)
	) {
		console.log(`I read ${URI} from cache`);
		const data = await Deno.readTextFile(
			resolve(
				dirname,
				`../../../.cache/${decode(URI)}.txt`,
			),
		);
		const dom = new DOMParser(data);
		return dom.window.document;
	} else {
		count++;
		console.log(`Fetch ${count}: I fetched ${URI} fresh`);
		const HTMLData = await (await fetch(URI, { keepalive: true })).text();
		if (!ignoreCache) {
			Deno.writeTextFileSync(
				resolve(
					dirname,
					`../../../.cache/${encode(URI)}.txt`,
				),
				HTMLData,
			);
		}
		const dom = new DOMParser(HTMLData);
		return dom.window.document;
	}
}

export function sleep(ms: number) {
	return new Promise((resolve) => setTimeout(resolve, ms));
}
