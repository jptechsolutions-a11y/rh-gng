import 'server-only';
import { drizzle, type PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

declare global {
  // eslint-disable-next-line no-var
  var __pgClient: ReturnType<typeof postgres> | undefined;
  // eslint-disable-next-line no-var
  var __db: PostgresJsDatabase<typeof schema> | undefined;
}

function build(): PostgresJsDatabase<typeof schema> {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error('DATABASE_URL não configurada');
  // Supavisor pooler (transaction mode) → prepared OFF.
  // max_lifetime força reciclagem antes do pooler matar a conexão por idle,
  // evitando ECONNRESET em sockets cacheados entre hot-reloads no dev.
  const client = globalThis.__pgClient ?? postgres(url, {
    prepare: false,
    max: process.env.NODE_ENV === 'production' ? 1 : 5,
    idle_timeout: 20,
    max_lifetime: 60 * 5,
    connect_timeout: 10,
    ssl: 'require',
    onnotice: () => {},
  });
  if (process.env.NODE_ENV !== 'production') globalThis.__pgClient = client;
  return drizzle(client, { schema });
}

export const db: PostgresJsDatabase<typeof schema> = new Proxy({} as PostgresJsDatabase<typeof schema>, {
  get(_t, prop) {
    if (!globalThis.__db) globalThis.__db = build();
    return Reflect.get(globalThis.__db, prop);
  },
});
export { schema };
