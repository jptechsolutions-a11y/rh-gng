// Carga inicial do módulo IC: aplica a migration 0012 e importa a semana (bandeira PERLOG).
// Uso: node node_modules/tsx/dist/cli.mjs scripts/carga-ic.mts "<caminho do .xlsx>" <yyyy-mm-dd>
import postgres from 'postgres';
import * as XLSX from 'xlsx';
import { readFileSync } from 'node:fs';
import { parseBaseIc } from '../lib/ic/parse.ts';

const arquivo = process.argv[2];
const semana = process.argv[3];
if (!arquivo || !/^\d{4}-\d{2}-\d{2}$/.test(semana ?? '')) throw new Error('uso: carga-ic.mts <arquivo.xlsx> <yyyy-mm-dd>');

const env = Object.fromEntries(
  readFileSync('.env.local', 'utf8')
    .split(/\r?\n/)
    .filter((l) => l && !l.startsWith('#') && l.includes('='))
    .map((l) => { const i = l.indexOf('='); return [l.slice(0, i), l.slice(i + 1)]; }),
);

const sql = postgres(env.DIRECT_URL!, { ssl: 'require', onnotice: () => {} });
try {
  await sql.unsafe(readFileSync('db/migrations/0012_ic.sql', 'utf8'));

  const wb = XLSX.read(readFileSync(arquivo), { type: 'buffer', cellDates: true, sheets: 'BASE' });
  const { pendencias, headcount, totalBase } = parseBaseIc(wb);
  console.log(`lidas ${pendencias.length} pendências PERLOG e ${headcount.reduce((s, h) => s + h.qtd, 0)} funcionários (de ${totalBase} linhas)`);

  const [imp] = await sql<{ id: string }[]>`
    INSERT INTO ic_imports (semana_ref, arquivo_nome, importado_por_nome)
    VALUES (${semana}, ${arquivo.split(/[\\/]/).pop()!}, 'Carga inicial') RETURNING id`;

  const CH = 500;
  for (let i = 0; i < pendencias.length; i += CH) {
    const lote = pendencias.slice(i, i + CH).map((l) => ({
      import_id: imp!.id, filial_codigo: l.filialCodigo, regional: l.regional, chapa: l.chapa, nome: l.nome,
      funcao: l.funcao, secao: l.secao, codsituacao: l.codsituacao, categoria: l.categoria, tipo: l.tipo, data_pend: l.dataPend,
    }));
    await sql`INSERT INTO ic_pendencias ${sql(lote)}`;
  }
  if (headcount.length > 0) {
    await sql`INSERT INTO ic_headcount ${sql(headcount.map((h) => ({ import_id: imp!.id, filial_codigo: h.filialCodigo, qtd: h.qtd })))}`;
  }
  await sql`UPDATE ic_imports SET concluida = true, total_pendencias = ${pendencias.length} WHERE id = ${imp!.id}`;
  await sql`DELETE FROM ic_imports WHERE semana_ref = ${semana} AND id <> ${imp!.id}`;

  const porFilial = await sql`SELECT filial_codigo, count(*)::int AS n FROM ic_pendencias WHERE import_id = ${imp!.id} GROUP BY 1 ORDER BY 2 DESC`;
  console.log('OK semana', semana, '→', porFilial.map((r) => `${r.filial_codigo}=${r.n}`).join(' '));
  const resp = await sql`SELECT nome, filiais FROM ic_responsaveis ORDER BY ordem`;
  console.log('responsáveis:', resp.map((r) => `${r.nome} [${(r.filiais as string[]).join(',')}]`).join(' | '));
} finally {
  await sql.end();
}
