import { BASE_URL, fetchPageData } from './util';

export interface Assessment {
  month: number;
  year: number;
  land: number;
  building: number;
  total: string;
}

export interface Sale {
  id: string;
  day: number;
  month: number;
  year: number;
  purchaseCode: string;
  price: number;
}

export interface Property {
  account: number;
  streetNumber: string;
  streetName: string;
  type: string;
  studyGroup: number;
  description: string;
  lotSize: number;
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

async function parseSalesData(data: Document) {
  const sales: Sale[] = [];
  const table: HTMLTableElement = Array.from(
    data.querySelectorAll('table'),
  ).filter(b => b.querySelector('.dataheader').innerHTML.match(/Sale Date/))[0];

  const noData = Array.from(table.querySelectorAll('.dataheader')).some(b => {
    return b.innerHTML.match(/No Prior Sales Data Was Found/);
  });
  if (noData) {
    return [];
  }

  const rows = Array.from(table.children[0].children);
  if (rows[1].children.length === 1) {
    return sales;
  }
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i].children;
    const [month, day, year] = row[0].querySelector('div').innerHTML.split('/');
    sales.push({
      id: row[5].querySelector('div').innerHTML.replace(/&nbsp;/g, ''),
      day: +day,
      month: +month,
      year: +year,
      price: +row[1]
        .querySelector('div')
        .innerHTML.replace(/(?:&nbsp;|\$|,)/g, ''),
      purchaseCode: row[4].querySelector('a').innerHTML.replace(/&nbsp;/g, ''),
    });
  }
  return sales;
}

async function parseAssessmentData(data: Document) {
  const assessments: Assessment[] = [];
  const table: HTMLTableElement = Array.from(
    data.querySelectorAll('table'),
  ).filter(b =>
    b.querySelector('.dataheader').innerHTML.match(/Assessment Date/),
  )[0];

  const noData = Array.from(table.querySelectorAll('.dataheader')).some(b => {
    return b.innerHTML.match(/No Prior Assessment Data Was Found/);
  });
  if (noData) {
    return [];
  }

  const rows = Array.from(table.children[0].children);
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i].children;
    assessments.push({
      month: +row[0].children[0].innerHTML.match(/(\d+)/g)[0],
      year: +row[0].children[0].innerHTML.match(/(\d+)/g)[1],
      land: +row[1]
        .querySelector('div')
        .innerHTML.replace(/(?:&nbsp;|\$|,)/g, ''),
      building: +row[2]
        .querySelector('div')
        .innerHTML.replace(/(?:&nbsp;|\$|,)/g, ''),
      total: row[3].querySelector('div').innerHTML.replace(/&nbsp;/g, ''),
    });
  }
  return assessments;
}

export async function parsePropertyDetails(account: string): Promise<Property> {
  const page = await fetchPageData(
    `${BASE_URL}detail.php?accountno=${account}`,
  );
  const rawHTML = page.querySelector('#coa_rea_main').innerHTML;
  const type = page
    .querySelector(
      '#coa_rea_main > table:nth-of-type(1) > tbody > tr:nth-child(1) > td:nth-child(1) > span:nth-child(5)',
    )
    .innerHTML.replace(/(\n|\t|\r)/g, '');
  if (type.match(/(SUB-PARCEL)/)) {
    return;
  }
  const studyGroup = +page.querySelector(
    '#coa_rea_main > table:nth-of-type(1) > tbody > tr:nth-child(1) > td:nth-child(2) > span:nth-child(5)',
  ).innerHTML;
  const address = page
    .querySelector('h3.notranslate')
    .innerHTML.replace(/(\n|\t|\r)/g, '')
    .match(/(\d+(?:\w+?|\/\d+)?)\s*(.*?),/);
  let streetNumber: string, streetName: string;
  if (address) {
    [, streetNumber, streetName] = address;
  } else {
    [streetNumber, streetName] = ['', ''];
  }
  const description = page
    .querySelector('div.data:nth-child(9)')
    .innerHTML.replace(/(\n|\t|\r)/g, '');

  let lotSize: number | null;
  const findLotSize: string[] | null = rawHTML.match(
    /Lot Size \(Sq\. Ft\.\):(?:<\/span>)?\s?((\d+,?)+)/,
  );
  if (findLotSize) lotSize = +findLotSize[1].replace(',', '');

  let yearBuilt: number | null;
  const findYearBuilt: string[] | null = rawHTML.match(
    /Year Built:(?:<\/span>)? (\d+)/,
  );
  if (findYearBuilt) yearBuilt = +findYearBuilt[1];

  let livingArea: number | null;
  const findLivingArea: string[] | null = rawHTML.match(
    /(?:Above Grade Living Area|Unit Size) \(Sq\. Ft\.\):(?:<\/span>)?\s?((\d+,?)+)/,
  );
  if (findLivingArea) livingArea = +findLivingArea[1].replace(',', '');

  let totalBasement: number | null;
  const findTotalBasement: string[] | null = rawHTML.match(
    /Total Basement Area \(Sq\. Ft\.\):(?:<\/span>)?\s?((\d+,?)+)/,
  );
  if (findTotalBasement) totalBasement = +findTotalBasement[1].replace(',', '');

  let finishedBasement: number | null;
  const findFinishedBasement: string[] | null = rawHTML.match(
    /Finished Basement Area \(Sq\. Ft\.\):(?:<\/span>)?\s?((\d+,?)+)/,
  );
  if (findFinishedBasement) {
    finishedBasement = +findFinishedBasement[1].replace(',', '');
  }

  let fullBaths: number | null;
  const findFullBaths: string[] | null = rawHTML.match(
    /Full Baths:(?:<\/span>)? (\d+)/,
  );
  if (findFullBaths) fullBaths = +findFullBaths[1];

  let halfBaths: number | null;
  const findHalfBaths: string[] | null = rawHTML.match(
    /Half Baths:(?:<\/span>)? (\d+)/,
  );
  if (findHalfBaths) halfBaths = +findHalfBaths[1];

  let buildingType: string | null;
  const findBuildingType: string[] | null = rawHTML.match(
    /Building Type:(?:<\/span>)?\s?(.*)<br>/,
  );
  if (findBuildingType) buildingType = findBuildingType[1].replace('&lt;', '<');

  const assessments = await parseAssessmentData(page);
  const sales = await parseSalesData(page);

  const result: Property = {
    account: +account,
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
