// Carga inicial do módulo EPI: aplica a migration 0011 e importa as linhas PERLOG do painel.
// Uso: node node_modules/tsx/dist/cli.mjs scripts/carga-epi.ts "<caminho do .xlsm>"
import postgres from 'postgres';
import * as XLSX from 'xlsx';
import { readFileSync } from 'node:fs';
import { parseBaseEpi } from '../lib/epi/parse.ts';
import { normalizarCodigoFilial } from '../lib/vagas/normalizar-codigo-filial.ts';

const arquivo = process.argv[2];
if (!arquivo) throw new Error('informe o caminho do arquivo');

const env = Object.fromEntries(
  readFileSync('.env.local', 'utf8')
    .split(/\r?\n/)
    .filter((l) => l && !l.startsWith('#') && l.includes('='))
    .map((l) => { const i = l.indexOf('='); return [l.slice(0, i), l.slice(i + 1)]; }),
);

const sql = postgres(env.DIRECT_URL!, { ssl: 'require' });
try {
  await sql.unsafe(readFileSync('db/migrations/0011_epi.sql', 'utf8'));

  const wb = XLSX.read(readFileSync(arquivo), { type: 'buffer', cellDates: true, sheets: 'Base de dados' });
  const { linhas, totalBase } = parseBaseEpi(wb);
  console.log(`lidas ${linhas.length} linhas PERLOG de ${totalBase}`);

  const filiais = await sql<{ id: string; codigo: string }[]>`SELECT id, codigo FROM filiais`;
  const porCodigo = new Map(filiais.map((f) => [normalizarCodigoFilial(f.codigo), f.id]));
  const semFilial = new Set<string>();

  const [imp] = await sql<{ id: string }[]>`
    INSERT INTO epi_imports (arquivo_nome, importado_por_nome)
    VALUES (${arquivo.split(/[\\/]/).pop()!}, 'Carga inicial') RETURNING id`;

  const CH = 500;
  for (let i = 0; i < linhas.length; i += CH) {
    const lote = linhas.slice(i, i + CH).map((l) => {
      const cod = normalizarCodigoFilial(l.filialCodigo);
      const filialId = porCodigo.get(cod) ?? null;
      if (!filialId) semFilial.add(cod);
      return {
        import_id: imp!.id, filial_id: filialId, filial_codigo: cod, regional: l.regional, bandeira: l.bandeira,
        secao: l.secao, chapa: l.chapa, nome: l.nome, funcao: l.funcao, data_admissao: l.dataAdmissao,
        codsituacao: l.codsituacao, item_risco: l.itemRisco, cod_epi: l.codEpi, epi: l.epi,
        durabilidade: l.durabilidade, dias_a_vencer: l.diasAVencer, data_emprestimo: l.dataEmprestimo,
        status: l.status, tst: l.tst,
      };
    });
    await sql`INSERT INTO epi_linhas ${sql(lote)}`;
  }
  await sql`UPDATE epi_imports SET concluida = true, total_linhas = ${linhas.length} WHERE id = ${imp!.id}`;
  await sql`DELETE FROM epi_imports WHERE id <> ${imp!.id}`;

  const [{ n }] = await sql<{ n: number }[]>`SELECT count(*)::int AS n FROM epi_linhas WHERE import_id = ${imp!.id}`;
  const st = await sql`SELECT status, count(*)::int AS n FROM epi_linhas WHERE import_id = ${imp!.id} GROUP BY status ORDER BY status`;
  console.log(`OK: ${n} linhas gravadas`, st.map((r) => `${r.status}=${r.n}`).join(' '));
  console.log('filiais da planilha sem cadastro no sistema:', [...semFilial].join(', ') || 'nenhuma');
} finally {
  await sql.end();
}
