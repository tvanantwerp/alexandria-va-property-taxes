import { PromisePool } from '@supercharge/promise-pool';
import { existsSync, readFileSync, writeFile } from 'fs';
import { resolve } from 'path';

import { getAccountNumbers } from './accounts';
import { parsePropertyDetails } from './properties';

async function getProperties(accounts: string[]) {
  let count = 1;
  const studyGroups: { [index: number]: number[] } = {};
  const propertyTypes: { [index: string]: number } = {};
  const { results, errors } = await PromisePool.withConcurrency(20)
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
      const property = await parsePropertyDetails(account);
      if (property && property.studyGroup) {
        if (property.studyGroup in studyGroups) {
          studyGroups[property.studyGroup].push(+account);
        } else {
          studyGroups[property.studyGroup] = [+account];
        }
      }
      if (property && property.type) {
        if (property.type in propertyTypes) {
          propertyTypes[property.type] += 1;
        } else {
          propertyTypes[property.type] = 1;
        }
        return property;
      }
    });
  if (errors.length) {
    console.error('Failure in getProperties', errors);
  }
  const formattedStudyGroups: { group: number; accounts: number[] }[] = [];
  for (const [key, value] of Object.entries(studyGroups)) {
    formattedStudyGroups.push({ group: +key, accounts: value });
  }
  return [
    results.filter(result => result !== null),
    formattedStudyGroups,
    propertyTypes,
  ];
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

  const [properties, studyGroups, propertyTypes] = await getProperties(
    accounts,
  );

  console.log('Writing properties...');
  writeFile(
    resolve(__dirname, '../../../data/properties.json'),
    JSON.stringify(properties),
    { encoding: 'utf8' },
    err => console.error(err),
  );
  console.log('Writing study groups...');
  writeFile(
    resolve(__dirname, '../../../data/groups.json'),
    JSON.stringify(studyGroups),
    { encoding: 'utf8' },
    err => console.error(err),
  );
  console.log('Writing property types...');
  writeFile(
    resolve(__dirname, '../../../data/types.json'),
    JSON.stringify(propertyTypes),
    { encoding: 'utf8' },
    err => console.error(err),
  );
  console.log('Done!');
}

getAssessments();
