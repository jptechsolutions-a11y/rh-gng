import { NextRequest, NextResponse } from 'next/server';
import { and, asc, eq, inArray } from 'drizzle-orm';
import { requireSession, getFiliaisVisiveis } from '@/lib/auth/session';
import { db, schema } from '@/db/client';
import { coletarContexto, coletarConsolidado } from '@/lib/relatorio-completo/coletar';
import { gerarDeckConsolidado } from '@/lib/relatorio-completo/pptx';
import type { ChaveIndicador, DadosConsolidado } from '@/lib/relatorio-completo/tipos';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const PPTX_MIME = 'application/vnd.openxmlformats-officedocument.presentationml.presentation';

const TODOS_INDICADORES: ChaveIndicador[] = ['bh', 'inconsist', 'cursos', 'feriados', 'vagas'];

export async function POST(req: NextRequest) {
  const s = await requireSession();
  if (s.perfil !== 'admin') return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 });

  let body: { filialIds?: unknown; indicadores?: unknown } = {};
  try { body = await req.json(); } catch { /* body vazio ⇒ todos */ }
  const pedidos = Array.isArray(body.filialIds)
    ? body.filialIds.filter((x): x is string => typeof x === 'string')
    : [];

  const indicadoresPedidos = Array.isArray(body.indicadores)
    ? body.indicadores.filter((x): x is ChaveIndicador => TODOS_INDICADORES.includes(x as ChaveIndicador))
    : [];
  const indicadoresSel = indicadoresPedidos.length > 0 ? indicadoresPedidos : TODOS_INDICADORES;

  const escopo = getFiliaisVisiveis(s);
  const cond = [eq(schema.filiais.ativa, true)];
  if (escopo) cond.push(inArray(schema.filiais.id, escopo));
  if (pedidos.length > 0) cond.push(inArray(schema.filiais.id, pedidos));

  const filiais = await db
    .select({ filialId: schema.filiais.id, codigo: schema.filiais.codigo, nome: schema.filiais.nome })
    .from(schema.filiais)
    .where(and(...cond))
    .orderBy(asc(schema.filiais.codigo));

  if (filiais.length < 2) {
    return NextResponse.json({ error: 'Selecione ao menos 2 CDs para comparar' }, { status: 400 });
  }

  const ctx = await coletarContexto(escopo);
  const dadosCompletos = coletarConsolidado(ctx, filiais);

  // Filtra pros indicadores pedidos — "vagas" também controla se as páginas
  // de detalhe por CD (quadro/status) entram no deck, já que dependem dele.
  const incluiVagas = indicadoresSel.includes('vagas');
  const dados: DadosConsolidado = {
    ...dadosCompletos,
    rankings: dadosCompletos.rankings.filter((r) => indicadoresSel.includes(r.chave)),
    vagasDetalhe: incluiVagas ? dadosCompletos.vagasDetalhe : [],
    statusVagas: incluiVagas ? dadosCompletos.statusVagas : [],
  };

  const bytes = await gerarDeckConsolidado(dados);

  const stamp = new Date().toISOString().slice(0, 10);
  return new NextResponse(new Uint8Array(bytes), {
    status: 200,
    headers: {
      'Content-Type': PPTX_MIME,
      'Content-Disposition': `attachment; filename="Relatorio_Consolidado_Indicadores_${stamp}.pptx"`,
      'Cache-Control': 'no-store',
    },
  });
}
