'use server';

import { db } from '@/db/client';
import { eq, inArray } from 'drizzle-orm';
import { qlpColaboradores, qlpFuncoesCargo, filiais } from '@/db/schema';
import { parseQuadroPerlog, type LinhaQuadro } from '@/lib/qlp/xls-parser';
import { computeDiff } from '@/lib/qlp/sync-diff';
import { autoclassify } from '@/lib/qlp/autoclassify';
import { requireSession } from '@/lib/auth/session';
import { revalidatePath } from 'next/cache';
import { runImportSync, type ImportSummary } from '@/lib/qlp/import-sync';

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

export async function previewImport(formData: FormData): Promise<PreviewResultado> {
  await requireSession('admin');
  const file = formData.get('arquivo') as File | null;
  if (!file) throw new Error('arquivo ausente');
  const buf = Buffer.from(await file.arrayBuffer());
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

export async function aplicarSync(formData: FormData): Promise<ImportSummary> {
  const s = await requireSession('admin');
  const file = formData.get('arquivo') as File | null;
  if (!file) throw new Error('arquivo ausente');
  const buf = Buffer.from(await file.arrayBuffer());
  const linhas = parseQuadroPerlog(buf);

  const summary = await runImportSync({
    linhas,
    arquivoNome: file.name,
    ator: {
      id: s.adminId,
      nome: s.nome ?? s.usuario,
    },
  });

  revalidatePath('/qlp');
  revalidatePath('/qlp/quadro');
  revalidatePath('/qlp/cargos');
  revalidatePath('/qlp/historico');
  revalidatePath('/qlp/indicadores');
  return summary;
}

// Re-export para uso por outras camadas se necessário
export type { LinhaQuadro };
