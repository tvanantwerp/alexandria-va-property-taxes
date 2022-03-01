import axios from 'axios';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

import { streets } from './streets';

interface Address {
  streetNumber?: number;
  streetName: string;
}

const BASE_URL = 'https://realestate.alexandriava.gov/';

function getPropertyURI({ streetNumber, streetName }: Address) {
  return `${BASE_URL}index.php?StreetNumber=${streetNumber}&StreetName=${streetName}&UnitNo=&Search=Search`;
}

async function fetchPageData(URI: string) {
  const HTMLData = await axios.get(URI);
  return HTMLData.data;
}

async function parsePageData(data: string, firstPage = true) {
  // select pages with 'center p a
  // if (pages.length > 2 && firstPage) {
  //create URI array, then call fetchPageData for them
  // }
  //return parsed data on account
  return 'hi';
}

async function getAccountNumbers(streetAddresses: Address[]) {
  return await Promise.all(
    streetAddresses.map(async address => {
      const $ = await fetchPageData(getPropertyURI(address));
      return parsePageData($);
    }),
  );
}

async function getData() {
  const accounts = await getAccountNumbers(streets);
  console.log(accounts);
}
