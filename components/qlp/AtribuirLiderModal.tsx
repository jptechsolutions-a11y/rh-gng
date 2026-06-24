'use client';

import { useEffect, useMemo, useState, useTransition } from 'react';
import { Search, X } from 'lucide-react';
import { atribuirVinculo, removerVinculo } from '@/actions/qlp/vinculos';

interface ColaboradorAlvo {
  id: string;
  nome: string;
  funcao: string;
  chapa?: string;
  secao?: string | null;
  filialCodigo?: string | null;
  lider_id: string | null;
  lider_nome?: string | null;
  lider_tier?: string | null;
}

interface LiderOpt {
  id: string;
  tier: string;
  nivel: string | null;
  escopo_nacional: boolean;
  nome: string;
  funcao: string;
  codfilial: number;
}

export function AtribuirLiderModal({
  colaborador,
  onClose,
}: {
  colaborador: ColaboradorAlvo;
  onClose: () => void;
}) {
  const [lideres, setLideres] = useState<LiderOpt[]>([]);
  const [liderId, setLiderId] = useState('');
  const [buscaLider, setBuscaLider] = useState('');
  const [liderOpen, setLiderOpen] = useState(true);
  const [motivo, setMotivo] = useState('');
  const [erro, setErro] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/qlp/lideres-elegiveis?colaboradorId=${colaborador.id}`)
      .then((r) => r.json())
      .then((data) => {
        setLideres(data ?? []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [colaborador.id]);

  const liderSel = useMemo(
    () => lideres.find((l) => l.id === liderId) ?? null,
    [lideres, liderId],
  );

  const lideresFiltrados = useMemo(() => {
    const q = buscaLider.trim().toLowerCase();
    if (!q) return lideres;
    return lideres.filter((l) =>
      `${l.nome} ${l.funcao} ${l.codfilial} ${l.tier}`.toLowerCase().includes(q),
    );
  }, [lideres, buscaLider]);

  function escolherLider(id: string) {
    setLiderId(id);
    setLiderOpen(false);
    setBuscaLider('');
  }

  function limparLider() {
    setLiderId('');
    setBuscaLider('');
    setLiderOpen(true);
  }

  function submit() {
    setErro(null);
    if (!liderId) {
      setErro('Escolha um líder.');
      return;
    }
    if (!motivo.trim()) {
      setErro('Motivo é obrigatório.');
      return;
    }
    start(async () => {
      try {
        await atribuirVinculo({ colaboradorId: colaborador.id, liderId, motivo });
        onClose();
        location.reload();
      } catch (e) {
        setErro(e instanceof Error ? e.message : 'Erro ao salvar.');
      }
    });
  }

  function remover() {
    setErro(null);
    if (!motivo.trim()) {
      setErro('Motivo é obrigatório para remover.');
      return;
    }
    if (!confirm('Remover o vínculo atual? O colaborador ficará sem líder.')) return;
    start(async () => {
      try {
        await removerVinculo(colaborador.id, motivo);
        onClose();
        location.reload();
      } catch (e) {
        setErro(e instanceof Error ? e.message : 'Erro ao remover.');
      }
    });
  }

  return (
    <div className="fixed inset-0 bg-conecta-primary/30 backdrop-blur-sm grid place-items-center z-50 p-4">
      <div className="bg-white rounded-2xl p-6 w-full max-w-2xl space-y-4 shadow-2xl border border-conecta-primary/10 max-h-[90vh] flex flex-col">

        {/* Cabeçalho */}
        <div>
          <h2 className="font-display text-lg font-extrabold text-conecta-primary">
            {colaborador.lider_id ? 'Mover líder' : 'Atribuir líder'}
          </h2>
          <p className="text-xs text-conecta-muted leading-tight mt-0.5">
            Selecione o líder que ficará responsável por este colaborador.
          </p>
        </div>

        {/* Info do colaborador */}
        <div className="rounded-lg border border-conecta-primary/15 bg-conecta-primary/[0.02] px-4 py-3">
          <div className="text-[10px] uppercase tracking-[0.18em] font-display font-semibold text-conecta-muted mb-1">
            Colaborador
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-display font-bold text-conecta-primary">{colaborador.nome}</span>
            {colaborador.chapa && (
              <span className="text-[10px] text-conecta-muted bg-conecta-primary/5 rounded-full px-2 py-0.5 font-mono">
                {colaborador.chapa}
              </span>
            )}
          </div>
          <div className="text-[12px] text-conecta-muted mt-0.5">
            {colaborador.funcao}
            {colaborador.secao ? ` · Seção ${colaborador.secao}` : ''}
            {colaborador.filialCodigo ? ` · Filial ${colaborador.filialCodigo}` : ''}
          </div>
          {colaborador.lider_nome && (
            <div className="text-[11px] text-amber-700 font-semibold mt-1.5">
              Líder atual: [{colaborador.lider_tier}] {colaborador.lider_nome}
            </div>
          )}
        </div>

        {/* Escolha do Líder */}
        <div>
          <label className="block text-[10px] uppercase tracking-[0.18em] font-semibold text-conecta-primary mb-1">
            Novo Líder
          </label>

          {loading ? (
            <p className="text-sm text-conecta-muted py-3">Carregando líderes elegíveis…</p>
          ) : lideres.length === 0 ? (
            <p className="text-sm text-rose-600 py-3">
              Nenhum líder elegível para esta filial/tier. Verifique se há líderes cadastrados com escopo cobrindo esta filial.
            </p>
          ) : liderSel && !liderOpen ? (
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
                {lideresFiltrados.length} de {lideres.length} líderes elegíveis
              </p>
            </div>
          )}
        </div>

        {/* Motivo */}
        <div>
          <label className="block text-[10px] uppercase tracking-[0.18em] font-semibold text-conecta-primary mb-1">
            Motivo da Atribuição / Movimentação
          </label>
          <input
            type="text"
            className="w-full border border-conecta-primary/15 rounded-lg p-2 text-sm focus:outline-none focus:border-conecta-accent/60"
            placeholder="Ex: distribuição inicial, troca de setor, redistribuição de carga…"
            value={motivo}
            onChange={(e) => setMotivo(e.target.value)}
          />
        </div>

        {erro && <div className="text-rose-600 text-sm font-medium">{erro}</div>}

        {/* Rodapé */}
        <div className="flex justify-between items-center gap-2 pt-2 border-t border-conecta-primary/10">
          {colaborador.lider_id && (
            <button
              onClick={remover}
              disabled={pending}
              className="px-3 py-2 rounded-lg bg-rose-50 text-rose-700 text-sm font-semibold hover:bg-rose-100 disabled:opacity-50 transition"
            >
              Remover vínculo
            </button>
          )}
          <div className="flex gap-2 ml-auto">
            <button onClick={onClose} className="px-3 py-2 text-sm text-conecta-muted hover:text-conecta-primary">
              Cancelar
            </button>
            <button
              onClick={submit}
              disabled={pending || !liderId}
              className="px-4 py-2 rounded-lg bg-conecta-accent text-white text-sm font-display font-semibold hover:brightness-110 disabled:opacity-50 transition"
            >
              {pending ? 'Salvando…' : 'Confirmar'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
