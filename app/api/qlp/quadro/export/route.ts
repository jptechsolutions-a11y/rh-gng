import { NextRequest, NextResponse } from 'next/server';
import * as XLSX from 'xlsx';
import { sql } from 'drizzle-orm';
import { db } from '@/db/client';
import { requireSession } from '@/lib/auth/session';

export const dynamic = 'force-dynamic';

interface QuadroExportRow {
  chapa: string;
  nome: string;
  funcao: string;
  secao: string | null;
  filial_codigo: string | null;
  lider_nome: string | null;
  lider_secao: string | null;
}

export async function GET(req: NextRequest) {
  const s = await requireSession();
  const sp = req.nextUrl.searchParams;

  // perfil 'filial' só pode exportar a própria filial, independente da query —
  // mesma regra usada em app/(app)/qlp/quadro/page.tsx.
  const filialSessao = s.perfil === 'filial' ? s.filialId : null;

  const filiaisParam = sp.get('filiais');
  const codigos = filiaisParam
    ? filiaisParam.split(',').map((c) => c.trim()).filter(Boolean)
    : null;

  // postgres.js não converte um array JS em parâmetro `text[]` automaticamente
  // dentro de db.execute(sql`...`) — ANY(${codigos}::text[]) falha com
  // "malformed array literal". Em vez disso, construímos um IN (...)
  // parametrizado com sql.join, mesmo padrão já usado em
  // db/queries/qlp-ocorrencias.ts.
  const filialCondition =
    codigos === null
      ? sql`TRUE`
      : codigos.length === 0
        ? sql`FALSE`
        : sql`f.codigo IN (${sql.join(codigos.map((c) => sql`${c}`), sql`, `)})`;

  const rows = (await db.execute(sql`
    SELECT
      c.chapa, c.nome, c.funcao, c.secao,
      f.codigo AS filial_codigo,
      cl.nome AS lider_nome,
      cl.secao AS lider_secao
    FROM qlp_colaboradores c
    LEFT JOIN qlp_vinculos v ON v.colaborador_id = c.id
    LEFT JOIN qlp_lideres l ON l.id = v.lider_id
    LEFT JOIN qlp_colaboradores cl ON cl.id = l.colaborador_id
    LEFT JOIN filiais f ON f.id = c.filial_id
    WHERE c.ativo
      AND (${filialSessao}::uuid IS NULL OR c.filial_id = ${filialSessao}::uuid)
      AND (${filialCondition})
    ORDER BY c.nome
  `)) as unknown as QuadroExportRow[];

  const data = rows.map((r) => ({
    'Matrícula': r.chapa,
    'Nome': r.nome,
    'Função': r.funcao,
    'Seção': r.secao ?? '',
    'Filial': r.filial_codigo ?? '',
    'Gestor Direto': r.lider_nome ?? '',
    'Seção Gestor': r.lider_secao ?? '',
    'Mesma Seção do Gestor?': !r.lider_nome
      ? 'Sem líder'
      : r.secao && r.lider_secao && r.secao === r.lider_secao
        ? 'Sim'
        : 'Não',
  }));

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(data);
  ws['!cols'] = [
    { wch: 14 }, { wch: 30 }, { wch: 26 }, { wch: 26 },
    { wch: 10 }, { wch: 30 }, { wch: 26 }, { wch: 20 },
  ];
  XLSX.utils.book_append_sheet(wb, ws, 'Quadro');

  const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }) as Buffer;

  const stamp = new Intl.DateTimeFormat('pt-BR', { timeZone: 'America/Sao_Paulo' })
    .format(new Date())
    .replace(/\//g, '-');
  const filename = `Quadro QLP ${stamp}.xlsx`;

  return new NextResponse(new Uint8Array(buf), {
    status: 200,
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Cache-Control': 'no-store',
    },
  });
}
