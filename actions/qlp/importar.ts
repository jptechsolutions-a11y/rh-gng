'use server';

import { db } from '@/db/client';
import { eq, inArray } from 'drizzle-orm';
import {
  qlpColaboradores,
  qlpFuncoesCargo,
  qlpImports,
  qlpPendencias,
  qlpVinculos,
  qlpLideres,
  filiais,
} from '@/db/schema';
import { parseQuadroPerlog } from '@/lib/qlp/xls-parser';
import { computeDiff } from '@/lib/qlp/sync-diff';
import { autoclassify } from '@/lib/qlp/autoclassify';
import { gravarHistorico } from './_shared';
import { requireSession } from '@/lib/auth/session';
import { revalidatePath } from 'next/cache';

export interface PreviewResultado {
  totalLinhas: number;
  novos: number;
  atualizadosSemQuebra: number;
  mudancaTier: number;
  mudancaFilial: number;
  desligados: number;
  funcoesNovas: Array<{ funcao: string; tier: string; nivel: string | null; trilha: string | null }>;
  filiaisDesconhecidas: number[];
  amostras: {
    novos: Array<{ chapa: string; nome: string; funcao: string; codfilial: number }>;
    desligados: Array<{ chapa: string; nome: string }>;
    mudancaTier: Array<{ chapa: string; nome: string; de: string; para: string }>;
    mudancaFilial: Array<{ chapa: string; nome: string; de: number; para: number }>;
  };
}

async function parseAndDiff(buf: Buffer) {
  const linhas = parseQuadroPerlog(buf);

  const funcoesExistentes = await db.select().from(qlpFuncoesCargo);
  const funcoesMap = new Map(funcoesExistentes.map((f) => [f.funcao, f]));
  const funcoesNovas: PreviewResultado['funcoesNovas'] = [];
  for (const l of linhas) {
    if (!funcoesMap.has(l.funcao)) {
      const c = autoclassify(l.funcao);
      funcoesNovas.push({ funcao: l.funcao, tier: c.tier, nivel: c.nivel, trilha: c.trilha });
      funcoesMap.set(l.funcao, {
        funcao: l.funcao,
        tier: c.tier,
        nivel: c.nivel,
        trilha: c.trilha,
        classificadaEm: new Date(),
        confirmadaPorAdmin: false,
      });
    }
  }

  const atual = await db
    .select({
      chapa: qlpColaboradores.chapa,
      nome: qlpColaboradores.nome,
      codfilial: qlpColaboradores.codfilial,
      funcao: qlpColaboradores.funcao,
      tier: qlpColaboradores.tierResolvido,
      situacao: qlpColaboradores.situacao,
    })
    .from(qlpColaboradores)
    .where(eq(qlpColaboradores.ativo, true));

  const atualNorm = atual.map((c) => ({
    chapa: c.chapa,
    nome: c.nome,
    codfilial: c.codfilial,
    funcao: c.funcao,
    tier: c.tier ?? 'base',
    situacao: c.situacao ?? '',
  }));

  const diff = computeDiff(atualNorm, linhas, autoclassify);

  const codfiliais = Array.from(new Set(linhas.map((l) => l.codfilial)));
  const filiaisExistentes =
    codfiliais.length > 0
      ? await db
          .select({ codigo: filiais.codigo })
          .from(filiais)
          .where(inArray(filiais.codigo, codfiliais.map(String)))
      : [];
  const cods = new Set(filiaisExistentes.map((f) => Number(f.codigo)));
  const filiaisDesconhecidas = codfiliais.filter((c) => !cods.has(c));

  return { linhas, diff, funcoesNovas, filiaisDesconhecidas };
}

export async function previewImport(formData: FormData): Promise<PreviewResultado> {
  await requireSession('admin');
  const file = formData.get('arquivo') as File | null;
  if (!file) throw new Error('arquivo ausente');
  const buf = Buffer.from(await file.arrayBuffer());
  const { linhas, diff, funcoesNovas, filiaisDesconhecidas } = await parseAndDiff(buf);

  return {
    totalLinhas: linhas.length,
    novos: diff.novos.length,
    atualizadosSemQuebra: diff.atualizadosSemQuebra.length,
    mudancaTier: diff.mudancaTier.length,
    mudancaFilial: diff.mudancaFilial.length,
    desligados: diff.desligados.length,
    funcoesNovas,
    filiaisDesconhecidas,
    amostras: {
      novos: diff.novos.slice(0, 20).map((n) => ({
        chapa: n.chapa,
        nome: n.nome,
        funcao: n.funcao,
        codfilial: n.codfilial,
      })),
      desligados: diff.desligados.slice(0, 20).map((d) => ({ chapa: d.chapa, nome: d.nome })),
      mudancaTier: diff.mudancaTier.slice(0, 20).map((m) => ({
        chapa: m.antes.chapa,
        nome: m.antes.nome,
        de: m.tierAntigo,
        para: m.tierNovo,
      })),
      mudancaFilial: diff.mudancaFilial.slice(0, 20).map((m) => ({
        chapa: m.antes.chapa,
        nome: m.antes.nome,
        de: m.antes.codfilial,
        para: m.depois.codfilial,
      })),
    },
  };
}

