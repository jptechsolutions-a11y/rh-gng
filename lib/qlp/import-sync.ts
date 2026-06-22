import 'server-only';
import { eq, inArray } from 'drizzle-orm';
import { db } from '@/db/client';
import {
  qlpColaboradores,
  qlpFuncoesCargo,
  qlpImports,
  qlpPendencias,
  qlpVinculos,
  qlpLideres,
  qlpHistorico,
  filiais,
} from '@/db/schema';
import { autoclassify } from './autoclassify';
import type { LinhaQuadro } from './xls-parser';

export interface ImportSummary {
  importId: string;
  novos: number;
  atualizados: number;
  desligados: number;
  mudancaTier: number;
  mudancaFilial: number;
  pendencias: number;
}

interface Pendencia {
  tipo: string;
  colaborador_id: string | null;
  descricao: string;
}

interface HistoricoEvento {
  evento: string;
  colaborador_id: string | null;
  lider_id_antigo: string | null;
  lider_id_novo: string | null;
  detalhes: Record<string, unknown>;
}

const CHUNK = 500;

function chunked<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

/**
 * Aplica o sync do XLS em batches:
 * - 1 SELECT por tabela (funcoes, colaboradores, filiais) up-front
 * - Diff calculado em memória, sem round-trips
 * - INSERTs/DELETEs em chunks de 500
 * - UPDATEs por colaborador alterado (apenas linhas que realmente mudaram)
 * - 1 historico de import_executado + 1 por mudança "relevante"
 *   (tier_mudou, filial_mudou, desligamento) — novos não geram historico
 *   por colaborador (consultar created_at em qlp_colaboradores se precisar)
 */
