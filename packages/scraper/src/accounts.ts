import { streets } from './streets';
import { Address, BASE_URL, fetchPageData, getPropertyURI } from './util';

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

export async function getData() {
  const accounts = await getAccountNumbers(streets);
  const flatAccounts = accounts.flat();
  return flatAccounts;
}
