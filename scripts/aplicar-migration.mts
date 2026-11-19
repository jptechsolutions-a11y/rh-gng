// Aplica uma migration .sql (idempotente: usa IF NOT EXISTS) no banco de DIRECT_URL.
// Uso: node node_modules/tsx/dist/cli.mjs scripts/aplicar-migration.mts db/migrations/0016_comite_desligamento.sql
import postgres from 'postgres';
import { readFileSync } from 'node:fs';

const arq = process.argv[2];
if (!arq) throw new Error('uso: aplicar-migration.mts <arquivo.sql>');
const env = Object.fromEntries(
  readFileSync('.env.local', 'utf8').split(/\r?\n/).filter((l) => l && !l.startsWith('#') && l.includes('='))
    .map((l) => { const i = l.indexOf('='); return [l.slice(0, i), l.slice(i + 1)]; }),
);
const sql = postgres(env.DIRECT_URL!, { ssl: 'require', onnotice: () => {} });
try {
  await sql.unsafe(readFileSync(arq, 'utf8'));
  console.log('OK', arq);
} finally {
  await sql.end();
}
