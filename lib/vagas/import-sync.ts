import 'server-only';
import { and, eq, inArray, isNull, notInArray, sql } from 'drizzle-orm';
import { db, schema } from '@/db/client';
import type { LinhaQuadroVagas } from './xls-parser';
import { planejarReconciliacao } from './reconciliar';

export interface ImportSummaryVagas {
  totalLinhas: number;
  linhasValidas: number;
  filiaisDesconhecidas: string[];
  vagasCriadas: number;
  vagasFechadas: number;
  linhasZeradas: number;
}

interface ResolvidoLinha {
  linha: LinhaQuadroVagas;
  filialId: string;
}

function chaveLinha(filialId: string, funcao: string, secao: string | null): string {
  return `${filialId}::${funcao}::${secao ?? ''}`;
}

async function resolverFiliais(
  linhas: LinhaQuadroVagas[],
): Promise<{ resolvidas: ResolvidoLinha[]; filiaisDesconhecidas: string[] }> {
  const codigos = Array.from(new Set(linhas.map((l) => l.filialCodigo)));
  const encontradas = codigos.length
    ? await db
        .select({ id: schema.filiais.id, codigo: schema.filiais.codigo })
        .from(schema.filiais)
        .where(inArray(schema.filiais.codigo, codigos))
    : [];
  const mapa = new Map(encontradas.map((f) => [f.codigo, f.id]));

  const resolvidas: ResolvidoLinha[] = [];
  const desconhecidasSet = new Set<string>();
  for (const linha of linhas) {
    const filialId = mapa.get(linha.filialCodigo);
    if (filialId) {
      resolvidas.push({ linha, filialId });
    } else {
      desconhecidasSet.add(linha.filialCodigo);
    }
  }
  return { resolvidas, filiaisDesconhecidas: Array.from(desconhecidasSet) };
}

async function contarAbertasAtuais(linhaIds: string[]): Promise<Map<string, number>> {
  if (linhaIds.length === 0) return new Map();
  const rows = await db
    .select({
      linhaId: schema.vagas.linhaId,
      total: sql<number>`count(*)`.as('total'),
    })
    .from(schema.vagas)
    .innerJoin(schema.vagasStatus, eq(schema.vagasStatus.id, schema.vagas.statusId))
    .where(
      and(
        eq(schema.vagas.ativa, true),
        eq(schema.vagasStatus.sistema, true),
        inArray(schema.vagas.linhaId, linhaIds),
      ),
    )
    .groupBy(schema.vagas.linhaId);
  return new Map(rows.map((r) => [r.linhaId, Number(r.total)]));
}

/**
 * Pré-visualização: não escreve no banco. Resolve filiais e calcula quantas
 * vagas seriam criadas/fechadas, incluindo o zeramento de combinações que
 * existiam antes e não aparecem mais na planilha.
 */
