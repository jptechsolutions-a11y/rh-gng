import { NextResponse } from 'next/server';
import { db } from '@/db/client';
import { qlpColaboradores } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { requireSession } from '@/lib/auth/session';

export async function GET(req: Request) {
  await requireSession('admin');
  const url = new URL(req.url);
  const chapa = url.searchParams.get('chapa')?.trim() ?? '';
  if (!chapa) return NextResponse.json(null);
  const c = await db.query.qlpColaboradores.findFirst({
    where: eq(qlpColaboradores.chapa, chapa),
  });
  return NextResponse.json(c ?? null);
}
