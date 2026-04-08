import Database from 'better-sqlite3';
import { writeFileSync } from 'fs';
import { join } from 'path';

const DB_PATH = '/Users/tvanantwerp/Documents/personal/alexandria-va-property-taxes/packages/database/prisma/prisma/dev.db';

interface AssessmentChange {
  account: number;
  percentChange: number | null;
  recentTotal: number;
  previousTotal: number | null;
  recentYear: number;
  previousYear: number | null;
}

async function generateAssessmentData() {
  console.log('Opening database...');
  const db = new Database(DB_PATH, { readonly: true });

  console.log('Querying properties and assessments...');

  // Get most recent assessment for each year, then compare the two most recent years
  // Include ALL properties, even those with only one year of data
  const query = `
    WITH YearlyAssessments AS (
      SELECT
        p.account,
        a.year,
        a.land + a.building as total,
        ROW_NUMBER() OVER (PARTITION BY p.account, a.year ORDER BY a.month DESC) as month_rn
      FROM Property p
      JOIN Assessment a ON p.id = a.propertyId
    ),
    LatestByYear AS (
      SELECT
        account,
        year,
        total,
        ROW_NUMBER() OVER (PARTITION BY account ORDER BY year DESC) as year_rn
      FROM YearlyAssessments
      WHERE month_rn = 1
    ),
    RecentAssessments AS (
      SELECT
        account,
        MAX(CASE WHEN year_rn = 1 THEN year END) as recent_year,
        MAX(CASE WHEN year_rn = 1 THEN total END) as recent_total,
        MAX(CASE WHEN year_rn = 2 THEN year END) as previous_year,
        MAX(CASE WHEN year_rn = 2 THEN total END) as previous_total
      FROM LatestByYear
      WHERE year_rn <= 2
      GROUP BY account
    )
    SELECT
      account,
      recent_year,
      recent_total,
      previous_year,
      previous_total,
      CASE
        WHEN previous_total IS NOT NULL AND previous_total > 0
        THEN ROUND(((CAST(recent_total AS REAL) - previous_total) / previous_total * 100), 2)
        ELSE NULL
      END as percent_change
    FROM RecentAssessments
  `;

  const rows = db.prepare(query).all() as Array<{
    account: number;
    recent_year: number;
    recent_total: number;
    previous_year: number | null;
    previous_total: number | null;
    percent_change: number | null;
  }>;

  console.log(`Found ${rows.length} properties with assessment data`);

  const assessmentChanges: Record<string, AssessmentChange> = {};
  let withChange = 0;
  let withoutChange = 0;

  for (const row of rows) {
    assessmentChanges[row.account.toString()] = {
      account: row.account,
      percentChange: row.percent_change,
      recentTotal: row.recent_total,
      previousTotal: row.previous_total,
      recentYear: row.recent_year,
      previousYear: row.previous_year,
    };

    if (row.percent_change !== null) {
      withChange++;
    } else {
      withoutChange++;
    }
  }

  // Calculate statistics (only for properties with change data)
  const changes = rows.filter((r) => r.percent_change !== null).map((r) => r.percent_change!);
  const min = changes.length > 0 ? Math.min(...changes) : 0;
  const max = changes.length > 0 ? Math.max(...changes) : 0;
  const avg = changes.length > 0 ? changes.reduce((a, b) => a + b, 0) / changes.length : 0;

  console.log('\nStatistics:');
  console.log(`Properties with year-over-year data: ${withChange}`);
  console.log(`Properties with only recent year: ${withoutChange}`);
  console.log(`Min change: ${min.toFixed(2)}%`);
  console.log(`Max change: ${max.toFixed(2)}%`);
  console.log(`Avg change: ${avg.toFixed(2)}%`);

  // Write to file
  const outputPath = join(__dirname, '../public/assessment-changes.json');
  writeFileSync(outputPath, JSON.stringify(assessmentChanges, null, 2));

  console.log(`\nData written to: ${outputPath}`);

  db.close();
}

generateAssessmentData().catch((error) => {
  console.error('Error:', error);
  process.exit(1);
});
