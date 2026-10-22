import postgres from 'postgres';
import { readFileSync } from 'node:fs';
import { randomBytes } from 'node:crypto';

const env = Object.fromEntries(
  readFileSync('.env.local', 'utf8')
    .split(/\r?\n/)
    .filter((l) => l && !l.startsWith('#') && l.includes('='))
    .map((l) => { const i = l.indexOf('='); return [l.slice(0, i), l.slice(i + 1)]; }),
);

const ALFABETO = 'abcdefghjkmnpqrstuvwxyz23456789';
const slug = () => Array.from(randomBytes(10), (b) => ALFABETO[b % ALFABETO.length]).join('');

const sql = postgres(env.DIRECT_URL, { ssl: 'require' });
try {
  await sql.unsafe(readFileSync('db/migrations/0010_pesquisas.sql', 'utf8'));

  // Primeira pesquisa: Escala 5x2 (identificada — a matrícula é pedida na página pública).
  const [ja] = await sql`SELECT id, slug FROM pesquisas WHERE titulo = 'Escala 5x2' LIMIT 1`;
  if (ja) {
    console.log(`Escala 5x2 já existe: /p/${ja.slug}`);
  } else {
    const [p] = await sql`
      INSERT INTO pesquisas (slug, titulo, descricao, anonima, criada_por_nome)
      VALUES (${slug()}, 'Escala 5x2', 'Pesquisa sobre a preferência de escala 5x2.', false, 'Sistema')
      RETURNING id, slug`;
    const opcoes = [
      'Sábado e Domingo',
      'Domingo e Segunda',
      'Domingo e Terça',
      'Domingo e Quarta',
      'Domingo e Quinta',
      'Domingo e Sexta',
    ];
    await sql`
      INSERT INTO pesquisa_perguntas (pesquisa_id, ordem, texto, tipo, obrigatoria, opcoes) VALUES
        (${p.id}, 1, 'Qual escala 5x2 você prefere? (dias de folga)', 'unica', true, ${sql.json(opcoes)}),
        (${p.id}, 2, 'Você acha que a empresa ter escala 5x2 atrai mais você como empresa para trabalhar?', 'unica', true, ${sql.json(['Sim', 'Não'])})`;
    console.log(`OK: pesquisa Escala 5x2 criada: /p/${p.slug}`);
  }
} finally {
  await sql.end();
}
