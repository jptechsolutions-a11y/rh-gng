import postgres from 'postgres';
import { readFileSync } from 'node:fs';

const env = Object.fromEntries(
  readFileSync('.env.local', 'utf8')
    .split(/\r?\n/)
    .filter((l) => l && !l.startsWith('#') && l.includes('='))
    .map((l) => { const i = l.indexOf('='); return [l.slice(0, i), l.slice(i + 1)]; }),
);

const sql = postgres(env.DIRECT_URL, { ssl: 'require' });
try {
  const ddl = readFileSync('db/migrations/0009_vagas_secao_classificacao.sql', 'utf8');
  await sql.unsafe(ddl);
  const [{ count }] = await sql`SELECT count(*)::int AS count FROM vagas_secao_classificacao`;
  console.log(`OK: migration 0009 aplicada — ${count} mapeamentos`);
} finally {
  await sql.end();
}