export async function previewImportVagas(linhas: LinhaQuadroVagas[]): Promise<ImportSummaryVagas> {
  const { resolvidas, filiaisDesconhecidas } = await resolverFiliais(linhas);

  const existentes = await db
    .select({
      id: schema.vagasQuadroLinhas.id,
      filialId: schema.vagasQuadroLinhas.filialId,
      funcao: schema.vagasQuadroLinhas.funcao,
      secao: schema.vagasQuadroLinhas.secao,
    })
    .from(schema.vagasQuadroLinhas);
  const existentesMap = new Map(
    existentes.map((e) => [chaveLinha(e.filialId, e.funcao, e.secao), e.id]),
  );

  const chavesNaPlanilha = new Set<string>();
  let vagasCriadas = 0;
  let vagasFechadas = 0;

  const linhaIdsExistentesNaPlanilha: string[] = [];
  for (const { linha, filialId } of resolvidas) {
    const chave = chaveLinha(filialId, linha.funcao, linha.secao);
    chavesNaPlanilha.add(chave);
    const linhaId = existentesMap.get(chave);
    if (linhaId) linhaIdsExistentesNaPlanilha.push(linhaId);
  }

  const contagens = await contarAbertasAtuais(linhaIdsExistentesNaPlanilha);

  for (const { linha, filialId } of resolvidas) {
    const chave = chaveLinha(filialId, linha.funcao, linha.secao);
    const linhaId = existentesMap.get(chave);
    const atual = linhaId ? (contagens.get(linhaId) ?? 0) : 0;
    const target = Math.max(0, linha.emAberto);
    const delta = target - atual;
    if (delta > 0) vagasCriadas += delta;
    else if (delta < 0) vagasFechadas += -delta;
  }

  // Linhas existentes cuja combinação não aparece mais na planilha → target 0.
  const linhasAusentes = existentes.filter(
    (e) => !chavesNaPlanilha.has(chaveLinha(e.filialId, e.funcao, e.secao)),
  );
  const contagensAusentes = await contarAbertasAtuais(linhasAusentes.map((l) => l.id));
  let linhasZeradas = 0;
  for (const l of linhasAusentes) {
    const atual = contagensAusentes.get(l.id) ?? 0;
    if (atual > 0) {
      vagasFechadas += atual;
      linhasZeradas += 1;
    }
  }

  return {
    totalLinhas: linhas.length,
    linhasValidas: resolvidas.length,
    filiaisDesconhecidas,
    vagasCriadas,
    vagasFechadas,
    linhasZeradas,
  };
}

/**
 * Aplica o import em uma transação: upsert das linhas do quadro, cria/fecha
 * vagas conforme `planejarReconciliacao`, zera combinações ausentes da nova
 * planilha e grava o registro em `vagas_quadro_imports`.
 */
