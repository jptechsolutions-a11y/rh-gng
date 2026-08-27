import { NextRequest, NextResponse } from 'next/server';
import JSZip from 'jszip';
import { and, asc, eq, inArray } from 'drizzle-orm';
import { requireSession, getFiliaisVisiveis } from '@/lib/auth/session';
import { db, schema } from '@/db/client';
import { coletarContexto, coletarFilial } from '@/lib/relatorio-completo/coletar';
import { gerarDeckFilial } from '@/lib/relatorio-completo/pptx';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const PPTX_MIME = 'application/vnd.openxmlformats-officedocument.presentationml.presentation';

export async function POST(req: NextRequest) {
  const s = await requireSession(); // não passa 'admin' p/ evitar redirect de visualizador
  if (s.perfil !== 'admin') {
    return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 });
  }

  let body: { filialIds?: unknown };
  try { body = await req.json(); } catch { return NextResponse.json({ error: 'JSON inválido' }, { status: 400 }); }
  const pedidos = Array.isArray(body.filialIds) ? body.filialIds.filter((x): x is string => typeof x === 'string') : [];
  if (pedidos.length === 0) return NextResponse.json({ error: 'Selecione ao menos uma filial' }, { status: 400 });

  const escopo = getFiliaisVisiveis(s); // admin → null (todas)
  const cond = [eq(schema.filiais.ativa, true), inArray(schema.filiais.id, pedidos)];
  if (escopo) cond.push(inArray(schema.filiais.id, escopo));
  const filiais = await db
    .select({ id: schema.filiais.id, codigo: schema.filiais.codigo, nome: schema.filiais.nome })
    .from(schema.filiais)
    .where(and(...cond))
    .orderBy(asc(schema.filiais.codigo));

  if (filiais.length === 0) return NextResponse.json({ error: 'Nenhuma filial válida no seu escopo' }, { status: 400 });

  const ctx = await coletarContexto(escopo);
  const stamp = new Date().toISOString().slice(0, 10);
  const slug = (str: string) => str.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-zA-Z0-9]+/g, '_');

  const decks: { nome: string; bytes: Uint8Array }[] = [];
  const falhas: string[] = [];
  for (const f of filiais) {
    try {
      const dados = coletarFilial(f, ctx);
      decks.push({ nome: `Relatorio_Completo_${f.codigo}_${slug(f.nome)}.pptx`, bytes: await gerarDeckFilial(dados) });
    } catch (e) {
      falhas.push(`${f.codigo} ${f.nome}: ${e instanceof Error ? e.message : 'erro'}`);
    }
  }

  if (decks.length === 0) {
    return NextResponse.json({ error: 'Falha ao gerar todos os decks', detalhes: falhas }, { status: 500 });
  }

  if (decks.length === 1) {
    const [only] = decks;
    return new NextResponse(new Uint8Array(only!.bytes), {
      status: 200,
      headers: {
        'Content-Type': PPTX_MIME,
        'Content-Disposition': `attachment; filename="${only!.nome}"`,
        'Cache-Control': 'no-store',
        ...(falhas.length ? { 'X-Relatorio-Falhas': String(falhas.length) } : {}),
      },
    });
  }

  const zip = new JSZip();
  for (const d of decks) zip.file(d.nome, d.bytes);
  if (falhas.length) zip.file('_falhas.txt', falhas.join('\n'));
  const zipBytes = await zip.generateAsync({ type: 'nodebuffer' });

  return new NextResponse(new Uint8Array(zipBytes), {
    status: 200,
    headers: {
      'Content-Type': 'application/zip',
      'Content-Disposition': `attachment; filename="Relatorio_Completo_Indicadores_${stamp}.zip"`,
      'Cache-Control': 'no-store',
      ...(falhas.length ? { 'X-Relatorio-Falhas': String(falhas.length) } : {}),
    },
  });
}
