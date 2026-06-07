'use server';

import { revalidatePath } from 'next/cache';
import { and, desc, eq, ilike, or } from 'drizzle-orm';
import { db, schema } from '@/db/client';
import { requireSession } from '@/lib/auth/session';
import { checkRateLimit } from '@/lib/auth/rate-limit';
import { atualizarStatusSchema, entrevistaInputSchema, type EntrevistaInput } from '@/lib/validators';

export async function listarEntrevistasFilial(filtroStatus?: string) {
  const s = await requireSession('filial');
  const where = filtroStatus
    ? and(eq(schema.entrevistas.filialId, s.filialId), eq(schema.entrevistas.status, filtroStatus))
    : eq(schema.entrevistas.filialId, s.filialId);
  return db.select().from(schema.entrevistas).where(where).orderBy(desc(schema.entrevistas.dataHora)).limit(500);
}

// Projeção enxuta usada pelas páginas de listagem (painel/agenda/histórico/banco-talentos).
// Evita transferir os JSONB pesados (`respostasRoteiro`, `notasCriterios`) e o texto longo de
// `experiencias` em cada navegação — esses só são necessários no detalhe da entrevista.
export async function listarEntrevistasFilialSlim(filtroStatus?: string) {
  const s = await requireSession('filial');
  const where = filtroStatus
    ? and(eq(schema.entrevistas.filialId, s.filialId), eq(schema.entrevistas.status, filtroStatus))
    : eq(schema.entrevistas.filialId, s.filialId);
  return db
    .select({
      id: schema.entrevistas.id,
      filialId: schema.entrevistas.filialId,
      dataHora: schema.entrevistas.dataHora,
      cpf: schema.entrevistas.cpf,
      nome: schema.entrevistas.nome,
      email: schema.entrevistas.email,
      telefone: schema.entrevistas.telefone,
      cidade: schema.entrevistas.cidade,
      cargoPretendido: schema.entrevistas.cargoPretendido,
      status: schema.entrevistas.status,
      dataRetorno: schema.entrevistas.dataRetorno,
      recrutador: schema.entrevistas.recrutador,
      gestorAprovador: schema.entrevistas.gestorAprovador,
      decisaoEm: schema.entrevistas.decisaoEm,
      decisaoPor: schema.entrevistas.decisaoPor,
      motivoDecisao: schema.entrevistas.motivoDecisao,
      aprovadoPeloGg: schema.entrevistas.aprovadoPeloGg,
      notaGeral: schema.entrevistas.notaGeral,
    })
    .from(schema.entrevistas)
    .where(where)
    .orderBy(desc(schema.entrevistas.dataHora))
    .limit(500);
}

