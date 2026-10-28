import 'server-only';
import { and, asc, desc, eq, inArray, sql } from 'drizzle-orm';
import { db, schema } from '@/db/client';
import type { Session } from '@/lib/auth/session';
import { getFiliaisCodigosVisiveis } from '@/lib/auth/session';
import { normalizarCodigoFilial } from '@/lib/vagas/normalizar-codigo-filial';
import { SEM_RESP, type IcUfPorFilial, type IcEvolucaoPonto, type IcResponsavelView, type IcRow, type IcSemana } from './tipos';

/** Responsável (grupo) de cada filial, na ordem configurada. */
export async function carregarResponsaveis(): Promise<IcResponsavelView[]> {
  const rs = await db.select().from(schema.icResponsaveis).orderBy(asc(schema.icResponsaveis.ordem));
  return rs.map((r) => ({ id: r.id, nome: r.nome, cor: r.cor, imagem: r.imagem, filiais: r.filiais }));
}

/**
 * Dados do IC para a sessão: semanas disponíveis, a semana escolhida (ou a mais
 * recente), pendências no escopo de filiais, funcionários por filial e a
 * evolução de pendências por responsável em todas as semanas.
 */
export async function buscarIc(s: Session, semanaId?: string | null) {
  const responsaveis = await carregarResponsaveis();
  const semanasRaw = await db
    .select()
    .from(schema.icImports)
    .where(eq(schema.icImports.concluida, true))
    .orderBy(desc(schema.icImports.semanaRef));
  const semanas: IcSemana[] = semanasRaw.map((w) => ({ id: w.id, semanaRef: w.semanaRef, total: w.totalPendencias }));
  const atual = semanasRaw.find((w) => w.id === semanaId) ?? semanasRaw[0] ?? null;
  const ufPorFilial: IcUfPorFilial = {};
  if (!atual) return { responsaveis, semanas, semanaAtual: null, rows: [] as IcRow[], headcount: {} as Record<string, number>, evolucao: [] as IcEvolucaoPonto[], ufPorFilial };

  const escopoRaw = getFiliaisCodigosVisiveis(s);
  const escopo = escopoRaw ? escopoRaw.map(normalizarCodigoFilial) : null;
  if (escopo && escopo.length === 0) return { responsaveis, semanas, semanaAtual: atual.id, rows: [] as IcRow[], headcount: {} as Record<string, number>, evolucao: [] as IcEvolucaoPonto[], ufPorFilial };

  const respDaFilial = new Map<string, string>();
  for (const r of responsaveis) for (const f of r.filiais) respDaFilial.set(normalizarCodigoFilial(f), r.nome);

  const conds = [eq(schema.icPendencias.importId, atual.id)];
  if (escopo) conds.push(inArray(schema.icPendencias.filialCodigo, escopo));
  const [raw, hc] = await Promise.all([
    db
      .select({
        filial: schema.icPendencias.filialCodigo,
        chapa: schema.icPendencias.chapa,
        nome: schema.icPendencias.nome,
        funcao: schema.icPendencias.funcao,
        secao: schema.icPendencias.secao,
        sit: schema.icPendencias.codsituacao,
        categoria: schema.icPendencias.categoria,
        tipo: schema.icPendencias.tipo,
        data: schema.icPendencias.dataPend,
      })
      .from(schema.icPendencias)
      .where(and(...conds)),
    db.select().from(schema.icHeadcount).where(eq(schema.icHeadcount.importId, atual.id)),
  ]);

  const rows: IcRow[] = raw.map((r) => ({
    filial: r.filial,
    chapa: r.chapa,
    nome: r.nome,
    funcao: r.funcao ?? 'Sem função',
    secao: r.secao ?? 'Sem seção',
    sit: r.sit ?? '—',
    categoria: r.categoria,
    tipo: r.tipo ?? r.categoria,
    data: r.data,
    resp: respDaFilial.get(r.filial) ?? SEM_RESP,
  }));
  const headcount: Record<string, number> = {};
  for (const h of hc) if (!escopo || escopo.includes(h.filialCodigo)) headcount[h.filialCodigo] = h.qtd;

  // Evolução: pendências por filial em cada semana → agregadas por responsável.
  const porSemanaFilial = await db
    .select({
      importId: schema.icPendencias.importId,
      filial: schema.icPendencias.filialCodigo,
      n: sql<number>`count(*)::int`,
    })
    .from(schema.icPendencias)
    .innerJoin(schema.icImports, eq(schema.icImports.id, schema.icPendencias.importId))
    .where(and(eq(schema.icImports.concluida, true), escopo ? inArray(schema.icPendencias.filialCodigo, escopo) : undefined))
    .groupBy(schema.icPendencias.importId, schema.icPendencias.filialCodigo);
  const refDe = new Map(semanasRaw.map((w) => [w.id, w.semanaRef]));
  const pontos = new Map<string, Record<string, number>>();
  const pontosFilial = new Map<string, Record<string, number>>();
  for (const w of semanasRaw) { pontos.set(w.semanaRef, {}); pontosFilial.set(w.semanaRef, {}); }
  for (const p of porSemanaFilial) {
    const ref = refDe.get(p.importId);
    if (!ref) continue;
    const nome = respDaFilial.get(p.filial) ?? SEM_RESP;
    const o = pontos.get(ref)!;
    o[nome] = (o[nome] ?? 0) + p.n;
    const of = pontosFilial.get(ref)!;
    of[p.filial] = (of[p.filial] ?? 0) + p.n;
  }
  const evolucao: IcEvolucaoPonto[] = Array.from(pontos.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([semanaRef, porResp]) => ({ semanaRef, porResp, porFilial: pontosFilial.get(semanaRef) ?? {} }));

  // UF: primeiro pelo cadastro da filial (regional "SC", "SP-230"…), depois pela regional da própria planilha.
  const UFS = new Set(['SC', 'SP', 'RS', 'MT', 'MS', 'DF']);
  const ufDe = (txt: string | null | undefined) => {
    const m = (txt ?? '').toUpperCase().match(/^[A-Z]{2}/);
    return m && UFS.has(m[0]) ? m[0] : null;
  };
  const [cadFiliais, regPlanilha] = await Promise.all([
    db.select({ codigo: schema.filiais.codigo, regional: schema.filiais.regional }).from(schema.filiais),
    db
      .selectDistinct({ filial: schema.icPendencias.filialCodigo, regional: schema.icPendencias.regional })
      .from(schema.icPendencias)
      .where(eq(schema.icPendencias.importId, atual.id)),
  ]);
  for (const f of regPlanilha) { const u = ufDe(f.regional); if (u) ufPorFilial[f.filial] = u; }
  for (const f of cadFiliais) { const u = ufDe(f.regional); if (u) ufPorFilial[normalizarCodigoFilial(f.codigo)] = u; }

  return { responsaveis, semanas, semanaAtual: atual.id, rows, headcount, evolucao, ufPorFilial };
}
