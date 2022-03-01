import axios from 'axios';
import { JSDOM } from 'jsdom';

export interface Address {
  streetNumber?: number;
  streetName: string;
}

export const BASE_URL = 'https://realestate.alexandriava.gov/';

export function getPropertyURI({ streetNumber, streetName }: Address) {
  return `${BASE_URL}index.php?StreetNumber=${streetNumber}&StreetName=${streetName}&UnitNo=&Search=Search`;
}

export async function fetchPageData(URI: string) {
  const HTMLData = await axios.get(URI);
  const dom = new JSDOM(HTMLData.data);
  return dom.window.document;
}
