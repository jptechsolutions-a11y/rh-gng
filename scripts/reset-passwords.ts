import { readFileSync } from 'fs';
import { resolve } from 'path';
// Carrega .env.local manualmente (dotenv não instalado)
try {
  const envPath = resolve(process.cwd(), '.env.local');
  const content = readFileSync(envPath, 'utf-8');
  for (const line of content.split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z_][A-Z0-9_]*)\s*=\s*(.*)$/i);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^"|"$/g, '');
  }
} catch {}
import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import { hash } from '@node-rs/argon2';
import { eq } from 'drizzle-orm';
import * as schema from '../db/schema';

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

async function main() {
  console.log('Resetando senhas para valores conhecidos...\n');
  const creds: Array<{ alvo: string; senha: string }> = [];

  // Admin
  const adminSenha = 'Perlog@2026';
  const adminHash = await hash(adminSenha, argonOpts);
  const adminExist = await db.select().from(schema.admins).where(eq(schema.admins.usuario, 'admin')).limit(1);
  if (adminExist.length > 0) {
    await db.update(schema.admins).set({ senhaHash: adminHash }).where(eq(schema.admins.usuario, 'admin'));
  } else {
    await db.insert(schema.admins).values({ usuario: 'admin', nome: 'Administrador', senhaHash: adminHash });
  }
  creds.push({ alvo: 'ADMIN (usuário: admin)', senha: adminSenha });

  // Filiais — senha = "Filial@<codigo>"
  for (const f of FILIAIS) {
    const senha = `Filial@${f.codigo}`;
    const senhaHash = await hash(senha, argonOpts);
    const exist = await db.select().from(schema.filiais).where(eq(schema.filiais.codigo, f.codigo)).limit(1);
    if (exist.length > 0) {
      await db.update(schema.filiais).set({ senhaHash, ativa: true }).where(eq(schema.filiais.codigo, f.codigo));
    } else {
      await db.insert(schema.filiais).values({ codigo: f.codigo, nome: f.nome, senhaHash });
    }
    creds.push({ alvo: `Filial ${f.codigo} ${f.nome}`, senha });
  }

  console.log('=== CREDENCIAIS ===');
  for (const c of creds) console.log(`  ${c.alvo.padEnd(40)} senha: ${c.senha}`);
  console.log('===================\n');

  await client.end();
}

main().catch((e) => { console.error(e); process.exit(1); });
