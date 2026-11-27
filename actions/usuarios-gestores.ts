'use server';

import { revalidatePath } from 'next/cache';
import { and, eq, inArray } from 'drizzle-orm';
import { db, schema } from '@/db/client';
import { requireSession } from '@/lib/auth/session';
import { hashPassword } from '@/lib/auth/password';
import { TIERS_GESTOR, atribuirUsuarios, senhaGestor, usuarioBase } from '@/lib/uniformes/gestores';

export interface PlanoGestor {
  chapa: string;
  nome: string;
  funcao: string;
  tier: string;
  codfilial: string;
  nacional: boolean;
  filiaisCodigos: string[];
  usuario: string;
  /** só para quem ainda não tem usuário */
  senha: string | null;
  situacao: 'novo' | 'existente' | 'sem_filial';
  /** o usuário ganhou número no fim porque o nome já estava em uso */
  repetido: boolean;
  /** quem já existe, mas cujas filiais mudaram no QLP */
  filiaisDesatualizadas: boolean;
}

export interface ResumoGestores {
  total: number;
  novos: number;
  existentes: number;
  repetidos: number;
  semFilial: number;
  filiaisDesatualizadas: number;
}

interface Calculo {
  itens: PlanoGestor[];
  /** id das filiais de cada chapa (para gravar) */
  filiaisIds: Map<string, string[]>;
  /** id do usuário de acesso de quem já existe */
  existentes: Map<string, { usuarioAcessoId: string; filiaisAtuais: string[] }>;
  colaboradorIds: Map<string, string>;
}

const mesmoConjunto = (a: string[], b: string[]) => a.length === b.length && a.every((x) => b.includes(x));

/** Calcula, sem gravar nada, quem ganha usuário de gestor, com que usuário/senha e quais filiais. */
async function calcular(): Promise<Calculo> {
  const [lideres, filiais, gestoresExistentes, admins, usuarios] = await Promise.all([
    db
      .select({
        tier: schema.qlpLideres.tier,
        nacional: schema.qlpLideres.escopoNacional,
        escopo: schema.qlpLideres.filiaisEscopo,
        colabId: schema.qlpColaboradores.id,
        chapa: schema.qlpColaboradores.chapa,
        nome: schema.qlpColaboradores.nome,
        funcao: schema.qlpColaboradores.funcao,
        codfilial: schema.qlpColaboradores.codfilial,
        filialId: schema.qlpColaboradores.filialId,
      })
      .from(schema.qlpLideres)
      .innerJoin(schema.qlpColaboradores, eq(schema.qlpColaboradores.id, schema.qlpLideres.colaboradorId))
      .where(and(
        eq(schema.qlpLideres.ativo, true),
        eq(schema.qlpColaboradores.ativo, true),
        inArray(schema.qlpLideres.tier, [...TIERS_GESTOR]),
      )),
    db.select({ id: schema.filiais.id, codigo: schema.filiais.codigo }).from(schema.filiais).where(eq(schema.filiais.ativa, true)),
    db
      .select({
        chapa: schema.usuariosGestores.chapa,
        usuarioAcessoId: schema.usuariosGestores.usuarioAcessoId,
        usuario: schema.usuariosAcesso.usuario,
      })
      .from(schema.usuariosGestores)
      .innerJoin(schema.usuariosAcesso, eq(schema.usuariosAcesso.id, schema.usuariosGestores.usuarioAcessoId)),
    db.select({ usuario: schema.admins.usuario }).from(schema.admins),
    db.select({ usuario: schema.usuariosAcesso.usuario }).from(schema.usuariosAcesso),
  ]);

  const codigoPorId = new Map(filiais.map((f) => [f.id, f.codigo]));
  const existentePorChapa = new Map(gestoresExistentes.map((g) => [g.chapa, g]));
  const ocupados = new Set([...admins, ...usuarios].map((u) => u.usuario.toLowerCase()));

  // Filiais atuais de quem já existe.
  const vinculos = gestoresExistentes.length
    ? await db
        .select({ id: schema.usuariosAcessoFiliais.usuarioAcessoId, filialId: schema.usuariosAcessoFiliais.filialId })
        .from(schema.usuariosAcessoFiliais)
        .where(inArray(schema.usuariosAcessoFiliais.usuarioAcessoId, gestoresExistentes.map((g) => g.usuarioAcessoId)))
    : [];
  const atuaisPorUsuario = new Map<string, string[]>();
  for (const v of vinculos) atuaisPorUsuario.set(v.id, [...(atuaisPorUsuario.get(v.id) ?? []), v.filialId]);

  // Ordem fixa (por matrícula) para o número dos repetidos não mudar entre a conferência e a geração.
  const ordenados = [...lideres].sort((a, b) => a.chapa.localeCompare(b.chapa, undefined, { numeric: true }));

  const filiaisIds = new Map<string, string[]>();
  const existentes: Calculo['existentes'] = new Map();
  const colaboradorIds = new Map<string, string>();
  const parciais: Omit<PlanoGestor, 'usuario' | 'repetido'>[] = [];

  for (const l of ordenados) {
    colaboradorIds.set(l.chapa, l.colabId);
    // Mesmas filiais do QLP: nacional vê todas; senão a lista do líder; sem lista, a própria filial dele.
    const lista = (Array.isArray(l.escopo) ? (l.escopo as string[]) : []).filter((id) => codigoPorId.has(id));
    const ids = l.nacional ? [] : lista.length ? lista : l.filialId && codigoPorId.has(l.filialId) ? [l.filialId] : [];
    filiaisIds.set(l.chapa, ids);
    const ex = existentePorChapa.get(l.chapa);
    const atuais = ex ? atuaisPorUsuario.get(ex.usuarioAcessoId) ?? [] : [];
    if (ex) existentes.set(l.chapa, { usuarioAcessoId: ex.usuarioAcessoId, filiaisAtuais: atuais });
    const semFilial = !l.nacional && ids.length === 0;
    parciais.push({
      chapa: l.chapa,
      nome: l.nome,
      funcao: l.funcao,
      tier: l.tier,
      codfilial: String(l.codfilial),
      nacional: l.nacional,
      filiaisCodigos: ids.map((id) => codigoPorId.get(id)!).sort((a, b) => a.localeCompare(b, undefined, { numeric: true })),
      senha: ex || semFilial ? null : senhaGestor(l.chapa, l.codfilial, l.nome),
      situacao: ex ? 'existente' : semFilial ? 'sem_filial' : 'novo',
      filiaisDesatualizadas: !!ex && !l.nacional && !mesmoConjunto(ids, atuais),
    });
  }

  // Usuário de quem é novo: primeiro.ultimo, com número se já estiver em uso.
  const novos = parciais.filter((p) => p.situacao === 'novo');
  const atribuidos = atribuirUsuarios(novos.map((p) => usuarioBase(p.nome)), ocupados);
  const porChapa = new Map(novos.map((p, i) => [p.chapa, atribuidos[i]!]));

  const itens: PlanoGestor[] = parciais.map((p) => {
    const ex = existentePorChapa.get(p.chapa);
    const a = porChapa.get(p.chapa);
    return { ...p, usuario: ex ? ex.usuario : a?.usuario ?? usuarioBase(p.nome), repetido: a?.repetido ?? false };
  });
  return { itens, filiaisIds, existentes, colaboradorIds };
}

