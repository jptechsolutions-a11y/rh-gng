import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';
import { requireSession } from '@/lib/auth/session';
import { db } from '@/db/client';
import { sql } from 'drizzle-orm';
import { TopBar } from '@/components/layout/TopBar';
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
      <div className="space-y-5 p-4 lg:p-6">
        <Link
          href="/qlp/quadro"
          className="inline-flex items-center gap-1 text-xs text-conecta-muted hover:text-conecta-accent"
        >
          <ChevronLeft className="h-3.5 w-3.5" /> Voltar ao quadro
        </Link>

        <div className="rounded-2xl bg-white border border-conecta-primary/10 p-4 grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
          <Info label="Filial">
            {colab.filial_codigo ?? colab.codfilial}
            {colab.filial_nome && <div className="text-xs text-conecta-muted">{colab.filial_nome}</div>}
          </Info>
          <Info label="Seção">{colab.secao ?? '—'}</Info>
          <Info label="Situação">
            {colab.situacao ?? '—'}
            {!colab.ativo && (
              <span className="ml-2 rounded-full bg-rose-100 text-rose-700 px-2 py-0.5 text-xs">inativo</span>
            )}
          </Info>
          <Info label="Tier">{colab.tier_resolvido ?? '—'}</Info>
        </div>

        <section>
          <h2 className="font-display text-[11px] uppercase tracking-[0.22em] font-semibold text-conecta-muted mb-2">
            Cadeia de liderança
          </h2>
          <div className="rounded-2xl bg-white border border-conecta-primary/10 p-4">
            {cadeia.length === 0 ? (
              <p className="text-sm text-rose-600">Sem líder atribuído.</p>
            ) : (
              <ol className="flex flex-wrap items-center gap-2">
                {cadeia.map((c, i) => (
                  <li key={c.colaborador_id} className="flex items-center gap-2">
                    {i > 0 && <span className="text-conecta-muted/40">→</span>}
                    <Link
                      href={`/qlp/${c.colaborador_id}`}
                      className="inline-flex items-center gap-2 rounded-full bg-conecta-primary/5 hover:bg-conecta-accent/10 px-3 py-1.5 transition"
                    >
                      <span className="text-[10px] uppercase tracking-wide font-semibold text-conecta-accent">
                        {c.tier}
                      </span>
                      <span className="font-medium text-conecta-primary">{c.nome}</span>
                    </Link>
                  </li>
                ))}
              </ol>
            )}
          </div>
        </section>

        {meuLiderId && (
          <section>
            <h2 className="font-display text-[11px] uppercase tracking-[0.22em] font-semibold text-conecta-muted mb-2">
              Meu time{' '}
              <span className="text-conecta-primary font-bold tabular-nums">({time.length})</span>
            </h2>
            {time.length === 0 ? (
              <p className="rounded-2xl bg-white border border-conecta-primary/10 p-4 text-sm text-conecta-muted">
                Nenhum subordinado vinculado ainda.
              </p>
            ) : (
              <div className="rounded-2xl bg-white border border-conecta-primary/10 overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-conecta-primary/10 text-[11px] uppercase tracking-[0.12em] font-semibold text-conecta-muted">
                      <th className="text-left p-3">Chapa</th>
                      <th className="text-left p-3">Nome</th>
                      <th className="text-left p-3">Função</th>
                      <th className="text-left p-3">Tier</th>
                      <th className="text-right p-3">Nível</th>
                    </tr>
                  </thead>
                  <tbody>
                    {time.map((m) => (
                      <tr key={m.colaboradorId} className="border-b border-conecta-primary/5 hover:bg-conecta-primary/[0.02]">
                        <td className="p-3 font-mono text-xs text-conecta-muted">{m.chapa}</td>
                        <td className="p-3">
                          <Link
                            href={`/qlp/${m.colaboradorId}`}
                            className="font-medium text-conecta-primary hover:text-conecta-accent"
                          >
                            {m.nome}
                          </Link>
                        </td>
                        <td className="p-3 text-conecta-text">{m.funcao}</td>
                        <td className="p-3 text-conecta-text">{m.tier}</td>
                        <td className="p-3 text-right tabular-nums text-conecta-primary font-semibold">{m.nivel}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        )}

        <section>
          <h2 className="font-display text-[11px] uppercase tracking-[0.22em] font-semibold text-conecta-muted mb-2">
            Histórico
          </h2>
          {historico.length === 0 ? (
            <p className="rounded-2xl bg-white border border-conecta-primary/10 p-4 text-sm text-conecta-muted">
              Sem eventos registrados.
            </p>
          ) : (
            <ul className="space-y-1 text-sm">
              {historico.map((h) => (
                <li
                  key={h.id}
                  className="rounded-xl bg-white border border-conecta-primary/10 px-3 py-2 flex items-center gap-2 flex-wrap"
                >
                  <span className="text-xs text-conecta-muted tabular-nums">
                    {new Date(h.created_at).toLocaleString('pt-BR')}
                  </span>
                  <span className="font-medium text-conecta-primary">{h.evento}</span>
                  <span className="text-xs text-conecta-muted">
                    por {h.ator_nome} ({h.ator_tipo})
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </>
  );
}

function Info({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-[0.18em] font-semibold text-conecta-muted">{label}</div>
      <div className="mt-1 text-conecta-primary font-medium">{children}</div>
    </div>
  );
}
