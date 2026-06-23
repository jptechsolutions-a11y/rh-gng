import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ChevronLeft, ChevronRight, Users, Network, History, IdCard } from 'lucide-react';
import { requireSession } from '@/lib/auth/session';
import { db } from '@/db/client';
import { sql } from 'drizzle-orm';
import { TopBar } from '@/components/layout/TopBar';
import { ConectaCard, SectionHeader } from '@/components/ui/conecta-card';
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

  const ehLiderAtivo = Boolean(meuLiderId);
  const filialLabel = colab.filial_codigo ?? String(colab.codfilial);

  return (
    <>
      <TopBar
        titulo={colab.nome}
        subtitulo={`${colab.chapa} · ${colab.funcao}`}
        badge={badge}
      />
      <div className="space-y-5 p-4 lg:p-6">
        <Link
          href="/qlp/organograma"
          className="inline-flex items-center gap-1 text-[11px] font-display font-semibold uppercase tracking-[0.18em] text-conecta-muted hover:text-conecta-accent transition-colors"
        >
          <ChevronLeft className="h-3.5 w-3.5" /> Voltar ao organograma
        </Link>

        {/* ===== Cartão do líder/colaborador ===== */}
        <ConectaCard variant={ehLiderAtivo ? 'orange' : 'navy'}>
          <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-5">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 mb-2">
                <span className="h-[2px] w-6 bg-conecta-accent" />
                <span className="font-display text-[10px] uppercase tracking-[0.32em] text-conecta-accent font-semibold">
                  {ehLiderAtivo ? 'Líder do time' : 'Colaborador'}
                </span>
              </div>
              <h1 className="font-display text-2xl lg:text-[28px] font-extrabold text-conecta-primary leading-tight tracking-tight">
                {colab.nome}
              </h1>
              <div className="mt-1 flex items-center flex-wrap gap-2 text-[12px] text-conecta-muted">
                <span className="font-mono text-conecta-primary/80">{colab.chapa}</span>
                <span className="text-conecta-muted/40">·</span>
                <span>{colab.funcao}</span>
                {!colab.ativo && (
                  <span className="rounded-full bg-rose-100 text-rose-700 px-2 py-0.5 text-[10px] uppercase tracking-[0.14em] font-display font-bold">
                    inativo
                  </span>
                )}
              </div>

              <div className="mt-5 grid grid-cols-2 sm:grid-cols-4 gap-3">
                <InfoChip label="Função" value={colab.funcao} />
                <InfoChip label="Seção" value={colab.secao ?? '—'} />
                <InfoChip
                  label="Filial"
                  value={filialLabel}
                  hint={colab.filial_nome ?? undefined}
                />
                <InfoChip
                  label="Tier"
                  value={(colab.tier_resolvido ?? '—').toUpperCase()}
                  hint={colab.nivel_resolvido ?? undefined}
                  highlight
                />
              </div>
            </div>

            {ehLiderAtivo && (
              <div className="shrink-0 grid place-items-center bg-conecta-accent/10 text-conecta-accent rounded-2xl px-5 py-4 min-w-[140px]">
                <Users className="h-6 w-6" />
                <div className="font-display text-3xl font-extrabold tabular-nums leading-none mt-1.5">
                  {time.length}
                </div>
                <div className="text-[10px] uppercase tracking-[0.18em] font-display font-semibold mt-1">
                  no time
                </div>
              </div>
            )}
          </div>
        </ConectaCard>

        {/* ===== Cadeia de liderança ===== */}
        <ConectaCard>
          <SectionHeader label="Cadeia de liderança" icon={Network} className="mb-4" />
          {cadeia.length === 0 ? (
            <p className="text-sm font-display font-semibold text-rose-600">
              Sem líder atribuído.
            </p>
          ) : (
            <ol className="flex flex-wrap items-center gap-2">
              {cadeia.map((c, i) => (
                <li key={c.colaborador_id} className="flex items-center gap-2">
                  {i > 0 && <ChevronRight className="h-3.5 w-3.5 text-conecta-muted/40" />}
                  <Link
                    href={`/qlp/${c.colaborador_id}`}
                    className="inline-flex items-center gap-2 rounded-full bg-conecta-primary/5 hover:bg-conecta-accent/10 px-3 py-1.5 transition-colors group"
                  >
                    <span className="text-[10px] uppercase tracking-[0.14em] font-display font-bold text-conecta-accent">
                      {c.tier}
                    </span>
                    <span className="font-display font-semibold text-conecta-primary group-hover:text-conecta-accent transition-colors">
                      {c.nome}
                    </span>
                  </Link>
                </li>
              ))}
            </ol>
          )}
        </ConectaCard>

        {/* ===== Meu time ===== */}
        {ehLiderAtivo && (
          <ConectaCard noPadding>
            <div className="p-5 pb-3">
              <SectionHeader
                label={`Meu time (${time.length})`}
                icon={Users}
              />
            </div>
            {time.length === 0 ? (
              <p className="p-5 text-sm text-conecta-muted">
                Nenhum subordinado vinculado ainda. Use a tela{' '}
                <Link href="/qlp/quadro" className="text-conecta-accent font-display font-semibold hover:underline">
                  Quadro
                </Link>{' '}
                para atribuir colaboradores a este líder.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="conecta-table">
                  <thead>
                    <tr>
                      <th>Chapa</th>
                      <th>Nome</th>
                      <th>Função</th>
                      <th>Tier</th>
                      <th className="text-right">Nível</th>
                    </tr>
                  </thead>
                  <tbody>
                    {time.map((m) => (
                      <tr key={m.colaboradorId}>
                        <td>
                          <span className="font-mono text-[12px] text-conecta-primary/80">{m.chapa}</span>
                        </td>
                        <td>
                          <Link
                            href={`/qlp/${m.colaboradorId}`}
                            className="font-display font-semibold text-conecta-primary hover:text-conecta-accent transition-colors"
                          >
                            {m.nome}
                          </Link>
                        </td>
                        <td className="text-conecta-muted">{m.funcao}</td>
                        <td>
                          <span className="text-[10px] uppercase tracking-[0.14em] font-display font-bold px-1.5 py-0.5 rounded bg-conecta-primary/8 text-conecta-primary">
                            {m.tier}
                          </span>
                        </td>
                        <td className="text-right">
                          <span className="font-display font-bold text-conecta-accent tabular-nums">{m.nivel}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </ConectaCard>
        )}

        {/* ===== Histórico (admin) ===== */}
        {s.perfil === 'admin' && (
          <ConectaCard>
            <SectionHeader label="Histórico" icon={History} className="mb-4" />
            {historico.length === 0 ? (
              <p className="text-sm text-conecta-muted">Sem eventos registrados.</p>
            ) : (
              <ul className="space-y-1.5 text-sm">
                {historico.map((h) => (
                  <li
                    key={h.id}
                    className="rounded-lg bg-conecta-primary/[0.02] border border-conecta-primary/8 px-3 py-2 flex items-center gap-2 flex-wrap"
                  >
                    <span className="text-[11px] text-conecta-muted tabular-nums">
                      {new Date(h.created_at).toLocaleString('pt-BR')}
                    </span>
                    <span className="text-[10px] uppercase tracking-[0.14em] font-display font-bold px-1.5 py-0.5 rounded bg-conecta-primary/8 text-conecta-primary">
                      {h.evento}
                    </span>
                    <span className="text-[11px] text-conecta-muted">
                      por <span className="text-conecta-primary font-display font-semibold">{h.ator_nome}</span> ({h.ator_tipo})
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </ConectaCard>
        )}
      </div>
    </>
  );
}

function InfoChip({
  label,
  value,
  hint,
  highlight = false,
}: {
  label: string;
  value: string;
  hint?: string;
  highlight?: boolean;
}) {
  return (
    <div className={`rounded-lg border px-3 py-2 ${highlight ? 'border-conecta-accent/30 bg-conecta-accent/5' : 'border-conecta-primary/10 bg-conecta-primary/[0.02]'}`}>
      <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-[0.18em] font-display font-semibold text-conecta-muted">
        {label === 'Tier' && <IdCard className="h-3 w-3 text-conecta-accent" />}
        {label}
      </div>
      <div className={`mt-0.5 font-display font-bold leading-tight truncate ${highlight ? 'text-conecta-accent' : 'text-conecta-primary'}`} title={value}>
        {value}
      </div>
      {hint && (
        <div className="text-[11px] text-conecta-muted truncate mt-0.5" title={hint}>
          {hint}
        </div>
      )}
    </div>
  );
}
