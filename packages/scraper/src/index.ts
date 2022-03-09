import { PromisePool } from '@supercharge/promise-pool';
import { existsSync, readFile, readFileSync, writeFile } from 'fs';
import { resolve } from 'path';

import { getData } from './accounts';
import { BASE_URL, fetchPageData, sleep } from './util';

interface Assessment {
  date: string;
  land: string;
  building: string;
  total: string;
}

async function getProperties(accounts: string[]) {
  const { results, errors } = await PromisePool.withConcurrency(5)
    .for(accounts)
    .handleError(async (error, account, pool) => {
      if (error) {
        console.error(
          'Experienced an error while getting properties.',
          error,
          account,
        );
        return pool.stop();
      }
    })
    .process(async account => {
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
      sleep(10);

      return {
        address,
        type,
        description,
        assessments,
      };
    });
  if (errors) {
    console.error('Failure in getProperties', errors);
  }
  return results;
}

async function parseAssessmentData(data: Document) {
  const assessments: Assessment[] = [];
  const rows = Array.from(
    data.querySelector('#coa_rea_main > table:nth-of-type(2) > tbody').children,
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
  let accounts: string[];
  if (existsSync(resolve(__dirname, `../../../data/accounts.json`))) {
    console.log('Getting list of accounts from file...');
    accounts = JSON.parse(
      readFileSync(resolve(__dirname, `../../../data/accounts.json`), {
        encoding: 'utf8',
      }),
    );
  } else {
    console.log('Scraping to get list of accounts...');
    accounts = await getData();

    console.log('Saving scraped list of accounts...');
    writeFile(
      resolve(__dirname, '../../../data/accounts.json'),
      JSON.stringify(accounts),
      { encoding: 'utf8' },
      err => console.error(err),
    );
  }

  const properties = await getProperties(accounts);

  writeFile(
    resolve(__dirname, '../../../data/properties.json'),
    JSON.stringify(properties),
    { encoding: 'utf8' },
    err => console.error(err),
  );
}

getAssessments();
