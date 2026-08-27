'use client';

import { useMemo, useState, useTransition } from 'react';
import { Search, X } from 'lucide-react';
import { atualizarStatusVagasEmLote } from '@/actions/vagas/vagas';
import type { VagaRow } from './VagasQuadroTable';
import type { VagaStatus } from '@/db/schema';

export function AtualizarStatusEmLoteModal({
  vagas,
  statusOptions,
  onClose,
  onAplicado,
}: {
  vagas: VagaRow[];
  statusOptions: VagaStatus[];
  onClose: () => void;
  /** Chamado após aplicar com sucesso, para o pai atualizar o estado local sem recarregar a página. */
  onAplicado: (vagaIds: string[], statusId: string) => void;
}) {
  const [busca, setBusca] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [statusIdSel, setStatusIdSel] = useState('');
  const [erro, setErro] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const filtradas = useMemo(() => {
    const q = busca.trim().toLowerCase();
    if (!q) return vagas;
    return vagas.filter((v) =>
      `${v.filialCodigo} ${v.funcao} ${v.secao ?? ''} ${v.statusNome}`.toLowerCase().includes(q),
    );
  }, [vagas, busca]);

  function alternarTodos() {
    if (selectedIds.size === filtradas.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filtradas.map((v) => v.id)));
    }
  }

  function alternarUm(id: string) {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  }

  function submit() {
    setErro(null);
    if (selectedIds.size === 0) {
      setErro('selecione ao menos uma vaga');
      return;
    }
    if (!statusIdSel) {
      setErro('selecione o novo status');
      return;
    }

    const ids = Array.from(selectedIds);
    start(async () => {
      try {
        await atualizarStatusVagasEmLote(ids, statusIdSel);
        onAplicado(ids, statusIdSel);
        onClose();
      } catch (e) {
        setErro(e instanceof Error ? e.message : 'erro ao salvar');
      }
    });
  }

  return (
    <div className="fixed inset-0 bg-conecta-primary/30 backdrop-blur-sm grid place-items-center z-50 p-4">
      <div className="bg-white rounded-2xl p-6 w-full max-w-2xl space-y-4 shadow-2xl border border-conecta-primary/10 max-h-[90vh] flex flex-col">
        <div>
          <h2 className="font-display text-lg font-extrabold text-conecta-primary">
            Atualizar Status em Lote
          </h2>
          <p className="text-xs text-conecta-muted leading-tight mt-0.5">
            Selecione as vagas e o novo status a aplicar em todas de uma vez.
          </p>
        </div>

        <div className="flex-1 flex flex-col min-h-0 space-y-2">
          <div className="flex justify-between items-center gap-2">
            <label className="text-[10px] uppercase tracking-[0.18em] font-semibold text-conecta-primary">
              Vagas ({vagas.length})
            </label>
            <button
              type="button"
              onClick={alternarTodos}
              className="text-xs text-conecta-accent hover:underline font-semibold"
            >
              {selectedIds.size === filtradas.length && filtradas.length > 0 ? 'Desmarcar todas' : 'Marcar todas filtradas'}
            </button>
          </div>

          <div className="relative">
            <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-conecta-accent pointer-events-none" />
            <input
              type="search"
              autoFocus
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Buscar por filial, função, seção ou status atual…"
              className="w-full rounded-lg border border-conecta-primary/15 bg-white pl-9 pr-9 py-2 text-sm focus:outline-none focus:border-conecta-accent focus:ring-2 focus:ring-conecta-accent/25"
            />
            {busca && (
              <button
                type="button"
                aria-label="Limpar busca"
                onClick={() => setBusca('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-conecta-muted hover:text-conecta-accent"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          <div className="flex-1 min-h-[150px] overflow-y-auto border border-conecta-primary/10 rounded-lg divide-y divide-conecta-primary/5 bg-conecta-primary/[0.01]">
            {filtradas.length === 0 ? (
              <p className="text-xs text-conecta-muted p-4 text-center">Nenhuma vaga encontrada.</p>
            ) : (
              filtradas.map((v) => {
                const isChecked = selectedIds.has(v.id);
                return (
                  <label
                    key={v.id}
                    className="flex items-start gap-3 p-2.5 hover:bg-conecta-primary/[0.03] transition cursor-pointer select-none"
                  >
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => alternarUm(v.id)}
                      className="mt-1 accent-conecta-accent"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-conecta-primary truncate">{v.funcao}</span>
                        <span className="text-[10px] text-conecta-muted bg-conecta-primary/5 rounded-full px-2 py-0.5 font-mono">
                          {v.filialCodigo}
                        </span>
                      </div>
                      <div className="text-xs text-conecta-muted truncate mt-0.5">
                        {v.secao ?? 'Sem seção'} · Status atual: <span className="font-semibold">{v.statusNome}</span>
                      </div>
                    </div>
                  </label>
                );
              })
            )}
          </div>
          {selectedIds.size > 0 && (
            <p className="text-[10px] text-conecta-accent font-semibold">
              {selectedIds.size} vaga(s) selecionada(s).
            </p>
          )}
        </div>

        <div>
          <label className="block text-[10px] uppercase tracking-[0.18em] font-semibold text-conecta-primary mb-1">
            Novo status
          </label>
          <select
            value={statusIdSel}
            onChange={(e) => setStatusIdSel(e.target.value)}
            className="w-full rounded-lg border border-conecta-primary/15 bg-white px-3 py-2 text-sm focus:outline-none focus:border-conecta-accent focus:ring-2 focus:ring-conecta-accent/25"
          >
            <option value="">Selecione…</option>
            {statusOptions.map((s) => (
              <option key={s.id} value={s.id}>{s.nome}</option>
            ))}
          </select>
        </div>

        {erro && <div className="text-rose-600 text-sm font-medium">{erro}</div>}

        <div className="flex justify-end gap-2 pt-2 border-t border-conecta-primary/10">
          <button
            onClick={onClose}
            type="button"
            className="px-3 py-2 text-sm text-conecta-muted hover:text-conecta-primary"
          >
            Cancelar
          </button>
          <button
            onClick={submit}
            disabled={pending || selectedIds.size === 0 || !statusIdSel}
            className="px-4 py-2 rounded-lg bg-conecta-accent text-white text-sm font-display font-semibold hover:brightness-110 disabled:opacity-50 transition"
          >
            {pending ? 'Salvando…' : 'Aplicar em lote'}
          </button>
        </div>
      </div>
    </div>
  );
}
