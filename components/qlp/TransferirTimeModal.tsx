'use client';

import { useMemo, useState, useTransition } from 'react';
import { Search, X, ArrowRight } from 'lucide-react';
import { transferirTime } from '@/actions/qlp/vinculos';

export interface LiderDestino {
  id: string;
  tier: string;
  nivel: string | null;
  escopo_nacional: boolean;
  nome: string;
  funcao: string;
  codfilial: number;
}

export function TransferirTimeModal({
  liderOrigem,
  diretos,
  lideresDestino,
  onClose,
}: {
  liderOrigem: { id: string; nome: string; funcao: string; tier: string };
  diretos: number;
  lideresDestino: LiderDestino[];
  onClose: () => void;
}) {
  const [destinoId, setDestinoId] = useState('');
  const [busca, setBusca] = useState('');
  const [motivo, setMotivo] = useState('');
  const [erro, setErro] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const destinos = useMemo(
    () => lideresDestino.filter((l) => l.id !== liderOrigem.id),
    [lideresDestino, liderOrigem.id],
  );

  const filtrados = useMemo(() => {
    const q = busca.trim().toLowerCase();
    if (!q) return destinos;
    return destinos.filter((l) =>
      `${l.nome} ${l.funcao} ${l.codfilial} ${l.tier}`.toLowerCase().includes(q),
    );
  }, [destinos, busca]);

  const destinoSel = useMemo(
    () => destinos.find((l) => l.id === destinoId) ?? null,
    [destinos, destinoId],
  );

  function submit() {
    setErro(null);
    if (!destinoId) {
      setErro('selecione o líder de destino');
      return;
    }
    if (!motivo.trim()) {
      setErro('digite o motivo da transferência');
      return;
    }
    start(async () => {
      try {
        const r = await transferirTime({
          liderOrigemId: liderOrigem.id,
          liderDestinoId: destinoId,
          motivo: motivo.trim(),
        });
        const ignoradosMsg =
          r.ignorados.length > 0
            ? `\n\n${r.ignorados.length} ignorado(s):\n` +
              r.ignorados.map((i) => `• ${i.nome} — ${i.motivo}`).join('\n')
            : '';
        alert(`${r.transferidos} colaborador(es) transferido(s) com sucesso.${ignoradosMsg}`);
        onClose();
        location.reload();
      } catch (e) {
        setErro(e instanceof Error ? e.message : 'erro ao transferir time');
      }
    });
  }

  return (
    <div className="fixed inset-0 bg-conecta-primary/30 backdrop-blur-sm grid place-items-center z-50 p-4">
      <div className="bg-white rounded-2xl p-6 w-full max-w-lg space-y-4 shadow-2xl border border-conecta-primary/10 max-h-[90vh] flex flex-col">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="h-[2px] w-6 bg-conecta-accent" />
            <span className="font-display text-[10px] uppercase tracking-[0.32em] text-conecta-accent font-semibold">
              Transferir time
            </span>
          </div>
          <h2 className="font-display text-lg font-extrabold text-conecta-primary">
            Mover todos os subordinados para outro líder
          </h2>
          <p className="text-xs text-conecta-muted leading-snug mt-1">
            Cada colaborador será validado contra a hierarquia e o escopo do líder de destino.
            Quem violar as regras é ignorado e listado no fim.
          </p>
        </div>

        {/* Origem → destino */}
        <div className="rounded-xl border border-conecta-primary/10 bg-conecta-primary/[0.02] p-3 flex items-center gap-3">
          <div className="min-w-0 flex-1">
            <div className="text-[10px] uppercase tracking-[0.18em] font-display font-semibold text-conecta-muted">
              De
            </div>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="text-[10px] uppercase tracking-[0.14em] font-display font-bold px-1.5 py-0.5 rounded bg-conecta-primary/10 text-conecta-primary shrink-0">
                {liderOrigem.tier}
              </span>
              <span className="font-display font-semibold text-conecta-primary truncate">
                {liderOrigem.nome}
              </span>
            </div>
            <div className="text-[11px] text-conecta-muted mt-0.5">
              {liderOrigem.funcao} ·{' '}
              <span className="font-display font-bold text-conecta-accent tabular-nums">
                {diretos}
              </span>{' '}
              direto(s)
            </div>
          </div>

          <ArrowRight className="h-5 w-5 text-conecta-accent shrink-0" />

          <div className="min-w-0 flex-1">
            <div className="text-[10px] uppercase tracking-[0.18em] font-display font-semibold text-conecta-muted">
              Para
            </div>
            {destinoSel ? (
              <>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="text-[10px] uppercase tracking-[0.14em] font-display font-bold px-1.5 py-0.5 rounded bg-conecta-accent/15 text-conecta-accent shrink-0">
                    {destinoSel.tier}
                  </span>
                  <span className="font-display font-semibold text-conecta-primary truncate">
                    {destinoSel.nome}
                  </span>
                </div>
                <div className="text-[11px] text-conecta-muted mt-0.5 truncate">
                  {destinoSel.funcao} · Filial {destinoSel.codfilial}
                  {destinoSel.escopo_nacional ? ' · Nacional' : ''}
                </div>
              </>
            ) : (
              <div className="text-[12px] text-conecta-muted/70 mt-1.5 italic">
                Escolha um líder abaixo
              </div>
            )}
          </div>
        </div>

        {/* Busca de destino */}
        <div className="flex-1 flex flex-col min-h-0">
          <label className="block text-[10px] uppercase tracking-[0.18em] font-display font-semibold text-conecta-primary mb-1">
            Líder de destino
          </label>
          <div className="relative">
            <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-conecta-accent pointer-events-none" />
            <input
              type="search"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Buscar por nome, função, tier ou filial…"
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
          <div className="mt-2 max-h-56 overflow-y-auto rounded-lg border border-conecta-primary/10 divide-y divide-conecta-primary/5 bg-white">
            {filtrados.length === 0 ? (
              <p className="text-xs text-conecta-muted p-3 text-center">
                Nenhum líder encontrado.
              </p>
            ) : (
              filtrados.map((l) => {
                const ativo = l.id === destinoId;
                return (
                  <button
                    key={l.id}
                    type="button"
                    onClick={() => setDestinoId(l.id)}
                    className={`w-full text-left px-3 py-2 transition-colors flex items-center gap-2 ${
                      ativo ? 'bg-conecta-accent/8' : 'hover:bg-conecta-primary/[0.04]'
                    }`}
                  >
                    <span className="text-[10px] uppercase tracking-[0.14em] font-display font-bold px-1.5 py-0.5 rounded bg-conecta-primary/8 text-conecta-primary shrink-0">
                      {l.tier}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="font-display font-semibold text-conecta-primary text-sm truncate">
                        {l.nome}
                      </div>
                      <div className="text-[11px] text-conecta-muted truncate">
                        {l.funcao} · Filial {l.codfilial}
                        {l.escopo_nacional ? ' · Nacional' : ''}
                      </div>
                    </div>
                    {ativo && (
                      <span className="text-[10px] uppercase tracking-[0.14em] font-display font-bold text-conecta-accent shrink-0">
                        Selecionado
                      </span>
                    )}
                  </button>
                );
              })
            )}
          </div>
          <p className="text-[10px] text-conecta-muted/80 mt-1">
            {filtrados.length} de {destinos.length} líderes
          </p>
        </div>

        {/* Motivo */}
        <div>
          <label className="block text-[10px] uppercase tracking-[0.18em] font-display font-semibold text-conecta-primary mb-1">
            Motivo da transferência
          </label>
          <input
            type="text"
            className="w-full border border-conecta-primary/15 rounded-lg p-2 text-sm focus:outline-none focus:border-conecta-accent focus:ring-2 focus:ring-conecta-accent/25"
            placeholder="Ex: substituição de gestor, reestruturação da equipe…"
            value={motivo}
            onChange={(e) => setMotivo(e.target.value)}
          />
        </div>

        {erro && <div className="text-rose-600 text-sm font-medium">{erro}</div>}

        <div className="flex justify-end gap-2 pt-2 border-t border-conecta-primary/10">
          <button
            onClick={onClose}
            type="button"
            disabled={pending}
            className="px-3 py-2 text-sm font-display font-semibold text-conecta-muted hover:text-conecta-primary"
          >
            Cancelar
          </button>
          <button
            onClick={submit}
            disabled={pending || !destinoId || !motivo.trim()}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-conecta-accent text-white text-sm font-display font-semibold uppercase tracking-[0.14em] hover:brightness-110 disabled:opacity-50 transition"
          >
            {pending ? 'Transferindo…' : (
              <>
                <ArrowRight className="h-3.5 w-3.5" />
                Transferir {diretos > 0 ? `${diretos} pessoa(s)` : 'time'}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
