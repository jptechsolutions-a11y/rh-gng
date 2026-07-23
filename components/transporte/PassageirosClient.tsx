'use client';

import { useState, useEffect, useMemo, useTransition } from 'react';
import { toast } from 'sonner';
import {
  listarRotas, listarTodosPassageiros,
  alocarPassageiro, alocarMultiplos, desalocarPassageiro, removerPassageiro,
} from '@/actions/transporte';
import {
  Search, MapPin, ArrowRight, Users, AlertTriangle, Bus,
  CheckCircle2, ChevronDown, Trash2, RotateCcw,
} from 'lucide-react';
import { useConfirm } from '@/components/ui/confirm-dialog';

type Filial = { id: string; codigo: string; nome: string };
type Rota = { id: string; nome: string; turno: string; lugares: number; passageiros: number; ativo: boolean };
type Passageiro = { id: string; nome: string; chapa: string | null; cidade: string | null; ativo: boolean; rotaId?: string | null };

export function PassageirosClient({
  perfil,
  filialId: initialFilialId,
  filiais,
}: {
  perfil: string;
  filialId?: string;
  filiais: Filial[];
}) {
  const confirmar = useConfirm();
  const isAdmin = perfil === 'admin';
  const [filialId, setFilialId] = useState(initialFilialId ?? filiais[0]?.id ?? '');
  const [rotas, setRotas] = useState<Rota[]>([]);
  const [passageiros, setPassageiros] = useState<Passageiro[]>([]);
  const [loading, setLoading] = useState(true);
  const [pending, start] = useTransition();

  const [busca, setBusca] = useState('');
  const [filtroStatus, setFiltroStatus] = useState<'todos' | 'sem_rota' | 'alocado'>('todos');
  const [filtroCidade, setFiltroCidade] = useState('');
  const [filtroRota, setFiltroRota] = useState('');

  const [selecionados, setSelecionados] = useState<Set<string>>(new Set());
  const [showAlocar, setShowAlocar] = useState(false);

  const carregar = async () => {
    if (!filialId) { setLoading(false); return; }
    setLoading(true);
    try {
      const fid = isAdmin ? filialId : undefined;
      const [r, p] = await Promise.all([
        listarRotas(fid),
        listarTodosPassageiros(fid),
      ]);
      setRotas(r as Rota[]);
      setPassageiros(p as Passageiro[]);
    } catch { /* */ }
    setLoading(false);
  };

  useEffect(() => { carregar(); }, [filialId]);

  const todosPassageiros = useMemo(() => {
    return passageiros.map(p => {
      const rota = p.rotaId ? rotas.find(r => r.id === p.rotaId) : undefined;
      return { ...p, rotaNome: rota?.nome, rotaTurno: rota?.turno };
    });
  }, [passageiros, rotas]);

  const cidades = useMemo(() =>
    [...new Set(todosPassageiros.map(p => p.cidade).filter(Boolean))].sort() as string[],
    [todosPassageiros]
  );

  const filtrados = useMemo(() => {
    let result = todosPassageiros;
    if (busca.trim()) {
      const q = busca.toLowerCase();
      result = result.filter(p =>
        p.nome.toLowerCase().includes(q) ||
        (p.chapa ?? '').toLowerCase().includes(q)
      );
    }
    if (filtroStatus === 'sem_rota') result = result.filter(p => !p.rotaId);
    if (filtroStatus === 'alocado') result = result.filter(p => !!p.rotaId);
    if (filtroCidade) result = result.filter(p => p.cidade === filtroCidade);
    if (filtroRota) result = result.filter(p => p.rotaId === filtroRota);
    return result;
  }, [todosPassageiros, busca, filtroStatus, filtroCidade, filtroRota]);

  const toggleSelect = (id: string) => {
    setSelecionados(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const selectAllFiltered = () => {
    const semRota = filtrados.filter(p => !p.rotaId).map(p => p.id);
    setSelecionados(new Set(semRota));
  };

  const clearSelection = () => setSelecionados(new Set());

  const handleAlocarLote = (rotaId: string) => {
    if (selecionados.size === 0) return;
    start(async () => {
      try {
        await alocarMultiplos(Array.from(selecionados), rotaId);
        toast.success(`${selecionados.size} passageiro(s) alocados`);
        setSelecionados(new Set());
        setShowAlocar(false);
        carregar();
      } catch (e) { toast.error(e instanceof Error ? e.message : 'Erro'); }
    });
  };

  const handleDesalocar = (passageiroId: string) => {
    start(async () => {
      try {
        await desalocarPassageiro(passageiroId);
        toast.success('Passageiro desalocado');
        carregar();
      } catch (e) { toast.error(e instanceof Error ? e.message : 'Erro'); }
    });
  };

  const handleRemover = async (id: string) => {
    if (!(await confirmar({ titulo: 'Remover passageiro', descricao: 'O passageiro será marcado como inativo.', confirmLabel: 'Remover' }))) return;
    start(async () => {
      try {
        await removerPassageiro(id);
        toast.success('Passageiro removido');
        carregar();
      } catch (e) { toast.error(e instanceof Error ? e.message : 'Erro'); }
    });
  };

  const handleAlocarUnico = (passageiroId: string, rotaId: string) => {
    start(async () => {
      try {
        await alocarPassageiro(passageiroId, rotaId);
        toast.success('Passageiro alocado');
        carregar();
      } catch (e) { toast.error(e instanceof Error ? e.message : 'Erro'); }
    });
  };

  const semRota = todosPassageiros.filter(p => !p.rotaId).length;
  const comRota = todosPassageiros.length - semRota;

  if (loading) {
    return <div className="p-6 text-center text-conecta-muted text-sm">Carregando...</div>;
  }

  return (
    <div className="space-y-4 p-4 lg:p-6">
      {/* Admin filial selector */}
      {isAdmin && filiais.length > 0 && (
        <div className="flex items-end gap-4">
          <div className="flex-1 max-w-xs">
            <label className="block text-xs font-medium text-conecta-primary mb-1">Filial</label>
            <select
              value={filialId}
              onChange={e => { setFilialId(e.target.value); setSelecionados(new Set()); }}
              className="h-9 w-full rounded-md border border-slate-200 bg-white text-sm px-3"
            >
              {filiais.map(f => (
                <option key={f.id} value={f.id}>{f.codigo} — {f.nome}</option>
              ))}
            </select>
          </div>
        </div>
      )}

      {/* Resumo */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        <div className="bg-white rounded-xl border border-conecta-primary/8 p-3 flex items-center gap-3"
          style={{ boxShadow: '0 4px 24px -10px rgba(13,43,107,0.08)' }}>
          <div className="grid place-items-center h-9 w-9 rounded-lg bg-conecta-primary text-white">
            <Users className="h-4 w-4" />
          </div>
          <div>
            <div className="font-display text-lg font-extrabold text-conecta-primary">{todosPassageiros.length}</div>
            <div className="text-[11px] text-conecta-muted">Total</div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-emerald-200 p-3 flex items-center gap-3"
          style={{ boxShadow: '0 4px 24px -10px rgba(16,185,129,0.08)' }}>
          <div className="grid place-items-center h-9 w-9 rounded-lg bg-emerald-500 text-white">
            <CheckCircle2 className="h-4 w-4" />
          </div>
          <div>
            <div className="font-display text-lg font-extrabold text-emerald-700">{comRota}</div>
            <div className="text-[11px] text-conecta-muted">Alocados</div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-amber-200 p-3 flex items-center gap-3"
          style={{ boxShadow: '0 4px 24px -10px rgba(245,158,11,0.08)' }}>
          <div className="grid place-items-center h-9 w-9 rounded-lg bg-amber-500 text-white">
            <AlertTriangle className="h-4 w-4" />
          </div>
          <div>
            <div className="font-display text-lg font-extrabold text-amber-700">{semRota}</div>
            <div className="text-[11px] text-conecta-muted">Sem rota</div>
          </div>
        </div>
      </div>

      {/* Filtros */}
      <div className="bg-white rounded-xl border border-conecta-primary/8 p-3 flex flex-wrap items-center gap-3"
        style={{ boxShadow: '0 4px 24px -10px rgba(13,43,107,0.06)' }}>
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-conecta-muted" />
          <input
            value={busca}
            onChange={e => setBusca(e.target.value)}
            placeholder="Buscar por nome ou chapa..."
            className="h-9 w-full rounded-md border border-slate-200 bg-white text-sm pl-9 pr-3"
          />
        </div>
        <select value={filtroStatus} onChange={e => setFiltroStatus(e.target.value as 'todos' | 'sem_rota' | 'alocado')}
          className="h-9 rounded-md border border-slate-200 bg-white text-xs px-2">
          <option value="todos">Todos</option>
          <option value="sem_rota">Sem rota ({semRota})</option>
          <option value="alocado">Alocados ({comRota})</option>
        </select>
        <select value={filtroCidade} onChange={e => setFiltroCidade(e.target.value)}
          className="h-9 rounded-md border border-slate-200 bg-white text-xs px-2">
          <option value="">Todas as cidades</option>
          {cidades.map(c => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
        <select value={filtroRota} onChange={e => setFiltroRota(e.target.value)}
          className="h-9 rounded-md border border-slate-200 bg-white text-xs px-2">
          <option value="">Todas as rotas</option>
          {rotas.filter(r => r.ativo).map(r => (
            <option key={r.id} value={r.id}>{r.nome} ({r.turno})</option>
          ))}
        </select>
      </div>

      {/* Barra de ações em lote */}
      {selecionados.size > 0 && (
        <div className="bg-conecta-primary rounded-xl px-4 py-3 flex items-center gap-3 flex-wrap sticky top-0 z-10"
          style={{ boxShadow: '0 4px 24px -10px rgba(13,43,107,0.3)' }}>
          <span className="text-sm font-medium text-white">{selecionados.size} selecionado(s)</span>
          <button type="button" onClick={clearSelection}
            className="text-xs text-white/70 hover:text-white underline">Limpar</button>
          <div className="flex-1" />
          {!showAlocar ? (
            <button type="button" onClick={() => setShowAlocar(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium bg-conecta-accent text-white hover:bg-conecta-accent/90">
              <ArrowRight className="h-4 w-4" /> Alocar na rota...
            </button>
          ) : (
            <div className="flex flex-wrap gap-2">
              {rotas.filter(r => r.ativo).map(r => (
                <button
                  key={r.id}
                  type="button"
                  disabled={pending}
                  onClick={() => handleAlocarLote(r.id)}
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs font-medium bg-white text-conecta-primary hover:bg-conecta-accent hover:text-white transition-colors disabled:opacity-50"
                >
                  <Bus className="h-3 w-3" />
                  {r.nome} <span className="text-[10px] opacity-70">({r.turno})</span>
                </button>
              ))}
              <button type="button" onClick={() => setShowAlocar(false)}
                className="px-2 py-1.5 rounded-md text-xs text-white/60 hover:text-white">
                Cancelar
              </button>
            </div>
          )}
        </div>
      )}

      {/* Tabela de passageiros */}
      <div className="bg-white rounded-xl border border-conecta-primary/8 overflow-hidden"
        style={{ boxShadow: '0 4px 24px -10px rgba(13,43,107,0.08)' }}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 text-left text-xs uppercase tracking-wide text-conecta-muted">
                <th className="px-3 py-3 w-8">
                  <input
                    type="checkbox"
                    checked={selecionados.size > 0 && selecionados.size === filtrados.filter(p => !p.rotaId).length && filtrados.filter(p => !p.rotaId).length > 0}
                    onChange={() => {
                      if (selecionados.size > 0) clearSelection();
                      else selectAllFiltered();
                    }}
                    className="h-4 w-4 rounded border-slate-300 text-conecta-accent focus:ring-conecta-accent"
                  />
                </th>
                <th className="px-3 py-3 font-medium">Nome</th>
                <th className="px-3 py-3 font-medium">Chapa</th>
                <th className="px-3 py-3 font-medium">Cidade</th>
                <th className="px-3 py-3 font-medium">Rota</th>
                <th className="px-3 py-3 font-medium text-right">Ações</th>
              </tr>
            </thead>
            <tbody>
              {filtrados.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-conecta-muted text-sm">
                    Nenhum passageiro encontrado
                  </td>
                </tr>
              ) : (
                filtrados.map(p => {
                  const rota = rotas.find(r => r.id === p.rotaId);
                  return (
                    <tr key={p.id} className={`border-b border-slate-50 hover:bg-slate-50/60 ${!p.rotaId ? 'bg-amber-50/30' : ''}`}>
                      <td className="px-3 py-2">
                        {!p.rotaId && (
                          <input
                            type="checkbox"
                            checked={selecionados.has(p.id)}
                            onChange={() => toggleSelect(p.id)}
                            className="h-4 w-4 rounded border-slate-300 text-conecta-accent focus:ring-conecta-accent"
                          />
                        )}
                      </td>
                      <td className="px-3 py-2 font-medium text-conecta-primary">{p.nome}</td>
                      <td className="px-3 py-2 text-conecta-muted font-mono text-xs">{p.chapa ?? '—'}</td>
                      <td className="px-3 py-2">
                        {p.cidade ? (
                          <span className="inline-flex items-center gap-1 text-xs text-conecta-muted">
                            <MapPin className="h-3 w-3" />{p.cidade}
                          </span>
                        ) : '—'}
                      </td>
                      <td className="px-3 py-2">
                        {rota ? (
                          <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
                            <Bus className="h-3 w-3" />{rota.nome}
                            <span className="text-[10px] text-emerald-600">({rota.turno})</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full">
                            <AlertTriangle className="h-3 w-3" />Sem rota
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-2 text-right">
                        <div className="inline-flex gap-1">
                          {p.rotaId ? (
                            <button type="button" onClick={() => handleDesalocar(p.id)} disabled={pending}
                              title="Desalocar"
                              className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs border border-amber-200 text-amber-700 hover:bg-amber-50 disabled:opacity-50">
                              <RotateCcw className="h-3 w-3" />
                            </button>
                          ) : (
                            <RotaDropdown
                              rotas={rotas.filter(r => r.ativo)}
                              onSelect={(rotaId) => handleAlocarUnico(p.id, rotaId)}
                              disabled={pending}
                            />
                          )}
                          <button type="button" onClick={() => handleRemover(p.id)} disabled={pending}
                            title="Remover"
                            className="inline-flex items-center px-2 py-1 rounded text-xs border border-red-200 text-red-500 hover:bg-red-50 disabled:opacity-50">
                            <Trash2 className="h-3 w-3" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
        {filtrados.length > 0 && (
          <div className="px-4 py-2 border-t border-slate-100 text-xs text-conecta-muted">
            Mostrando {filtrados.length} de {todosPassageiros.length} passageiro(s)
          </div>
        )}
      </div>
    </div>
  );
}

function RotaDropdown({
  rotas,
  onSelect,
  disabled,
}: {
  rotas: { id: string; nome: string; turno: string }[];
  onSelect: (rotaId: string) => void;
  disabled: boolean;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <button type="button" onClick={() => setOpen(!open)} disabled={disabled}
        className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs border border-conecta-primary/20 text-conecta-primary hover:bg-slate-50 disabled:opacity-50">
        <ArrowRight className="h-3 w-3" /> Alocar <ChevronDown className="h-3 w-3" />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-20" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full mt-1 z-30 bg-white rounded-lg border border-slate-200 shadow-lg py-1 min-w-[200px]">
            {rotas.map(r => (
              <button
                key={r.id}
                type="button"
                onClick={() => { onSelect(r.id); setOpen(false); }}
                className="w-full text-left px-3 py-2 text-xs hover:bg-slate-50 flex items-center gap-2"
              >
                <Bus className="h-3.5 w-3.5 text-conecta-accent" />
                <span className="font-medium text-conecta-primary">{r.nome}</span>
                <span className="text-[10px] text-conecta-muted ml-auto">{r.turno}</span>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
