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

function getPropertyURI({ streetNumber, streetName }: Address) {
  return `https://realestate.alexandriava.gov/index.php?StreetNumber=${streetNumber}&StreetName=${streetName}&UnitNo=&Search=Search`;
}

async function getAccountNumbers(streetAddresses: Address[]) {
  return await Promise.all(
    streetAddresses.map(async ({ streetNumber, streetName }) => {
      const HTMLData = await axios.get(
        getPropertyURI({ streetNumber, streetName }),
      );
      const $ = cheerio.load(HTMLData.data);
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
