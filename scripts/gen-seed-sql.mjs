import { hash } from '@node-rs/argon2';
import { randomBytes } from 'node:crypto';
import { writeFile } from 'node:fs/promises';

const FILIAIS = [
  { codigo: '464', nome: 'MT TREVO' },
  { codigo: '468', nome: 'MT PONTE NOVA' },
  { codigo: '743', nome: 'MS GUAICURUS' },
  { codigo: '783', nome: 'SC SAO JOSE' },
  { codigo: '264', nome: 'SC PORTO BELO' },
  { codigo: '773', nome: 'RS SAO LEOPOLDO' },
  { codigo: '713', nome: 'SP VARGEM GRANDE' },
  { codigo: '733', nome: 'SP JACAREI' },
  { codigo: '364', nome: 'DF SIA' },
];

const opts = { algorithm: 2, memoryCost: 65536, timeCost: 3, parallelism: 1 };
const gen = () => randomBytes(5).toString('hex');
const esc = (s) => s.replace(/'/g, "''");

const lines = ['-- INSERTs de seed (filiais + admin)'];
const credentials = [];

for (const f of FILIAIS) {
  const senha = `${f.codigo}@${gen()}`;
  const h = await hash(senha, opts);
  credentials.push({ alvo: `Filial ${f.codigo} ${f.nome}`, senha });
  lines.push(
    `insert into public.filiais (codigo, nome, senha_hash) values ('${f.codigo}', '${esc(f.nome)}', '${esc(h)}') on conflict (codigo) do nothing;`
  );
}

const adminSenha = `admin@${gen()}`;
const adminHash = await hash(adminSenha, opts);
credentials.push({ alvo: 'ADMIN (usuário: admin)', senha: adminSenha });
lines.push(
  `insert into public.admins (usuario, nome, senha_hash) values ('admin', 'Administrador', '${esc(adminHash)}') on conflict (usuario) do nothing;`
);

await writeFile('scripts/seed-output.sql', lines.join('\n') + '\n');

console.log('\n=== CREDENCIAIS GERADAS — ANOTE AGORA ===');
for (const c of credentials) console.log(`  ${c.alvo.padEnd(40)} senha: ${c.senha}`);
console.log('=========================================');
console.log('\nSQL salvo em scripts/seed-output.sql');
