import { ensureDirSync, ensureFileSync } from 'std/fs/mod.ts';
import { pooledMap } from 'std/async/pool.ts';

import { getAccountNumbers } from './accounts.ts';
import { parsePropertyDetails, Property } from './properties.ts';

async function getProperties(accounts: string[]) {
	let count = 1;
	const studyGroups: { [index: number]: number[] } = {};
	const propertyTypes: { [index: string]: number } = {};
	const propertyDetails = pooledMap(5, accounts, async (account: string) => {
		console.log(
			`Fetching account ${count} of ${accounts.length}, number ${account}.`,
		);
		count++;
		const property = await parsePropertyDetails(account);
		if (property) {
			if (property.studyGroup in studyGroups) {
				studyGroups[property.studyGroup].push(+account);
			} else {
				studyGroups[property.studyGroup] = [+account];
			}
			if (property.type in propertyTypes) {
				propertyTypes[property.type] += 1;
			} else {
				propertyTypes[property.type] = 1;
			}
			return property;
		}
	});

	let results: Property[] = [];
	for await (const property of propertyDetails) {
		if (property) {
			results.push(property);
		}
	}

	const formattedStudyGroups: { group: number; accounts: number[] }[] = [];
	for (const [key, value] of Object.entries(studyGroups)) {
		formattedStudyGroups.push({ group: +key, accounts: value });
	}

	return [
		results,
		formattedStudyGroups,
		propertyTypes,
	];
}

async function getAssessments() {
	ensureDirSync('../.cache');
	let accounts: string[];
	ensureFileSync(`../data/accounts.json`);
	const accountsFile = Deno.readTextFileSync(
		`../data/accounts.json`,
	);
	if (accountsFile.length > 0) {
		console.log('Getting list of accounts from file...');
		accounts = JSON.parse(
			Deno.readTextFileSync(`../data/accounts.json`),
		);
	} else {
		console.log('Scraping to get list of accounts...');
		accounts = await getAccountNumbers();

		console.log('Saving scraped list of accounts...');
		Deno.writeTextFile(
			'../data/accounts.json',
			JSON.stringify(accounts),
		);
	}

	const [properties, studyGroups, propertyTypes] = await getProperties(
		accounts,
	);

	console.log('Writing properties...');
	Deno.writeTextFile(
		'../data/properties.json',
		JSON.stringify(properties),
	);
	console.log('Writing study groups...');
	Deno.writeTextFile(
		'../data/groups.json',
		JSON.stringify(studyGroups),
	);
	console.log('Writing property types...');
	Deno.writeTextFile(
		'../data/types.json',
		JSON.stringify(propertyTypes),
	);
	console.log('Done!');
}

getAssessments();
