import { and, eq, inArray } from 'drizzle-orm';
import { db, schema } from '@/db/client';
import { requireSession, getFiliaisVisiveis } from '@/lib/auth/session';
import { TopBar } from '@/components/layout/TopBar';
import { VagasView } from '@/components/vagas/VagasView';
import type { VagaRow } from '@/components/vagas/VagasQuadroTable';

export const dynamic = 'force-dynamic';

export default async function VagasPage() {
  const s = await requireSession();
  const escopo = getFiliaisVisiveis(s);

  const condicoes = [eq(schema.vagas.ativa, true)];
  if (escopo) condicoes.push(inArray(schema.vagas.filialId, escopo));

  const rowsRaw = await db
    .select({
      id: schema.vagas.id,
      filialCodigo: schema.filiais.codigo,
      filialNome: schema.filiais.nome,
      funcao: schema.vagas.funcao,
      secao: schema.vagas.secao,
      statusId: schema.vagas.statusId,
      statusNome: schema.vagasStatus.nome,
      statusAtualizadoEm: schema.vagas.statusAtualizadoEm,
      statusAtualizadoPorNome: schema.vagas.statusAtualizadoPorNome,
      limite: schema.vagasQuadroLinhas.limite,
      potencial: schema.vagasQuadroLinhas.potencial,
      alocados: schema.vagasQuadroLinhas.alocados,
      afastados: schema.vagasQuadroLinhas.afastados,
    })
    .from(schema.vagas)
    .innerJoin(schema.filiais, eq(schema.filiais.id, schema.vagas.filialId))
    .innerJoin(schema.vagasStatus, eq(schema.vagasStatus.id, schema.vagas.statusId))
    .innerJoin(schema.vagasQuadroLinhas, eq(schema.vagasQuadroLinhas.id, schema.vagas.linhaId))
    .where(and(...condicoes))
    .orderBy(schema.filiais.codigo, schema.vagas.funcao);

  const rows: VagaRow[] = rowsRaw.map((r) => ({
    ...r,
    statusAtualizadoEm: r.statusAtualizadoEm.toISOString(),
  }));

  const statusOptions = await db
    .select()
    .from(schema.vagasStatus)
    .where(eq(schema.vagasStatus.ativo, true))
    .orderBy(schema.vagasStatus.ordem);

  const porStatus = new Map<string, number>();
  for (const r of rows) porStatus.set(r.statusNome, (porStatus.get(r.statusNome) ?? 0) + 1);
  const chartStatus = Array.from(porStatus.entries())
    .map(([status, total]) => ({ status, total }))
    .sort((a, b) => b.total - a.total || a.status.localeCompare(b.status));

  // "Vagas em aberto" nos gráficos = todas as vagas ativas da coluna
  // importada (EM ABERTO), não só as que ainda estão no status literal "Em
  // aberto" — uma vaga em "Em Recrutamento"/"Entrevista"/etc. continua
  // ocupando uma posição em aberto da planilha até virar "Preenchida" (ou
  // ser fechada pela reconciliação do import). Mesmo critério usado em
  // lib/vagas/reconciliar.ts para decidir o total contra o alvo do import.
  const porFilial = new Map<string, number>();
  for (const r of rows) {
    porFilial.set(r.filialCodigo, (porFilial.get(r.filialCodigo) ?? 0) + 1);
  }
  const chartFilial = Array.from(porFilial.entries())
    .map(([filial, total]) => ({ filial, total }))
    .sort((a, b) => b.total - a.total || a.filial.localeCompare(b.filial));

  const porSecao = new Map<string, number>();
  const porFuncao = new Map<string, number>();
  for (const r of rows) {
    const secao = r.secao ?? 'Sem seção';
    porSecao.set(secao, (porSecao.get(secao) ?? 0) + 1);
    porFuncao.set(r.funcao, (porFuncao.get(r.funcao) ?? 0) + 1);
  }
  const chartSecao = Array.from(porSecao.entries())
    .map(([secao, total]) => ({ secao, total }))
    .sort((a, b) => b.total - a.total || a.secao.localeCompare(b.secao))
    .slice(0, 10);
  const chartFuncao = Array.from(porFuncao.entries())
    .map(([funcao, total]) => ({ funcao, total }))
    .sort((a, b) => b.total - a.total || a.funcao.localeCompare(b.funcao))
    .slice(0, 10);

  const podeEditar = s.perfil === 'admin' || s.perfil === 'filial';
  const badge =
    s.perfil === 'filial' ? `Filial ${s.filialCodigo}` :
    s.perfil === 'admin'  ? 'ADMIN' :
    (s.escopo === 'nacional' ? 'NACIONAL' : 'REGIONAL');

  return (
    <>
      <TopBar titulo="Quadro de Vagas" subtitulo={`${rows.length} vagas ativas`} badge={badge} />
      <div className="p-4 lg:p-6">
        <VagasView
          rows={rows}
          statusOptions={statusOptions}
          podeEditar={podeEditar}
          chartStatus={chartStatus}
          chartFilial={chartFilial}
          chartSecao={chartSecao}
          chartFuncao={chartFuncao}
        />
      </div>
    </>
  );
}
