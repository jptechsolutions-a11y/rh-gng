import { readFileSync } from 'fs';
import { resolve } from 'path';
try {
  const content = readFileSync(resolve(process.cwd(), '.env.local'), 'utf-8');
  for (const line of content.split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z_][A-Z0-9_]*)\s*=\s*(.*)$/i);
    if (m && m[1] && m[2] !== undefined && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^"|"$/g, '');
  }
} catch {}

import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import * as schema from '../db/schema';

const NOVOS_CARGOS = [
  'ASSIST. ADMINISTRATIVO',
  'CONFERENTE',
  'SUPERVISOR(A)',
  'COZINHEIRO(A)',
  'OP. DE EMPILHADEIRA',
  'ANALISTA',
  'AUX. ADMINISTRATIVO',
  'PORTEIRO(A)',
  'TECNICO(A) DE MANUTENCAO I',
  'AUX. DE MANUTENCAO',
  'AUX. DE ARMAZEM',
  'AUX. DE CARGA E DESCARGA',
];

const url = process.env.DIRECT_URL ?? process.env.DATABASE_URL!;
const client = postgres(url, { prepare: false, max: 1, ssl: 'require' });
const db = drizzle(client, { schema });

async function main() {
  console.log('Removendo cargos atuais...');
  await db.delete(schema.cargos);

  console.log('Inserindo novos cargos...');
  for (const nome of NOVOS_CARGOS) {
    await db.insert(schema.cargos).values({ nome, ativo: true });
    console.log(`  + ${nome}`);
  }

  console.log(`\nOK — ${NOVOS_CARGOS.length} cargos cadastrados.`);
  await client.end();
}

main().catch((e) => { console.error(e); process.exit(1); });
