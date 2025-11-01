// scripts/migrate.ts
import 'dotenv/config';
import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';

async function main() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const db = drizzle(pool);

  console.log('Running migrations from ./drizzle ...');
  await migrate(db, { migrationsFolder: 'drizzle' });
  await pool.end();
  console.log('Done ✅');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
