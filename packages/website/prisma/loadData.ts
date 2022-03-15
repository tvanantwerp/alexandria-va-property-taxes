import { PrismaClient } from '@prisma/client';
import { PromisePool } from '@supercharge/promise-pool';
import { readFile } from 'fs/promises';
import { resolve } from 'path';

import { Property } from '../../scraper/src/properties';

const db = new PrismaClient();

async function getProperties(): Promise<Property[]> {
  const properties = await readFile(
    resolve(__dirname, `../../../data/properties.json`),
    { encoding: 'utf8' },
  );
  return JSON.parse(properties);
}

async function loadData() {
  const properties = await getProperties();
  await PromisePool.withConcurrency(5)
    .for(properties)
    .handleError(async (error, property, pool) => {
      console.error(error, property);
      return pool.stop();
    })
    .process(async property => {
      return db.property.create({
        data: {
          id: property.account,
          streetNumber: property.streetNumber,
          streetName: property.streetName,
          description: property.description,
          lotSize: property.lotSize,
          yearBuilt: property.yearBuilt,
          buildingType: property.buildingType,
          livingArea: property.livingArea,
          totalBasement: property.totalBasement,
          finishedBasement: property.finishedBasement,
          fullBaths: property.fullBaths,
          halfBaths: property.halfBaths,
          studyGroup: {
            create: {
              id: property.studyGroup,
            },
          },
          propertyType: {
            create: {
              id: property.type,
            },
          },
          assessments: {
            create: property.assessments.map(
              ({ month, year, land, building }) => {
                return {
                  month,
                  year,
                  land,
                  building,
                };
              },
            ),
          },
          sales: {
            create: property.sales.map(
              ({ id, purchaseCode, price, day, month, year }) => {
                return { id, purchaseCode, price, day, month, year };
              },
            ),
          },
        },
      });
    });
}

loadData();
