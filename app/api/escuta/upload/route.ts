import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { requireSession } from '@/lib/auth/session';
import { randomBytes } from 'crypto';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const MAX = 10 * 1024 * 1024;
const BUCKET = 'escuta-evidencias';
const ALLOWED_MIME = new Set(['image/jpeg', 'image/png', 'image/jpg']);

function isJpegOrPng(buf: Buffer) {
  // JPEG: FF D8 FF · PNG: 89 50 4E 47
  return (
    (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) ||
    (buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47)
  );
}

export async function POST(req: NextRequest) {
  let session;
  try { session = await requireSession(); }
  catch { return NextResponse.json({ erro: 'Unauthorized' }, { status: 401 }); }

  const form = await req.formData();
  const file = form.get('file');
  if (!(file instanceof File)) return NextResponse.json({ erro: 'Arquivo ausente' }, { status: 400 });
  if (file.size === 0 || file.size > MAX) return NextResponse.json({ erro: 'Tamanho inválido (max 10MB)' }, { status: 400 });
  if (!ALLOWED_MIME.has(file.type)) return NextResponse.json({ erro: 'Tipo inválido (JPG/PNG)' }, { status: 400 });

  const buf = Buffer.from(await file.arrayBuffer());
  if (!isJpegOrPng(buf)) return NextResponse.json({ erro: 'Arquivo não é uma imagem válida' }, { status: 400 });

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );

  const owner = session.perfil === 'filial' ? session.filialCodigo : 'admin';
  const ext = file.type === 'image/png' ? 'png' : 'jpg';
  const path = `${owner}/tmp/${Date.now()}-${randomBytes(8).toString('hex')}.${ext}`;

  const { error } = await supabase.storage.from(BUCKET).upload(path, buf, {
    contentType: file.type,
    upsert: false,
  });
  if (error) return NextResponse.json({ erro: error.message }, { status: 500 });

  return NextResponse.json({ path, size: file.size });
}
