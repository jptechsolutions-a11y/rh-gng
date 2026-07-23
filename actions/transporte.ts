'use server';

import { revalidatePath } from 'next/cache';
import { eq, and, sql, asc, desc, isNull, isNotNull, inArray } from 'drizzle-orm';
import { db, schema } from '@/db/client';
import { requireSession, type Session } from '@/lib/auth/session';
import { hasModuleAccess } from '@/lib/modules/permissions';

async function requireTransporte(): Promise<Session> {
  const s = await requireSession();
  if (!(await hasModuleAccess(s, 'transporte'))) throw new Error('FORBIDDEN');
  return s;
}

function getFilialId(s: Session, filialIdParam?: string): string {
  if (s.perfil === 'admin') {
    if (!filialIdParam) throw new Error('filialId obrigatório para admin');
    return filialIdParam;
  }
  if (s.perfil !== 'filial') throw new Error('FORBIDDEN');
  return s.filialId;
}

// ─── Rotas ───────────────────────────────────────────────────

export async function listarRotas(filialIdParam?: string) {
  const s = await requireTransporte();
  const filialId = getFilialId(s, filialIdParam);

  const rotas = await db
    .select()
    .from(schema.transporteRotas)
    .where(eq(schema.transporteRotas.filialId, filialId))
    .orderBy(asc(schema.transporteRotas.ordem));

  const passageirosCount = await db
    .select({
      rotaId: schema.transportePassageiros.rotaId,
      total: sql<number>`count(*)::int`,
    })
    .from(schema.transportePassageiros)
    .where(eq(schema.transportePassageiros.ativo, true))
    .groupBy(schema.transportePassageiros.rotaId);

  const countMap = new Map(passageirosCount.map(p => [p.rotaId, p.total]));

  return rotas.map(r => ({
    ...r,
    passageiros: countMap.get(r.id) ?? 0,
  }));
}

export async function criarRota(data: {
  filialId: string;
  nome: string;
  turno: string;
  lugares: number;
  ordem: number;
}) {
  await requireSession('admin');
  const [rota] = await db.insert(schema.transporteRotas).values(data).returning();
  revalidatePath('/transporte');
  revalidatePath('/admin/config/transporte');
  return rota;
}

export async function atualizarRota(id: string, data: {
  nome?: string;
  turno?: string;
  lugares?: number;
  ordem?: number;
}) {
  await requireSession('admin');
  await db.update(schema.transporteRotas).set(data).where(eq(schema.transporteRotas.id, id));
  revalidatePath('/transporte');
  revalidatePath('/admin/config/transporte');
  return { ok: true };
}

export async function toggleRotaAtiva(id: string) {
  await requireSession('admin');
  const [rota] = await db
    .select({ ativo: schema.transporteRotas.ativo })
    .from(schema.transporteRotas)
    .where(eq(schema.transporteRotas.id, id));
  if (!rota) throw new Error('Rota não encontrada');
  await db.update(schema.transporteRotas).set({ ativo: !rota.ativo }).where(eq(schema.transporteRotas.id, id));
  revalidatePath('/transporte');
  revalidatePath('/admin/config/transporte');
  return { ok: true };
}

// ─── Passageiros ─────────────────────────────────────────────

export async function listarPassageiros(rotaId: string) {
  await requireTransporte();
  return db
    .select()
    .from(schema.transportePassageiros)
    .where(and(
      eq(schema.transportePassageiros.rotaId, rotaId),
      eq(schema.transportePassageiros.ativo, true),
    ))
    .orderBy(asc(schema.transportePassageiros.nome));
}

export async function listarNaoAlocados(filialIdParam?: string) {
  const s = await requireTransporte();
  const filialId = getFilialId(s, filialIdParam);
  return db
    .select()
    .from(schema.transportePassageiros)
    .where(and(
      eq(schema.transportePassageiros.filialId, filialId),
      isNull(schema.transportePassageiros.rotaId),
      eq(schema.transportePassageiros.ativo, true),
    ))
    .orderBy(asc(schema.transportePassageiros.cidade), asc(schema.transportePassageiros.nome));
}

export async function alocarPassageiro(passageiroId: string, rotaId: string) {
  await requireTransporte();
  await db.update(schema.transportePassageiros)
    .set({ rotaId })
    .where(eq(schema.transportePassageiros.id, passageiroId));
  revalidatePath('/transporte');
  revalidatePath('/admin/config/transporte');
  return { ok: true };
}

export async function alocarMultiplos(passageiroIds: string[], rotaId: string) {
  await requireTransporte();
  if (passageiroIds.length === 0) return { ok: true };
  await db.update(schema.transportePassageiros)
    .set({ rotaId })
    .where(inArray(schema.transportePassageiros.id, passageiroIds));
  revalidatePath('/transporte');
  revalidatePath('/admin/config/transporte');
  return { ok: true };
}

