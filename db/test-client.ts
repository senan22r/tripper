import { drizzle } from 'drizzle-orm/sql-js';
import { INIT_SQL } from './init-sql';
import * as schema from './schema';

export async function createTestDb() {
  const initSqlJs = require('sql.js/dist/sql-asm.js');
  const SQL = await initSqlJs();
  const sqlite = new SQL.Database();
  sqlite.exec(INIT_SQL);
  const db = drizzle(sqlite, { schema });
  return { db, sqlite };
}

