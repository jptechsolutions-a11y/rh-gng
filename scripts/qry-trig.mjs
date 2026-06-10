import postgres from 'postgres';
import { readFileSync } from 'node:fs';
const env = Object.fromEntries(readFileSync('.env.local','utf8').split(/\r?\n/).filter(l=>l && !l.startsWith('#') && l.includes('=')).map(l => { const i=l.indexOf('='); return [l.slice(0,i), l.slice(i+1)]; }));
const sql = postgres(env.DIRECT_URL, { ssl: 'require' });
try {
  const trigs = await sql`SELECT t.tgname, c.relname AS table_name FROM pg_trigger t JOIN pg_class c ON c.oid = t.tgrelid WHERE NOT t.tgisinternal AND c.relname IN ('log_historico','log_acessos')`;
  console.log('TRIGGERS:', JSON.stringify(trigs, null, 2));
  for (const t of trigs) {
    const fn = await sql`SELECT pg_get_functiondef((SELECT tgfoid FROM pg_trigger WHERE tgname = ${t.tgname} LIMIT 1)) AS def`;
    console.log('=== FUNC for', t.tgname, '===\n', fn[0]?.def, '\n');
  }
} finally { await sql.end(); }
