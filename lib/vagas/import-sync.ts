import 'server-only';
import { and, eq, inArray, sql } from 'drizzle-orm';
import { db, schema } from '@/db/client';
import type { LinhaQuadroVagas } from './xls-parser';
import { planejarReconciliacao } from './reconciliar';
import { normalizarCodigoFilial } from './normalizar-codigo-filial';

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

// Envia os writes em lotes deste tamanho (mesmo valor usado em
// lib/qlp/import-sync.ts para o mesmo problema) — em vez de 1 round-trip por
// linha, cada INSERT/UPDATE em massa cobre até CHUNK linhas de uma vez.
const CHUNK = 500;

function chunked<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

function chaveLinha(filialId: string, funcao: string, secao: string | null): string {
  return `${filialId}::${funcao}::${secao ?? ''}`;
}

async function resolverFiliais(
  linhas: LinhaQuadroVagas[],
): Promise<{ resolvidas: ResolvidoLinha[]; filiaisDesconhecidas: string[] }> {
  // Busca todo o cadastro (não dá pra filtrar por igualdade exata de string
  // no SQL já que a comparação precisa ser normalizada) — tabela pequena.
  const todas = await db.select({ id: schema.filiais.id, codigo: schema.filiais.codigo }).from(schema.filiais);
  const mapa = new Map(todas.map((f) => [normalizarCodigoFilial(f.codigo), f.id]));

  const resolvidas: ResolvidoLinha[] = [];
  const desconhecidasSet = new Set<string>();
  for (const linha of linhas) {
    const filialId = mapa.get(normalizarCodigoFilial(linha.filialCodigo));
    if (filialId) {
      resolvidas.push({ linha, filialId });
    } else {
      desconhecidasSet.add(linha.filialCodigo);
    }
  }
  return { resolvidas, filiaisDesconhecidas: Array.from(desconhecidasSet) };
}

/**
 * A planilha não garante unicidade por filial+função+seção (linha duplicada,
 * turnos mesclados, etc.). Deduplicamos por essa combinação com semântica
 * "última vence" — a última ocorrência no arquivo é a autoritativa — para que
 * `previewImportVagas` e `aplicarImportVagas` sempre operem sobre o mesmo
 * conjunto e nunca divirjam entre si.
 */
function dedupeResolvidas(resolvidas: ResolvidoLinha[]): ResolvidoLinha[] {
  const map = new Map<string, ResolvidoLinha>();
  for (const item of resolvidas) {
    const chave = chaveLinha(item.filialId, item.linha.funcao, item.linha.secao);
    map.set(chave, item);
  }
  return Array.from(map.values());
}

interface ContagemLinha {
  /** Vagas ativas na combinação, em QUALQUER status — é contra isso que o target é comparado. */
  total: number;
  /** Dentre as ativas, quantas ainda estão literalmente "Em aberto" (únicas candidatas a fechamento automático). */
  fechavel: number;
}

async function contarAtivasEFechaveis(linhaIds: string[]): Promise<Map<string, ContagemLinha>> {
  if (linhaIds.length === 0) return new Map();
  const rows = await db
    .select({
      linhaId: schema.vagas.linhaId,
      total: sql<number>`count(*)`.as('total'),
      fechavel: sql<number>`count(*) filter (where ${schema.vagasStatus.sistema})`.as('fechavel'),
    })
    .from(schema.vagas)
    .innerJoin(schema.vagasStatus, eq(schema.vagasStatus.id, schema.vagas.statusId))
    .where(and(eq(schema.vagas.ativa, true), inArray(schema.vagas.linhaId, linhaIds)))
    .groupBy(schema.vagas.linhaId);
  return new Map(rows.map((r) => [r.linhaId, { total: Number(r.total), fechavel: Number(r.fechavel) }]));
}

/**
 * Pré-visualização: não escreve no banco. Resolve filiais e calcula quantas
 * vagas seriam criadas/fechadas, incluindo o zeramento de combinações que
 * existiam antes e não aparecem mais na planilha.
 */
