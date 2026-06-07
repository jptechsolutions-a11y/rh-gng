import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { requireSession } from '@/lib/auth/session';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const BUCKET = 'escuta-evidencias';

export async function GET(req: NextRequest) {
  let session;
  try {
    session = await requireSession();
  } catch {
    return NextResponse.json({ erro: 'Unauthorized' }, { status: 401 });
  }

  const path = req.nextUrl.searchParams.get('path');
  if (!path || path.includes('..') || path.startsWith('/')) {
    return NextResponse.json({ erro: 'Path inválido' }, { status: 400 });
  }

  // Filial só pode acessar fotos do próprio "owner" (filial_codigo); admin acessa tudo.
  if (session.perfil === 'filial') {
    const [owner] = path.split('/', 1);
    if (owner !== session.filialCodigo) {
      return NextResponse.json({ erro: 'Forbidden' }, { status: 403 });
    }
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );

  const { data, error } = await supabase.storage.from(BUCKET).download(path);
  if (error || !data) {
    return NextResponse.json({ erro: error?.message ?? 'Foto não encontrada' }, { status: 404 });
  }

  const buf = Buffer.from(await data.arrayBuffer());
  const contentType = data.type || 'application/octet-stream';
  return new NextResponse(buf, {
    status: 200,
    headers: {
      'Content-Type': contentType,
      'Content-Length': String(buf.length),
      'Cache-Control': 'private, max-age=300',
    },
  });
}
