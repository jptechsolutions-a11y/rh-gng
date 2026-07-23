'use client';

import { useState, useTransition, useEffect } from 'react';
import { toast } from 'sonner';
import {
  listarRotas, criarRota, toggleRotaAtiva,
  listarPassageiros, removerPassageiro,
  listarNaoAlocados, alocarMultiplos, desalocarPassageiro,
} from '@/actions/transporte';
import { Plus, X, CheckCircle2, Power, Trash2, ChevronDown, ChevronUp, MapPin, ArrowRight, Users, AlertTriangle } from 'lucide-react';
import { useConfirm } from '@/components/ui/confirm-dialog';

type Filial = { id: string; codigo: string; nome: string };
type Rota = { id: string; nome: string; turno: string; lugares: number; ordem: number; ativo: boolean; passageiros: number };
type Passageiro = { id: string; nome: string; chapa: string | null; cidade: string | null; ativo: boolean };

export function RotasClient({ filiais }: { filiais: Filial[] }) {
  const confirmar = useConfirm();
  const [filialId, setFilialId] = useState(filiais[0]?.id ?? '');
  const [rotas, setRotas] = useState<Rota[]>([]);
  const [loading, setLoading] = useState(false);
  const [pending, start] = useTransition();
  const [showForm, setShowForm] = useState(false);
  const [expandedRota, setExpandedRota] = useState<string | null>(null);
  const [passageiros, setPassageiros] = useState<Passageiro[]>([]);
  const [loadingPass, setLoadingPass] = useState(false);

  // Não alocados
  const [naoAlocados, setNaoAlocados] = useState<Passageiro[]>([]);
  const [showNaoAlocados, setShowNaoAlocados] = useState(false);
  const [selectedNaoAlocados, setSelectedNaoAlocados] = useState<Set<string>>(new Set());
  const [filtroCidade, setFiltroCidade] = useState('');

  // Form state
  const [formNome, setFormNome] = useState('');
  const [formTurno, setFormTurno] = useState('1º Turno');
  const [formLugares, setFormLugares] = useState(15);
  const [formOrdem, setFormOrdem] = useState(1);

  const carregarRotas = async () => {
    if (!filialId) return;
    setLoading(true);
    try {
      const data = await listarRotas(filialId);
      setRotas(data as Rota[]);
    } catch { toast.error('Erro ao carregar rotas'); }
    setLoading(false);
  };

  const carregarNaoAlocados = async () => {
    if (!filialId) return;
    try {
      const data = await listarNaoAlocados(filialId);
      setNaoAlocados(data as Passageiro[]);
    } catch { toast.error('Erro ao carregar não alocados'); }
  };

  useEffect(() => { carregarRotas(); carregarNaoAlocados(); }, [filialId]);

  const carregarPassageiros = async (rotaId: string) => {
    setLoadingPass(true);
    try {
      const data = await listarPassageiros(rotaId);
      setPassageiros(data as Passageiro[]);
    } catch { toast.error('Erro ao carregar passageiros'); }
    setLoadingPass(false);
  };

  const toggleExpand = (rotaId: string) => {
    if (expandedRota === rotaId) {
      setExpandedRota(null);
      setPassageiros([]);
    } else {
      setExpandedRota(rotaId);
      carregarPassageiros(rotaId);
    }
  };

  const handleCriarRota = () => {
    if (!formNome.trim()) { toast.error('Nome obrigatório'); return; }
    start(async () => {
      try {
        await criarRota({ filialId, nome: formNome, turno: formTurno, lugares: formLugares, ordem: formOrdem });
        toast.success('Rota criada');
        setShowForm(false);
        setFormNome(''); setFormTurno('1º Turno'); setFormLugares(15); setFormOrdem(rotas.length + 1);
        carregarRotas();
      } catch (e) { toast.error(e instanceof Error ? e.message : 'Erro'); }
    });
  };

  const handleToggleAtiva = async (id: string) => {
    start(async () => {
      try {
        await toggleRotaAtiva(id);
        carregarRotas();
      } catch (e) { toast.error(e instanceof Error ? e.message : 'Erro'); }
    });
  };

  const handleDesalocar = async (passageiroId: string) => {
    start(async () => {
      try {
        await desalocarPassageiro(passageiroId);
        toast.success('Passageiro desalocado');
        if (expandedRota) carregarPassageiros(expandedRota);
        carregarRotas();
        carregarNaoAlocados();
      } catch (e) { toast.error(e instanceof Error ? e.message : 'Erro'); }
    });
  };

  const handleRemoverPassageiro = async (id: string) => {
    if (!(await confirmar({ titulo: 'Remover passageiro', descricao: 'O passageiro será marcado como inativo. Tem certeza?', confirmLabel: 'Remover' }))) return;
    start(async () => {
      try {
        await removerPassageiro(id);
        toast.success('Passageiro removido');
        if (expandedRota) carregarPassageiros(expandedRota);
        carregarRotas();
        carregarNaoAlocados();
      } catch (e) { toast.error(e instanceof Error ? e.message : 'Erro'); }
    });
  };

  const toggleSelectNaoAlocado = (id: string) => {
    setSelectedNaoAlocados(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const selectAllFiltered = () => {
    const filtered = naoAlocadosFiltrados.map(p => p.id);
    setSelectedNaoAlocados(new Set(filtered));
  };

  const handleAlocarSelecionados = (rotaId: string) => {
    if (selectedNaoAlocados.size === 0) { toast.error('Selecione passageiros'); return; }
    start(async () => {
      try {
        await alocarMultiplos(Array.from(selectedNaoAlocados), rotaId);
        toast.success(`${selectedNaoAlocados.size} passageiro(s) alocados`);
        setSelectedNaoAlocados(new Set());
        carregarRotas();
        carregarNaoAlocados();
      } catch (e) { toast.error(e instanceof Error ? e.message : 'Erro'); }
    });
  };

  const cidades = [...new Set(naoAlocados.map(p => p.cidade).filter(Boolean))].sort() as string[];
  const naoAlocadosFiltrados = filtroCidade
    ? naoAlocados.filter(p => p.cidade === filtroCidade)
    : naoAlocados;

  if (filiais.length === 0) {
    return (
      <div className="p-6">
        <div className="bg-white rounded-xl border border-conecta-primary/8 p-8 text-center text-conecta-muted">
          <p className="text-sm">Nenhuma filial com o módulo Transporte ativo.</p>
          <p className="text-xs mt-1">Ative o módulo em Configuração &rarr; Módulos por filial.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-4">
      {/* Seletor de filial + ações */}
      <div className="flex items-end gap-4 flex-wrap">
        <div className="flex-1 max-w-xs">
          <label className="block text-xs font-medium text-conecta-primary mb-1">Filial</label>
          <select
            value={filialId}
            onChange={e => { setFilialId(e.target.value); setExpandedRota(null); setShowNaoAlocados(false); }}
            className="h-9 w-full rounded-md border border-slate-200 bg-white text-sm px-3"
          >
            {filiais.map(f => (
              <option key={f.id} value={f.id}>{f.codigo} — {f.nome}</option>
            ))}
          </select>
        </div>
        <button
          type="button"
          onClick={() => { setShowForm(true); setFormOrdem(rotas.length + 1); }}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium bg-conecta-accent text-white hover:bg-conecta-accent/90"
        >
          <Plus className="h-4 w-4" /> Nova rota
        </button>
      </div>

      {/* Banner não alocados */}
      {naoAlocados.length > 0 && (
        <button
          type="button"
          onClick={() => setShowNaoAlocados(!showNaoAlocados)}
          className="w-full flex items-center justify-between gap-3 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-left hover:bg-amber-100/60 transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="grid place-items-center h-9 w-9 rounded-lg bg-amber-500 text-white">
              <AlertTriangle className="h-4.5 w-4.5" />
            </div>
            <div>
              <p className="text-sm font-semibold text-amber-900">{naoAlocados.length} passageiro(s) sem rota</p>
              <p className="text-xs text-amber-700">Clique para alocar a uma rota</p>
            </div>
          </div>
          {showNaoAlocados ? <ChevronUp className="h-4 w-4 text-amber-600" /> : <ChevronDown className="h-4 w-4 text-amber-600" />}
        </button>
      )}

      {/* Painel não alocados */}
      {showNaoAlocados && naoAlocados.length > 0 && (
        <div className="bg-white rounded-xl border border-amber-200 overflow-hidden" style={{ boxShadow: '0 4px 24px -10px rgba(232,98,26,0.12)' }}>
          <div className="px-4 py-3 border-b border-amber-100 flex items-center gap-3 flex-wrap">
            <div className="flex-1 flex items-center gap-2">
              <label className="text-xs font-medium text-conecta-primary">Filtrar por cidade:</label>
              <select
                value={filtroCidade}
                onChange={e => { setFiltroCidade(e.target.value); setSelectedNaoAlocados(new Set()); }}
                className="h-8 rounded-md border border-slate-200 bg-white text-xs px-2"
              >
                <option value="">Todas ({naoAlocados.length})</option>
                {cidades.map(c => (
                  <option key={c} value={c}>{c} ({naoAlocados.filter(p => p.cidade === c).length})</option>
                ))}
              </select>
            </div>
            <button type="button" onClick={selectAllFiltered}
              className="text-xs text-conecta-accent hover:underline">
              Selecionar todos ({naoAlocadosFiltrados.length})
            </button>
          </div>

          {/* Lista de seleção */}
          <div className="max-h-64 overflow-y-auto">
            {naoAlocadosFiltrados.map(p => (
              <label key={p.id}
                className={`flex items-center gap-3 px-4 py-2 border-b border-slate-50 cursor-pointer hover:bg-slate-50/60 ${selectedNaoAlocados.has(p.id) ? 'bg-amber-50/50' : ''}`}>
                <input
                  type="checkbox"
                  checked={selectedNaoAlocados.has(p.id)}
                  onChange={() => toggleSelectNaoAlocado(p.id)}
                  className="h-4 w-4 rounded border-slate-300 text-conecta-accent focus:ring-conecta-accent"
                />
                <div className="flex-1 min-w-0">
                  <span className="text-sm font-medium text-conecta-primary truncate block">{p.nome}</span>
                  <span className="text-[11px] text-conecta-muted">{p.chapa}</span>
                </div>
                {p.cidade && (
                  <span className="inline-flex items-center gap-1 text-[11px] text-conecta-muted bg-slate-100 px-2 py-0.5 rounded-full">
                    <MapPin className="h-3 w-3" />{p.cidade}
                  </span>
                )}
              </label>
            ))}
          </div>

          {/* Alocar para rota */}
          {selectedNaoAlocados.size > 0 && (
            <div className="px-4 py-3 border-t border-amber-100 bg-amber-50/40">
              <p className="text-xs font-medium text-amber-900 mb-2">
                Alocar {selectedNaoAlocados.size} selecionado(s) na rota:
              </p>
              <div className="flex flex-wrap gap-2">
                {rotas.filter(r => r.ativo).map(r => (
                  <button
                    key={r.id}
                    type="button"
                    disabled={pending}
                    onClick={() => handleAlocarSelecionados(r.id)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium border border-conecta-primary/20 bg-white hover:bg-conecta-primary hover:text-white transition-colors disabled:opacity-50"
                  >
                    <ArrowRight className="h-3 w-3" />
                    {r.nome} ({r.turno})
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Form nova rota */}
      {showForm && (
        <div className="bg-white rounded-xl border border-conecta-accent/30 p-4 space-y-3"
          style={{ boxShadow: '0 4px 24px -10px rgba(232,98,26,0.15)' }}>
          <div className="flex items-center justify-between">
            <h3 className="font-display text-sm font-bold text-conecta-primary">Nova rota</h3>
            <button onClick={() => setShowForm(false)}><X className="h-4 w-4 text-conecta-muted" /></button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div>
              <label className="block text-xs font-medium text-conecta-primary mb-1">Nome</label>
              <input value={formNome} onChange={e => setFormNome(e.target.value)} placeholder="Ex.: Biguaçu"
                className="h-9 w-full rounded-md border border-slate-200 bg-white text-sm px-3" />
            </div>
            <div>
              <label className="block text-xs font-medium text-conecta-primary mb-1">Turno</label>
              <select value={formTurno} onChange={e => setFormTurno(e.target.value)}
                className="h-9 w-full rounded-md border border-slate-200 bg-white text-sm px-3">
                <option>1º Turno</option>
                <option>2º Turno</option>
                <option>3º Turno</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-conecta-primary mb-1">Lugares</label>
              <input type="number" min={1} value={formLugares} onChange={e => setFormLugares(Number(e.target.value))}
                className="h-9 w-full rounded-md border border-slate-200 bg-white text-sm px-3" />
            </div>
            <div>
              <label className="block text-xs font-medium text-conecta-primary mb-1">Ordem</label>
              <input type="number" min={1} value={formOrdem} onChange={e => setFormOrdem(Number(e.target.value))}
                className="h-9 w-full rounded-md border border-slate-200 bg-white text-sm px-3" />
            </div>
          </div>
          <div className="flex justify-end">
            <button onClick={handleCriarRota} disabled={pending}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium bg-conecta-accent text-white hover:bg-conecta-accent/90 disabled:opacity-50">
              <CheckCircle2 className="h-4 w-4" /> {pending ? 'Salvando...' : 'Criar rota'}
            </button>
          </div>
        </div>
      )}

      {/* Tabela de rotas */}
      {loading ? (
        <div className="text-center text-conecta-muted py-8 text-sm">Carregando...</div>
      ) : rotas.length === 0 ? (
        <div className="bg-white rounded-xl border border-conecta-primary/8 p-8 text-center text-conecta-muted">
          <p className="text-sm">Nenhuma rota cadastrada para esta filial.</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-conecta-primary/8 overflow-hidden"
          style={{ boxShadow: '0 4px 24px -10px rgba(13,43,107,0.08)' }}>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 text-left text-xs uppercase tracking-wide text-conecta-muted">
                <th className="px-4 py-3 font-medium w-8">#</th>
                <th className="px-4 py-3 font-medium">Nome</th>
                <th className="px-4 py-3 font-medium">Turno</th>
                <th className="px-4 py-3 font-medium text-center">Lugares</th>
                <th className="px-4 py-3 font-medium text-center">Passageiros</th>
                <th className="px-4 py-3 font-medium text-center">Ocupação</th>
                <th className="px-4 py-3 font-medium text-center">Status</th>
                <th className="px-4 py-3 font-medium text-right">Ações</th>
              </tr>
            </thead>
            <tbody>
              {rotas.map(r => {
                const ocup = r.lugares > 0 ? Math.round((r.passageiros / r.lugares) * 100) : 0;
                return (
                  <>
                    <tr key={r.id} className="border-b border-slate-50 hover:bg-slate-50/60">
                      <td className="px-4 py-2.5 text-conecta-muted text-xs">{r.ordem}</td>
                      <td className="px-4 py-2.5 font-medium text-conecta-primary">{r.nome}</td>
                      <td className="px-4 py-2.5 text-conecta-muted">{r.turno}</td>
                      <td className="px-4 py-2.5 text-center font-semibold text-conecta-primary">{r.lugares}</td>
                      <td className="px-4 py-2.5 text-center text-conecta-muted">{r.passageiros}</td>
                      <td className="px-4 py-2.5 text-center">
                        <div className="inline-flex items-center gap-2">
                          <div className="w-16 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full ${ocup > 90 ? 'bg-red-500' : ocup > 70 ? 'bg-amber-500' : 'bg-emerald-500'}`}
                              style={{ width: `${Math.min(ocup, 100)}%` }}
                            />
                          </div>
                          <span className="text-xs text-conecta-muted">{ocup}%</span>
                        </div>
                      </td>
                      <td className="px-4 py-2.5 text-center">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                          r.ativo ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'
                        }`}>
                          {r.ativo ? 'Ativa' : 'Inativa'}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-right">
                        <div className="inline-flex gap-1.5">
                          <button type="button" onClick={() => toggleExpand(r.id)}
                            className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs border border-slate-200 hover:bg-slate-50 text-conecta-primary">
                            {expandedRota === r.id ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                            <Users className="h-3.5 w-3.5" />
                          </button>
                          <button type="button" onClick={() => handleToggleAtiva(r.id)} disabled={pending}
                            className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs border ${
                              r.ativo ? 'border-amber-200 hover:bg-amber-50 text-amber-700' : 'border-emerald-200 hover:bg-emerald-50 text-emerald-700'
                            }`}>
                            <Power className="h-3.5 w-3.5" /> {r.ativo ? 'Desativar' : 'Ativar'}
                          </button>
                        </div>
                      </td>
                    </tr>

                    {expandedRota === r.id && (
                      <tr key={`${r.id}-pass`}>
                        <td colSpan={8} className="bg-slate-50/80 px-4 py-3">
                          {loadingPass ? (
                            <p className="text-xs text-conecta-muted text-center py-2">Carregando...</p>
                          ) : (
                            <div className="space-y-2">
                              {passageiros.length === 0 ? (
                                <p className="text-xs text-conecta-muted text-center py-2">Nenhum passageiro alocado nesta rota</p>
                              ) : (
                                <div className="space-y-1">
                                  {passageiros.map(p => (
                                    <div key={p.id} className="flex items-center justify-between bg-white rounded-md px-3 py-1.5 border border-slate-100">
                                      <div className="flex items-center gap-3">
                                        <span className="text-xs font-medium text-conecta-primary">{p.nome}</span>
                                        {p.chapa && <span className="text-[11px] text-conecta-muted font-mono">{p.chapa}</span>}
                                        {p.cidade && (
                                          <span className="inline-flex items-center gap-0.5 text-[10px] text-conecta-muted bg-slate-100 px-1.5 py-0.5 rounded">
                                            <MapPin className="h-2.5 w-2.5" />{p.cidade}
                                          </span>
                                        )}
                                      </div>
                                      <div className="flex items-center gap-1">
                                        <button type="button" onClick={() => handleDesalocar(p.id)} disabled={pending}
                                          title="Desalocar (voltar para não alocados)"
                                          className="text-amber-400 hover:text-amber-600 transition-colors">
                                          <ArrowRight className="h-3.5 w-3.5 rotate-180" />
                                        </button>
                                        <button type="button" onClick={() => handleRemoverPassageiro(p.id)} disabled={pending}
                                          title="Remover passageiro"
                                          className="text-red-400 hover:text-red-600 transition-colors">
                                          <Trash2 className="h-3.5 w-3.5" />
                                        </button>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          )}
                        </td>
                      </tr>
                    )}
                  </>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
