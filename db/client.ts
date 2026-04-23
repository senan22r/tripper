import * as SQLite from 'expo-sqlite';
import { drizzle } from 'drizzle-orm/expo-sqlite';
import { INIT_SQL } from './init-sql';
import * as schema from './schema';

export const DB_NAME = 'tripper.db';

const sqlite = SQLite.openDatabaseSync(DB_NAME);

sqlite.execSync(INIT_SQL);

export const db = drizzle(sqlite, { schema });
export { sqlite };
