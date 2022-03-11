import { PromisePool } from '@supercharge/promise-pool';
import { existsSync, readFileSync, writeFile } from 'fs';
import { resolve } from 'path';

import { getAccountNumbers } from './accounts';
import { parsePropertyDetails } from './properties';

async function getProperties(accounts: string[]) {
  let count = 1;
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
      console.log(
        `Fetching account ${count} of ${accounts.length}, number ${account}.`,
      );
      count++;
      return await parsePropertyDetails(account);
    });
  if (errors.length) {
    console.error('Failure in getProperties', errors);
  }
  return results;
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
    accounts = await getAccountNumbers();

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
