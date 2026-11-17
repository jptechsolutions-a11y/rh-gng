// Carga do módulo Avaliação de Experiência: aplica a migration 0015 e importa o arquivo (PERLOG, Ativos).
// Uso: node node_modules/tsx/dist/cli.mjs scripts/carga-experiencia.mts "<arquivo.xls>" <yyyy-mm-dd>
import postgres from 'postgres';
import * as XLSX from 'xlsx';
import { readFileSync } from 'node:fs';
import { parseAvaliacoes } from '../lib/experiencia/parse.ts';

const arquivo = process.argv[2];
const data = process.argv[3];
if (!arquivo || !/^\d{4}-\d{2}-\d{2}$/.test(data ?? '')) throw new Error('uso: carga-experiencia.mts <arquivo> <yyyy-mm-dd>');

const env = Object.fromEntries(
  readFileSync('.env.local', 'utf8')
    .split(/\r?\n/)
    .filter((l) => l && !l.startsWith('#') && l.includes('='))
    .map((l) => { const i = l.indexOf('='); return [l.slice(0, i), l.slice(i + 1)]; }),
);

const sql = postgres(env.DIRECT_URL!, { ssl: 'require', onnotice: () => {} });
try {
  await sql.unsafe(readFileSync('db/migrations/0015_experiencia.sql', 'utf8'));
  const wb = XLSX.read(readFileSync(arquivo), { type: 'buffer', cellDates: true });
  const { linhas, totalArquivo } = parseAvaliacoes(wb);
  const pend = linhas.reduce((s, l) => s + +/^(PFP|PDP)/.test(l.status35 ?? '') + +/^(PFP|PDP)/.test(l.status70 ?? ''), 0);
  console.log(`lidos ${linhas.length} colaboradores PERLOG ativos (de ${totalArquivo} linhas) · ${pend} etapas pendentes`);

  const [imp] = await sql<{ id: string }[]>`
    INSERT INTO exp_imports (data_ref, arquivo_nome, importado_por_nome)
    VALUES (${data}, ${arquivo.split(/[\\/]/).pop()!}, 'Carga inicial') RETURNING id`;
  const CH = 500;
  for (let i = 0; i < linhas.length; i += CH) {
    const lote = linhas.slice(i, i + CH).map((l) => ({
      import_id: imp!.id, filial_codigo: l.filialCodigo, chapa: l.chapa, nome: l.nome, dt_admissao: l.dtAdmissao,
      avaliador_arquivo: l.avaliadorArquivo, prev_35: l.prev35, status_35: l.status35, prev_70: l.prev70, status_70: l.status70,
    }));
    await sql`INSERT INTO exp_linhas ${sql(lote)}`;
  }
  await sql`UPDATE exp_imports SET concluida = true, total_colaboradores = ${linhas.length} WHERE id = ${imp!.id}`;
  await sql`DELETE FROM exp_imports WHERE data_ref = ${data} AND id <> ${imp!.id}`;

  const porFilial = await sql`
    SELECT filial_codigo, (count(*) FILTER (WHERE status_35 IN ('PFP','PDP')) + count(*) FILTER (WHERE status_70 IN ('PFP','PDP')))::int AS n
    FROM exp_linhas WHERE import_id = ${imp!.id} GROUP BY 1 ORDER BY 2 DESC`;
  console.log('OK', data, '→', porFilial.map((r) => `${r.filial_codigo}=${r.n}`).join(' '));
} finally {
  await sql.end();
}