// Variante para a tela de comparar: filtra por cargo no SQL e traz só os 6 mais recentes,
// com as colunas necessárias para a tabela comparativa (inclui notasCriterios — único caso
// em que o JSONB realmente é usado pela listagem).
export async function listarPorCargoFilial(cargo: string, limite = 6) {
  const s = await requireSession('filial');
  return db
    .select({
      id: schema.entrevistas.id,
      dataHora: schema.entrevistas.dataHora,
      nome: schema.entrevistas.nome,
      cargoPretendido: schema.entrevistas.cargoPretendido,
      status: schema.entrevistas.status,
      cidade: schema.entrevistas.cidade,
      escolaridade: schema.entrevistas.escolaridade,
      possuiCnh: schema.entrevistas.possuiCnh,
      pretensaoSalarial: schema.entrevistas.pretensaoSalarial,
      disponibilidadeTurnos: schema.entrevistas.disponibilidadeTurnos,
      aprovadoPeloGg: schema.entrevistas.aprovadoPeloGg,
      recrutador: schema.entrevistas.recrutador,
      gestorAprovador: schema.entrevistas.gestorAprovador,
      notasCriterios: schema.entrevistas.notasCriterios,
    })
    .from(schema.entrevistas)
    .where(and(eq(schema.entrevistas.filialId, s.filialId), eq(schema.entrevistas.cargoPretendido, cargo)))
    .orderBy(desc(schema.entrevistas.dataHora))
    .limit(limite);
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

  const usuarioLabel = `filial:${s.filialCodigo}`;
  const isDecisaoFinal = parsed.status === 'Aprovado' || parsed.status === 'Reprovado';

  // Para updates, precisamos saber o status anterior para decidir se gravamos decisaoEm
  let statusAnterior: string | null = null;
  let decisaoEmAtual: Date | null = null;
  if (idExistente) {
    const prev = await db.select({ status: schema.entrevistas.status, decisaoEm: schema.entrevistas.decisaoEm })
      .from(schema.entrevistas)
      .where(and(eq(schema.entrevistas.id, idExistente), eq(schema.entrevistas.filialId, s.filialId)))
      .limit(1);
    statusAnterior = prev[0]?.status ?? null;
    decisaoEmAtual = prev[0]?.decisaoEm ?? null;
  }

  // Calcula decisaoEm:
  // - Se virou Aprovado/Reprovado e ainda não tinha → agora
  // - Se já era Aprovado/Reprovado → mantém a data original
  // - Se não é decisão final → null
  let decisaoEm: Date | null = null;
  let decisaoPor: string | null = null;
  if (isDecisaoFinal) {
    if (decisaoEmAtual && (statusAnterior === 'Aprovado' || statusAnterior === 'Reprovado')) {
      decisaoEm = decisaoEmAtual;
      // mantém decisaoPor existente (não sobrescreve)
    } else {
      decisaoEm = new Date();
      decisaoPor = usuarioLabel;
    }
  }

  const baseSemConsentimento = {
    filialId: s.filialId,
    cpf: parsed.cpf,
    nome: parsed.nome,
    dataNasc: parsed.dataNasc || null,
    telefone: parsed.telefone || null,
    email: parsed.email || null,
    cidade: parsed.cidade || null,
    cargoPretendido: parsed.cargoPretendido || null,
    pretensaoSalarial: parsed.pretensaoSalarial != null ? String(parsed.pretensaoSalarial) : null,
    experiencias: parsed.experiencias || null,
    escolaridade: parsed.escolaridade || null,
    estadoCivil: parsed.estadoCivil || null,
    temFilhos: parsed.temFilhos ?? null,
    possuiCnh: parsed.possuiCnh || null,
    veiculoProprio: parsed.veiculoProprio ?? null,
    disponibilidadeTurnos: parsed.disponibilidadeTurnos ?? null,
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
    dataRetorno: parsed.dataRetorno || null,
    recrutador: parsed.recrutador || s.filialCodigo,
    gestorAprovador: parsed.gestorAprovador || null,
    aprovadoPeloGg: parsed.aprovadoPeloGg ?? false,
    decisaoEm,
    decisaoPor: decisaoPor ?? (isDecisaoFinal && idExistente ? undefined : null),
    atualizadoPor: usuarioLabel,
  };

  // Remove decisaoPor undefined para não sobrescrever em update
  const baseFinal = { ...baseSemConsentimento };
  if (baseFinal.decisaoPor === undefined) {
    delete (baseFinal as { decisaoPor?: string | null }).decisaoPor;
  }

  if (idExistente) {
    await db.update(schema.entrevistas).set(baseFinal)
      .where(and(eq(schema.entrevistas.id, idExistente), eq(schema.entrevistas.filialId, s.filialId)));
    if (statusAnterior && statusAnterior !== baseFinal.status) {
      await db.insert(schema.logHistorico).values({
        entrevistaId: idExistente, deStatus: statusAnterior, paraStatus: baseFinal.status,
        usuario: usuarioLabel, motivo: parsed.motivoDecisao ?? null,
      });
    }
    revalidatePath('/painel');
    revalidatePath('/historico');
    revalidatePath('/banco-talentos');
    return { id: idExistente };
  }

  const base = { ...baseFinal, consentimentoLgpdEm: new Date() };
  const [row] = await db.insert(schema.entrevistas).values(base).returning({ id: schema.entrevistas.id });
  if (!row) throw new Error('Falha ao salvar');
  await db.insert(schema.logHistorico).values({
    entrevistaId: row.id, deStatus: null, paraStatus: base.status,
    usuario: usuarioLabel, motivo: 'criação',
  });
  revalidatePath('/painel');
  revalidatePath('/historico');
  revalidatePath('/banco-talentos');
  return { id: row.id };
}

/**
 * Atualiza APENAS os campos de decisão/status de uma entrevista.
 * Usado pelo histórico — preserva todos os demais dados.
 * Regras:
 *  - Se status virou Aprovado/Reprovado e gestorAprovador vazio → erro
 *  - decisaoEm é gravado quando o status passa para Aprovado/Reprovado
 *    (preserva data original se já estava nesse estado)
 */
