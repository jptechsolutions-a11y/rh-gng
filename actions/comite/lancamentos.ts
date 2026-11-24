'use server';

import { revalidatePath } from 'next/cache';
import { and, eq, inArray } from 'drizzle-orm';
import { db, schema } from '@/db/client';
import { requireSession } from '@/lib/auth/session';
import { filiaisPermitidas, nomeUsuario } from '@/lib/comite/acesso';
import { historicoDaChapa } from '@/lib/comite/buscar';
import { mesAtual, mesValido, type ColaboradorComite, type ComiteInput, type PedidoAnterior } from '@/lib/comite/tipos';
import { candidatosChapa } from '@/lib/pesquisas/tipos';
import { normalizarCodigoFilial } from '@/lib/vagas/normalizar-codigo-filial';

type Res<T = unknown> = ({ ok: true } & T) | { ok: false; erro: string };

/** Acha o colaborador ativo no QLP e confere se ele é da filial escolhida (e se a sessão pode usar essa filial). */
async function resolverColaborador(
  filialCodigo: string,
  chapaDigitada: string,
  permitidas: { codigo: string }[],
): Promise<{ ok: true; c: ColaboradorComite } | { ok: false; erro: string }> {
  const filial = normalizarCodigoFilial(filialCodigo);
  if (!permitidas.some((f) => f.codigo === filial)) return { ok: false, erro: 'você não tem acesso a essa filial' };
  const cands = candidatosChapa(chapaDigitada);
  if (cands.length === 0) return { ok: false, erro: 'informe a matrícula' };
  const [r] = await db
    .select({
      chapa: schema.qlpColaboradores.chapa,
      nome: schema.qlpColaboradores.nome,
      funcao: schema.qlpColaboradores.funcao,
      secao: schema.qlpColaboradores.secao,
      codfilial: schema.qlpColaboradores.codfilial,
      admissao: schema.qlpColaboradores.dtAdmissao,
      idade: schema.qlpColaboradores.idade,
      horario: schema.qlpColaboradores.horario,
    })
    .from(schema.qlpColaboradores)
    .where(and(inArray(schema.qlpColaboradores.chapa, cands), eq(schema.qlpColaboradores.ativo, true)))
    .limit(1);
  if (!r) return { ok: false, erro: 'matrícula não encontrada entre os colaboradores ativos (QLP)' };
  const dele = normalizarCodigoFilial(String(r.codfilial));
  if (dele !== filial) return { ok: false, erro: `essa matrícula pertence à filial ${dele}, não à ${filial}` };
  return { ok: true, c: { chapa: r.chapa, nome: r.nome, funcao: r.funcao, secao: r.secao, filialCodigo: dele, admissao: r.admissao, idade: r.idade, horario: r.horario } };
}

/** Preenche o formulário: dados do colaborador pela matrícula + aviso se já está lançado no mês. */
export async function buscarColaboradorComite(
  filialCodigo: string,
  chapa: string,
  mes?: string,
): Promise<Res<{ colaborador: ColaboradorComite; jaLancado: { id: string; mes: string } | null; historico: PedidoAnterior[] }>> {
  try {
    const s = await requireSession();
    const r = await resolverColaborador(filialCodigo, chapa, await filiaisPermitidas(s));
    if (!r.ok) return r;
    let jaLancado: { id: string; mes: string } | null = null;
    if (mes && mesValido(mes)) {
      const [l] = await db
        .select({ id: schema.comiteDesligamentos.id })
        .from(schema.comiteDesligamentos)
        .where(and(eq(schema.comiteDesligamentos.chapa, r.c.chapa), eq(schema.comiteDesligamentos.mesReferencia, `${mes}-01`)))
        .limit(1);
      if (l) jaLancado = { id: l.id, mes };
    }
    // Pedidos de meses anteriores que o comitê não aprovou (aviso no lançamento).
    const historico = await historicoDaChapa(r.c.chapa, mes && mesValido(mes) ? mes : mesAtual());
    return { ok: true, colaborador: r.c, jaLancado, historico };
  } catch (e) {
    return { ok: false, erro: e instanceof Error ? e.message : 'erro ao buscar' };
  }
}

function validar(i: ComiteInput): string | null {
  if (!mesValido(i.mes)) return 'informe o mês de referência';
  for (const n of [i.suspensoes, i.advertencias]) {
    if (!Number.isInteger(n) || n < 0 || n > 99) return 'quantidade de medidas inválida (0 a 99)';
  }
  if (i.idade != null && (!Number.isInteger(i.idade) || i.idade < 14 || i.idade > 90)) return 'idade inválida';
  const j = i.justificativa.trim();
  if (j.length < 5) return 'escreva a justificativa';
  if (j.length > 3000) return 'justificativa longa demais (máx. 3000 caracteres)';
  return null;
}

