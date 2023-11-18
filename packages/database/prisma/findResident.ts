import { PrismaClient, Property, Sale } from '@prisma/client';
import readline from 'readline';

const db = new PrismaClient();

async function getRecordsWithOwner(name: string): Promise<Property[]> {
  const result = await db.property.findMany({
    where: {
      owner: {
        contains: name.toUpperCase(),
      },
    },
  });
  if (result.length) {
    return result;
  }

  const salesFallback = await db.sale.findMany({
    where: {
      grantee: {
        contains: name.toUpperCase(),
      },
    },
    include: {
      property: true,
    },
  });
  return salesFallback.map(s => s.property);
}

async function search() {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  rl.question('Name to search for: ', name => {
    getRecordsWithOwner(name).then(res => {
      console.log(JSON.stringify(res, null, 2));
    });
    rl.close();
  });
}

search();
