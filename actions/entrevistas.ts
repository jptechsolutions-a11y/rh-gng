'use server';

import { revalidatePath } from 'next/cache';
import { and, desc, eq, ilike, or } from 'drizzle-orm';
import { db, schema } from '@/db/client';
import { requireSession } from '@/lib/auth/session';
import { atualizarStatusSchema, entrevistaInputSchema, type EntrevistaInput } from '@/lib/validators';

export async function listarEntrevistasFilial(filtroStatus?: string) {
  const s = await requireSession('filial');
  const where = filtroStatus
    ? and(eq(schema.entrevistas.filialId, s.filialId), eq(schema.entrevistas.status, filtroStatus))
    : eq(schema.entrevistas.filialId, s.filialId);
  return db.select().from(schema.entrevistas).where(where).orderBy(desc(schema.entrevistas.dataHora)).limit(500);
}

export async function buscarPorCpf(cpf: string) {
  const s = await requireSession();
  const digits = cpf.replace(/\D/g, '');
  if (digits.length !== 11) return null;
  const filialFilter = s.perfil === 'filial' ? eq(schema.entrevistas.filialId, s.filialId) : undefined;
  const where = filialFilter ? and(eq(schema.entrevistas.cpf, digits), filialFilter) : eq(schema.entrevistas.cpf, digits);
  const rows = await db.select().from(schema.entrevistas).where(where).orderBy(desc(schema.entrevistas.dataHora)).limit(10);
  return rows;
}

export async function getEntrevista(id: string) {
  const s = await requireSession();
  const where = s.perfil === 'filial'
    ? and(eq(schema.entrevistas.id, id), eq(schema.entrevistas.filialId, s.filialId))
    : eq(schema.entrevistas.id, id);
  const rows = await db.select().from(schema.entrevistas).where(where).limit(1);
  return rows[0] ?? null;
}

export async function salvarEntrevista(input: EntrevistaInput, idExistente?: string) {
  const s = await requireSession('filial');
  const parsed = entrevistaInputSchema.parse(input);

  const base = {
    filialId: s.filialId,
    cpf: parsed.cpf,
    nome: parsed.nome,
    dataNasc: parsed.dataNasc || null,
    rg: parsed.rg || null,
    telefone: parsed.telefone || null,
    email: parsed.email || null,
    cidade: parsed.cidade || null,
    cargoPretendido: parsed.cargoPretendido || null,
    pretensaoSalarial: parsed.pretensaoSalarial != null ? String(parsed.pretensaoSalarial) : null,
    experiencias: parsed.experiencias || null,
    linkedin: parsed.linkedin || null,
    escolaridade: parsed.escolaridade || null,
    estadoCivil: parsed.estadoCivil || null,
    temFilhos: parsed.temFilhos ?? null,
    possuiCnh: parsed.possuiCnh || null,
    veiculoProprio: parsed.veiculoProprio ?? null,
    disponibilidadeTurnos: parsed.disponibilidadeTurnos ?? null,
    disponibilidadeInicio: parsed.disponibilidadeInicio || null,
    disponibilidadeViagem: parsed.disponibilidadeViagem ?? null,
    pcd: parsed.pcd ?? null,
    pcdTipo: parsed.pcdTipo || null,
    indicacao: parsed.indicacao ?? null,
    indicadoPorNome: parsed.indicadoPorNome || null,
    indicadoPorCargo: parsed.indicadoPorCargo || null,
    fumante: parsed.fumante ?? null,
    jaTrabalhouGrupo: parsed.jaTrabalhouGrupo ?? null,
    jaTrabalhouQuando: parsed.jaTrabalhouQuando || null,
    respostasRoteiro: parsed.respostasRoteiro ?? {},
    notasCriterios: parsed.notasCriterios ?? {},
    observacoes: parsed.observacoes || null,
    notaGeral: parsed.notaGeral != null ? String(parsed.notaGeral) : null,
    status: parsed.status || 'Em análise',
    motivoDecisao: parsed.motivoDecisao || null,
    proximaEtapa: parsed.proximaEtapa || null,
    dataRetorno: parsed.dataRetorno || null,
    recrutador: parsed.recrutador || s.filialCodigo,
    consentimentoLgpdEm: new Date(),
    atualizadoPor: `filial:${s.filialCodigo}`,
  };

  if (idExistente) {
    await db.update(schema.entrevistas).set(base)
      .where(and(eq(schema.entrevistas.id, idExistente), eq(schema.entrevistas.filialId, s.filialId)));
    revalidatePath('/painel');
    revalidatePath('/banco-talentos');
    return { id: idExistente };
  }

  const [row] = await db.insert(schema.entrevistas).values(base).returning({ id: schema.entrevistas.id });
  if (!row) throw new Error('Falha ao salvar');
  await db.insert(schema.logHistorico).values({
    entrevistaId: row.id, deStatus: null, paraStatus: base.status,
    usuario: `filial:${s.filialCodigo}`, motivo: 'criação',
  });
  revalidatePath('/painel');
  revalidatePath('/banco-talentos');
  return { id: row.id };
}

export async function atualizarStatus(input: { entrevistaId: string; novoStatus: string; motivo?: string }) {
  const s = await requireSession();
  const parsed = atualizarStatusSchema.parse(input);

  const where = s.perfil === 'filial'
    ? and(eq(schema.entrevistas.id, parsed.entrevistaId), eq(schema.entrevistas.filialId, s.filialId))
    : eq(schema.entrevistas.id, parsed.entrevistaId);

  const rows = await db.select({ status: schema.entrevistas.status }).from(schema.entrevistas).where(where).limit(1);
  const atual = rows[0];
  if (!atual) throw new Error('Entrevista não encontrada');
  if (atual.status === parsed.novoStatus) return { ok: true };

  const usuario = s.perfil === 'filial' ? `filial:${s.filialCodigo}` : `admin:${s.usuario}`;

  await db.update(schema.entrevistas)
    .set({ status: parsed.novoStatus, motivoDecisao: parsed.motivo ?? null, atualizadoPor: usuario })
    .where(where);

  await db.insert(schema.logHistorico).values({
    entrevistaId: parsed.entrevistaId,
    deStatus: atual.status, paraStatus: parsed.novoStatus,
    usuario, motivo: parsed.motivo,
  });

  revalidatePath('/painel');
  revalidatePath('/admin');
  return { ok: true };
}

export async function buscaGlobal(termo: string) {
  await requireSession('admin');
  const q = termo.trim();
  if (q.length < 2) return [];
  const digits = q.replace(/\D/g, '');
  return db.select({
    id: schema.entrevistas.id,
    nome: schema.entrevistas.nome,
    cpf: schema.entrevistas.cpf,
    email: schema.entrevistas.email,
    status: schema.entrevistas.status,
    filialId: schema.entrevistas.filialId,
    dataHora: schema.entrevistas.dataHora,
  })
    .from(schema.entrevistas)
    .where(or(
      ilike(schema.entrevistas.nome, `%${q}%`),
      ilike(schema.entrevistas.email, `%${q}%`),
      digits.length >= 3 ? ilike(schema.entrevistas.cpf, `%${digits}%`) : undefined,
    ))
    .orderBy(desc(schema.entrevistas.dataHora))
    .limit(50);
}