export async function criarLancamentoComite(i: ComiteInput): Promise<Res<{ id: string }>> {
  try {
    const s = await requireSession();
    const erro = validar(i);
    if (erro) return { ok: false, erro };
    const r = await resolverColaborador(i.filialCodigo, i.chapa, await filiaisPermitidas(s));
    if (!r.ok) return r;
    const [ex] = await db
      .select({ id: schema.comiteDesligamentos.id })
      .from(schema.comiteDesligamentos)
      .where(and(eq(schema.comiteDesligamentos.chapa, r.c.chapa), eq(schema.comiteDesligamentos.mesReferencia, `${i.mes}-01`)))
      .limit(1);
    if (ex) return { ok: false, erro: 'esse colaborador já foi lançado para esse mês — edite o lançamento existente' };
    const [novo] = await db
      .insert(schema.comiteDesligamentos)
      .values({
        filialCodigo: r.c.filialCodigo, chapa: r.c.chapa, nome: r.c.nome, funcao: r.c.funcao, secao: r.c.secao,
        dtAdmissao: r.c.admissao, idade: r.c.idade ?? i.idade ?? null, horario: r.c.horario, qtdSuspensoes: i.suspensoes, qtdAdvertencias: i.advertencias,
        mesReferencia: `${i.mes}-01`, justificativa: i.justificativa.trim(), criadoPor: nomeUsuario(s),
      })
      .returning({ id: schema.comiteDesligamentos.id });
    revalidatePath('/comite');
    revalidatePath('/comite/lancamentos');
    return { ok: true, id: novo!.id };
  } catch (e) {
    return { ok: false, erro: e instanceof Error ? e.message : 'erro ao salvar' };
  }
}

/** Edita medidas, mês e justificativa (a pessoa não muda — para outra pessoa, exclua e lance de novo). */
export async function editarLancamentoComite(id: string, i: Omit<ComiteInput, 'filialCodigo' | 'chapa'>): Promise<Res> {
  try {
    const s = await requireSession();
    const erro = validar({ ...i, filialCodigo: '', chapa: '' });
    if (erro) return { ok: false, erro };
    const [l] = await db.select().from(schema.comiteDesligamentos).where(eq(schema.comiteDesligamentos.id, id)).limit(1);
    if (!l || !(await filiaisPermitidas(s)).some((f) => f.codigo === l.filialCodigo)) return { ok: false, erro: 'lançamento não encontrado' };
    const dia1 = `${i.mes}-01`;
    if (dia1 !== l.mesReferencia) {
      const [dup] = await db
        .select({ id: schema.comiteDesligamentos.id })
        .from(schema.comiteDesligamentos)
        .where(and(eq(schema.comiteDesligamentos.chapa, l.chapa), eq(schema.comiteDesligamentos.mesReferencia, dia1)))
        .limit(1);
      if (dup) return { ok: false, erro: 'esse colaborador já tem lançamento nesse mês' };
    }
    await db
      .update(schema.comiteDesligamentos)
      .set({
        ...(i.idade != null ? { idade: i.idade } : {}),
        qtdSuspensoes: i.suspensoes, qtdAdvertencias: i.advertencias, mesReferencia: dia1,
        justificativa: i.justificativa.trim(), atualizadoPor: nomeUsuario(s), updatedAt: new Date(),
      })
      .where(eq(schema.comiteDesligamentos.id, id));
    revalidatePath('/comite');
    revalidatePath('/comite/lancamentos');
    return { ok: true };
  } catch (e) {
    return { ok: false, erro: e instanceof Error ? e.message : 'erro ao salvar' };
  }
}

export async function excluirLancamentoComite(id: string): Promise<Res> {
  try {
    const s = await requireSession();
    const [l] = await db.select().from(schema.comiteDesligamentos).where(eq(schema.comiteDesligamentos.id, id)).limit(1);
    if (!l || !(await filiaisPermitidas(s)).some((f) => f.codigo === l.filialCodigo)) return { ok: false, erro: 'lançamento não encontrado' };
    await db.delete(schema.comiteDesligamentos).where(eq(schema.comiteDesligamentos.id, id));
    revalidatePath('/comite');
    revalidatePath('/comite/lancamentos');
    return { ok: true };
  } catch (e) {
    return { ok: false, erro: e instanceof Error ? e.message : 'erro ao excluir' };
  }
}
