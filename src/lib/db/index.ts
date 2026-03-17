import { drizzle } from 'drizzle-orm/better-sqlite3';
import Database from 'better-sqlite3';
import * as schema from './schema';
import { mkdirSync } from 'fs';
import { dirname } from 'path';

const dbPath = process.env.DATABASE_PATH || './data/app.db';

// Verzeichnis erstellen falls noetig
mkdirSync(dirname(dbPath), { recursive: true });

const sqlite = new Database(dbPath);

// WAL-Modus fuer bessere Concurrent-Read-Performance
sqlite.pragma('journal_mode = WAL');
sqlite.pragma('foreign_keys = ON');

export const db = drizzle(sqlite, { schema });