export async function aplicarImportVagas(
  linhas: LinhaQuadroVagas[],
  opts: { arquivoNome: string; importadoPorNome: string },
): Promise<ImportSummaryVagas> {
  const { resolvidas, filiaisDesconhecidas } = await resolverFiliais(linhas);

  return db.transaction(async (tx) => {
    /**
     * Encontra (por filial+função+seção, tratando seção nula corretamente) ou
     * cria a linha do quadro correspondente, atualizando seus agregados.
     * Implementado como SELECT explícito + branch (não `onConflictDoUpdate`) —
     * a versão instalada do drizzle-orm tipa o `target` de `onConflictDoUpdate`
     * como `IndexColumn | IndexColumn[]` apenas, então não aceita o índice único
     * funcional; além disso o índice único em (filial_id, funcao, secao) não
     * dedupe de forma confiável quando `secao` é NULL (Postgres trata NULL como
     * distinto de NULL em índices únicos), caso real e frequente nesta planilha.
     */
    async function upsertLinha(
      filialId: string,
      linha: LinhaQuadroVagas,
      importId: string,
    ): Promise<string> {
      const condSecao =
        linha.secao === null
          ? isNull(schema.vagasQuadroLinhas.secao)
          : eq(schema.vagasQuadroLinhas.secao, linha.secao);
      const cond = and(
        eq(schema.vagasQuadroLinhas.filialId, filialId),
        eq(schema.vagasQuadroLinhas.funcao, linha.funcao),
        condSecao,
      );

      const existente = await tx
        .select({ id: schema.vagasQuadroLinhas.id })
        .from(schema.vagasQuadroLinhas)
        .where(cond)
        .limit(1);

      const valoresAgregados = {
        regional: linha.regional || null,
        bandeira: linha.bandeira || null,
        limite: linha.limite,
        potencial: linha.potencial,
        alocados: linha.alocados,
        afastados: linha.afastados,
        emAbertoImportado: linha.emAberto,
        ultimaImportId: importId,
        updatedAt: new Date(),
      };

      if (existente.length > 0) {
        const id = existente[0]!.id;
        await tx
          .update(schema.vagasQuadroLinhas)
          .set(valoresAgregados)
          .where(eq(schema.vagasQuadroLinhas.id, id));
        return id;
      }

      const inserido = await tx
        .insert(schema.vagasQuadroLinhas)
        .values({
          filialId,
          funcao: linha.funcao,
          secao: linha.secao,
          ...valoresAgregados,
        })
        .returning({ id: schema.vagasQuadroLinhas.id });
      return inserido[0]!.id;
    }

    async function buscarAbertasDaLinha(linhaId: string) {
      return tx
        .select({ id: schema.vagas.id, createdAt: schema.vagas.createdAt })
        .from(schema.vagas)
        .innerJoin(schema.vagasStatus, eq(schema.vagasStatus.id, schema.vagas.statusId))
        .where(
          and(
            eq(schema.vagas.linhaId, linhaId),
            eq(schema.vagas.ativa, true),
            eq(schema.vagasStatus.sistema, true),
          ),
        );
    }

    const statusEmAberto = await tx.query.vagasStatus.findFirst({
      where: eq(schema.vagasStatus.sistema, true),
    });
    if (!statusEmAberto) {
      throw new Error('catálogo de status sem o status "Em aberto" — rode a migration de seed');
    }

    const importRow = await tx
      .insert(schema.vagasQuadroImports)
      .values({
        arquivoNome: opts.arquivoNome,
        importadoPorNome: opts.importadoPorNome,
        totalLinhas: linhas.length,
        filiaisDesconhecidas,
      })
      .returning({ id: schema.vagasQuadroImports.id });
    const importId = importRow[0]!.id;

    let vagasCriadas = 0;
    let vagasFechadas = 0;
    const linhaIdsTocadas = new Set<string>();

    for (const { linha, filialId } of resolvidas) {
      const linhaId = await upsertLinha(filialId, linha, importId);
      linhaIdsTocadas.add(linhaId);

      const abertas = await buscarAbertasDaLinha(linhaId);
      const target = Math.max(0, linha.emAberto);
      const plano = planejarReconciliacao(abertas, target);

      if (plano.criar > 0) {
        await tx.insert(schema.vagas).values(
          Array.from({ length: plano.criar }, () => ({
            linhaId,
            filialId,
            funcao: linha.funcao,
            secao: linha.secao,
            statusId: statusEmAberto.id,
            origemImportId: importId,
          })),
        );
        vagasCriadas += plano.criar;
      }
      if (plano.fecharIds.length > 0) {
        await tx
          .update(schema.vagas)
          .set({ ativa: false, motivoFechamento: 'ajuste_importacao' })
          .where(inArray(schema.vagas.id, plano.fecharIds));
        vagasFechadas += plano.fecharIds.length;
      }
    }

    // Zera (fecha) combinações que existiam antes e não vieram nesta planilha.
    let linhasZeradas = 0;
    const linhasAusentes = await tx
      .select({ id: schema.vagasQuadroLinhas.id })
      .from(schema.vagasQuadroLinhas)
      .where(
        linhaIdsTocadas.size > 0
          ? notInArray(schema.vagasQuadroLinhas.id, Array.from(linhaIdsTocadas))
          : sql`true`,
      );
    for (const l of linhasAusentes) {
      const abertas = await buscarAbertasDaLinha(l.id);
      if (abertas.length === 0) continue;
      const plano = planejarReconciliacao(abertas, 0);
      await tx
        .update(schema.vagas)
        .set({ ativa: false, motivoFechamento: 'ajuste_importacao' })
        .where(inArray(schema.vagas.id, plano.fecharIds));
      vagasFechadas += plano.fecharIds.length;
      linhasZeradas += 1;
    }

    await tx
      .update(schema.vagasQuadroImports)
      .set({ vagasCriadas, vagasFechadas })
      .where(eq(schema.vagasQuadroImports.id, importId));

    return {
      totalLinhas: linhas.length,
      linhasValidas: resolvidas.length,
      filiaisDesconhecidas,
      vagasCriadas,
      vagasFechadas,
      linhasZeradas,
    };
  });
}
