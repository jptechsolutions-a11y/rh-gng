// Cria um usuário admin (senha com argon2id, mesmo formato do login). Não altera se o usuário já existir.
// Uso: node node_modules/tsx/dist/cli.mjs scripts/criar-admin.mts <usuario> <nome> <senha>
import postgres from 'postgres';
import { hash } from '@node-rs/argon2';
import { readFileSync } from 'node:fs';

const [usuario, nome, senha] = process.argv.slice(2);
if (!usuario || !nome || !senha) throw new Error('uso: criar-admin.mts <usuario> <nome> <senha>');

const env = Object.fromEntries(
  readFileSync('.env.local', 'utf8').split(/\r?\n/).filter((l) => l && !l.startsWith('#') && l.includes('='))
    .map((l) => { const i = l.indexOf('='); return [l.slice(0, i), l.slice(i + 1)]; }),
);
const sql = postgres(env.DIRECT_URL!, { ssl: 'require', onnotice: () => {} });
try {
  const [ex] = await sql`SELECT id FROM admins WHERE usuario = ${usuario} LIMIT 1`;
  if (ex) {
    console.log('Já existe um admin com esse usuário — nada foi alterado.');
  } else {
    const senhaHash = await hash(senha, { algorithm: 2, memoryCost: 65536, timeCost: 3, parallelism: 1 });
    await sql`INSERT INTO admins (usuario, senha_hash, nome) VALUES (${usuario}, ${senhaHash}, ${nome})`;
    console.log('Admin criado:', usuario);
  }
} finally {
  await sql.end();
}
