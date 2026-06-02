import 'dotenv/config';
import { randomBytes } from 'crypto';
import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import { hash } from '@node-rs/argon2';
import * as schema from '../db/schema';
import { eq } from 'drizzle-orm';

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

const url = process.env.DIRECT_URL ?? process.env.DATABASE_URL!;
const client = postgres(url, { prepare: false, max: 1, ssl: 'require' });
const db = drizzle(client, { schema });

const argonOpts = { algorithm: 2, memoryCost: 65536, timeCost: 3, parallelism: 1 } as const;

function gen() {
  return randomBytes(5).toString('hex'); // 10 hex chars
}

async function main() {
  console.log('Seeding filiais e admin...');
  const credenciais: Array<{ alvo: string; senha: string }> = [];

  for (const f of FILIAIS) {
    const existing = await db.select().from(schema.filiais).where(eq(schema.filiais.codigo, f.codigo)).limit(1);
    if (existing.length > 0) {
      console.log(`  já existe: ${f.codigo} ${f.nome}`);
      continue;
    }
    const senha = `${f.codigo}@${gen()}`;
    const senhaHash = await hash(senha, argonOpts);
    await db.insert(schema.filiais).values({ codigo: f.codigo, nome: f.nome, senhaHash });
    credenciais.push({ alvo: `Filial ${f.codigo} ${f.nome}`, senha });
  }

  const admins = await db.select().from(schema.admins).limit(1);
  if (admins.length === 0) {
    const senha = `admin@${gen()}`;
    const senhaHash = await hash(senha, argonOpts);
    await db.insert(schema.admins).values({ usuario: 'admin', nome: 'Administrador', senhaHash });
    credenciais.push({ alvo: 'ADMIN (usuário: admin)', senha });
  } else {
    console.log('  admin já existe');
  }

  console.log('\n=== CREDENCIAIS GERADAS — ANOTE AGORA ===');
  for (const c of credenciais) console.log(`  ${c.alvo.padEnd(40)} senha: ${c.senha}`);
  console.log('=========================================\n');

  await client.end();
}

main().catch((e) => { console.error(e); process.exit(1); });
