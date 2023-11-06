import { PrismaClient } from '@prisma/client';
import { writeFile } from 'fs';
import { resolve } from 'path';

import properties from './Parcels_Within_Polygon.json';

const db = new PrismaClient();

interface Transaction {
  address: string | null;
  type: string | null;
  zone: string | null;
  price: number;
  day: number;
  month: number;
  year: number;
}

async function getProperty(id: string) {
  const property = await db.property.findUnique({
    where: {
      account: +id,
    },
  });

  return property;
}

async function getSales(id: string) {
  const sales = await db.sale.findMany({
    where: {
      propertyId: id,
    },
  });

  return sales.filter(sale => sale.purchaseCode === 'A');
}

interface Property {
  ACCOUNTNO: string;
  ADDRESS_GI: string | null;
  LANDDESC: string | null;
  ZONING: string | null;
}

function getMostRecentDateObject(array: Transaction[]) {
  return array.sort((a, b) => {
    const dateA = new Date(a.year, a.month - 1, a.day);
    const dateB = new Date(b.year, b.month - 1, b.day);
    return dateB.getSeconds() - dateA.getSeconds();
  })[0];
}

async function getDelRayProperties() {
  const salesDB: Transaction[] = [];
  for (const property of properties as Property[]) {
    if (
      !(property.ZONING && property.ZONING.startsWith('R')) &&
      !(property.LANDDESC && property.LANDDESC.includes('APT'))
    )
      continue;
    console.log('Recording latest sale for ', property.ADDRESS_GI);
    const propRecord = await getProperty(property.ACCOUNTNO);
    if (!propRecord) continue;
    const pSales = await getSales(propRecord?.id);
    const formattedSales = pSales.map(a => {
      const record: Transaction = {
        address: property.ADDRESS_GI,
        price: a.price,
        type: property.LANDDESC,
        zone: property.ZONING,
        day: a.day,
        month: a.month,
        year: a.year,
      };
      return record;
    });
    const mostRecentSale = getMostRecentDateObject(formattedSales);
    salesDB.push(mostRecentSale);
  }

  return salesDB;
}

async function writeData() {
  const sales = await getDelRayProperties();

  writeFile(
    resolve(__dirname, '../../../data/salesInDelRay.json'),
    JSON.stringify(sales),
    { encoding: 'utf8' },
    err => console.error(err),
  );
}

writeData();
