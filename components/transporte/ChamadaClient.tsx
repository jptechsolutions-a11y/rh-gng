'use client';

import { useState, useTransition, useEffect } from 'react';
import { toast } from 'sonner';
import { obterChamada, salvarChamada } from '@/actions/transporte';
import { CheckCircle2, XCircle, Save, Bus } from 'lucide-react';

type Rota = { id: string; nome: string; turno: string; lugares: number };
type Registro = { passageiroId: string; nome: string; chapa: string | null; presente: boolean | null; observacao: string | null };

export function ChamadaClient({ rotas }: { rotas: Rota[] }) {
  const hoje = new Date().toISOString().slice(0, 10);
  const [rotaId, setRotaId] = useState(rotas[0]?.id ?? '');
  const [data, setData] = useState(hoje);
  const [registros, setRegistros] = useState<Registro[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, startSave] = useTransition();

  const rotaSelecionada = rotas.find(r => r.id === rotaId);

  useEffect(() => {
    if (!rotaId || !data) return;
    setLoading(true);
    obterChamada(rotaId, data)
      .then(setRegistros)
      .catch(() => toast.error('Erro ao carregar chamada'))
      .finally(() => setLoading(false));
  }, [rotaId, data]);

  const togglePresente = (idx: number, presente: boolean) => {
    setRegistros(prev => prev.map((r, i) => i === idx ? { ...r, presente } : r));
  };

  const marcarTodos = (presente: boolean) => {
    setRegistros(prev => prev.map(r => ({ ...r, presente })));
  };

  const salvar = () => {
    const paraEnviar = registros
      .filter(r => r.presente !== null)
      .map(r => ({ passageiroId: r.passageiroId, presente: r.presente!, observacao: r.observacao ?? undefined }));

    if (paraEnviar.length === 0) {
      toast.error('Marque a presença de pelo menos um passageiro');
      return;
    }

    startSave(async () => {
      try {
        await salvarChamada(rotaId, data, paraEnviar);
        toast.success('Chamada salva com sucesso');
      } catch {
        toast.error('Erro ao salvar chamada');
      }
    });
  };

  const presentes = registros.filter(r => r.presente === true).length;
  const ausentes = registros.filter(r => r.presente === false).length;

  return (
    <div className="space-y-4">
      {/* Filtros */}
      <div className="bg-white rounded-xl border border-conecta-primary/8 p-4 flex flex-wrap gap-4 items-end"
        style={{ boxShadow: '0 4px 24px -10px rgba(13,43,107,0.08)' }}>
        <div className="flex-1 min-w-[200px]">
          <label className="block text-xs font-medium text-conecta-primary mb-1">Rota</label>
          <select
            value={rotaId}
            onChange={e => setRotaId(e.target.value)}
            className="h-9 w-full rounded-md border border-slate-200 bg-white text-sm px-3"
          >
            {rotas.map(r => (
              <option key={r.id} value={r.id}>{r.nome} — {r.turno} ({r.lugares} lugares)</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-conecta-primary mb-1">Data</label>
          <input
            type="date"
            value={data}
            onChange={e => setData(e.target.value)}
            className="h-9 rounded-md border border-slate-200 bg-white text-sm px-3"
          />
        </div>
      </div>

      {/* Lista de passageiros */}
      {loading ? (
        <div className="bg-white rounded-xl border border-conecta-primary/8 p-8 text-center text-conecta-muted">
          <p className="text-sm">Carregando...</p>
        </div>
      ) : registros.length === 0 ? (
        <div className="bg-white rounded-xl border border-conecta-primary/8 p-8 text-center text-conecta-muted">
          <Bus className="h-8 w-8 mx-auto mb-2 text-conecta-accent/50" />
          <p className="text-sm">Nenhum passageiro cadastrado nesta rota.</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-conecta-primary/8 overflow-hidden"
          style={{ boxShadow: '0 4px 24px -10px rgba(13,43,107,0.08)' }}>
          {/* Header com ações em massa */}
          <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
            <div className="text-sm text-conecta-muted">
              {registros.length} passageiros · <span className="text-emerald-600 font-medium">{presentes} presentes</span> · <span className="text-red-500 font-medium">{ausentes} ausentes</span>
              {rotaSelecionada && (
                <span className="ml-2 text-conecta-primary font-medium">({rotaSelecionada.lugares} lugares)</span>
              )}
            </div>
            <div className="flex gap-1.5">
              <button
                type="button"
                onClick={() => marcarTodos(true)}
                className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs border border-emerald-200 hover:bg-emerald-50 text-emerald-700"
              >
                <CheckCircle2 className="h-3.5 w-3.5" /> Todos presentes
              </button>
              <button
                type="button"
                onClick={() => marcarTodos(false)}
                className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs border border-red-200 hover:bg-red-50 text-red-700"
              >
                <XCircle className="h-3.5 w-3.5" /> Todos ausentes
              </button>
            </div>
          </div>

          {/* Tabela */}
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 text-left text-xs uppercase tracking-wide text-conecta-muted">
                <th className="px-4 py-2 font-medium">Nome</th>
                <th className="px-4 py-2 font-medium">Chapa</th>
                <th className="px-4 py-2 font-medium text-center">Presença</th>
              </tr>
            </thead>
            <tbody>
              {registros.map((r, idx) => (
                <tr key={r.passageiroId} className="border-b border-slate-50 hover:bg-slate-50/60">
                  <td className="px-4 py-2.5 font-medium text-conecta-primary">{r.nome}</td>
                  <td className="px-4 py-2.5 text-conecta-muted font-mono text-xs">{r.chapa ?? '—'}</td>
                  <td className="px-4 py-2.5">
                    <div className="flex items-center justify-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => togglePresente(idx, true)}
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                          r.presente === true
                            ? 'bg-emerald-100 text-emerald-800 ring-1 ring-emerald-300'
                            : 'border border-slate-200 text-slate-500 hover:bg-emerald-50 hover:text-emerald-700'
                        }`}
                      >
                        <CheckCircle2 className="h-3.5 w-3.5" /> P
                      </button>
                      <button
                        type="button"
                        onClick={() => togglePresente(idx, false)}
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                          r.presente === false
                            ? 'bg-red-100 text-red-800 ring-1 ring-red-300'
                            : 'border border-slate-200 text-slate-500 hover:bg-red-50 hover:text-red-700'
                        }`}
                      >
                        <XCircle className="h-3.5 w-3.5" /> A
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Footer */}
          <div className="px-4 py-3 border-t border-slate-100 flex justify-end">
            <button
              type="button"
              onClick={salvar}
              disabled={saving}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-md text-sm font-medium bg-conecta-accent text-white hover:bg-conecta-accent/90 disabled:opacity-50 transition-colors"
            >
              <Save className="h-4 w-4" /> {saving ? 'Salvando...' : 'Salvar chamada'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
