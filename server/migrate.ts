import { drizzle } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import postgres from 'postgres';

const client = postgres(process.env.DATABASE_URL!, { max: 1 });
const db = drizzle(client);

async function main() {
  console.log('Migrationen werden ausgefuehrt...');
  await migrate(db, { migrationsFolder: './src/lib/db/migrations' });
  console.log('Migrationen abgeschlossen.');
  await client.end();
}

main().catch((err) => {
  console.error('Migration fehlgeschlagen:', err);
  process.exit(1);
});