function resumir(itens: PlanoGestor[]): ResumoGestores {
  return {
    total: itens.length,
    novos: itens.filter((i) => i.situacao === 'novo').length,
    existentes: itens.filter((i) => i.situacao === 'existente').length,
    repetidos: itens.filter((i) => i.repetido).length,
    semFilial: itens.filter((i) => i.situacao === 'sem_filial').length,
    filiaisDesatualizadas: itens.filter((i) => i.filiaisDesatualizadas).length,
  };
}

/** Conferência antes de gerar: quem ganha usuário, usuários repetidos, quem está sem filial. */
export async function conferirGestoresQlp(): Promise<{ ok: true; itens: PlanoGestor[]; resumo: ResumoGestores } | { ok: false; erro: string }> {
  try {
    await requireSession('admin');
    const { itens } = await calcular();
    return { ok: true, itens, resumo: resumir(itens) };
  } catch (e) {
    return { ok: false, erro: e instanceof Error ? e.message : 'erro ao conferir' };
  }
}

const LOTE = 15; // a função tem 15 s e cada senha custa um hash; a tela repete até zerar.

/** Cria os usuários que faltam (em lotes) e atualiza as filiais de quem já existe. */
export async function gerarUsuariosGestores(): Promise<
  { ok: true; criados: number; restantes: number; filiaisAtualizadas: number } | { ok: false; erro: string }
> {
  try {
    const s = await requireSession('admin');
    const plano = await calcular();

    // Atualiza as filiais de quem já existe e mudou de escopo no QLP.
    let filiaisAtualizadas = 0;
    for (const it of plano.itens) {
      if (!it.filiaisDesatualizadas) continue;
      const ex = plano.existentes.get(it.chapa)!;
      const ids = plano.filiaisIds.get(it.chapa) ?? [];
      await db.transaction(async (tx) => {
        await tx.delete(schema.usuariosAcessoFiliais).where(eq(schema.usuariosAcessoFiliais.usuarioAcessoId, ex.usuarioAcessoId));
        if (ids.length) await tx.insert(schema.usuariosAcessoFiliais).values(ids.map((fid) => ({ usuarioAcessoId: ex.usuarioAcessoId, filialId: fid })));
      });
      filiaisAtualizadas++;
    }

    const novos = plano.itens.filter((i) => i.situacao === 'novo');
    const lote = novos.slice(0, LOTE);
    let criados = 0;
    for (const it of lote) {
      const senhaHash = await hashPassword(it.senha!);
      const ids = plano.filiaisIds.get(it.chapa) ?? [];
      await db.transaction(async (tx) => {
        const [u] = await tx
          .insert(schema.usuariosAcesso)
          .values({
            usuario: it.usuario,
            nome: it.nome,
            senhaHash,
            escopo: it.nacional ? 'nacional' : 'lista',
            ativo: true,
            createdBy: s.adminId,
          })
          .returning({ id: schema.usuariosAcesso.id });
        if (!it.nacional && ids.length > 0) {
          await tx.insert(schema.usuariosAcessoFiliais).values(ids.map((fid) => ({ usuarioAcessoId: u!.id, filialId: fid })));
        }
        await tx.insert(schema.usuariosGestores).values({
          usuarioAcessoId: u!.id,
          chapa: it.chapa,
          colaboradorId: plano.colaboradorIds.get(it.chapa) ?? null,
        });
      });
      criados++;
    }
    revalidatePath('/admin/config/usuarios');
    return { ok: true, criados, restantes: novos.length - criados, filiaisAtualizadas };
  } catch (e) {
    return { ok: false, erro: e instanceof Error ? e.message : 'erro ao gerar' };
  }
}
