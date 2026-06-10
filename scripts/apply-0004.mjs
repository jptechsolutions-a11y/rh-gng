import postgres from 'postgres';
import { readFileSync } from 'node:fs';
const env = Object.fromEntries(readFileSync('.env.local','utf8').split(/\r?\n/).filter(l=>l && !l.startsWith('#') && l.includes('=')).map(l => { const i=l.indexOf('='); return [l.slice(0,i), l.slice(i+1)]; }));
const sql = postgres(env.DIRECT_URL, { ssl: 'require' });
try {
  const ddl = readFileSync('db/migrations/0004_indicadores_inconsist.sql', 'utf8');
  await sql.unsafe(ddl);
  console.log('OK: migration 0004 aplicada');
} finally { await sql.end(); }
