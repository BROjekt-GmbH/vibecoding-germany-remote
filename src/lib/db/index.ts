import { drizzle, type BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';
import Database from 'better-sqlite3';
import * as schema from './schema';
import { mkdirSync } from 'fs';
import { dirname } from 'path';

let _db: BetterSQLite3Database<typeof schema> | null = null;

/**
 * Lazy DB-Verbindung — wird erst beim ersten Zugriff erstellt.
 * Verhindert SQLITE_BUSY bei Next.js Build (mehrere Worker parallel).
 */
export const db = new Proxy({} as BetterSQLite3Database<typeof schema>, {
  get(_target, prop) {
    if (!_db) {
      const dbPath = process.env.DATABASE_PATH || './data/app.db';
      mkdirSync(dirname(dbPath), { recursive: true });
      const sqlite = new Database(dbPath);
      sqlite.pragma('journal_mode = WAL');
      sqlite.pragma('foreign_keys = ON');
      _db = drizzle(sqlite, { schema });
    }
    return (_db as unknown as Record<string | symbol, unknown>)[prop];
  },
});
