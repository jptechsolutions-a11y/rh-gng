'use client';

import { useMemo, useState, useTransition } from 'react';
import { Search, X } from 'lucide-react';
import { atribuirVinculosEmMassa } from '@/actions/qlp/vinculos';
import { assertCanLead } from '@/lib/qlp/hierarchy';

export interface LiderOpt {
  id: string;
  tier: string;
  nivel: string | null;
  escopo_nacional: boolean;
  filiais_escopo: unknown;
  nome: string;
  funcao: string;
  codfilial: number;
  filial_id: string | null;
}

interface ColaboradorOpt {
  id: string;
  chapa: string;
  nome: string;
  funcao: string;
  secao: string | null;
  tier_resolvido: string | null;
  filial_id: string | null;
  filial_codigo: string | null;
  lider_nome: string | null;
  lider_tier: string | null;
  lider_id: string | null;
}

export function AtribuirTimeLoteModal({
  lideres,
  colaboradores,
  onClose,
}: {
  lideres: LiderOpt[];
  colaboradores: ColaboradorOpt[];
  onClose: () => void;
}) {
  const [liderIdSel, setLiderIdSel] = useState('');
  const [buscaLider, setBuscaLider] = useState('');
  const [liderOpen, setLiderOpen] = useState(false);
  const [buscaColab, setBuscaColab] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [motivo, setMotivo] = useState('');
  const [erro, setErro] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const lideresFiltrados = useMemo(() => {
    const q = buscaLider.trim().toLowerCase();
    if (!q) return lideres;
    return lideres.filter((l) =>
      `${l.nome} ${l.funcao} ${l.codfilial} ${l.tier}`.toLowerCase().includes(q),
    );
  }, [lideres, buscaLider]);

  function escolherLider(id: string) {
    setLiderIdSel(id);
    setSelectedIds(new Set());
    setLiderOpen(false);
    setBuscaLider('');
  }

  function limparLider() {
    setLiderIdSel('');
    setSelectedIds(new Set());
    setBuscaLider('');
    setLiderOpen(true);
  }

  // Encontra o líder selecionado
  const liderSel = useMemo(() => {
    return lideres.find((l) => l.id === liderIdSel) || null;
  }, [lideres, liderIdSel]);

  // Filtra os colaboradores elegíveis para o líder selecionado
  const colaboradoresElegiveis = useMemo(() => {
    if (!liderSel) return [];

    return colaboradores.filter((colab) => {
      // 1. O próprio líder não pode ser liderado por ele mesmo
      if (colab.id === liderSel.id || colab.chapa === liderSel.id) return false;

      // 2. Valida regras de tier no frontend (hierarchy)
      try {
        // Encontra o nível resolvido do colaborador (se for líder, lê o nível; senão é nulo/filial)
        const colabLider = lideres.find((l) => l.id === colab.lider_id || l.nome === colab.nome);
        
        assertCanLead(liderSel.tier, colab.tier_resolvido ?? 'base', {
          liderNivel: liderSel.nivel,
          lideradoNivel: colabLider?.nivel ?? null,
        });
      } catch {
        return false; // se violar a hierarquia, descarta
      }

      // 3. Valida se o líder cobre a filial do colaborador
      if (liderSel.escopo_nacional) return true;
      if (!colab.filial_id) return false;

      const escopo = typeof liderSel.filiais_escopo === 'string'
        ? JSON.parse(liderSel.filiais_escopo)
        : liderSel.filiais_escopo;

      if (Array.isArray(escopo) && escopo.includes(colab.filial_id)) {
        return true;
      }

      return false;
    });
  }, [liderSel, colaboradores, lideres]);

  // Filtra os colaboradores elegíveis com base na busca textual
  const elegiveisFiltrados = useMemo(() => {
    const q = buscaColab.trim().toLowerCase();
    if (!q) return colaboradoresElegiveis;
    return colaboradoresElegiveis.filter(
      (c) => `${c.chapa} ${c.nome} ${c.funcao} ${c.secao ?? ''}`.toLowerCase().includes(q)
    );
  }, [colaboradoresElegiveis, buscaColab]);

  function alternarTodos() {
    if (selectedIds.size === elegiveisFiltrados.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(elegiveisFiltrados.map((c) => c.id)));
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
    if (!liderIdSel) {
      setErro('selecione o líder do time');
      return;
    }
    if (selectedIds.size === 0) {
      setErro('selecione ao menos um colaborador');
      return;
    }
    if (!motivo.trim()) {
      setErro('digite o motivo da atribuição');
      return;
    }

    start(async () => {
      try {
        await atribuirVinculosEmMassa({
          colaboradorIds: Array.from(selectedIds),
          liderId: liderIdSel,
          motivo: motivo.trim(),
        });
        onClose();
        location.reload();
      } catch (e) {
        setErro(e instanceof Error ? e.message : 'erro ao salvar');
      }
    });
  }

  return (
    <div className="fixed inset-0 bg-conecta-primary/30 backdrop-blur-sm grid place-items-center z-50 p-4">
      <div className="bg-white rounded-2xl p-6 w-full max-w-2xl space-y-4 shadow-2xl border border-conecta-primary/10 max-h-[90vh] flex flex-col">
        
        {/* Cabeçalho */}
        <div>
          <h2 className="font-display text-lg font-extrabold text-conecta-primary">
            Atribuir Time em Lote (Atribuição em Massa)
          </h2>
          <p className="text-xs text-conecta-muted leading-tight mt-0.5">
            Selecione o líder e marque todas as pessoas que responderão a ele.
          </p>
        </div>

        {/* Escolha do Líder */}
        <div>
          <label className="block text-[10px] uppercase tracking-[0.18em] font-semibold text-conecta-primary mb-1">
            Líder do Time
          </label>

          {liderSel && !liderOpen ? (
            <div className="flex items-center gap-2 rounded-lg border border-conecta-primary/15 bg-conecta-primary/[0.02] px-3 py-2">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] uppercase tracking-[0.14em] font-display font-bold px-1.5 py-0.5 rounded bg-conecta-primary/10 text-conecta-primary">
                    {liderSel.tier}
                  </span>
                  <span className="font-display font-semibold text-conecta-primary truncate">
                    {liderSel.nome}
                  </span>
                </div>
                <div className="text-[11px] text-conecta-muted truncate mt-0.5">
                  {liderSel.funcao} · Filial {liderSel.codfilial}
                  {liderSel.escopo_nacional ? ' · Nacional' : ''}
                </div>
              </div>
              <button
                type="button"
                onClick={limparLider}
                className="text-[11px] font-display font-semibold uppercase tracking-[0.14em] text-conecta-muted hover:text-conecta-accent transition-colors"
              >
                Trocar
              </button>
            </div>
          ) : (
            <div className="space-y-1.5">
              <div className="relative">
                <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-conecta-accent pointer-events-none" />
                <input
                  type="search"
                  autoFocus
                  value={buscaLider}
                  onChange={(e) => { setBuscaLider(e.target.value); setLiderOpen(true); }}
                  onFocus={() => setLiderOpen(true)}
                  placeholder="Buscar líder por nome, função, tier ou filial…"
                  className="w-full rounded-lg border border-conecta-primary/15 bg-white pl-9 pr-9 py-2 text-sm focus:outline-none focus:border-conecta-accent focus:ring-2 focus:ring-conecta-accent/25"
                />
                {buscaLider && (
                  <button
                    type="button"
                    aria-label="Limpar busca"
                    onClick={() => setBuscaLider('')}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-conecta-muted hover:text-conecta-accent"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
              <div className="max-h-56 overflow-y-auto rounded-lg border border-conecta-primary/10 divide-y divide-conecta-primary/5 bg-white">
                {lideresFiltrados.length === 0 ? (
                  <p className="text-xs text-conecta-muted p-3 text-center">
                    Nenhum líder encontrado.
                  </p>
                ) : (
                  lideresFiltrados.map((l) => (
                    <button
                      key={l.id}
                      type="button"
                      onClick={() => escolherLider(l.id)}
                      className="w-full text-left px-3 py-2 hover:bg-conecta-primary/[0.04] transition-colors flex items-center gap-2"
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
                    </button>
                  ))
                )}
              </div>
              <p className="text-[10px] text-conecta-muted/80">
                {lideresFiltrados.length} de {lideres.length} líderes
              </p>
            </div>
          )}
        </div>

        {/* Seção de Colaboradores */}
        {liderSel ? (
          <div className="flex-1 flex flex-col min-h-0 space-y-2">
            <div className="flex justify-between items-center gap-2">
              <label className="text-[10px] uppercase tracking-[0.18em] font-semibold text-conecta-primary">
                Colaboradores Elegíveis ({colaboradoresElegiveis.length})
              </label>
              <button
                type="button"
                onClick={alternarTodos}
                className="text-xs text-conecta-accent hover:underline font-semibold"
              >
                {selectedIds.size === elegiveisFiltrados.length ? 'Desmarcar Todos' : 'Marcar Todos Filtrados'}
              </button>
            </div>

            <input
              type="search"
              className="w-full border border-conecta-primary/15 rounded-lg p-2 text-sm focus:outline-none focus:border-conecta-accent/60"
              placeholder="Buscar colaborador por chapa, nome ou função…"
              value={buscaColab}
              onChange={(e) => setBuscaColab(e.target.value)}
            />

            <div className="flex-1 min-h-[150px] overflow-y-auto border border-conecta-primary/10 rounded-lg divide-y divide-conecta-primary/5 bg-conecta-primary/[0.01]">
              {elegiveisFiltrados.length === 0 ? (
                <p className="text-xs text-conecta-muted p-4 text-center">
                  Nenhum colaborador elegível encontrado.
                </p>
              ) : (
                elegiveisFiltrados.map((c) => {
                  const isChecked = selectedIds.has(c.id);
                  return (
                    <label
                      key={c.id}
                      className="flex items-start gap-3 p-2.5 hover:bg-conecta-primary/[0.03] transition cursor-pointer select-none"
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => alternarUm(c.id)}
                        className="mt-1 accent-conecta-accent"
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold text-conecta-primary truncate">
                            {c.nome}
                          </span>
                          <span className="text-[10px] text-conecta-muted bg-conecta-primary/5 rounded-full px-2 py-0.5 font-mono">
                            {c.chapa}
                          </span>
                        </div>
                        <div className="text-xs text-conecta-muted truncate mt-0.5">
                          {c.funcao} {c.secao ? `· Seção ${c.secao}` : ''} · Filial {c.filial_codigo}
                        </div>
                        {c.lider_nome && (
                          <div className="text-[10px] text-amber-700 font-semibold mt-1">
                            Líder atual: [{c.lider_tier}] {c.lider_nome}
                          </div>
                        )}
                      </div>
                    </label>
                  );
                })
              )}
            </div>
            {selectedIds.size > 0 && (
              <p className="text-[10px] text-conecta-accent font-semibold">
                {selectedIds.size} colaborador(es) selecionado(es).
              </p>
            )}
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center border border-dashed border-conecta-primary/15 rounded-lg p-8 bg-conecta-primary/[0.01]">
            <p className="text-sm text-conecta-muted/80 text-center">
              Selecione o líder no campo acima para ver a lista de colaboradores elegíveis.
            </p>
          </div>
        )}

        {/* Motivo da Mudança */}
        <div>
          <label className="block text-[10px] uppercase tracking-[0.18em] font-semibold text-conecta-primary mb-1">
            Motivo da Atribuição / Movimentação
          </label>
          <input
            type="text"
            className="w-full border border-conecta-primary/15 rounded-lg p-2 text-sm focus:outline-none focus:border-conecta-accent/60"
            placeholder="Ex: Alocação inicial da equipe de logística / Mudança de turno…"
            value={motivo}
            onChange={(e) => setMotivo(e.target.value)}
          />
        </div>

        {erro && <div className="text-rose-600 text-sm font-medium">{erro}</div>}

        {/* Rodapé Ações */}
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
            disabled={pending || !liderIdSel || selectedIds.size === 0}
            className="px-4 py-2 rounded-lg bg-conecta-accent text-white text-sm font-display font-semibold hover:brightness-110 disabled:opacity-50 transition"
          >
            {pending ? 'Salvando…' : 'Confirmar Atribuição'}
          </button>
        </div>
      </div>
    </div>
  );
}
