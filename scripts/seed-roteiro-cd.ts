import { readFileSync } from 'fs';
import { resolve } from 'path';
try {
  const content = readFileSync(resolve(process.cwd(), '.env.local'), 'utf-8');
  for (const line of content.split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z_][A-Z0-9_]*)\s*=\s*(.*)$/i);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^"|"$/g, '');
  }
} catch {}

import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import * as schema from '../db/schema';

const PERGUNTAS = [
  {
    ordem: 1,
    pergunta:
      'O que mais chamou sua atenção nesta oportunidade? — Anote o que o candidato citou (salário, estabilidade, crescimento, escala, proximidade, área logística, etc.) e avalie se a expectativa está alinhada com a vaga.',
  },
  {
    ordem: 2,
    pergunta:
      'Quais situações fazem você perder o interesse ou decidir sair de uma empresa? — Identifique gatilhos de desligamento (liderança, escala, salário, ambiente, crescimento) e avalie o risco de turnover.',
  },
  {
    ordem: 3,
    pergunta:
      'Conte uma situação difícil que viveu no trabalho e como resolveu. — Avalie maturidade, autonomia, postura sob pressão, comunicação e iniciativa.',
  },
  {
    ordem: 4,
    pergunta:
      'Quais são seus planos profissionais para os próximos anos? — Avalie aderência à vaga, foco e probabilidade de permanência.',
  },
  {
    ordem: 5,
    pergunta:
      'Você tem disponibilidade para horas extras, troca de turno e trabalho aos sábados quando necessário? Já trabalhou com metas, produtividade ou rotina operacional intensa? — Avalie aderência operacional, flexibilidade e experiência prévia em CD/logística.',
  },
  {
    ordem: 6,
    pergunta:
      'Comportamento e perfil — Observe durante a entrevista: comunicação, interesse pela vaga, postura, pontualidade, clareza, estabilidade emocional, energia, comprometimento e trabalho em equipe.',
  },
];

const url = process.env.DIRECT_URL ?? process.env.DATABASE_URL!;
const client = postgres(url, { prepare: false, max: 1, ssl: 'require' });
const db = drizzle(client, { schema });

async function main() {
  console.log('Removendo roteiro atual (cargo TODOS)...');
  await db.delete(schema.roteiro);

  console.log('Inserindo perguntas do documento Perlog CD...');
  for (const p of PERGUNTAS) {
    await db.insert(schema.roteiro).values({
      cargo: 'TODOS',
      ordem: p.ordem,
      pergunta: p.pergunta,
      tipo: 'texto',
      ativo: true,
    });
    console.log(`  ${p.ordem}. ${p.pergunta.slice(0, 80)}...`);
  }

  console.log(`\nOK — ${PERGUNTAS.length} perguntas cadastradas.`);
  await client.end();
}

main().catch((e) => { console.error(e); process.exit(1); });