export async function previewImportVagas(linhas: LinhaQuadroVagas[]): Promise<ImportSummaryVagas> {
  const resolucao = await resolverFiliais(linhas);
  const resolvidas = dedupeResolvidas(resolucao.resolvidas);
  const { filiaisDesconhecidas } = resolucao;

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

  const contagens = await contarAtivasEFechaveis(linhaIdsExistentesNaPlanilha);

  for (const { linha, filialId } of resolvidas) {
    const chave = chaveLinha(filialId, linha.funcao, linha.secao);
    const linhaId = existentesMap.get(chave);
    const info = linhaId ? contagens.get(linhaId) : undefined;
    const total = info?.total ?? 0;
    const fechavel = info?.fechavel ?? 0;
    const target = Math.max(0, linha.emAberto);
    const delta = target - total;
    if (delta > 0) vagasCriadas += delta;
    else if (delta < 0) vagasFechadas += Math.min(-delta, fechavel);
  }

  // Linhas existentes cuja combinação não aparece mais na planilha → target 0.
  const linhasAusentes = existentes.filter(
    (e) => !chavesNaPlanilha.has(chaveLinha(e.filialId, e.funcao, e.secao)),
  );
  const contagensAusentes = await contarAtivasEFechaveis(linhasAusentes.map((l) => l.id));
  let linhasZeradas = 0;
  for (const l of linhasAusentes) {
    const fechavel = contagensAusentes.get(l.id)?.fechavel ?? 0;
    if (fechavel > 0) {
      vagasFechadas += fechavel;
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

interface AgregadosLinha {
  regional: string | null;
  bandeira: string | null;
  limite: number;
  potencial: number;
  alocados: number;
  afastados: number;
  emAbertoImportado: number;
}

/**
 * Atualiza os agregados de várias `vagas_quadro_linhas` já existentes numa
 * única instrução (UPDATE ... FROM VALUES) — evita 1 round-trip por linha,
 * que é o que estourava o timeout da rota com planilhas de 1000+ linhas.
 */
async function atualizarLinhasEmMassa(
  linhas: { id: string; agregados: AgregadosLinha }[],
  importId: string,
): Promise<void> {
  if (linhas.length === 0) return;
  for (const batch of chunked(linhas, CHUNK)) {
    const values = sql.join(
      batch.map(
        (l) => sql`(${l.id}::uuid, ${l.agregados.regional}::text, ${l.agregados.bandeira}::text, ${l.agregados.limite}::int, ${l.agregados.potencial}::int, ${l.agregados.alocados}::int, ${l.agregados.afastados}::int, ${l.agregados.emAbertoImportado}::int)`,
      ),
      sql`, `,
    );
    await db.execute(sql`
      UPDATE vagas_quadro_linhas AS l SET
        regional = v.regional,
        bandeira = v.bandeira,
        limite = v.limite,
        potencial = v.potencial,
        alocados = v.alocados,
        afastados = v.afastados,
        em_aberto_importado = v.em_aberto_importado,
        ultima_import_id = ${importId}::uuid,
        updated_at = now()
      FROM (VALUES ${values}) AS v(id, regional, bandeira, limite, potencial, alocados, afastados, em_aberto_importado)
      WHERE l.id = v.id
    `);
  }
}

/**
 * Aplica o import: resolve tudo em memória a partir de leituras em lote
 * (sem 1 round-trip por linha) e grava em poucos INSERT/UPDATE em massa —
 * mesmo padrão de `lib/qlp/import-sync.ts` para o mesmo problema (uma
 * transação envolvendo milhares de round-trips individuais estoura o
 * statement_timeout do Supavisor e o maxDuration da rota). Não há uma
 * transação envolvendo tudo: cada etapa é atômica em si; se algo falhar no
 * meio, a linha do import fica sem `vagas_quadro_imports` — reaplicar a
 * planilha é seguro (o diff é idempotente).
 */
export async function aplicarImportVagas(
  linhas: LinhaQuadroVagas[],
  opts: { arquivoNome: string; importadoPorNome: string },
): Promise<ImportSummaryVagas> {
  const resolucao = await resolverFiliais(linhas);
  const resolvidas = dedupeResolvidas(resolucao.resolvidas);
  const { filiaisDesconhecidas } = resolucao;

  const statusEmAberto = await db.query.vagasStatus.findFirst({
    where: eq(schema.vagasStatus.sistema, true),
  });
  if (!statusEmAberto) {
    throw new Error('catálogo de status sem o status "Em aberto" — rode a migration de seed');
  }

  const importRow = await db
    .insert(schema.vagasQuadroImports)
    .values({
      arquivoNome: opts.arquivoNome,
      importadoPorNome: opts.importadoPorNome,
      totalLinhas: linhas.length,
      filiaisDesconhecidas,
    })
    .returning({ id: schema.vagasQuadroImports.id });
  const importId = importRow[0]!.id;

  // 1) leitura em lote de TODAS as linhas do quadro já existentes.
  const existentes = await db
    .select({
      id: schema.vagasQuadroLinhas.id,
      filialId: schema.vagasQuadroLinhas.filialId,
      funcao: schema.vagasQuadroLinhas.funcao,
      secao: schema.vagasQuadroLinhas.secao,
    })
    .from(schema.vagasQuadroLinhas);
  const existentesMap = new Map(existentes.map((e) => [chaveLinha(e.filialId, e.funcao, e.secao), e.id]));

  // 2) separa, em memória, quem precisa INSERT vs UPDATE.
  const paraInserir: { filialId: string; funcao: string; secao: string | null; agregados: AgregadosLinha }[] = [];
  const paraAtualizar: { id: string; agregados: AgregadosLinha }[] = [];
  const linhaIdPorChave = new Map<string, string>();

  for (const { linha, filialId } of resolvidas) {
    const chave = chaveLinha(filialId, linha.funcao, linha.secao);
    const agregados: AgregadosLinha = {
      regional: linha.regional || null,
      bandeira: linha.bandeira || null,
      limite: linha.limite,
      potencial: linha.potencial,
      alocados: linha.alocados,
      afastados: linha.afastados,
      emAbertoImportado: Math.max(0, linha.emAberto),
    };
    const idExistente = existentesMap.get(chave);
    if (idExistente) {
      linhaIdPorChave.set(chave, idExistente);
      paraAtualizar.push({ id: idExistente, agregados });
    } else {
      paraInserir.push({ filialId, funcao: linha.funcao, secao: linha.secao, agregados });
    }
  }

  // 3) grava as novas linhas do quadro em lote, recuperando os ids gerados.
  for (const batch of chunked(paraInserir, CHUNK)) {
    const inseridos = await db
      .insert(schema.vagasQuadroLinhas)
      .values(
        batch.map((l) => ({
          filialId: l.filialId,
          funcao: l.funcao,
          secao: l.secao,
          ...l.agregados,
          ultimaImportId: importId,
        })),
      )
      .returning({ id: schema.vagasQuadroLinhas.id, filialId: schema.vagasQuadroLinhas.filialId, funcao: schema.vagasQuadroLinhas.funcao, secao: schema.vagasQuadroLinhas.secao });
    for (const r of inseridos) linhaIdPorChave.set(chaveLinha(r.filialId, r.funcao, r.secao), r.id);
  }

  // 4) atualiza as linhas existentes em lote (1 UPDATE por lote de CHUNK, não 1 por linha).
  await atualizarLinhasEmMassa(paraAtualizar, importId);

  // 5) 1 única leitura em lote de todas as vagas ativas de TODAS as linhas
  // pré-existentes (tocadas nesta planilha ou não — as "ausentes" também
  // precisam entrar na reconciliação, como target 0).
  const todosLinhaIdsExistentes = existentes.map((e) => e.id);
  const ativasPorLinha = new Map<string, { id: string; createdAt: Date; sistema: boolean }[]>();
  for (const batch of chunked(todosLinhaIdsExistentes, CHUNK)) {
    if (batch.length === 0) continue;
    const rows = await db
      .select({
        id: schema.vagas.id,
        linhaId: schema.vagas.linhaId,
        createdAt: schema.vagas.createdAt,
        sistema: schema.vagasStatus.sistema,
      })
      .from(schema.vagas)
      .innerJoin(schema.vagasStatus, eq(schema.vagasStatus.id, schema.vagas.statusId))
      .where(and(eq(schema.vagas.ativa, true), inArray(schema.vagas.linhaId, batch)));
    for (const r of rows) {
      const lista = ativasPorLinha.get(r.linhaId) ?? [];
      lista.push({ id: r.id, createdAt: r.createdAt, sistema: r.sistema });
      ativasPorLinha.set(r.linhaId, lista);
    }
  }

  // 6) plano de criação/fechamento por linha, tudo em memória.
  const paraCriar: { linhaId: string; filialId: string; funcao: string; secao: string | null }[] = [];
  const idsParaFechar: string[] = [];
  let vagasCriadas = 0;
  let vagasFechadas = 0;

  for (const { linha, filialId } of resolvidas) {
    const chave = chaveLinha(filialId, linha.funcao, linha.secao);
    const linhaId = linhaIdPorChave.get(chave)!;
    const ativas = ativasPorLinha.get(linhaId) ?? [];
    const fechaveis = ativas.filter((v) => v.sistema);
    const target = Math.max(0, linha.emAberto);
    const plano = planejarReconciliacao(ativas.length, fechaveis, target);

    if (plano.criar > 0) {
      for (let i = 0; i < plano.criar; i++) {
        paraCriar.push({ linhaId, filialId, funcao: linha.funcao, secao: linha.secao });
      }
      vagasCriadas += plano.criar;
    }
    if (plano.fecharIds.length > 0) {
      idsParaFechar.push(...plano.fecharIds);
      vagasFechadas += plano.fecharIds.length;
    }
  }

  // 7) zera (fecha) combinações que existiam antes e não vieram nesta planilha.
  const linhaIdsTocadas = new Set(linhaIdPorChave.values());
  let linhasZeradas = 0;
  for (const l of existentes) {
    if (linhaIdsTocadas.has(l.id)) continue;
    const ativas = ativasPorLinha.get(l.id) ?? [];
    const fechaveis = ativas.filter((v) => v.sistema);
    if (fechaveis.length === 0) continue;
    const plano = planejarReconciliacao(ativas.length, fechaveis, 0);
    idsParaFechar.push(...plano.fecharIds);
    vagasFechadas += plano.fecharIds.length;
    linhasZeradas += 1;
  }

  // 8) grava tudo em lote.
  for (const batch of chunked(paraCriar, CHUNK)) {
    await db.insert(schema.vagas).values(
      batch.map((v) => ({
        linhaId: v.linhaId,
        filialId: v.filialId,
        funcao: v.funcao,
        secao: v.secao,
        statusId: statusEmAberto.id,
        origemImportId: importId,
      })),
    );
  }
  for (const batch of chunked(idsParaFechar, CHUNK)) {
    await db
      .update(schema.vagas)
      .set({ ativa: false, motivoFechamento: 'ajuste_importacao' })
      .where(inArray(schema.vagas.id, batch));
  }

  await db
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
}
