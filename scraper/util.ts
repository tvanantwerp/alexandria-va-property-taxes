import { ensureFileSync } from 'std/fs/ensure_file.ts';
import { DOMParser } from 'deno_dom';
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
	ensureFileSync(`../.cache/${decode(URI)}.txt`);
	const data = await Deno.readTextFile(`../.cache/${decode(URI)}.txt`);
	if (!ignoreCache && data.length > 0) {
		console.log(`I read ${URI} from cache`);
		const document = new DOMParser().parseFromString(data, 'text/html');
		if (!document) {
			throw new Error(`No document was parsed from cached data: ${data}`);
		}
		return document;
	} else {
		count++;
		console.log(`Fetch ${count}: I fetched ${URI} fresh`);
		const HTMLData = await (await fetch(URI, { keepalive: true })).text();
		if (!ignoreCache) {
			Deno.writeTextFileSync(
				`../.cache/${encode(URI)}.txt`,
				HTMLData,
			);
		}
		const document = new DOMParser().parseFromString(HTMLData, 'text/html');
		if (!document) {
			throw new Error(`No document was parsed from fetched data: ${HTMLData}`);
		}
		return document;
	}
}

export function sleep(ms: number) {
	return new Promise((resolve) => setTimeout(resolve, ms));
}
