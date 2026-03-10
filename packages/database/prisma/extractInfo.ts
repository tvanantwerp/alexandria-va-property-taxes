import { PrismaClient } from '@prisma/client';
import { writeFile } from 'fs';
import { resolve } from 'path';

const db = new PrismaClient();

interface Transaction {
  streetNumber: string;
  street: string;
  lotSize: number | null;
  livingArea: number | null;
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

async function getStudyGroupData(): Promise<string[]> {
  let sales = 'number,street,year,price,lot,livingArea\n';
  let assessments = 'number,street,year,price,lot,livingArea\n';

  if (!process.env.STUDY_GROUP) {
    throw new Error('No study group specified in .env file.');
  }

  const studyGroup = await db.studyGroup.findUnique({
    where: {
      studyGroupID: +process.env.STUDY_GROUP,
    },
  });

  if (!studyGroup) {
    throw new Error('Study group not found.');
  }

  const properties = await db.property.findMany({
    where: {
      studyGroupId: studyGroup.id,
    },
  });
  const salesDB: Transaction[] = [];
  for (const property of properties) {
    const pSales = await getSales(property.id);
    const formattedSales = pSales.map(a => {
      const record: Transaction = {
        streetNumber: property.streetNumber,
        street: property.streetName,
        lotSize: property.lotSize,
        livingArea: property.livingArea,
        price: a.price,
        year: a.year,
      };
      return record;
    });
    formattedSales.forEach(s => salesDB.push(s));
  }

  const assessmentsDB: Transaction[] = [];
  for (const property of properties) {
    const pAssessments = await getAssessments(property.id);
    const formattedAssessments = pAssessments.map(a => {
      const record: Transaction = {
        streetNumber: property.streetNumber,
        street: property.streetName,
        lotSize: property.lotSize,
        livingArea: property.livingArea,
        price: a.land + a.building,
        year: a.year,
      };
      return record;
    });
    formattedAssessments.forEach(s => assessmentsDB.push(s));
  }

  salesDB.forEach(sale => {
    sales += `${sale.streetNumber},${sale.street},${String(sale.year)},${String(sale.price)},${String(sale.lotSize)},${String(sale.livingArea)}\n`;
  });
  assessmentsDB.forEach(assessment => {
    assessments += `${assessment.streetNumber},${assessment.street},${String(assessment.year)},${String(assessment.price)},${String(assessment.lotSize)},${String(assessment.livingArea)}\n`;
  });

  return [sales, assessments];
}

async function writeData() {
  const [sales, assessments] = await getStudyGroupData();

  if (sales) {
    writeFile(
      resolve(__dirname, '../../../data/sales.csv'),
      sales,
      { encoding: 'utf8' },
      err => {
        if (err) console.error(err);
      },
    );
  }
  if (assessments) {
    writeFile(
      resolve(__dirname, '../../../data/assessments.csv'),
      assessments,
      { encoding: 'utf8' },
      err => {
        if (err) console.error(err);
      },
    );
  }
}

void writeData();
