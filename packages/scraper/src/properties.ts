import { BASE_URL, fetchPageData, sleep } from './util';

interface Assessment {
  date: string;
  land: string;
  building: string;
  total: string;
}

interface Property {
  address: string;
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
}

async function parseAssessmentData(data: Document) {
  const assessments: Assessment[] = [];
  const table: HTMLTableElement = Array.from(
    data.querySelectorAll('table'),
  ).filter(b =>
    b.children[0].children[0].children[0].children[0].innerHTML.match(
      /Assessment Date/,
    ),
  )[0];
  const rows = Array.from(table.children[0].children);
  for (let i = 0; i < rows.length; i++) {
    if (i === 0) continue;
    const row = rows[i].children;
    assessments.push({
      date:
        i === 1
          ? row[0].querySelector('a').innerHTML.replace(/&nbsp;/g, '')
          : row[0].querySelector('div').innerHTML.replace(/&nbsp;/g, ''),
      land: row[1].querySelector('div').innerHTML.replace(/&nbsp;/g, ''),
      building: row[2].querySelector('div').innerHTML.replace(/&nbsp;/g, ''),
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
    .innerHTML.replace('\t\t\t\t\t\t\t  \n', '');
  const description = page
    .querySelector('div.data:nth-child(9)')
    .innerHTML.replace(/(\n|\t|\r)/g, '');

  let lotSize: number | null,
    findLotSize: any[] | null = rawHTML.match(
      /Lot Size \(Sq\. Ft\.\):(<\/span>)?\s?((\d+,?)+)/,
    );
  if (findLotSize) lotSize = +findLotSize[2].replace(',', '');

  let yearBuilt: number | null,
    findYearBuilt: any[] | null = rawHTML.match(/Year Built:(<\/span>)? (\d+)/);
  if (findYearBuilt) yearBuilt = +findYearBuilt[2];

  let livingArea: number | null,
    findLivingArea: any[] | null = rawHTML.match(
      /Above Grade Living Area \(Sq\. Ft\.\):(<\/span>)?\s?((\d+,?)+)/,
    );
  if (findLivingArea) livingArea = +findLivingArea[2].replace(',', '');

  let totalBasement: number | null,
    findTotalBasement: any[] | null = rawHTML.match(
      /Total Basement Area \(Sq\. Ft\.\):(<\/span>)?\s?((\d+,?)+)/,
    );
  if (findTotalBasement) totalBasement = +findTotalBasement[2].replace(',', '');

  let finishedBasement: number | null,
    findFinishedBasement: any[] | null = rawHTML.match(
      /Finished Basement Area \(Sq\. Ft\.\):(<\/span>)?\s?((\d+,?)+)/,
    );
  if (findFinishedBasement)
    finishedBasement = +findFinishedBasement[2].replace(',', '');

  let fullBaths: number | null,
    findFullBaths: any[] | null = rawHTML.match(/Full Baths:(<\/span>)? (\d+)/);
  if (findFullBaths) fullBaths = +findFullBaths[2];

  let halfBaths: number | null,
    findHalfBaths: any[] | null = rawHTML.match(/Half Baths:(<\/span>)? (\d+)/);
  if (findHalfBaths) halfBaths = +findHalfBaths[2];

  let buildingType: string | null,
    findBuildingType: any[] | null = rawHTML.match(
      /Building Type:(<\/span>)?\s?((\w+\s?)+)/,
    );
  if (findBuildingType) buildingType = findBuildingType[2];

  const assessments = await parseAssessmentData(page);
  sleep(10);

  const result: Property = {
    address,
    type,
    studyGroup,
    description,
    lotSize,
    assessments,
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
