import { pooledMap } from 'std/async/pool.ts';

import { streets } from './streets.ts';
import {
	Address,
	BASE_URL,
	fetchPageData,
	getPropertyURI,
	sleep,
} from './util.ts';

async function parsePageData(
	data: Document,
	firstPage = true,
): Promise<string[]> {
	const pageLinks: HTMLAnchorElement[] = Array.from(
		data.querySelectorAll('center p a'),
	);
	if (pageLinks.length > 2 && firstPage) {
		let pages: string[] = [];
		pageLinks.forEach((link) => {
			const href = link.href;
			if (!pages.includes(href)) {
				pages.push(href);
			}
		});
		pages = pages
			.filter((link) => !link.includes('&CPage=0') && !link.includes('%5'))
			.sort();

		const allPages = await Promise.all(
			pages.map(async (page) => {
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
	).map((el) => el.innerHTML);
}

async function getRawAccounts(streets: Address[]) {
	const accountsData = await pooledMap(5, streets, async (street: Address) => {
		const rawData = await fetchPageData(getPropertyURI(street));
		sleep(100);
		return parsePageData(rawData);
	});

	let accounts: string[] = [];
	for await (const account of accountsData) {
		accounts.push(account);
	}

	return accounts;
}

export async function getAccountNumbers() {
	const accounts = await getRawAccounts(streets);
	const flatAccounts = accounts.flat();
	return flatAccounts;
}
