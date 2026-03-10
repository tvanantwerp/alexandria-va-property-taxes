import { BASE_URL, fetchPageData } from './util';

export interface Assessment {
  month: number;
  year: number;
  land: number;
  building: number;
  total: number;
}

export interface Sale {
  id: string;
  day: number;
  month: number;
  year: number;
  purchaseCode: string;
  price: number;
  grantor: string;
  grantee: string;
}

type SaleDate = [number, number, number];

export interface Property {
  account: number;
  streetNumber: string;
  streetName: string;
  owner: string;
  type: string;
  studyGroup: number;
  description: string;
  lotSize?: number;
  yearBuilt?: number;
  buildingType?: string;
  livingArea?: number;
  totalBasement?: number;
  finishedBasement?: number;
  fullBaths?: number;
  halfBaths?: number;
  assessments: Assessment[];
  sales: Sale[];
}

// Get data for a given label
function getDataByLabel(doc: Document, label: string): string {
  const headers = doc.querySelectorAll('span.dataheader, div.dataheader');

  for (const el of headers) {
    if (el.textContent.trim().replace(/:$/, '') === label) {
      const nextEl = el.nextElementSibling;
      const result = nextEl?.textContent.trim();
      if (!result) throw new Error(`Could not retrieve value for ${label}`);
      return result;
    }
  }

  // Log available headers to help debug
  const availableHeaders = Array.from(headers)
    .map(el => el.textContent.trim().replace(/:$/, ''))
    .filter(Boolean);

  throw new Error(
    `Could not find ${label} on the page. Available headers: ${availableHeaders.join(', ')}`,
  );
}

function parseSalesData(data: Document) {
  const sales: Sale[] = [];
  const table: HTMLTableElement | undefined = Array.from(
    data.querySelectorAll('table'),
  ).find(b => b.querySelector('.dataheader')?.innerHTML.match(/Sale Date/));

  if (!table) {
    return [];
  }

  const noData = Array.from(table.querySelectorAll('.dataheader')).some(b => {
    return /No Prior Sales Data Was Found/.exec(b.innerHTML);
  });
  if (noData) {
    return [];
  }

  const rows = Array.from(table.children[0]?.children ?? []);
  if (rows[1]?.children.length === 1) {
    return sales;
  }
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i]?.children;
    if (!row) continue;
    const saleDate = row[0]?.querySelector('div')?.innerHTML;
    if (!saleDate) continue;
    const [month, day, year] = saleDate.split('/').map(s => +s) as SaleDate;
    const id = row[5]?.querySelector('div')?.innerHTML.replace(/&nbsp;/g, '');
    const price = row[1]
      ?.querySelector('div')
      ?.innerHTML.replace(/(?:&nbsp;|\$|,)/g, '');
    const purchaseCode = row[4]
      ?.querySelector('a')
      ?.innerHTML.replace(/&nbsp;/g, '');
    if (!id || !price || !purchaseCode) continue;
    sales.push({
      id,
      day,
      month,
      year,
      price: +price,
      purchaseCode,
      grantor: row[2]?.textContent ?? '',
      grantee: row[3]?.textContent ?? '',
    });
  }
  return sales;
}

function parseAssessmentData(data: Document) {
  const assessments: Assessment[] = [];
  const table: HTMLTableElement | undefined = Array.from(
    data.querySelectorAll('table'),
  ).find(b =>
    b.querySelector('.dataheader')?.innerHTML.match(/Assessment Date/),
  );

  if (!table) {
    return [];
  }

  const noData = Array.from(table.querySelectorAll('.dataheader')).some(b => {
    return /No Prior Assessment Data Was Found/.exec(b.innerHTML);
  });
  if (noData) {
    return [];
  }

  const rows = Array.from(table.children[0]?.children ?? []);
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i]?.children;
    if (!row) continue;
    const date = row[0]?.children[0]?.innerHTML
      .match(/(\d+)\/(\d+)/)
      ?.slice(1)
      .map(s => +s);
    if (
      date?.length !== 2 ||
      typeof date[0] !== 'number' ||
      typeof date[1] !== 'number'
    ) {
      throw new Error(`Invalid date: ${JSON.stringify(date)}`);
    }
    const [month, year] = date as [number, number];
    const land = row[1]
      ?.querySelector('div')
      ?.innerHTML.replace(/(?:&nbsp;|\$|,)/g, '');
    const building = row[2]
      ?.querySelector('div')
      ?.innerHTML.replace(/(?:&nbsp;|\$|,)/g, '');
    const total = row[3]
      ?.querySelector('div')
      ?.innerHTML.replace(/&nbsp;|\$|,/g, '');
    if (!land || !building || !total) continue;
    assessments.push({
      month,
      year,
      land: +land,
      building: +building,
      total: +total,
    });
  }
  return assessments;
}

