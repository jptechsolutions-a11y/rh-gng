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
import { eq } from 'drizzle-orm';
import * as schema from '../db/schema';
import { COMPETENCIAS_SEED } from '../lib/avaliacao/seed-data';

const url = process.env.DIRECT_URL ?? process.env.DATABASE_URL!;
const client = postgres(url, { prepare: false, max: 1, ssl: 'require' });
const db = drizzle(client, { schema });

async function main() {
  console.log('Seed de competências e fatores...');
  let compsCriadas = 0;
  let fatoresCriados = 0;

  for (const comp of COMPETENCIAS_SEED) {
    const existing = await db
      .select()
      .from(schema.competencias)
      .where(eq(schema.competencias.nome, comp.nome))
      .limit(1);

    let competenciaId: string;
    if (existing.length === 0) {
      const [inserted] = await db
        .insert(schema.competencias)
        .values({ nome: comp.nome, ordem: comp.ordem })
        .returning({ id: schema.competencias.id });
      competenciaId = inserted.id;
      compsCriadas++;
      console.log(`  + competência "${comp.nome}" criada`);
    } else {
      competenciaId = existing[0].id;
      console.log(`  . competência "${comp.nome}" já existe`);
    }

    const ja = await db
      .select()
      .from(schema.fatoresAvaliacao)
      .where(eq(schema.fatoresAvaliacao.competenciaId, competenciaId));

    for (let i = 0; i < comp.fatores.length; i++) {
      const texto = comp.fatores[i];
      if (ja.find((f) => f.texto === texto)) continue;
      await db
        .insert(schema.fatoresAvaliacao)
        .values({ competenciaId, ordem: i + 1, texto });
      fatoresCriados++;
      console.log(`      + fator ${i + 1}`);
    }
  }

  console.log(`\nSeed concluído. Competências novas: ${compsCriadas}, fatores novos: ${fatoresCriados}.`);
  await client.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
