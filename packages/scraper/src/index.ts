import axios from 'axios';
import { JSDOM } from 'jsdom';

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
  const dom = new JSDOM(HTMLData.data);
  return dom.window.document;
}

async function parsePageData(
  data: Document,
  firstPage = true,
): Promise<string[]> {
  const pageLinks: HTMLAnchorElement[] = Array.from(
    data.querySelectorAll('center p a'),
  );
  if (pageLinks.length > 2 && firstPage) {
    let pages: string[] = [];
    pageLinks.forEach(link => {
      const href = link.href;
      if (!pages.includes(href)) {
        pages.push(href);
      }
    });
    pages = pages
      .filter(link => !link.includes('&CPage=0') && !link.includes('%5'))
      .sort();

    const allPages = await Promise.all(
      pages.map(async page => {
        const rawData = await fetchPageData(`${BASE_URL}${page}`);
        return parsePageData(rawData, false);
      }),
    );

    return allPages.flat();
  }

  return Array.from(
    data.querySelectorAll(
      '.searchResultDetailRow > td:nth-child(3) > span:nth-child(2)',
    ),
  ).map(el => el.innerHTML);
}

async function getAccountNumbers(streets: Address[]) {
  return await Promise.all(
    streets.map(async street => {
      const rawData = await fetchPageData(getPropertyURI(street));
      return parsePageData(rawData);
    }),
  );
}

async function getData() {
  const accounts = await getAccountNumbers(streets);
  console.log(accounts);
}

getData();
