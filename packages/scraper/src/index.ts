import { writeFile } from 'fs';
import { resolve } from 'path';

import { getData } from './accounts';
import { BASE_URL, fetchPageData } from './util';

interface Assessment {
  date: string;
  land: string;
  building: string;
  total: string;
}

async function getProperties(accounts: string[]) {
  return await Promise.all(
    accounts.map(async account => {
      const page = await fetchPageData(
        `${BASE_URL}detail.php?accountno=${account}`,
      );
      const address = page
        .querySelector('h3.notranslate')
        .innerHTML.replace('\t\t\t\t\t\t\t  \n', '');
      const type = page
        .querySelector(
          '#coa_rea_main > table:nth-child(8) > tbody:nth-child(1) > tr:nth-child(1) > td:nth-child(1) > span:nth-child(5)',
        )
        .innerHTML.replace(/(\n|\t|\r)/g, '');
      const description = page
        .querySelector('div.data:nth-child(9)')
        .innerHTML.replace(/(\n|\t|\r)/g, '');
      const assessments = await parseAssessmentData(page);

      return {
        address,
        type,
        description,
        assessments,
      };
    }),
  );
}

async function parseAssessmentData(data: Document) {
  const assessments: Assessment[] = [];
  const rows = Array.from(
    data.querySelector(
      '#coa_rea_main > table:nth-child(17) > tbody:nth-child(1)',
    ).children,
  );
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

async function getAssessments() {
  const accounts = await getData();
  const properties = await getProperties(accounts);

  writeFile(
    resolve(__dirname, '../../../data/properties.json'),
    JSON.stringify(properties),
    { encoding: 'utf8' },
    err => console.error(err),
  );
}

getAssessments();
