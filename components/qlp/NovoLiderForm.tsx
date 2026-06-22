'use client';

import { useState, useTransition } from 'react';
import { criarLider } from '@/actions/qlp/lideres';

interface FilialOpt {
  id: string;
  codigo: string;
  nome: string;
}

export function NovoLiderForm({ filiais }: { filiais: FilialOpt[] }) {
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const [chapa, setChapa] = useState('');
  const [tier, setTier] = useState<'gerente' | 'subgerente' | 'coord'>('coord');
  const [nivel, setNivel] = useState<'nacional' | 'regional'>('regional');
  const [escopoNacional, setEscopoNacional] = useState(false);
  const [filiaisEscopo, setFiliaisEscopo] = useState<string[]>([]);
  const [erro, setErro] = useState<string | null>(null);
  const [colabInfo, setColabInfo] = useState<{ id: string; nome: string; funcao: string } | null>(null);

  async function lookupChapa(c: string) {
    setColabInfo(null);
    if (!c.trim()) return;
    try {
      const r = await fetch(`/api/qlp/colaborador-por-chapa?chapa=${encodeURIComponent(c.trim())}`);
      const data = await r.json();
      if (data?.id) setColabInfo({ id: data.id, nome: data.nome, funcao: data.funcao });
      else setColabInfo(null);
    } catch {
      /* ignore */
    }
  }

  function submit() {
    setErro(null);
    if (!colabInfo?.id) {
      setErro('busque a chapa do colaborador primeiro');
      return;
    }
    start(async () => {
      try {
        await criarLider({
          colaboradorId: colabInfo.id,
          tier,
          nivel: tier === 'subgerente' ? null : nivel,
          escopoNacional,
          filiaisEscopo: escopoNacional ? [] : filiaisEscopo,
        });
        setOpen(false);
        setChapa('');
        setColabInfo(null);
        setFiliaisEscopo([]);
        setEscopoNacional(false);
        location.reload();
      } catch (e) {
        setErro(e instanceof Error ? e.message : 'erro ao criar líder');
      }
    });
  }

  if (!open) {
    return (
      <button
        className="rounded-lg bg-slate-900 text-white px-3 py-2 text-sm hover:bg-slate-800"
        onClick={() => setOpen(true)}
      >
        + Novo líder
      </button>
    );
  }
  return (
    <div className="fixed inset-0 bg-black/40 grid place-items-center z-50 p-4">
      <div className="bg-white rounded-2xl p-6 w-full max-w-md space-y-3 shadow-xl">
        <h2 className="text-lg font-semibold">Novo líder</h2>

        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">Chapa do colaborador</label>
          <input
            className="w-full border border-slate-300 rounded-lg p-2 text-sm"
            placeholder="ex. 2000413"
            value={chapa}
            onChange={(e) => {
              setChapa(e.target.value);
              setColabInfo(null);
            }}
            onBlur={() => lookupChapa(chapa)}
          />
          {colabInfo && (
            <p className="text-xs text-emerald-700 mt-1">
              ✓ {colabInfo.nome} <span className="text-slate-500">({colabInfo.funcao})</span>
            </p>
          )}
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">Tier</label>
          <select
            className="w-full border border-slate-300 rounded-lg p-2 text-sm"
            value={tier}
            onChange={(e) => setTier(e.target.value as typeof tier)}
          >
            <option value="gerente">Gerente</option>
            <option value="subgerente">Subgerente</option>
            <option value="coord">Coordenador</option>
          </select>
        </div>

        {tier !== 'subgerente' && (
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Nível</label>
            <select
              className="w-full border border-slate-300 rounded-lg p-2 text-sm"
              value={nivel}
              onChange={(e) => setNivel(e.target.value as typeof nivel)}
            >
              <option value="regional">Regional</option>
              <option value="nacional">Nacional</option>
            </select>
          </div>
        )}

        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={escopoNacional}
            onChange={(e) => setEscopoNacional(e.target.checked)}
          />
          Escopo nacional (cobre todas as filiais)
        </label>

        {!escopoNacional && (
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Filiais cobertas</label>
            <select
              multiple
              className="w-full border border-slate-300 rounded-lg p-2 text-sm h-40"
              value={filiaisEscopo}
              onChange={(e) =>
                setFiliaisEscopo(Array.from(e.target.selectedOptions).map((o) => o.value))
              }
            >
              {filiais.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.codigo} — {f.nome}
                </option>
              ))}
            </select>
            <p className="text-xs text-slate-500 mt-1">Segure Ctrl/Cmd para selecionar múltiplas.</p>
          </div>
        )}

        {erro && <div className="text-red-600 text-sm">{erro}</div>}

        <div className="flex justify-end gap-2 pt-2">
          <button onClick={() => setOpen(false)} className="px-3 py-2 text-sm text-slate-700">
            Cancelar
          </button>
          <button
            onClick={submit}
            disabled={pending}
            className="px-3 py-2 rounded-lg bg-emerald-600 text-white text-sm disabled:opacity-50"
          >
            {pending ? 'Criando…' : 'Criar líder'}
          </button>
        </div>
      </div>
    </div>
  );
}
