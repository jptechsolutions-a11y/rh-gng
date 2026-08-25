'use client';

import { useEffect, useMemo, useState, useTransition } from 'react';
import { Users, Search } from 'lucide-react';
import { ConectaCard, SectionHeader } from '@/components/ui/conecta-card';
import { atualizarStatusVaga } from '@/actions/vagas/vagas';
import type { VagaStatus } from '@/db/schema';

export interface VagaRow {
  id: string;
  filialCodigo: string;
  filialNome: string;
  funcao: string;
  secao: string | null;
  statusId: string;
  statusNome: string;
  statusAtualizadoEm: string;
  statusAtualizadoPorNome: string | null;
  limite: number;
  potencial: number;
  alocados: number;
  afastados: number;
}

export function VagasQuadroTable({
  rows,
  statusOptions,
  podeEditar,
}: {
  rows: VagaRow[];
  statusOptions: VagaStatus[];
  podeEditar: boolean;
}) {
  const [busca, setBusca] = useState('');
  const [filialFiltro, setFilialFiltro] = useState('');
  const [statusFiltro, setStatusFiltro] = useState('');
  const [localRows, setLocalRows] = useState(rows);
  const [pending, start] = useTransition();
  const [erroId, setErroId] = useState<string | null>(null);

  useEffect(() => {
    setLocalRows(rows);
  }, [rows]);

  const filiaisList = useMemo(() => {
    const set = new Set(localRows.map((r) => r.filialCodigo));
    return Array.from(set).sort();
  }, [localRows]);

  const filtradas = useMemo(() => {
    const q = busca.trim().toLowerCase();
    return localRows.filter((r) => {
      if (filialFiltro && r.filialCodigo !== filialFiltro) return false;
      if (statusFiltro && r.statusId !== statusFiltro) return false;
      if (q && !`${r.funcao} ${r.secao ?? ''}`.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [localRows, busca, filialFiltro, statusFiltro]);

  function onMudarStatus(vagaId: string, statusId: string) {
    setErroId(null);
    const anterior = localRows;
    const status = statusOptions.find((s) => s.id === statusId);
    setLocalRows((l) =>
      l.map((r) => (r.id === vagaId ? { ...r, statusId, statusNome: status?.nome ?? r.statusNome } : r)),
    );
    start(async () => {
      try {
        await atualizarStatusVaga(vagaId, statusId);
      } catch (e) {
        setLocalRows(anterior);
        setErroId(e instanceof Error ? e.message : 'erro ao atualizar status');
      }
    });
  }

  return (
    <ConectaCard noPadding>
      <div className="p-5 pb-3 space-y-3">
        <SectionHeader
          label="Vagas em aberto"
          icon={Users}
          action={
            <span className="text-[11px] font-display font-semibold tabular-nums text-conecta-muted">
              {filtradas.length} / {localRows.length}
            </span>
          }
        />
        <div className="flex flex-wrap gap-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-conecta-muted" />
            <input
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Buscar função/seção…"
              className="rounded-lg border border-conecta-primary/15 pl-8 pr-3 py-1.5 text-sm"
            />
          </div>
          <select value={filialFiltro} onChange={(e) => setFilialFiltro(e.target.value)} className="rounded-lg border border-conecta-primary/15 px-3 py-1.5 text-sm">
            <option value="">Todas as filiais</option>
            {filiaisList.map((f) => <option key={f} value={f}>{f}</option>)}
          </select>
          <select value={statusFiltro} onChange={(e) => setStatusFiltro(e.target.value)} className="rounded-lg border border-conecta-primary/15 px-3 py-1.5 text-sm">
            <option value="">Todos os status</option>
            {statusOptions.map((s) => <option key={s.id} value={s.id}>{s.nome}</option>)}
          </select>
        </div>
      </div>

      {erroId && (
        <div className="mx-5 mb-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-900 p-2 text-xs">{erroId}</div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-[10px] uppercase tracking-[0.14em] text-conecta-muted border-t border-conecta-primary/8">
              <th className="px-5 py-2">Filial</th>
              <th className="px-5 py-2">Função</th>
              <th className="px-5 py-2">Seção</th>
              <th className="px-5 py-2">Limite/Alocados</th>
              <th className="px-5 py-2">Status</th>
              <th className="px-5 py-2">Atualizado</th>
            </tr>
          </thead>
          <tbody>
            {filtradas.map((r) => (
              <tr key={r.id} className="border-t border-conecta-primary/6 hover:bg-slate-50/60">
                <td className="px-5 py-2.5 font-mono text-xs">{r.filialCodigo}</td>
                <td className="px-5 py-2.5 font-display font-semibold text-conecta-primary">{r.funcao}</td>
                <td className="px-5 py-2.5 text-conecta-muted">{r.secao ?? '—'}</td>
                <td className="px-5 py-2.5 tabular-nums text-conecta-muted">{r.limite} / {r.alocados}</td>
                <td className="px-5 py-2.5">
                  {podeEditar ? (
                    <select
                      value={r.statusId}
                      disabled={pending}
                      onChange={(e) => onMudarStatus(r.id, e.target.value)}
                      className="rounded-lg border border-conecta-primary/15 px-2 py-1 text-xs"
                    >
                      {statusOptions.map((s) => (
                        <option key={s.id} value={s.id}>{s.nome}</option>
                      ))}
                    </select>
                  ) : (
                    <span className="text-xs">{r.statusNome}</span>
                  )}
                </td>
                <td className="px-5 py-2.5 text-xs text-conecta-muted">
                  {new Date(r.statusAtualizadoEm).toLocaleDateString('pt-BR')}
                  {r.statusAtualizadoPorNome ? ` · ${r.statusAtualizadoPorNome}` : ''}
                </td>
              </tr>
            ))}
            {filtradas.length === 0 && (
              <tr>
                <td colSpan={6} className="px-5 py-8 text-center text-conecta-muted text-sm">
                  Nenhuma vaga encontrada.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </ConectaCard>
  );
}
