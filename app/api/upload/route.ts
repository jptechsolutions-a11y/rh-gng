import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { requireSession } from '@/lib/auth/session';
import { randomBytes } from 'crypto';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const MAX = 10 * 1024 * 1024; // 10 MB
const ALLOWED_BUCKETS = new Set(['curriculos', 'laudos']);

function isPdf(buf: Buffer) {
  return buf.length > 4 && buf[0] === 0x25 && buf[1] === 0x50 && buf[2] === 0x44 && buf[3] === 0x46;
}

export async function POST(req: NextRequest) {
  let session;
  try {
    session = await requireSession();
  } catch {
    return NextResponse.json({ erro: 'Unauthorized' }, { status: 401 });
  }

  const form = await req.formData();
  const bucket = String(form.get('bucket') ?? '');
  const file = form.get('file');

  if (!ALLOWED_BUCKETS.has(bucket)) return NextResponse.json({ erro: 'Bucket inválido' }, { status: 400 });
  if (!(file instanceof File)) return NextResponse.json({ erro: 'Arquivo ausente' }, { status: 400 });
  // file.size é confiável (pré-buffer pelo runtime); cortamos cedo para evitar leitura desnecessária.
  if (file.size === 0 || file.size > MAX) return NextResponse.json({ erro: 'Tamanho inválido (max 10MB)' }, { status: 400 });

  const ab = await file.arrayBuffer();
  const buf = Buffer.from(ab);
  // Magic byte é a única verificação confiável; file.type vem do cliente.
  if (!isPdf(buf)) return NextResponse.json({ erro: 'Arquivo não é PDF válido' }, { status: 400 });

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );

  const filialOuAdmin = session.perfil === 'filial' ? session.filialCodigo : 'admin';
  const path = `${filialOuAdmin}/${Date.now()}-${randomBytes(8).toString('hex')}.pdf`;

  const { error } = await supabase.storage.from(bucket).upload(path, buf, {
    contentType: 'application/pdf',
    upsert: false,
  });
  if (error) return NextResponse.json({ erro: error.message }, { status: 500 });

  // URL assinada com download forçado: previne execução de PDFs maliciosos in-browser.
  const { data } = await supabase.storage.from(bucket).createSignedUrl(path, 300, { download: true });
  return NextResponse.json({ path, url: data?.signedUrl });
}
