import { PrismaClient } from '@prisma/client';
import { writeFile } from 'fs';
import { resolve } from 'path';

const db = new PrismaClient();

interface transaction {
  streetNumber: string;
  street: string;
  lot: number;
  livingArea: number;
  price: number;
  year: number;
}

async function getSales(id: string) {
  const sales = await db.sale.findMany({
    where: {
      propertyId: id,
    },
  });

  return sales.filter(sale => sale.purchaseCode === 'A');
}

async function getAssessments(id: string) {
  return await db.assessment.findMany({
    where: {
      propertyId: id,
    },
  });
}

async function getData(): Promise<string[]> {
  let sales = 'number,street,year,price,lot,livingArea\n';
  let assessments = 'number,street,year,price,lot,livingArea\n';

  const studyGroup = await db.studyGroup.findUnique({
    where: {
      studyGroupID: +process.env.STUDY_GROUP,
    },
  });
  const properties = await db.property.findMany({
    where: {
      studyGroupId: studyGroup.id,
    },
  });
  const salesDB: transaction[] = [];
  for (const property of properties) {
    const pSales = await getSales(property.id);
    const formattedSales = pSales.map(a => {
      const record: transaction = {
        streetNumber: property.streetNumber,
        street: property.streetName,
        lot: property.lotSize,
        livingArea: property.livingArea,
        price: a.price,
        year: a.year,
      };
      return record;
    });
    formattedSales.forEach(s => salesDB.push(s));
  }

  const assessmentsDB: transaction[] = [];
  for (const property of properties) {
    const pAssessments = await getAssessments(property.id);
    const formattedAssessments = pAssessments.map(a => {
      const record: transaction = {
        streetNumber: property.streetNumber,
        street: property.streetName,
        lot: property.lotSize,
        livingArea: property.livingArea,
        price: a.land + a.building,
        year: a.year,
      };
      return record;
    });
    formattedAssessments.forEach(s => assessmentsDB.push(s));
  }

  salesDB.forEach(sale => {
    sales += `${sale.streetNumber},${sale.street},${sale.year},${sale.price},${sale.lot},${sale.livingArea}\n`;
  });
  assessmentsDB.forEach(assessment => {
    assessments += `${assessment.streetNumber},${assessment.street},${assessment.year},${assessment.price},${assessment.lot},${assessment.livingArea}\n`;
  });

  return [sales, assessments];
}

async function writeData() {
  const [sales, assessments] = await getData();

  writeFile(
    resolve(__dirname, '../../../data/sales.csv'),
    sales,
    { encoding: 'utf8' },
    err => console.error(err),
  );
  writeFile(
    resolve(__dirname, '../../../data/assessments.csv'),
    assessments,
    { encoding: 'utf8' },
    err => console.error(err),
  );
}

writeData();