export async function runImportSync(input: {
  linhas: LinhaQuadro[];
  arquivoNome: string;
  ator: { id: string; nome: string };
}): Promise<ImportSummary> {
  const { linhas, arquivoNome, ator } = input;

  const [funcoesRows, atualRows, filiaisRows, lideresRows] = await Promise.all([
    db.select().from(qlpFuncoesCargo),
    db.select().from(qlpColaboradores).where(eq(qlpColaboradores.ativo, true)),
    db.select({ id: filiais.id, codigo: filiais.codigo }).from(filiais),
    db.select({ colaboradorId: qlpLideres.colaboradorId, tier: qlpLideres.tier }).from(qlpLideres),
  ]);

  const funcoesMap = new Map(funcoesRows.map((f) => [f.funcao, f]));
  const atualMap = new Map(atualRows.map((c) => [c.chapa, c]));
  const filMap = new Map(filiaisRows.map((f) => [Number(f.codigo), f.id]));
  const lideresSet = new Set(lideresRows.map((l) => l.colaboradorId));

  const novasFuncoes: Array<{
    funcao: string;
    tier: string;
    nivel: string | null;
    trilha: string | null;
  }> = [];
  for (const l of linhas) {
    if (!funcoesMap.has(l.funcao)) {
      const c = autoclassify(l.funcao);
      novasFuncoes.push({ funcao: l.funcao, tier: c.tier, nivel: c.nivel, trilha: c.trilha });
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

  const novosColab: Array<typeof qlpColaboradores.$inferInsert> = [];
  const updatesColab: Array<{
    id: string;
    patch: Partial<typeof qlpColaboradores.$inferInsert>;
  }> = [];
  const idsQuebrarVinculo: string[] = [];
  const desligadosIds: string[] = [];
  const pendencias: Pendencia[] = [];
  const historicoEventos: HistoricoEvento[] = [];

  let novos = 0;
  let atualizados = 0;
  let desligados = 0;
  let mudancaTierTotal = 0;
  let mudancaFilialTotal = 0;

  const chapasXLS = new Set<string>();

  for (const linha of linhas) {
    chapasXLS.add(linha.chapa);
    const c = autoclassify(linha.funcao);
    const filialId = filMap.get(linha.codfilial) ?? null;
    const antes = atualMap.get(linha.chapa);

    if (!antes) {
      novosColab.push({
        chapa: linha.chapa,
        nome: linha.nome,
        regional: linha.regional || null,
        bandeira: linha.bandeira || null,
        codfilial: linha.codfilial,
        filialId,
        funcao: linha.funcao,
        secao: linha.secao,
        horario: linha.horario,
        nacionalidade: linha.nacionalidade,
        dtAdmissao: linha.dtAdmissao,
        mesNasc: linha.mesNasc,
        idade: linha.idade,
        situacao: linha.situacao,
        tierResolvido: c.tier,
        nivelResolvido: c.nivel,
        trilhaResolvida: c.trilha,
      });
      novos++;
      if (!filialId) {
        pendencias.push({
          tipo: 'filial_desconhecida',
          colaborador_id: null,
          descricao: `${linha.nome} (chapa ${linha.chapa}): codfilial ${linha.codfilial} não cadastrada`,
        });
      }
      continue;
    }

    const tierMudou = (antes.tierResolvido ?? 'base') !== c.tier;
    const filialMudou = antes.codfilial !== linha.codfilial;
    const algoMudou =
      tierMudou ||
      filialMudou ||
      antes.funcao !== linha.funcao ||
      antes.nome !== linha.nome ||
      antes.situacao !== linha.situacao;

    if (algoMudou) {
      updatesColab.push({
        id: antes.id,
        patch: {
          nome: linha.nome,
          regional: linha.regional || null,
          bandeira: linha.bandeira || null,
          codfilial: linha.codfilial,
          filialId: filialId ?? antes.filialId,
          funcao: linha.funcao,
          secao: linha.secao,
          horario: linha.horario,
          nacionalidade: linha.nacionalidade,
          dtAdmissao: linha.dtAdmissao,
          mesNasc: linha.mesNasc,
          idade: linha.idade,
          situacao: linha.situacao,
          tierResolvido: c.tier,
          nivelResolvido: c.nivel,
          trilhaResolvida: c.trilha,
          updatedAt: new Date(),
        },
      });
      atualizados++;
    }

    if (tierMudou) {
      mudancaTierTotal++;
      idsQuebrarVinculo.push(antes.id);
      pendencias.push({
        tipo: 'tier_mudou',
        colaborador_id: antes.id,
        descricao: `${antes.nome}: ${antes.tierResolvido ?? 'base'} → ${c.tier}`,
      });
      historicoEventos.push({
        evento: 'colaborador_mudou_funcao',
        colaborador_id: antes.id,
        lider_id_antigo: null,
        lider_id_novo: null,
        detalhes: {
          antes: { tier: antes.tierResolvido, funcao: antes.funcao },
          depois: { tier: c.tier, funcao: linha.funcao },
        },
      });
    }
    if (filialMudou) {
      mudancaFilialTotal++;
      if (!tierMudou) idsQuebrarVinculo.push(antes.id);
      pendencias.push({
        tipo: 'filial_mudou',
        colaborador_id: antes.id,
        descricao: `${antes.nome}: filial ${antes.codfilial} → ${linha.codfilial}`,
      });
      historicoEventos.push({
        evento: 'colaborador_transferido_filial',
        colaborador_id: antes.id,
        lider_id_antigo: null,
        lider_id_novo: null,
        detalhes: {
          antes: { codfilial: antes.codfilial, filial_id: antes.filialId },
          depois: { codfilial: linha.codfilial, filial_id: filialId },
        },
      });
    }
  }

  for (const c of atualRows) {
    if (!chapasXLS.has(c.chapa)) {
      desligadosIds.push(c.id);
      desligados++;
      if (lideresSet.has(c.id)) {
        pendencias.push({
          tipo: 'desligado_com_time',
          colaborador_id: c.id,
          descricao: `${c.nome} (líder) foi desligado — reatribuir time`,
        });
      }
      historicoEventos.push({
        evento: 'colaborador_desligado',
        colaborador_id: c.id,
        lider_id_antigo: null,
        lider_id_novo: null,
        detalhes: { chapa: c.chapa, nome: c.nome },
      });
    }
  }

  // ============ EXECUÇÃO EM BATCH ============
  // Quando o volume é grande (1700+ inserts) uma única transaction estoura
  // o statement_timeout do Supavisor. Em vez disso fazemos batches sequenciais
  // SEM tx envelopando tudo: cada batch é atômico em si, e a auditoria
  // (qlp_imports + qlp_historico de import_executado) é gravada no final.
  // Se algo falhar no meio, a entrada em qlp_imports não é criada — o admin
  // pode reaplicar (o diff fica idempotente).

  if (novasFuncoes.length > 0) {
    for (const batch of chunked(novasFuncoes, CHUNK)) {
      await db.insert(qlpFuncoesCargo).values(batch).onConflictDoNothing();
    }
  }

  if (novosColab.length > 0) {
    for (const batch of chunked(novosColab, CHUNK)) {
      await db.insert(qlpColaboradores).values(batch);
    }
  }

  if (updatesColab.length > 0) {
    for (const u of updatesColab) {
      await db.update(qlpColaboradores).set(u.patch).where(eq(qlpColaboradores.id, u.id));
    }
  }

  if (idsQuebrarVinculo.length > 0) {
    for (const batch of chunked(idsQuebrarVinculo, CHUNK)) {
      await db.delete(qlpVinculos).where(inArray(qlpVinculos.colaboradorId, batch));
    }
  }

  if (desligadosIds.length > 0) {
    for (const batch of chunked(desligadosIds, CHUNK)) {
      await db
        .update(qlpColaboradores)
        .set({ ativo: false, updatedAt: new Date() })
        .where(inArray(qlpColaboradores.id, batch));
      await db.delete(qlpVinculos).where(inArray(qlpVinculos.colaboradorId, batch));
    }
  }

  // pendencias e historico: chapas dos pendencias `filial_desconhecida` foram
  // marcadas com colaborador_id=null porque os novos colaboradores ainda não
  // tinham id no momento do loop. Resolvemos agora consultando.
  if (pendencias.some((p) => !p.colaborador_id)) {
    const chapasSemId = new Set<string>();
    for (const p of pendencias) {
      if (!p.colaborador_id) {
        const m = p.descricao.match(/chapa (\S+)\)/);
        if (m && m[1]) chapasSemId.add(m[1]);
      }
    }
    if (chapasSemId.size > 0) {
      const recemCriados = await db
        .select({ id: qlpColaboradores.id, chapa: qlpColaboradores.chapa })
        .from(qlpColaboradores)
        .where(inArray(qlpColaboradores.chapa, Array.from(chapasSemId)));
      const chapaToId = new Map(recemCriados.map((r) => [r.chapa, r.id]));
      for (const p of pendencias) {
        if (!p.colaborador_id) {
          const m = p.descricao.match(/chapa (\S+)\)/);
          if (m && m[1]) {
            const id = chapaToId.get(m[1]);
            if (id) p.colaborador_id = id;
          }
        }
      }
    }
  }

  if (pendencias.length > 0) {
    for (const batch of chunked(pendencias, CHUNK)) {
      await db.insert(qlpPendencias).values(
        batch.map((p) => ({
          tipo: p.tipo,
          colaboradorId: p.colaborador_id,
          descricao: p.descricao,
        })),
      );
    }
  }

  if (historicoEventos.length > 0) {
    for (const batch of chunked(historicoEventos, CHUNK)) {
      await db.insert(qlpHistorico).values(
        batch.map((h) => ({
          evento: h.evento,
          colaboradorId: h.colaborador_id,
          liderIdAntigo: h.lider_id_antigo,
          liderIdNovo: h.lider_id_novo,
          detalhes: h.detalhes,
          atorTipo: 'sync',
          atorId: ator.id,
          atorNome: ator.nome,
          filialContextoId: null,
        })),
      );
    }
  }

  const [imp] = await db
    .insert(qlpImports)
    .values({
      arquivo: arquivoNome,
      executadoPor: ator.nome,
      totalLinhas: linhas.length,
      novos,
      atualizados,
      desligados,
      mudancaTier: mudancaTierTotal > 0 ? { count: mudancaTierTotal } : null,
      pendencias: { count: pendencias.length },
    })
    .returning();
  if (!imp) throw new Error('falha ao gravar import');

  await db.insert(qlpHistorico).values({
    evento: 'import_executado',
    colaboradorId: null,
    detalhes: {
      importId: imp.id,
      arquivo: arquivoNome,
      totalLinhas: linhas.length,
      novos,
      atualizados,
      desligados,
      mudancaTier: mudancaTierTotal,
      mudancaFilial: mudancaFilialTotal,
      pendencias: pendencias.length,
    },
    atorTipo: 'sync',
    atorId: ator.id,
    atorNome: ator.nome,
    filialContextoId: null,
  });

  return {
    importId: imp.id,
    novos,
    atualizados,
    desligados,
    mudancaTier: mudancaTierTotal,
    mudancaFilial: mudancaFilialTotal,
    pendencias: pendencias.length,
  };
}
