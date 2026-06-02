import { desc } from 'drizzle-orm';
import { db, schema } from '@/db/client';
import { requireSession } from '@/lib/auth/session';

export const dynamic = 'force-dynamic';

const COLS = [
  'id','filialId','dataHora','cpf','nome','email','telefone','cidade',
  'cargoPretendido','status','notaGeral','recrutador','atualizadoEm',
] as const;

function csvEscape(v: unknown): string {
  if (v == null) return '';
  const s = String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export async function GET() {
  try {
    await requireSession('admin');
  } catch {
    return new Response('Unauthorized', { status: 401 });
  }

  const rows = await db.select().from(schema.entrevistas).orderBy(desc(schema.entrevistas.dataHora)).limit(50000);

  const head = COLS.join(',');
  const body = rows.map((r) => COLS.map((c) => csvEscape((r as Record<string, unknown>)[c])).join(',')).join('\n');
  const csv = '﻿' + head + '\n' + body;

  return new Response(csv, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="entrevistas-${new Date().toISOString().slice(0,10)}.csv"`,
      'Cache-Control': 'no-store',
    },
  });
}
