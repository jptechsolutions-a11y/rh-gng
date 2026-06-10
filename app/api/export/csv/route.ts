import { desc } from 'drizzle-orm';
import { db, schema } from '@/db/client';
import { requireSession } from '@/lib/auth/session';

export const dynamic = 'force-dynamic';

const COLS = [
  'id','filialId','dataHora','cpf','nome',
  'cargoPretendido','status','parecer','notaGeral','recrutador','atualizadoEm',
] as const;

// CSV-injection-safe escape: aspas as necessárias + prefix `'` quando o valor
// começa com caractere interpretado como fórmula por Excel/LibreOffice.
function csvEscape(v: unknown): string {
  if (v == null) return '';
  const s = String(v);
  const dangerous = /^[=+\-@\t\r]/.test(s);
  const body = dangerous ? `'${s}` : s;
  return /[",\n]/.test(body) ? `"${body.replace(/"/g, '""')}"` : body;
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
