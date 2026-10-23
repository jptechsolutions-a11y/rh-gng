import 'server-only';
import { and, desc, eq, ilike, inArray } from 'drizzle-orm';
import { db, schema } from '@/db/client';
import type { Session } from '@/lib/auth/session';
import { getFiliaisVisiveis } from '@/lib/auth/session';
import type { EpiRow, StatusEpi } from './tipos';

/** Último lote concluído, filtrado pelo escopo de filiais da sessão (só bandeira PERLOG). */
export async function buscarEpi(s: Session) {
  const imp = await db.query.epiImports.findFirst({
    where: eq(schema.epiImports.concluida, true),
    orderBy: desc(schema.epiImports.createdAt),
  });
  if (!imp) return { imp: null, rows: [] as EpiRow[] };

  const escopo = getFiliaisVisiveis(s);
  const conds = [eq(schema.epiLinhas.importId, imp.id), ilike(schema.epiLinhas.bandeira, 'PERLOG')];
  if (escopo) {
    if (escopo.length === 0) return { imp, rows: [] as EpiRow[] };
    conds.push(inArray(schema.epiLinhas.filialId, escopo));
  }

  const raw = await db
    .select({
      filial: schema.epiLinhas.filialCodigo,
      secao: schema.epiLinhas.secao,
      chapa: schema.epiLinhas.chapa,
      nome: schema.epiLinhas.nome,
      funcao: schema.epiLinhas.funcao,
      epi: schema.epiLinhas.epi,
      risco: schema.epiLinhas.itemRisco,
      status: schema.epiLinhas.status,
      dias: schema.epiLinhas.diasAVencer,
      dtEmp: schema.epiLinhas.dataEmprestimo,
      adm: schema.epiLinhas.dataAdmissao,
      sit: schema.epiLinhas.codsituacao,
      tst: schema.epiLinhas.tst,
    })
    .from(schema.epiLinhas)
    .where(and(...conds));

  const rows: EpiRow[] = raw.map((r) => ({
    filial: r.filial,
    secao: r.secao ?? 'Sem seção',
    chapa: r.chapa,
    nome: r.nome,
    funcao: r.funcao ?? 'Sem função',
    epi: r.epi,
    risco: r.risco ?? 'Sem risco',
    status: r.status as StatusEpi,
    dias: r.dias,
    dtEmp: r.dtEmp,
    adm: r.adm,
    sit: r.sit ?? '—',
    tst: r.tst ?? 'Sem TST',
  }));
  return { imp, rows };
}
