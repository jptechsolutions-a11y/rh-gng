import { NextResponse } from 'next/server';
import { db } from '@/db/client';
import { sql } from 'drizzle-orm';
import { requireSession } from '@/lib/auth/session';

export async function GET(req: Request) {
  await requireSession();
  const url = new URL(req.url);
  const colaboradorId = url.searchParams.get('colaboradorId');
  if (!colaboradorId) return NextResponse.json([]);

  const rows = await db.execute(sql`
    WITH alvo AS (
      SELECT id, tier_resolvido, filial_id
      FROM qlp_colaboradores
      WHERE id = ${colaboradorId}
    )
    SELECT
      l.id,
      l.tier,
      l.nivel,
      l.escopo_nacional,
      c.nome,
      c.funcao,
      c.codfilial
    FROM qlp_lideres l
    JOIN qlp_colaboradores c ON c.id = l.colaborador_id
    JOIN alvo a ON true
    WHERE l.ativo
      AND (
        l.escopo_nacional
        OR (a.filial_id IS NOT NULL AND a.filial_id::text = ANY(
          SELECT jsonb_array_elements_text(l.filiais_escopo)
        ))
      )
      AND l.tier IN (
        SELECT unnest(
          CASE coalesce(a.tier_resolvido, 'base')
            WHEN 'base'       THEN ARRAY['supervisor','coord','subgerente','gerente']
            WHEN 'supervisor' THEN ARRAY['coord','subgerente','gerente']
            WHEN 'coord'      THEN ARRAY['subgerente','gerente']
            WHEN 'subgerente' THEN ARRAY['gerente']
            ELSE ARRAY[]::text[]
          END
        )
      )
    ORDER BY
      CASE l.tier WHEN 'supervisor' THEN 1 WHEN 'coord' THEN 2 WHEN 'subgerente' THEN 3 WHEN 'gerente' THEN 4 ELSE 5 END,
      c.nome
  `);
  return NextResponse.json(rows);
}
