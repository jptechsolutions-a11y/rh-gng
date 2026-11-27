'use server';

import { revalidatePath } from 'next/cache';
import { eq } from 'drizzle-orm';
import { db, schema } from '@/db/client';
import { requireSession } from '@/lib/auth/session';
import { filiaisPermitidas, nomeUsuario } from '@/lib/comite/acesso';
import { resolverColaborador } from '@/lib/comite/resolver';
import { emAndamentoPorChapa } from '@/lib/uniformes/buscar';
import {
  ITENS_UNIFORME, MOTIVOS_UNIFORME, QUANTIDADES_UNIFORME, TAMANHOS_UNIFORME, exigeDevolucaoPadrao,
  type ColaboradorUniforme, type MotivoUniforme, type SolicitacaoUniforme,
} from '@/lib/uniformes/tipos';

type Res<T = unknown> = ({ ok: true } & T) | { ok: false; erro: string };

const REGEX_DATA = /^\d{4}-\d{2}-\d{2}$/;
const dataValida = (d: string) => REGEX_DATA.test(d) && !Number.isNaN(new Date(`${d}T00:00:00Z`).getTime());
const caminhos = () => { revalidatePath('/uniformes'); revalidatePath('/uniformes/solicitacoes'); };

export interface NovaSolicitacaoUniforme {
  filialCodigo: string;
  chapa: string;
  item: string;
  tamanho: string;
  quantidade: number;
  motivo: string;
  motivoOutro?: string;
}

/** Preenche o formulário: dados do colaborador pela matrícula + pedidos dele ainda em andamento. */
export async function buscarColaboradorUniforme(
  filialCodigo: string,
  chapa: string,
): Promise<Res<{ colaborador: ColaboradorUniforme; emAndamento: SolicitacaoUniforme[] }>> {
  try {
    const s = await requireSession();
    const permitidas = await filiaisPermitidas(s);
    const r = await resolverColaborador(filialCodigo, chapa, permitidas);
    if (!r.ok) return r;
    const filialNome = permitidas.find((f) => f.codigo === r.c.filialCodigo)?.nome ?? '';
    return {
      ok: true,
      colaborador: { chapa: r.c.chapa, nome: r.c.nome, funcao: r.c.funcao, secao: r.c.secao, filialCodigo: r.c.filialCodigo, filialNome },
      emAndamento: await emAndamentoPorChapa(r.c.chapa),
    };
  } catch (e) {
    return { ok: false, erro: e instanceof Error ? e.message : 'erro ao buscar' };
  }
}

export async function criarSolicitacaoUniforme(i: NovaSolicitacaoUniforme): Promise<Res<{ id: string }>> {
  try {
    const s = await requireSession();
    if (!(ITENS_UNIFORME as readonly string[]).includes(i.item)) return { ok: false, erro: 'escolha o item' };
    if (!(TAMANHOS_UNIFORME as readonly string[]).includes(i.tamanho)) return { ok: false, erro: 'escolha o tamanho' };
    if (!(QUANTIDADES_UNIFORME as readonly number[]).includes(i.quantidade)) return { ok: false, erro: 'quantidade inválida (1 ou 2)' };
    if (!MOTIVOS_UNIFORME.some((m) => m.valor === i.motivo)) return { ok: false, erro: 'escolha o motivo' };
    const outro = (i.motivoOutro ?? '').trim();
    if (i.motivo === 'outro' && outro.length < 3) return { ok: false, erro: 'descreva o motivo' };
    if (outro.length > 300) return { ok: false, erro: 'motivo longo demais (máx. 300 caracteres)' };

    const r = await resolverColaborador(i.filialCodigo, i.chapa, await filiaisPermitidas(s));
    if (!r.ok) return r;

    const repetido = (await emAndamentoPorChapa(r.c.chapa)).find((p) => p.item === i.item);
    if (repetido) return { ok: false, erro: 'já existe um pedido em andamento desse item para esse colaborador' };

    const [novo] = await db
      .insert(schema.uniformesSolicitacoes)
      .values({
        solicitanteNome: nomeUsuario(s),
        solicitanteUsuario: s.perfil === 'filial' ? `filial.${s.filialCodigo}` : s.usuario,
        solicitantePerfil: s.perfil,
        filialCodigo: r.c.filialCodigo,
        chapa: r.c.chapa,
        colaboradorNome: r.c.nome,
        funcao: r.c.funcao,
        secao: r.c.secao,
        item: i.item,
        tamanho: i.tamanho,
        quantidade: i.quantidade,
        motivo: i.motivo,
        motivoOutro: i.motivo === 'outro' ? outro : null,
        exigeDevolucao: exigeDevolucaoPadrao(i.motivo as MotivoUniforme),
      })
      .returning({ id: schema.uniformesSolicitacoes.id });
    caminhos();
    return { ok: true, id: novo!.id };
  } catch (e) {
    return { ok: false, erro: e instanceof Error ? e.message : 'erro ao salvar' };
  }
}

// ---------------------------------------------------------------------------
// Gestão (só admin = Gente e Gestão)
// ---------------------------------------------------------------------------

async function admin() {
  const s = await requireSession();
  return s.perfil === 'admin' ? s : null;
}

async function carregar(id: string) {
  const [l] = await db.select().from(schema.uniformesSolicitacoes).where(eq(schema.uniformesSolicitacoes.id, id)).limit(1);
  return l ?? null;
}

async function atualizar(id: string, set: Partial<typeof schema.uniformesSolicitacoes.$inferInsert>) {
  await db.update(schema.uniformesSolicitacoes).set({ ...set, updatedAt: new Date() }).where(eq(schema.uniformesSolicitacoes.id, id));
  caminhos();
}

