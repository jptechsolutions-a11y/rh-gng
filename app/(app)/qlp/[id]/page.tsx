import { notFound } from 'next/navigation';
import Link from 'next/link';
import { requireSession } from '@/lib/auth/session';
import { db } from '@/db/client';
import { sql } from 'drizzle-orm';
import { getTimeEfetivo } from '@/db/queries/qlp';

export const dynamic = 'force-dynamic';

interface ColabDetalhe {
  id: string;
  chapa: string;
  nome: string;
  funcao: string;
  secao: string | null;
  situacao: string | null;
  regional: string | null;
  codfilial: number;
  filial_codigo: string | null;
  filial_nome: string | null;
  dt_admissao: string | null;
  idade: number | null;
  tier_resolvido: string | null;
  nivel_resolvido: string | null;
  trilha_resolvida: string | null;
  ativo: boolean;
  lider_id: string | null;
}

interface CadeiaItem {
  nivel: number;
  tier: string;
  nome: string;
  funcao: string;
  colaborador_id: string;
}

interface HistoricoItem {
  id: string;
  evento: string;
  detalhes: Record<string, unknown> | null;
  ator_nome: string;
  ator_tipo: string;
  created_at: string;
}

export default async function DetalhePage({ params }: { params: Promise<{ id: string }> }) {
  await requireSession();
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
  `)) as unknown as ColabDetalhe[];

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
  `)) as unknown as CadeiaItem[];

  const historico = (await db.execute(sql`
    SELECT id, evento, detalhes, ator_nome, ator_tipo, created_at
    FROM qlp_historico
    WHERE colaborador_id = ${id}
    ORDER BY created_at DESC
    LIMIT 100
  `)) as unknown as HistoricoItem[];

  const ehLider = await db.execute(sql`
    SELECT id FROM qlp_lideres WHERE colaborador_id = ${id} AND ativo
  `);
  const meuLiderId = (ehLider as unknown as { id: string }[])[0]?.id;
  const time = meuLiderId ? await getTimeEfetivo(meuLiderId) : [];

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <Link href="/qlp/quadro" className="hover:underline">← Voltar ao quadro</Link>
        </div>
        <h1 className="text-2xl font-semibold text-slate-900">{colab.nome}</h1>
        <p className="text-sm text-slate-600">
          <span className="font-mono text-xs">{colab.chapa}</span> · {colab.funcao}
          {colab.secao && <> · {colab.secao}</>}
        </p>
        <p className="text-xs text-slate-500">
          Filial {colab.filial_codigo ?? colab.codfilial}
          {colab.filial_nome && <> — {colab.filial_nome}</>} · {colab.situacao ?? '—'}
          {!colab.ativo && <span className="ml-2 rounded bg-rose-100 text-rose-700 px-1.5 py-0.5">inativo</span>}
        </p>
      </header>

      <section>
        <h2 className="text-lg font-semibold text-slate-900 mb-2">Cadeia de liderança</h2>
        {cadeia.length === 0 ? (
          <p className="text-sm text-rose-600">Sem líder atribuído.</p>
        ) : (
          <ol className="space-y-1">
            {cadeia.map((c) => (
              <li key={c.colaborador_id}>
                <Link
                  href={`/qlp/${c.colaborador_id}`}
                  className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 hover:bg-slate-50"
                >
                  <span className="text-xs rounded bg-slate-100 text-slate-700 px-2 py-0.5">[{c.tier}]</span>
                  <span className="font-medium text-slate-900">{c.nome}</span>
                  <span className="text-xs text-slate-500">{c.funcao}</span>
                </Link>
              </li>
            ))}
          </ol>
        )}
      </section>

      {meuLiderId && (
        <section>
          <h2 className="text-lg font-semibold text-slate-900 mb-2">
            Meu time <span className="text-sm font-normal text-slate-500">({time.length} pessoas)</span>
          </h2>
          {time.length === 0 ? (
            <p className="text-sm text-slate-500">Nenhum subordinado vinculado ainda.</p>
          ) : (
            <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-slate-50">
                  <tr className="border-b border-slate-200 text-slate-600">
                    <th className="text-left p-3 font-medium">Chapa</th>
                    <th className="text-left p-3 font-medium">Nome</th>
                    <th className="text-left p-3 font-medium">Função</th>
                    <th className="text-left p-3 font-medium">Tier</th>
                    <th className="text-right p-3 font-medium">Nível</th>
                  </tr>
                </thead>
                <tbody>
                  {time.map((m) => (
                    <tr key={m.colaboradorId} className="border-b border-slate-100 hover:bg-slate-50">
                      <td className="p-3 font-mono text-xs text-slate-600">{m.chapa}</td>
                      <td className="p-3">
                        <Link href={`/qlp/${m.colaboradorId}`} className="font-medium text-slate-900 hover:underline">
                          {m.nome}
                        </Link>
                      </td>
                      <td className="p-3 text-slate-700">{m.funcao}</td>
                      <td className="p-3 text-slate-700">{m.tier}</td>
                      <td className="p-3 text-right tabular-nums">{m.nivel}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}

      <section>
        <h2 className="text-lg font-semibold text-slate-900 mb-2">Histórico</h2>
        {historico.length === 0 ? (
          <p className="text-sm text-slate-500">Sem eventos registrados.</p>
        ) : (
          <ul className="space-y-1 text-sm">
            {historico.map((h) => (
              <li key={h.id} className="rounded border border-slate-200 bg-white p-2">
                <span className="text-xs text-slate-500 tabular-nums">
                  {new Date(h.created_at).toLocaleString('pt-BR')}
                </span>{' '}
                <span className="font-medium text-slate-900">{h.evento}</span>{' '}
                <span className="text-xs text-slate-500">
                  por {h.ator_nome} ({h.ator_tipo})
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