export async function atualizarDecisao(input: {
  entrevistaId: string;
  status: string;
  gestorAprovador?: string;
  motivoDecisao?: string;
  dataRetorno?: string;
  aprovadoPeloGg?: boolean;
}) {
  const s = await requireSession('filial');
  const { entrevistaId, status: novoStatus } = input;
  const isDecisaoFinal = novoStatus === 'Aprovado' || novoStatus === 'Reprovado';

  if (isDecisaoFinal && (!input.gestorAprovador || input.gestorAprovador.trim().length < 2)) {
    throw new Error('Informe o gestor que aprovou/reprovou');
  }

  const prev = await db.select({
    status: schema.entrevistas.status,
    decisaoEm: schema.entrevistas.decisaoEm,
    decisaoPor: schema.entrevistas.decisaoPor,
  })
    .from(schema.entrevistas)
    .where(and(eq(schema.entrevistas.id, entrevistaId), eq(schema.entrevistas.filialId, s.filialId)))
    .limit(1);

  const atual = prev[0];
  if (!atual) throw new Error('Entrevista não encontrada');

  const usuarioLabel = `filial:${s.filialCodigo}`;

  // Calcula decisaoEm / decisaoPor
  let decisaoEm: Date | null;
  let decisaoPor: string | null;
  if (isDecisaoFinal) {
    const jaTinhaDecisao = atual.status === 'Aprovado' || atual.status === 'Reprovado';
    decisaoEm = jaTinhaDecisao && atual.decisaoEm ? atual.decisaoEm : new Date();
    decisaoPor = jaTinhaDecisao ? (atual.decisaoPor ?? usuarioLabel) : usuarioLabel;
  } else {
    // Status não-final → limpa decisão
    decisaoEm = null;
    decisaoPor = null;
  }

  await db.update(schema.entrevistas).set({
    status: novoStatus,
    gestorAprovador: input.gestorAprovador?.trim() || null,
    motivoDecisao: input.motivoDecisao?.trim() || null,
    dataRetorno: input.dataRetorno || null,
    aprovadoPeloGg: input.aprovadoPeloGg ?? false,
    decisaoEm,
    decisaoPor,
    atualizadoPor: usuarioLabel,
  }).where(and(eq(schema.entrevistas.id, entrevistaId), eq(schema.entrevistas.filialId, s.filialId)));

  if (atual.status !== novoStatus) {
    await db.insert(schema.logHistorico).values({
      entrevistaId,
      deStatus: atual.status,
      paraStatus: novoStatus,
      usuario: usuarioLabel,
      motivo: input.motivoDecisao?.trim() || null,
    });
  }

  revalidatePath('/painel');
  revalidatePath('/historico');
  revalidatePath('/banco-talentos');
  revalidatePath(`/entrevista/${entrevistaId}`);
  return { ok: true };
}

/** Busca entrevistas com mesmo CPF (na mesma filial), para alerta de duplicata. */
export async function listarPorCpfMesmaFilial(cpf: string, excluirId?: string) {
  const s = await requireSession('filial');
  const digits = cpf.replace(/\D/g, '');
  if (digits.length !== 11) return [];
  const rows = await db.select({
    id: schema.entrevistas.id,
    nome: schema.entrevistas.nome,
    status: schema.entrevistas.status,
    cargoPretendido: schema.entrevistas.cargoPretendido,
    dataHora: schema.entrevistas.dataHora,
  })
    .from(schema.entrevistas)
    .where(and(eq(schema.entrevistas.cpf, digits), eq(schema.entrevistas.filialId, s.filialId)))
    .orderBy(desc(schema.entrevistas.dataHora))
    .limit(20);
  return excluirId ? rows.filter((r) => r.id !== excluirId) : rows;
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

function escapeLike(s: string) {
  return s.replace(/[\\%_]/g, (c) => `\\${c}`);
}

export async function buscaGlobal(termo: string) {
  const s = await requireSession('admin');
  // Rate-limit por admin: 60 buscas/min — barra scraping sem atrapalhar uso normal.
  const rl = await checkRateLimit(`busca:${s.usuario}`, 60, 60_000);
  if (!rl.ok) throw new Error('Muitas buscas em sequência. Aguarde um instante.');
  const q = termo.trim();
  if (q.length < 2) return [];
  const digits = q.replace(/\D/g, '');
  const like = `%${escapeLike(q)}%`;
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
      ilike(schema.entrevistas.nome, like),
      ilike(schema.entrevistas.email, like),
      digits.length >= 3 ? ilike(schema.entrevistas.cpf, `%${escapeLike(digits)}%`) : undefined,
    ))
    .orderBy(desc(schema.entrevistas.dataHora))
    .limit(50);
}
