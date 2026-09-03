import 'server-only';
import { and, eq, inArray } from 'drizzle-orm';
import { db, schema } from '@/db/client';
import type { Session } from '@/lib/auth/session';
import { getFiliaisVisiveis } from '@/lib/auth/session';
import type { VagaRow } from '@/components/vagas/VagasQuadroTable';

/**
 * Busca as vagas ativas visíveis pra sessão (escopo por filial) + o catálogo
 * de status ativos. Compartilhado entre a página principal do Quadro de
 * Vagas e a de Excedentes — ambas partem do mesmo conjunto de dados.
 */
export async function buscarQuadroVagas(s: Session) {
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
      emAbertoImportado: schema.vagasQuadroLinhas.emAbertoImportado,
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

  return { rows, statusOptions };
}
