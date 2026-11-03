// Carrega uma atualização ANTIGA do painel de EPI como histórico (sem apagar a atual) e aplica a migration 0013.
// Uso: node node_modules/tsx/dist/cli.mjs scripts/carga-epi-historico.mts "<caminho do .xlsm>" <yyyy-mm-dd>
import postgres from 'postgres';
import * as XLSX from 'xlsx';
import { readFileSync } from 'node:fs';
import { parseBaseEpi } from '../lib/epi/parse.ts';
import { normalizarCodigoFilial } from '../lib/vagas/normalizar-codigo-filial.ts';

const arquivo = process.argv[2];
const dataRef = process.argv[3];
if (!arquivo || !/^\d{4}-\d{2}-\d{2}$/.test(dataRef ?? '')) throw new Error('uso: carga-epi-historico.mts <arquivo.xlsm> <yyyy-mm-dd>');

const env = Object.fromEntries(
  readFileSync('.env.local', 'utf8')
    .split(/\r?\n/)
    .filter((l) => l && !l.startsWith('#') && l.includes('='))
    .map((l) => { const i = l.indexOf('='); return [l.slice(0, i), l.slice(i + 1)]; }),
);

const sql = postgres(env.DIRECT_URL!, { ssl: 'require', onnotice: () => {} });
try {
  await sql.unsafe(readFileSync('db/migrations/0013_epi_comparativo.sql', 'utf8'));

  const [ja] = await sql<{ id: string }[]>`SELECT id FROM epi_imports WHERE data_ref = ${dataRef} AND concluida LIMIT 1`;
  if (ja) {
    console.log(`Já existe uma atualização de ${dataRef} (${ja.id}) — nada a fazer.`);
  } else {
    const wb = XLSX.read(readFileSync(arquivo), { type: 'buffer', cellDates: true, sheets: 'Base de dados' });
    const { linhas, totalBase } = parseBaseEpi(wb);
    console.log(`lidas ${linhas.length} linhas PERLOG de ${totalBase}`);

    const filiais = await sql<{ id: string; codigo: string }[]>`SELECT id, codigo FROM filiais`;
    const porCodigo = new Map(filiais.map((f) => [normalizarCodigoFilial(f.codigo), f.id]));

    const [imp] = await sql<{ id: string }[]>`
      INSERT INTO epi_imports (arquivo_nome, importado_por_nome, data_ref, created_at)
      VALUES (${arquivo.split(/[\\/]/).pop()!}, 'Carga histórica', ${dataRef}, ${dataRef + 'T12:00:00-03:00'}) RETURNING id`;

    const CH = 500;
    for (let i = 0; i < linhas.length; i += CH) {
      const lote = linhas.slice(i, i + CH).map((l) => {
        const cod = normalizarCodigoFilial(l.filialCodigo);
        return {
          import_id: imp!.id, filial_id: porCodigo.get(cod) ?? null, filial_codigo: cod, regional: l.regional, bandeira: l.bandeira,
          secao: l.secao, chapa: l.chapa, nome: l.nome, funcao: l.funcao, data_admissao: l.dataAdmissao,
          codsituacao: l.codsituacao, item_risco: l.itemRisco, cod_epi: l.codEpi, epi: l.epi,
          durabilidade: l.durabilidade, dias_a_vencer: l.diasAVencer, data_emprestimo: l.dataEmprestimo,
          status: l.status, tst: l.tst,
        };
      });
      await sql`INSERT INTO epi_linhas ${sql(lote)}`;
    }
    await sql`UPDATE epi_imports SET concluida = true, total_linhas = ${linhas.length} WHERE id = ${imp!.id}`;
    console.log(`OK: ${linhas.length} linhas gravadas como atualização de ${dataRef}`);
  }

  const todas = await sql`SELECT arquivo_nome, data_ref::text AS data_ref, total_linhas FROM epi_imports WHERE concluida ORDER BY data_ref DESC`;
  console.log('atualizações no banco:', todas.map((r) => `${r.data_ref} (${r.total_linhas})`).join(' | '));
} finally {
  await sql.end();
}
