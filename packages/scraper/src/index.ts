import axios from 'axios';
import cheerio from 'cheerio';
import { csvParse } from 'd3-dsv';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

interface Address {
  streetNumber: number;
  streetName: string;
}

const BASE_URL = 'https://realestate.alexandriava.gov/';

function getPropertyURI({ streetNumber, streetName }: Address) {
  return `${BASE_URL}index.php?StreetNumber=${streetNumber}&StreetName=${streetName}&UnitNo=&Search=Search`;
}

async function fetchPageData(URI: string) {
  const HTMLData = await axios.get(URI);
  const $ = cheerio.load(HTMLData.data);
  return $;
}

async function getAccountNumbers(streetAddresses: Address[]) {
  return await Promise.all(
    streetAddresses.map(async address => {
      const $ = await fetchPageData(getPropertyURI(address));
      return $(
        '.searchResultDetailRow td:nth-of-type(3) span:nth-of-type(2)',
      ).text();
    }),
  );
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

fs.readFile(
  path.join(__dirname, '../../../data/Address_Points.csv'),
  'utf-8',
  async (err, data) => {
    if (err) console.error(err);

    const streetAddresses = csvParse(data).map(address => {
      return {
        streetNumber: +address.STNUM,
        streetName: [address.STPFX, address.STNAME, address.STTYPE].join('^'),
      };
    });

    const accounts = await getAccountNumbers(streetAddresses);
    console.log(accounts);
  },
);