export async function aplicarSync(formData: FormData) {
  const s = await requireSession('admin');
  const file = formData.get('arquivo') as File | null;
  if (!file) throw new Error('arquivo ausente');
  const arquivoNome = file.name;
  const buf = Buffer.from(await file.arrayBuffer());
  const linhas = parseQuadroPerlog(buf);

  const ator = {
    tipo: 'sync' as const,
    id: s.adminId,
    nome: s.nome ?? s.usuario,
    filialContextoId: null,
  };

  const resultado = await db.transaction(async (tx) => {
    const filiaisRows = await tx.select({ id: filiais.id, codigo: filiais.codigo }).from(filiais);
    const filMap = new Map(filiaisRows.map((f) => [Number(f.codigo), f.id]));

    for (const l of linhas) {
      const exists = await tx.query.qlpFuncoesCargo.findFirst({
        where: eq(qlpFuncoesCargo.funcao, l.funcao),
      });
      if (!exists) {
        const c = autoclassify(l.funcao);
        await tx
          .insert(qlpFuncoesCargo)
          .values({ funcao: l.funcao, tier: c.tier, nivel: c.nivel, trilha: c.trilha });
      }
    }

    const atualRows = await tx.select().from(qlpColaboradores).where(eq(qlpColaboradores.ativo, true));
    const atualMap = new Map(atualRows.map((c) => [c.chapa, c]));

    let novos = 0;
    let atualizados = 0;
    let desligados = 0;
    const pendencias: Array<{
      tipo: string;
      chapa: string;
      descricao: string;
      colaboradorId?: string;
    }> = [];
    const mudancasTier: Array<{ chapa: string; de: string; para: string }> = [];

    for (const l of linhas) {
      const c = autoclassify(l.funcao);
      const filialId = filMap.get(l.codfilial) ?? null;
      const antes = atualMap.get(l.chapa);

      if (!antes) {
        const [criado] = await tx
          .insert(qlpColaboradores)
          .values({
            chapa: l.chapa,
            nome: l.nome,
            regional: l.regional,
            bandeira: l.bandeira,
            codfilial: l.codfilial,
            filialId,
            funcao: l.funcao,
            secao: l.secao,
            horario: l.horario,
            nacionalidade: l.nacionalidade,
            dtAdmissao: l.dtAdmissao,
            mesNasc: l.mesNasc,
            idade: l.idade,
            situacao: l.situacao,
            tierResolvido: c.tier,
            nivelResolvido: c.nivel,
            trilhaResolvida: c.trilha,
          })
          .returning();
        if (!criado) throw new Error('falha ao inserir colaborador');
        novos++;
        pendencias.push({
          tipo: 'novo_sem_lider',
          chapa: l.chapa,
          descricao: `${l.nome} (${l.funcao})`,
          colaboradorId: criado.id,
        });
        if (!filialId) {
          pendencias.push({
            tipo: 'filial_desconhecida',
            chapa: l.chapa,
            descricao: `codfilial ${l.codfilial} não cadastrada`,
            colaboradorId: criado.id,
          });
        }
        await gravarHistorico(tx as unknown as typeof db, {
          evento: 'colaborador_cadastrado',
          colaboradorId: criado.id,
          detalhes: { chapa: l.chapa, funcao: l.funcao, classificacao: c },
          ator,
        });
        continue;
      }

      const tierMudou = (antes.tierResolvido ?? 'base') !== c.tier;
      const filialMudou = antes.codfilial !== l.codfilial;

      await tx
        .update(qlpColaboradores)
        .set({
          nome: l.nome,
          regional: l.regional,
          bandeira: l.bandeira,
          codfilial: l.codfilial,
          filialId: filialId ?? antes.filialId,
          funcao: l.funcao,
          secao: l.secao,
          horario: l.horario,
          nacionalidade: l.nacionalidade,
          dtAdmissao: l.dtAdmissao,
          mesNasc: l.mesNasc,
          idade: l.idade,
          situacao: l.situacao,
          tierResolvido: c.tier,
          nivelResolvido: c.nivel,
          trilhaResolvida: c.trilha,
          updatedAt: new Date(),
        })
        .where(eq(qlpColaboradores.id, antes.id));

      if (tierMudou || filialMudou) {
        const vinculo = await tx.query.qlpVinculos.findFirst({
          where: eq(qlpVinculos.colaboradorId, antes.id),
        });
        if (vinculo) {
          await tx.delete(qlpVinculos).where(eq(qlpVinculos.colaboradorId, antes.id));
        }
        if (tierMudou) {
          mudancasTier.push({
            chapa: antes.chapa,
            de: antes.tierResolvido ?? 'base',
            para: c.tier,
          });
          pendencias.push({
            tipo: 'tier_mudou',
            chapa: antes.chapa,
            descricao: `${antes.nome}: ${antes.tierResolvido ?? 'base'} → ${c.tier}`,
            colaboradorId: antes.id,
          });
        }
        if (filialMudou) {
          pendencias.push({
            tipo: 'filial_mudou',
            chapa: antes.chapa,
            descricao: `${antes.nome}: filial ${antes.codfilial} → ${l.codfilial}`,
            colaboradorId: antes.id,
          });
        }
        await gravarHistorico(tx as unknown as typeof db, {
          evento: tierMudou ? 'colaborador_mudou_funcao' : 'colaborador_transferido_filial',
          colaboradorId: antes.id,
          liderIdAntigo: vinculo?.liderId ?? null,
          detalhes: {
            antes: { tier: antes.tierResolvido, codfilial: antes.codfilial, funcao: antes.funcao },
            depois: { tier: c.tier, codfilial: l.codfilial, funcao: l.funcao },
          },
          ator,
        });
      }
      atualizados++;
    }

    const chapasNovas = new Set(linhas.map((l) => l.chapa));
    for (const c of atualRows) {
      if (!chapasNovas.has(c.chapa)) {
        const vinculo = await tx.query.qlpVinculos.findFirst({
          where: eq(qlpVinculos.colaboradorId, c.id),
        });
        await tx
          .update(qlpColaboradores)
          .set({ ativo: false, updatedAt: new Date() })
          .where(eq(qlpColaboradores.id, c.id));
        if (vinculo) {
          await tx.delete(qlpVinculos).where(eq(qlpVinculos.colaboradorId, c.id));
        }
        const eraLider = await tx.query.qlpLideres.findFirst({
          where: eq(qlpLideres.colaboradorId, c.id),
        });
        if (eraLider) {
          pendencias.push({
            tipo: 'desligado_com_time',
            chapa: c.chapa,
            descricao: `${c.nome} era líder (${eraLider.tier})`,
            colaboradorId: c.id,
          });
        }
        desligados++;
        await gravarHistorico(tx as unknown as typeof db, {
          evento: 'colaborador_desligado',
          colaboradorId: c.id,
          liderIdAntigo: vinculo?.liderId ?? null,
          detalhes: { chapa: c.chapa },
          ator,
        });
      }
    }

    for (const p of pendencias) {
      await tx.insert(qlpPendencias).values({
        tipo: p.tipo,
        colaboradorId: p.colaboradorId ?? null,
        descricao: p.descricao,
      });
    }

    const [imp] = await tx
      .insert(qlpImports)
      .values({
        arquivo: arquivoNome,
        executadoPor: s.nome ?? s.usuario,
        totalLinhas: linhas.length,
        novos,
        atualizados,
        desligados,
        mudancaTier: mudancasTier,
        pendencias,
      })
      .returning();
    if (!imp) throw new Error('falha ao gravar import');

    await gravarHistorico(tx as unknown as typeof db, {
      evento: 'import_executado',
      detalhes: {
        importId: imp.id,
        arquivo: arquivoNome,
        totalLinhas: linhas.length,
        novos,
        atualizados,
        desligados,
        pendencias: pendencias.length,
      },
      ator,
    });

    return { importId: imp.id, novos, atualizados, desligados, pendencias: pendencias.length };
  });

  revalidatePath('/qlp');
  revalidatePath('/qlp/quadro');
  revalidatePath('/qlp/cargos');
  revalidatePath('/qlp/historico');
  revalidatePath('/qlp/indicadores');
  return resultado;
}
