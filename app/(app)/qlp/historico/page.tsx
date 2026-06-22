import { requireSession } from '@/lib/auth/session';
import { db } from '@/db/client';
import { sql } from 'drizzle-orm';

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

  return (
    <div className="space-y-4">
      <header>
        <h1 className="text-2xl font-semibold text-slate-900">Histórico</h1>
        <p className="text-sm text-slate-500 mt-1">Últimas 500 movimentações registradas.</p>
      </header>

      {rows.length === 0 ? (
        <p className="text-sm text-slate-500">Nenhum evento registrado ainda.</p>
      ) : (
        <div className="rounded-2xl border border-slate-200 bg-white overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50">
              <tr className="border-b border-slate-200 text-slate-600">
                <th className="text-left p-3 font-medium whitespace-nowrap">Quando</th>
                <th className="text-left p-3 font-medium">Ator</th>
                <th className="text-left p-3 font-medium">Evento</th>
                <th className="text-left p-3 font-medium">Colaborador</th>
                <th className="text-left p-3 font-medium">Detalhes</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-b border-slate-100 hover:bg-slate-50 align-top">
                  <td className="p-3 whitespace-nowrap text-slate-600 tabular-nums">
                    {new Date(r.created_at).toLocaleString('pt-BR')}
                  </td>
                  <td className="p-3 text-slate-700">
                    {r.ator_nome}{' '}
                    <span className="text-xs text-slate-500">({r.ator_tipo})</span>
                  </td>
                  <td className="p-3">
                    <span className="rounded bg-slate-100 text-slate-700 text-xs px-2 py-0.5">
                      {EVENTO_LABEL[r.evento] ?? r.evento}
                    </span>
                  </td>
                  <td className="p-3 text-slate-700">{r.colaborador_nome ?? '—'}</td>
                  <td className="p-3">
                    <details>
                      <summary className="cursor-pointer text-xs text-slate-500">JSON</summary>
                      <pre className="text-xs bg-slate-50 p-2 mt-1 rounded max-w-md whitespace-pre-wrap break-all">
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
  );
}