export async function desalocarPassageiro(passageiroId: string) {
  await requireTransporte();
  await db.update(schema.transportePassageiros)
    .set({ rotaId: null })
    .where(eq(schema.transportePassageiros.id, passageiroId));
  revalidatePath('/transporte');
  revalidatePath('/admin/config/transporte');
  return { ok: true };
}

export async function adicionarPassageiro(data: { filialId: string; rotaId?: string; nome: string; chapa?: string; cidade?: string }) {
  await requireTransporte();
  const [p] = await db.insert(schema.transportePassageiros).values(data).returning();
  revalidatePath('/transporte');
  revalidatePath('/admin/config/transporte');
  return p;
}

export async function removerPassageiro(id: string) {
  await requireTransporte();
  await db.update(schema.transportePassageiros)
    .set({ ativo: false })
    .where(eq(schema.transportePassageiros.id, id));
  revalidatePath('/transporte');
  revalidatePath('/admin/config/transporte');
  return { ok: true };
}

export async function listarTodosPassageiros(filialIdParam?: string) {
  const s = await requireTransporte();
  const filialId = getFilialId(s, filialIdParam);
  return db
    .select()
    .from(schema.transportePassageiros)
    .where(and(
      eq(schema.transportePassageiros.filialId, filialId),
      eq(schema.transportePassageiros.ativo, true),
    ))
    .orderBy(asc(schema.transportePassageiros.nome));
}

// ─── Chamada diária ──────────────────────────────────────────

export async function obterChamada(rotaId: string, data: string) {
  const s = await requireTransporte();

  const passageiros = await db
    .select()
    .from(schema.transportePassageiros)
    .where(and(
      eq(schema.transportePassageiros.rotaId, rotaId),
      eq(schema.transportePassageiros.ativo, true),
    ))
    .orderBy(asc(schema.transportePassageiros.nome));

  const registros = await db
    .select()
    .from(schema.transporteChamada)
    .where(and(
      eq(schema.transporteChamada.rotaId, rotaId),
      eq(schema.transporteChamada.data, data),
    ));

  const chamadaMap = new Map(registros.map(r => [r.passageiroId, r]));

  return passageiros.map(p => ({
    passageiroId: p.id,
    nome: p.nome,
    chapa: p.chapa,
    presente: chamadaMap.get(p.id)?.presente ?? null,
    observacao: chamadaMap.get(p.id)?.observacao ?? null,
  }));
}

export async function salvarChamada(
  rotaId: string,
  data: string,
  registros: { passageiroId: string; presente: boolean; observacao?: string }[],
) {
  await requireTransporte();

  for (const r of registros) {
    await db.execute(sql`
      INSERT INTO transporte_chamada (passageiro_id, rota_id, data, presente, observacao)
      VALUES (${r.passageiroId}, ${rotaId}, ${data}, ${r.presente}, ${r.observacao ?? null})
      ON CONFLICT (passageiro_id, rota_id, data)
      DO UPDATE SET presente = ${r.presente}, observacao = ${r.observacao ?? null}
    `);
  }

  revalidatePath('/transporte');
  revalidatePath('/transporte/chamada');
  return { ok: true };
}

// ─── Stats ───────────────────────────────────────────────────

export async function statsTransporte(filialIdParam?: string) {
  const s = await requireTransporte();
  const filialId = getFilialId(s, filialIdParam);

  const rotas = await listarRotas(filialIdParam);
  const ativas = rotas.filter(r => r.ativo);

  const totalLugares = ativas.reduce((sum, r) => sum + r.lugares, 0);
  const totalPassageiros = ativas.reduce((sum, r) => sum + r.passageiros, 0);

  return {
    totalRotas: ativas.length,
    totalLugares,
    totalPassageiros,
    ocupacao: totalLugares > 0 ? Math.round((totalPassageiros / totalLugares) * 100) : 0,
    porTurno: {
      '1º Turno': {
        rotas: ativas.filter(r => r.turno === '1º Turno').length,
        lugares: ativas.filter(r => r.turno === '1º Turno').reduce((s, r) => s + r.lugares, 0),
        passageiros: ativas.filter(r => r.turno === '1º Turno').reduce((s, r) => s + r.passageiros, 0),
      },
      '2º Turno': {
        rotas: ativas.filter(r => r.turno === '2º Turno').length,
        lugares: ativas.filter(r => r.turno === '2º Turno').reduce((s, r) => s + r.lugares, 0),
        passageiros: ativas.filter(r => r.turno === '2º Turno').reduce((s, r) => s + r.passageiros, 0),
      },
    },
  };
}
