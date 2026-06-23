import { requireSession } from '@/lib/auth/session';
import { db } from '@/db/client';
import { sql } from 'drizzle-orm';
import { TopBar } from '@/components/layout/TopBar';
import { ConectaCard, SectionHeader } from '@/components/ui/conecta-card';
import { History } from 'lucide-react';

export const dynamic = 'force-dynamic';

interface HistoricoRow {
  id: string;
  evento: string;
  colaborador_id: string | null;
  lider_id_antigo: string | null;
  lider_id_novo: string | null;
  detalhes: Record<string, unknown> | null;
  ator_tipo: string;
  ator_nome: string;
  filial_contexto_id: string | null;
  created_at: string;
  colaborador_nome: string | null;
}

const EVENTO_LABEL: Record<string, string> = {
  vinculo_criado: 'Vínculo criado',
  vinculo_movido: 'Vínculo movido',
  vinculo_removido: 'Vínculo removido',
  lider_criado: 'Líder criado',
  lider_removido: 'Líder removido',
  lider_escopo_alterado: 'Escopo alterado',
  colaborador_cadastrado: 'Colaborador cadastrado',
  colaborador_mudou_funcao: 'Mudança de tier',
  colaborador_transferido_filial: 'Mudança de filial',
  colaborador_desligado: 'Desligamento',
  import_executado: 'Import executado',
  funcao_reclassificada: 'Função reclassificada',
};

export default async function HistoricoPage() {
  await requireSession('admin');
  const filialFilter = null;

  const rows = (await db.execute(sql`
    SELECT
      h.id, h.evento, h.colaborador_id, h.lider_id_antigo, h.lider_id_novo,
      h.detalhes, h.ator_tipo, h.ator_nome, h.filial_contexto_id, h.created_at,
      c.nome AS colaborador_nome
    FROM qlp_historico h
    LEFT JOIN qlp_colaboradores c ON c.id = h.colaborador_id
    WHERE (${filialFilter}::uuid IS NULL OR h.filial_contexto_id = ${filialFilter}::uuid)
    ORDER BY h.created_at DESC
    LIMIT 500
  `)) as unknown as HistoricoRow[];

  const badge = 'ADMIN';

  return (
    <>
      <TopBar
        titulo="QLP — Histórico"
        subtitulo={`${rows.length} eventos mais recentes`}
        badge={badge}
      />
      <div className="space-y-5 p-4 lg:p-6">
        {rows.length === 0 ? (
          <ConectaCard>
            <p className="text-sm text-conecta-muted">Nenhum evento registrado ainda.</p>
          </ConectaCard>
        ) : (
          <ConectaCard noPadding>
            <div className="p-5 pb-3">
              <SectionHeader
                label={`Eventos recentes (${rows.length})`}
                icon={History}
              />
            </div>
            <div className="overflow-x-auto">
              <table className="conecta-table">
                <thead>
                  <tr>
                    <th>Quando</th>
                    <th>Ator</th>
                    <th>Evento</th>
                    <th>Colaborador</th>
                    <th>Detalhes</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={r.id} className="align-top">
                      <td className="whitespace-nowrap tabular-nums text-conecta-muted text-[12px]">
                        {new Date(r.created_at).toLocaleString('pt-BR')}
                      </td>
                      <td>
                        <span className="font-display font-semibold text-conecta-primary">{r.ator_nome}</span>{' '}
                        <span className="text-[10px] uppercase tracking-[0.14em] text-conecta-muted">
                          ({r.ator_tipo})
                        </span>
                      </td>
                      <td>
                        <span className="text-[10px] uppercase tracking-[0.14em] font-display font-bold px-1.5 py-0.5 rounded bg-conecta-primary/8 text-conecta-primary">
                          {EVENTO_LABEL[r.evento] ?? r.evento}
                        </span>
                      </td>
                      <td className="text-conecta-muted">{r.colaborador_nome ?? '—'}</td>
                      <td>
                        <details>
                          <summary className="cursor-pointer text-xs font-display font-semibold uppercase tracking-[0.14em] text-conecta-muted hover:text-conecta-accent transition-colors">
                            JSON
                          </summary>
                          <pre className="text-xs bg-conecta-primary/[0.03] p-2 mt-1 rounded-lg max-w-md whitespace-pre-wrap break-all">
                            {JSON.stringify(r.detalhes, null, 2)}
                          </pre>
                        </details>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </ConectaCard>
        )}
      </div>
    </>
  );
}
