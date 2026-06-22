import { requireSession } from '@/lib/auth/session';
import { db } from '@/db/client';
import { sql } from 'drizzle-orm';
import { TopBar } from '@/components/layout/TopBar';
import { NovoLiderForm, type CandidatoColab } from '@/components/qlp/NovoLiderForm';
import { LiderActions } from '@/components/qlp/LiderActions';
import { SeedLideresButton } from '@/components/qlp/SeedLideresButton';

export const dynamic = 'force-dynamic';

interface LiderRow {
  id: string;
  tier: string;
  nivel: string | null;
  escopo_nacional: boolean;
  filiais_escopo: string[];
  nome: string;
  funcao: string;
  chapa: string;
  codfilial: number;
  colaborador_filial_id: string | null;
  diretos: number;
}

interface FilialRow {
  id: string;
  codigo: string;
  nome: string;
  regional: string | null;
}

export default async function LideresPage() {
  await requireSession('admin');

  const [lideresRaw, filiaisRaw, candidatosRaw] = await Promise.all([
    db.execute(sql`
      SELECT
        l.id, l.tier, l.nivel, l.escopo_nacional, l.filiais_escopo,
        c.nome, c.funcao, c.chapa, c.codfilial,
        c.filial_id AS colaborador_filial_id,
        (SELECT count(*) FROM qlp_vinculos v WHERE v.lider_id = l.id)::int AS diretos
      FROM qlp_lideres l
      JOIN qlp_colaboradores c ON c.id = l.colaborador_id
      WHERE l.ativo
      ORDER BY
        CASE l.tier WHEN 'gerente' THEN 1 WHEN 'subgerente' THEN 2 WHEN 'coord' THEN 3 ELSE 4 END,
        l.nivel NULLS LAST,
        c.nome
    `),
    db.execute(sql`
      SELECT id, codigo, nome, regional FROM filiais WHERE ativa ORDER BY codigo
    `),
    db.execute(sql`
      SELECT c.id, c.chapa, c.nome, c.funcao, c.codfilial, c.filial_id,
             c.tier_resolvido, c.nivel_resolvido
      FROM qlp_colaboradores c
      WHERE c.ativo
        AND NOT EXISTS (
          SELECT 1 FROM qlp_lideres l
          WHERE l.colaborador_id = c.id AND l.ativo
        )
      ORDER BY c.nome
    `),
  ]);

  const lideres = lideresRaw as unknown as LiderRow[];
  const filiais = filiaisRaw as unknown as FilialRow[];
  const candidatos = candidatosRaw as unknown as CandidatoColab[];

  return (
    <>
      <TopBar
        titulo="QLP — Líderes"
        subtitulo={`${lideres.length} líderes cadastrados · ${candidatos.length} colaboradores ativos no quadro`}
        badge="ADMIN"
      />
      <div className="space-y-5 p-4 lg:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <SeedLideresButton />
          <NovoLiderForm filiais={filiais} candidatos={candidatos} />
        </div>

        {lideres.length === 0 ? (
          <div className="rounded-2xl bg-white border border-conecta-primary/10 p-6 text-sm text-conecta-muted space-y-2">
            <p>Nenhum líder cadastrado ainda.</p>
            <p>
              <strong className="text-conecta-primary">Sugestão:</strong> clique em{' '}
              <strong className="text-conecta-primary">⚡ Pré-preencher do quadro</strong> para criar
              automaticamente os líderes a partir das funções classificadas (gerentes / subgerentes / coords).
            </p>
          </div>
        ) : (
          <div className="rounded-2xl bg-white border border-conecta-primary/10 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-conecta-primary/10 text-[11px] uppercase tracking-[0.12em] font-semibold text-conecta-muted">
                  <th className="text-left p-3">Nome</th>
                  <th className="text-left p-3">Função</th>
                  <th className="text-left p-3">Chapa</th>
                  <th className="text-left p-3">Tier</th>
                  <th className="text-left p-3">Nível</th>
                  <th className="text-left p-3">Escopo</th>
                  <th className="text-right p-3">Diretos</th>
                  <th className="text-right p-3">Ações</th>
                </tr>
              </thead>
              <tbody>
                {lideres.map((l) => (
                  <tr key={l.id} className="border-b border-conecta-primary/5 hover:bg-conecta-primary/[0.02]">
                    <td className="p-3 font-medium text-conecta-primary">{l.nome}</td>
                    <td className="p-3 text-conecta-text">{l.funcao}</td>
                    <td className="p-3 font-mono text-xs text-conecta-muted">{l.chapa}</td>
                    <td className="p-3">
                      <span className="rounded-full bg-conecta-primary/5 text-conecta-primary text-[11px] px-2 py-0.5 font-semibold">
                        {l.tier}
                      </span>
                    </td>
                    <td className="p-3 text-conecta-text">{l.nivel ?? '—'}</td>
                    <td className="p-3">
                      {l.escopo_nacional ? (
                        <span className="rounded-full bg-violet-100 text-violet-900 text-[10px] uppercase tracking-wide px-2 py-0.5">
                          Nacional
                        </span>
                      ) : (
                        <span className="text-conecta-text">{(l.filiais_escopo ?? []).length} filial(is)</span>
                      )}
                    </td>
                    <td className="p-3 text-right tabular-nums font-semibold text-conecta-primary">{l.diretos}</td>
                    <td className="p-3">
                      <LiderActions
                        liderId={l.id}
                        nome={l.nome}
                        funcao={l.funcao}
                        tier={l.tier}
                        nivel={l.nivel}
                        escopoNacional={l.escopo_nacional}
                        filiaisEscopo={l.filiais_escopo ?? []}
                        colaboradorFilialId={l.colaborador_filial_id}
                        filiais={filiais}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}
