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
        className="rounded-lg bg-conecta-accent text-white px-4 py-2 text-sm font-display font-semibold hover:brightness-110 transition"
        onClick={() => setOpen(true)}
      >
        + Novo líder
      </button>
    );
  }
  return (
    <div className="fixed inset-0 bg-conecta-primary/30 backdrop-blur-sm grid place-items-center z-50 p-4">
      <div className="bg-white rounded-2xl p-6 w-full max-w-md space-y-3 shadow-2xl border border-conecta-primary/10">
        <h2 className="font-display text-lg font-extrabold text-conecta-primary">Novo líder</h2>

        <Field label="Chapa do colaborador">
          <input
            className="w-full border border-conecta-primary/15 rounded-lg p-2 text-sm focus:outline-none focus:border-conecta-accent/60"
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
              ✓ {colabInfo.nome}{' '}
              <span className="text-conecta-muted">({colabInfo.funcao})</span>
            </p>
          )}
        </Field>

        <Field label="Tier">
          <select
            className="w-full border border-conecta-primary/15 rounded-lg p-2 text-sm bg-white"
            value={tier}
            onChange={(e) => setTier(e.target.value as typeof tier)}
          >
            <option value="gerente">Gerente</option>
            <option value="subgerente">Subgerente</option>
            <option value="coord">Coordenador</option>
          </select>
        </Field>

        {tier !== 'subgerente' && (
          <Field label="Nível">
            <select
              className="w-full border border-conecta-primary/15 rounded-lg p-2 text-sm bg-white"
              value={nivel}
              onChange={(e) => setNivel(e.target.value as typeof nivel)}
            >
              <option value="regional">Regional</option>
              <option value="nacional">Nacional</option>
            </select>
          </Field>
        )}

        <label className="flex items-center gap-2 text-sm text-conecta-primary">
          <input
            type="checkbox"
            checked={escopoNacional}
            onChange={(e) => setEscopoNacional(e.target.checked)}
            className="accent-conecta-accent"
          />
          Escopo nacional (cobre todas as filiais)
        </label>

        {!escopoNacional && (
          <Field label="Filiais cobertas">
            <select
              multiple
              className="w-full border border-conecta-primary/15 rounded-lg p-2 text-sm h-40"
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
            <p className="text-xs text-conecta-muted mt-1">Segure Ctrl/Cmd para selecionar múltiplas.</p>
          </Field>
        )}

        {erro && <div className="text-rose-600 text-sm">{erro}</div>}

        <div className="flex justify-end gap-2 pt-2">
          <button onClick={() => setOpen(false)} className="px-3 py-2 text-sm text-conecta-muted hover:text-conecta-primary">
            Cancelar
          </button>
          <button
            onClick={submit}
            disabled={pending}
            className="px-4 py-2 rounded-lg bg-conecta-accent text-white text-sm font-display font-semibold hover:brightness-110 disabled:opacity-50 transition"
          >
            {pending ? 'Criando…' : 'Criar líder'}
          </button>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-[10px] uppercase tracking-[0.18em] font-semibold text-conecta-primary mb-1">
        {label}
      </label>
      {children}
    </div>
  );
}
