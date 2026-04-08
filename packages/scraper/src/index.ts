import { PromisePool } from '@supercharge/promise-pool';
import { existsSync, readFileSync, writeFile } from 'fs';
import { resolve } from 'path';

import { getAccountNumbersFromGeoJSON } from './accounts-from-geojson';
import { parsePropertyDetails } from './properties';

interface ScrapeError {
  account: string;
  error: string;
  stack?: string;
  timestamp: string;
}

interface SkippedAccount {
  account: string;
  reason: 'invalid' | 'sub-parcel' | 'no-data';
  timestamp: string;
}

async function getProperties(accounts: string[]) {
  let count = 1;
  const studyGroups: Record<number, number[]> = {};
  const propertyTypes: Record<string, number> = {};
  const scrapeErrors: ScrapeError[] = [];
  const skippedAccounts: SkippedAccount[] = [];

  const { results, errors } = await PromisePool.withConcurrency(5)
    .for(accounts)
    .handleError((error, account) => {
      const scrapeError: ScrapeError = {
        account,
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        timestamp: new Date().toISOString(),
      };
      scrapeErrors.push(scrapeError);
      console.error(
        `Error fetching account ${account}: ${scrapeError.error}`,
      );
    })
    .process(async account => {
      console.log(
        `Fetching account ${count.toString()} of ${accounts.length.toString()}, number ${account}.`,
      );
      count++;
      const result = await parsePropertyDetails(account);

      if (!result.success) {
        skippedAccounts.push({
          account,
          reason: result.reason,
          timestamp: new Date().toISOString(),
        });
        return undefined;
      }

      const property = result.property;
      if (property.studyGroup) {
        if (property.studyGroup in studyGroups) {
          studyGroups[property.studyGroup]?.push(+account);
        } else {
          studyGroups[property.studyGroup] = [+account];
        }
      }
      if (property.type) {
        if (property.type in propertyTypes) {
          const current = propertyTypes[property.type];
          if (current !== undefined) {
            propertyTypes[property.type] = current + 1;
          }
        } else {
          propertyTypes[property.type] = 1;
        }
        return property;
      }
    });

  if (errors.length) {
    console.error(`\n⚠️  ${errors.length} errors occurred during scraping`);
  }

  const formattedStudyGroups: { group: number; accounts: number[] }[] = [];
  for (const [key, value] of Object.entries(studyGroups)) {
    formattedStudyGroups.push({ group: +key, accounts: value });
  }
  return [results, formattedStudyGroups, propertyTypes, scrapeErrors, skippedAccounts] as const;
}

async function getAssessments() {
  let accounts: string[];
  if (existsSync(resolve(__dirname, `../../../data/accounts.json`))) {
    console.log('Getting list of accounts from file...');
    accounts = JSON.parse(
      readFileSync(resolve(__dirname, `../../../data/accounts.json`), {
        encoding: 'utf8',
      }),
    ) as string[];
  } else {
    console.log('Extracting account numbers from GeoJSON...');
    accounts = getAccountNumbersFromGeoJSON();

    console.log('Saving account numbers list...');
    writeFile(
      resolve(__dirname, '../../../data/accounts.json'),
      JSON.stringify(accounts),
      { encoding: 'utf8' },
      err => {
        if (err) console.error(err);
      },
    );
  }

  const [properties, studyGroups, propertyTypes, scrapeErrors, skippedAccounts] =
    await getProperties(accounts);

  console.log('Writing properties...');
  writeFile(
    resolve(__dirname, '../../../data/properties.json'),
    JSON.stringify(properties),
    { encoding: 'utf8' },
    err => {
      if (err) console.error(err);
    },
  );
  console.log('Writing study groups...');
  writeFile(
    resolve(__dirname, '../../../data/groups.json'),
    JSON.stringify(studyGroups),
    { encoding: 'utf8' },
    err => {
      if (err) console.error(err);
    },
  );
  console.log('Writing property types...');
  writeFile(
    resolve(__dirname, '../../../data/types.json'),
    JSON.stringify(propertyTypes),
    { encoding: 'utf8' },
    err => {
      if (err) console.error(err);
    },
  );

  if (scrapeErrors.length > 0) {
    console.log('Writing scrape errors...');
    writeFile(
      resolve(__dirname, '../../../data/scrape-errors.json'),
      JSON.stringify(scrapeErrors, null, 2),
      { encoding: 'utf8' },
      err => {
        if (err) console.error(err);
        else {
          console.log(
            `❌ ${scrapeErrors.length} accounts had errors. Details saved to data/scrape-errors.json`,
          );
        }
      },
    );
  }

  if (skippedAccounts.length > 0) {
    console.log('Writing skipped accounts...');
    writeFile(
      resolve(__dirname, '../../../data/skipped-accounts.json'),
      JSON.stringify(skippedAccounts, null, 2),
      { encoding: 'utf8' },
      err => {
        if (err) console.error(err);
        else {
          const reasonCounts = skippedAccounts.reduce(
            (acc, skip) => {
              acc[skip.reason] = (acc[skip.reason] || 0) + 1;
              return acc;
            },
            {} as Record<string, number>,
          );
          const reasonSummary = Object.entries(reasonCounts)
            .map(([reason, count]) => `${count} ${reason}`)
            .join(', ');
          console.log(
            `⏭️  ${skippedAccounts.length} accounts skipped (${reasonSummary}). Details saved to data/skipped-accounts.json`,
          );
        }
      },
    );
  }

  console.log(
    `\n✅ Scraping complete: ${properties.length} properties scraped, ${skippedAccounts.length} skipped, ${scrapeErrors.length} errors`,
  );
  console.log('Done!');
}

void getAssessments();
