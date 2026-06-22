import { requireSession } from '@/lib/auth/session';
import { db } from '@/db/client';
import { sql } from 'drizzle-orm';
import { TopBar } from '@/components/layout/TopBar';

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
  const s = await requireSession();
  const filialFilter = s.perfil === 'filial' ? s.filialId : null;

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

  const badge =
    s.perfil === 'filial' ? `Filial ${s.filialCodigo}` :
    s.perfil === 'admin'  ? 'ADMIN' :
    (s.escopo === 'nacional' ? 'NACIONAL' : 'REGIONAL');

  return (
    <>
      <TopBar
        titulo="QLP — Histórico"
        subtitulo={`${rows.length} eventos mais recentes`}
        badge={badge}
      />
      <div className="space-y-5 p-4 lg:p-6">
        {rows.length === 0 ? (
          <p className="rounded-2xl bg-white border border-conecta-primary/10 p-6 text-sm text-conecta-muted">
            Nenhum evento registrado ainda.
          </p>
        ) : (
          <div className="rounded-2xl bg-white border border-conecta-primary/10 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-conecta-primary/10 text-[11px] uppercase tracking-[0.12em] font-semibold text-conecta-muted">
                  <th className="text-left p-3 whitespace-nowrap">Quando</th>
                  <th className="text-left p-3">Ator</th>
                  <th className="text-left p-3">Evento</th>
                  <th className="text-left p-3">Colaborador</th>
                  <th className="text-left p-3">Detalhes</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id} className="border-b border-conecta-primary/5 hover:bg-conecta-primary/[0.02] align-top">
                    <td className="p-3 whitespace-nowrap text-conecta-muted tabular-nums text-xs">
                      {new Date(r.created_at).toLocaleString('pt-BR')}
                    </td>
                    <td className="p-3">
                      <span className="font-medium text-conecta-primary">{r.ator_nome}</span>{' '}
                      <span className="text-[10px] uppercase tracking-wide text-conecta-muted">
                        ({r.ator_tipo})
                      </span>
                    </td>
                    <td className="p-3">
                      <span className="rounded-full bg-conecta-primary/5 text-conecta-primary text-[11px] px-2 py-0.5 font-semibold">
                        {EVENTO_LABEL[r.evento] ?? r.evento}
                      </span>
                    </td>
                    <td className="p-3 text-conecta-text">{r.colaborador_nome ?? '—'}</td>
                    <td className="p-3">
                      <details>
                        <summary className="cursor-pointer text-xs text-conecta-muted hover:text-conecta-accent">
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
        )}
      </div>
    </>
  );
}