export async function parsePropertyDetails(
  account: string,
): Promise<Property | undefined> {
  const page = await fetchPageData(
    `${BASE_URL}detail.php?accountno=${account}`,
  );
  const rawHTML = page.querySelector('#coa_rea_main')?.innerHTML;
  if (!rawHTML) {
    throw new Error('No raw HTML found - page may not have loaded correctly');
  }

  // Check if we got an error page, incomplete response, or invalid account
  const hasDataHeaders =
    page.querySelectorAll('span.dataheader, div.dataheader').length > 0;
  if (!hasDataHeaders) {
    console.log(
      `Skipping account ${account} - no data headers found (invalid account or error page)`,
    );
    return undefined;
  }
  const type = getDataByLabel(page, 'Primary Property Class').replace(
    /(\n|\t|\r)/g,
    '',
  );
  if (type && /(SUB-PARCEL)/.exec(type)) {
    return;
  }
  const studyGroupString = getDataByLabel(page, 'Study Group');
  const studyGroup: number = +studyGroupString;
  const address = page
    .querySelector('h3.notranslate')
    ?.innerHTML.replace(/(\n|\t|\r)/g, '')
    .match(/(\d+(?:\w+?|\/\d+)?)\s*(.*?),/);
  let streetNumber = '';
  let streetName = '';
  if (address) {
    streetNumber = address[1] ?? '';
    streetName = address[2] ?? '';
  }
  const descriptionEl = page.querySelector('div.data:nth-child(9)');
  const description = descriptionEl?.innerHTML.replace(/(\n|\t|\r)/g, '') ?? '';

  let lotSize: number | undefined;
  const findLotSize: string[] | null =
    /Lot Size \(Sq\. Ft\.\):(?:<\/span>)?\s?((?:\d+,?)+)/.exec(rawHTML);
  if (findLotSize?.[1]) {
    lotSize = +findLotSize[1].replace(/,/g, '');
  } else {
    lotSize = undefined;
  }

  let yearBuilt: number | undefined;
  const findYearBuilt: string[] | null = /Year Built:(?:<\/span>)? (\d+)/.exec(
    rawHTML,
  );
  if (findYearBuilt?.[1]) yearBuilt = +findYearBuilt[1];

  let livingArea: number | undefined;
  const findLivingArea: string[] | null =
    /(?:Above Grade Living Area|Unit Size) \(Sq\. Ft\.\):(?:<\/span>)?\s?((\d+,?)+)/.exec(
      rawHTML,
    );
  if (findLivingArea?.[1]) livingArea = +findLivingArea[1].replace(',', '');

  let totalBasement: number | undefined;
  const findTotalBasement: string[] | null =
    /Total Basement Area \(Sq\. Ft\.\):(?:<\/span>)?\s?((\d+,?)+)/.exec(
      rawHTML,
    );
  if (findTotalBasement?.[1])
    totalBasement = +findTotalBasement[1].replace(',', '');

  let finishedBasement: number | undefined;
  const findFinishedBasement: string[] | null =
    /Finished Basement Area \(Sq\. Ft\.\):(?:<\/span>)?\s?((\d+,?)+)/.exec(
      rawHTML,
    );
  if (findFinishedBasement?.[1]) {
    finishedBasement = +findFinishedBasement[1].replace(',', '');
  }

  let fullBaths: number | undefined;
  const findFullBaths: string[] | null = /Full Baths:(?:<\/span>)? (\d+)/.exec(
    rawHTML,
  );
  if (findFullBaths?.[1]) fullBaths = +findFullBaths[1];

  let halfBaths: number | undefined;
  const findHalfBaths: string[] | null = /Half Baths:(?:<\/span>)? (\d+)/.exec(
    rawHTML,
  );
  if (findHalfBaths?.[1]) halfBaths = +findHalfBaths[1];

  let buildingType: string | undefined;
  const findBuildingType: string[] | null =
    /Building Type:(?:<\/span>)?\s?(.*)<br>/.exec(rawHTML);
  if (findBuildingType?.[1])
    buildingType = findBuildingType[1].replace('&lt;', '<');

  const assessments = parseAssessmentData(page);
  const sales = parseSalesData(page);

  const result: Property = {
    account: +account,
    owner: sales.length >= 1 && sales[0] ? sales[0].grantee : '',
    streetNumber,
    streetName,
    type,
    studyGroup,
    description,
    lotSize,
    assessments,
    sales,
  };

  if (yearBuilt) result.yearBuilt = yearBuilt;
  if (buildingType) result.buildingType = buildingType;
  if (livingArea) result.livingArea = livingArea;
  if (totalBasement) result.totalBasement = totalBasement;
  if (finishedBasement) result.finishedBasement = finishedBasement;
  if (fullBaths) result.fullBaths = fullBaths;
  if (halfBaths) result.halfBaths = halfBaths;

  return result;
}