const SEM_PERMISSAO: Res = { ok: false, erro: 'só o Gente e Gestão (administrador) pode fazer isso' };

export async function aprovarUniforme(id: string): Promise<Res> {
  try {
    const s = await admin();
    if (!s) return SEM_PERMISSAO;
    const l = await carregar(id);
    if (!l) return { ok: false, erro: 'solicitação não encontrada' };
    if (l.status !== 'solicitado') return { ok: false, erro: 'só dá para aprovar um pedido que está como “Solicitado”' };
    await atualizar(id, { status: 'aprovado', decididoPor: nomeUsuario(s), decididoEm: new Date(), motivoRecusa: null });
    return { ok: true };
  } catch (e) {
    return { ok: false, erro: e instanceof Error ? e.message : 'erro' };
  }
}

export async function recusarUniforme(id: string, motivo: string): Promise<Res> {
  try {
    const s = await admin();
    if (!s) return SEM_PERMISSAO;
    const m = motivo.trim();
    if (m.length < 3) return { ok: false, erro: 'informe o motivo da recusa' };
    if (m.length > 500) return { ok: false, erro: 'motivo longo demais (máx. 500 caracteres)' };
    const l = await carregar(id);
    if (!l) return { ok: false, erro: 'solicitação não encontrada' };
    if (l.status !== 'solicitado') return { ok: false, erro: 'só dá para recusar um pedido que está como “Solicitado”' };
    await atualizar(id, { status: 'recusado', motivoRecusa: m, decididoPor: nomeUsuario(s), decididoEm: new Date() });
    return { ok: true };
  } catch (e) {
    return { ok: false, erro: e instanceof Error ? e.message : 'erro' };
  }
}

export async function marcarProntoUniforme(id: string): Promise<Res> {
  try {
    const s = await admin();
    if (!s) return SEM_PERMISSAO;
    const l = await carregar(id);
    if (!l) return { ok: false, erro: 'solicitação não encontrada' };
    if (l.status !== 'aprovado') return { ok: false, erro: 'o pedido precisa estar aprovado' };
    await atualizar(id, { status: 'pronto', prontoEm: new Date() });
    return { ok: true };
  } catch (e) {
    return { ok: false, erro: e instanceof Error ? e.message : 'erro' };
  }
}

export async function entregarUniforme(id: string, dataEntrega: string): Promise<Res> {
  try {
    const s = await admin();
    if (!s) return SEM_PERMISSAO;
    if (!dataValida(dataEntrega)) return { ok: false, erro: 'informe a data da entrega' };
    const l = await carregar(id);
    if (!l) return { ok: false, erro: 'solicitação não encontrada' };
    if (l.status !== 'aprovado' && l.status !== 'pronto') return { ok: false, erro: 'o pedido precisa estar aprovado ou pronto para retirar' };
    await atualizar(id, { status: 'entregue', dataEntrega, entreguePor: nomeUsuario(s), prontoEm: l.prontoEm ?? new Date() });
    return { ok: true };
  } catch (e) {
    return { ok: false, erro: e instanceof Error ? e.message : 'erro' };
  }
}

/** Volta uma etapa (corrige clique errado): entregue→pronto, pronto→aprovado, aprovado/recusado→solicitado. */
export async function voltarEtapaUniforme(id: string): Promise<Res> {
  try {
    const s = await admin();
    if (!s) return SEM_PERMISSAO;
    const l = await carregar(id);
    if (!l) return { ok: false, erro: 'solicitação não encontrada' };
    switch (l.status) {
      case 'entregue': await atualizar(id, { status: 'pronto', dataEntrega: null, entreguePor: null }); break;
      case 'pronto': await atualizar(id, { status: 'aprovado', prontoEm: null }); break;
      case 'aprovado':
      case 'recusado': await atualizar(id, { status: 'solicitado', decididoPor: null, decididoEm: null, motivoRecusa: null }); break;
      default: return { ok: false, erro: 'o pedido já está na primeira etapa' };
    }
    return { ok: true };
  } catch (e) {
    return { ok: false, erro: e instanceof Error ? e.message : 'erro' };
  }
}

/** Registra (ou desfaz, com `data = null`) a devolução do uniforme antigo. */
export async function registrarDevolucaoUniforme(id: string, data: string | null, obs?: string): Promise<Res> {
  try {
    const s = await admin();
    if (!s) return SEM_PERMISSAO;
    if (data !== null && !dataValida(data)) return { ok: false, erro: 'informe a data da devolução' };
    const l = await carregar(id);
    if (!l) return { ok: false, erro: 'solicitação não encontrada' };
    await atualizar(id, { devolvidoEm: data, devolucaoObs: data ? (obs ?? '').trim().slice(0, 300) || null : null });
    return { ok: true };
  } catch (e) {
    return { ok: false, erro: e instanceof Error ? e.message : 'erro' };
  }
}

/** O Gente e Gestão decide, pedido a pedido, se o uniforme antigo precisa ser devolvido. */
export async function definirExigeDevolucaoUniforme(id: string, exige: boolean): Promise<Res> {
  try {
    const s = await admin();
    if (!s) return SEM_PERMISSAO;
    const l = await carregar(id);
    if (!l) return { ok: false, erro: 'solicitação não encontrada' };
    await atualizar(id, { exigeDevolucao: exige, ...(exige ? {} : { devolvidoEm: null, devolucaoObs: null }) });
    return { ok: true };
  } catch (e) {
    return { ok: false, erro: e instanceof Error ? e.message : 'erro' };
  }
}
