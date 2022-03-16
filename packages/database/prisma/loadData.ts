import { PrismaClient } from '@prisma/client';
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

async function createProperty(property: Property) {
  try {
    await db.property.create({
      data: {
        account: property.account,
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
        StudyGroup: {
          connectOrCreate: {
            create: {
              studyGroupID: property.studyGroup,
            },
            where: {
              studyGroupID: property.studyGroup,
            },
          },
        },
        PropertyType: {
          connectOrCreate: {
            create: {
              propertyTypeId: property.type,
            },
            where: {
              propertyTypeId: property.type,
            },
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
              return { saleId: id, purchaseCode, price, day, month, year };
            },
          ),
        },
      },
    });
  } catch (error) {
    console.error(error, property);
  }
}

async function loadData() {
  getProperties().then(async properties => {
    let count = 0;
    for (const property of properties) {
      await createProperty(property);
      count++;
      console.log(`Created ${count} of ${properties.length}`);
    }
  });
}

loadData();
