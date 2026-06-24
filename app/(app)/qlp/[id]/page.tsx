import { notFound } from 'next/navigation';
import { requireSession } from '@/lib/auth/session';
import { db } from '@/db/client';
import { sql } from 'drizzle-orm';
import { TopBar } from '@/components/layout/TopBar';
import { GestorDetalheView } from '@/components/qlp/GestorDetalheView';
import { getOcorrenciasResumo, getOcorrenciasPorColaborador } from '@/db/queries/qlp-ocorrencias';

export const dynamic = 'force-dynamic';

export default async function DetalhePage({ params }: { params: Promise<{ id: string }> }) {
  const s = await requireSession();
  const { id } = await params;

  const colabRows = (await db.execute(sql`
    SELECT
      c.id, c.chapa, c.nome, c.funcao, c.secao, c.situacao,
      c.regional, c.codfilial, c.dt_admissao, c.idade,
      c.tier_resolvido, c.nivel_resolvido, c.trilha_resolvida, c.ativo,
      f.codigo AS filial_codigo,
      f.nome   AS filial_nome,
      v.lider_id
    FROM qlp_colaboradores c
    LEFT JOIN filiais f ON f.id = c.filial_id
    LEFT JOIN qlp_vinculos v ON v.colaborador_id = c.id
    WHERE c.id = ${id}
  `)) as unknown as {
    id: string; chapa: string; nome: string; funcao: string;
    secao: string | null; situacao: string | null; regional: string | null;
    codfilial: number; filial_codigo: string | null; filial_nome: string | null;
    dt_admissao: string | null; idade: number | null;
    tier_resolvido: string | null; nivel_resolvido: string | null;
    trilha_resolvida: string | null; ativo: boolean; lider_id: string | null;
  }[];

  const colab = colabRows[0];
  if (!colab) notFound();

  const cadeia = (await db.execute(sql`
    WITH RECURSIVE chain AS (
      SELECT 1 AS nivel, l.id AS lider_id, l.colaborador_id AS topo_colab_id, l.tier
      FROM qlp_vinculos v
      JOIN qlp_lideres l ON l.id = v.lider_id
      WHERE v.colaborador_id = ${id}
      UNION ALL
      SELECT ch.nivel + 1, l2.id, l2.colaborador_id, l2.tier
      FROM chain ch
      JOIN qlp_vinculos v2 ON v2.colaborador_id = ch.topo_colab_id
      JOIN qlp_lideres l2 ON l2.id = v2.lider_id
    )
    SELECT ch.nivel, ch.tier, c.nome, c.funcao, c.id AS colaborador_id
    FROM chain ch
    JOIN qlp_colaboradores c ON c.id = ch.topo_colab_id
    ORDER BY ch.nivel
  `)) as unknown as { nivel: number; tier: string; nome: string; funcao: string; colaborador_id: string }[];

  const historico = (await db.execute(sql`
    SELECT id, evento, detalhes, ator_nome, ator_tipo, created_at
    FROM qlp_historico
    WHERE colaborador_id = ${id}
    ORDER BY created_at DESC
    LIMIT 100
  `)) as unknown as { id: string; evento: string; ator_nome: string; ator_tipo: string; created_at: string }[];

  const ehLider = await db.execute(sql`
    SELECT id FROM qlp_lideres WHERE colaborador_id = ${id} AND ativo
  `);
  const meuLiderId = (ehLider as unknown as { id: string }[])[0]?.id;
  const [ocorrenciasResumo, time] = meuLiderId
    ? await Promise.all([
        getOcorrenciasResumo(meuLiderId),
        getOcorrenciasPorColaborador(meuLiderId),
      ])
    : [null, []];

  const badge =
    s.perfil === 'filial' ? `Filial ${s.filialCodigo}` :
    s.perfil === 'admin'  ? 'ADMIN' :
    (s.escopo === 'nacional' ? 'NACIONAL' : 'REGIONAL');

  return (
    <>
      <TopBar
        titulo={colab.nome}
        subtitulo={`${colab.chapa} · ${colab.funcao}`}
        badge={badge}
      />
      <GestorDetalheView
        colab={{
          nome: colab.nome,
          chapa: colab.chapa,
          funcao: colab.funcao,
          secao: colab.secao,
          ativo: colab.ativo,
          filialLabel: colab.filial_codigo ?? String(colab.codfilial),
          filialNome: colab.filial_nome,
          tierResolvido: colab.tier_resolvido,
          nivelResolvido: colab.nivel_resolvido,
        }}
        ehLiderAtivo={Boolean(meuLiderId)}
        ocorrenciasResumo={ocorrenciasResumo}
        time={time}
        cadeia={cadeia.map((c) => ({
          nivel: c.nivel,
          tier: c.tier,
          nome: c.nome,
          funcao: c.funcao,
          colaboradorId: c.colaborador_id,
        }))}
        historico={historico.map((h) => ({
          id: h.id,
          evento: h.evento,
          atorNome: h.ator_nome,
          atorTipo: h.ator_tipo,
          createdAt: h.created_at,
        }))}
        isAdmin={s.perfil === 'admin'}
      />
    </>
  );
}
