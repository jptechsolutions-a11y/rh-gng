import 'server-only';
import { desc, eq, inArray, sql } from 'drizzle-orm';
import { db, schema } from '@/db/client';
import { getFiliaisCodigosVisiveis, type Session } from '@/lib/auth/session';
import { normalizarCodigoFilial } from '@/lib/vagas/normalizar-codigo-filial';
import type { SolicitacaoUniforme, StatusUniforme } from './tipos';

type Linha = typeof schema.uniformesSolicitacoes.$inferSelect;

const iso = (d: Date | null) => (d ? d.toISOString() : null);

export function paraSolicitacao(r: Linha): SolicitacaoUniforme {
  return {
    id: r.id,
    criadoEm: r.createdAt.toISOString(),
    solicitanteNome: r.solicitanteNome,
    solicitanteUsuario: r.solicitanteUsuario,
    filial: r.filialCodigo,
    chapa: r.chapa,
    colaboradorNome: r.colaboradorNome,
    funcao: r.funcao,
    secao: r.secao,
    item: r.item,
    tamanho: r.tamanho,
    quantidade: r.quantidade,
    motivo: r.motivo,
    motivoOutro: r.motivoOutro,
    status: r.status as StatusUniforme,
    motivoRecusa: r.motivoRecusa,
    decididoPor: r.decididoPor,
    decididoEm: iso(r.decididoEm),
    prontoEm: iso(r.prontoEm),
    dataEntrega: r.dataEntrega,
    entreguePor: r.entreguePor,
    exigeDevolucao: r.exigeDevolucao,
    devolvidoEm: r.devolvidoEm,
    devolucaoObs: r.devolucaoObs,
    observacao: r.observacao,
  };
}

/** Solicitações que a sessão pode ver: admin/nacional → todas; filial → a dela; regional/gestor → as filiais dele. */
export async function listarSolicitacoesUniforme(s: Session): Promise<SolicitacaoUniforme[]> {
  const escopo = getFiliaisCodigosVisiveis(s);
  if (escopo && escopo.length === 0) return [];
  const t = schema.uniformesSolicitacoes;
  const base = db.select().from(t);
  const rows = await (escopo
    ? base.where(inArray(t.filialCodigo, Array.from(new Set(escopo.map(normalizarCodigoFilial)))))
    : base
  )
    .orderBy(desc(t.createdAt))
    .limit(1000);
  return rows.map(paraSolicitacao);
}

/** Pedidos ainda em andamento para uma matrícula (evita pedir duas vezes o mesmo item). */
export async function emAndamentoPorChapa(chapa: string): Promise<SolicitacaoUniforme[]> {
  const t = schema.uniformesSolicitacoes;
  const rows = await db
    .select()
    .from(t)
    .where(sql`${eq(t.chapa, chapa)} AND ${t.status} IN ('solicitado','aprovado','pronto')`)
    .orderBy(desc(t.createdAt));
  return rows.map(paraSolicitacao);
}
