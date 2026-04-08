import { PrismaClient } from '@prisma/client';
import { readFile, writeFile } from 'fs/promises';
import { resolve } from 'path';

import type { Property } from '../../scraper/src/properties';

const db = new PrismaClient();

interface LoadError {
  error: string;
  stack?: string;
  propertyData: unknown;
  isNull: boolean;
  isUndefined: boolean;
}

async function getProperties(): Promise<Property[]> {
  const properties = await readFile(
    resolve(__dirname, `../../../data/properties.json`),
    { encoding: 'utf8' },
  );
  return JSON.parse(properties) as Property[];
}

async function createProperty(
  property: Property | undefined | null,
): Promise<LoadError | null> {
  try {
    if (property !== undefined && property !== null) {
      await db.property.create({
        data: {
          account: property.account,
          streetNumber: property.streetNumber,
          streetName: property.streetName,
          owner: property.owner,
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
              ({
                id,
                purchaseCode,
                price,
                day,
                month,
                year,
                grantee,
                grantor,
              }) => {
                return {
                  saleId: id,
                  purchaseCode,
                  price,
                  day,
                  month,
                  year,
                  grantee,
                  grantor,
                };
              },
            ),
          },
        },
      });
    } else {
      throw new Error('Property is null or undefined');
    }
    return null;
  } catch (error) {
    const errorInfo: LoadError = {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      propertyData: property,
      isNull: property === null,
      isUndefined: property === undefined,
    };
    console.error(
      `Error loading property ${String(property?.account)}:`,
      error instanceof Error ? error.message : error,
    );
    return errorInfo;
  }
}

async function loadData() {
  const properties = await getProperties();
  let count = 1;
  const errors: LoadError[] = [];
  let successCount = 0;

  for (const property of properties) {
    const error = await createProperty(property);

    if (error) {
      errors.push(error);
    } else {
      successCount++;
      console.log(
        `Processed ${String(count)} of ${String(properties.length)} properties`,
      );
    }
    count++;
  }

  if (errors.length > 0) {
    const errorFilePath = resolve(__dirname, '../../../data/load-errors.json');
    await writeFile(errorFilePath, JSON.stringify(errors, null, 2), 'utf8');
    console.log(
      `\n❌ ${String(errors.length)} records failed to load. Details saved to data/load-errors.json`,
    );
  }

  console.log(
    `\n✅ Database load complete: ${String(successCount)} successful, ${String(errors.length)} failed`,
  );
}

void loadData();
