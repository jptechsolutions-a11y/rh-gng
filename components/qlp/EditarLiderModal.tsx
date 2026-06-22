'use client';

import { useState, useTransition } from 'react';
import { editarEscopoLider } from '@/actions/qlp/lideres';

interface FilialOpt {
  id: string;
  codigo: string;
  nome: string;
}

export function EditarLiderModal({
  liderId,
  nome,
  funcao,
  tier,
  nivel,
  escopoNacionalInicial,
  filiaisEscopoInicial,
  filiais,
  onClose,
}: {
  liderId: string;
  nome: string;
  funcao: string;
  tier: string;
  nivel: string | null;
  escopoNacionalInicial: boolean;
  filiaisEscopoInicial: string[];
  filiais: FilialOpt[];
  onClose: () => void;
}) {
  const [escopoNacional, setEscopoNacional] = useState(escopoNacionalInicial);
  const [filiaisEscopo, setFiliaisEscopo] = useState<string[]>(filiaisEscopoInicial);
  const [erro, setErro] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function submit() {
    setErro(null);
    if (!escopoNacional && filiaisEscopo.length === 0) {
      setErro('selecione ao menos uma filial OU marque escopo nacional');
      return;
    }
    start(async () => {
      try {
        await editarEscopoLider({
          liderId,
          escopoNacional,
          filiaisEscopo: escopoNacional ? [] : filiaisEscopo,
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
      <div className="bg-white rounded-2xl p-6 w-full max-w-md space-y-3 shadow-2xl border border-conecta-primary/10">
        <h2 className="font-display text-lg font-extrabold text-conecta-primary">Editar escopo do líder</h2>
        <div className="rounded-lg bg-conecta-primary/5 border border-conecta-primary/10 p-3">
          <div className="font-medium text-conecta-primary">{nome}</div>
          <div className="text-xs text-conecta-muted">{funcao}</div>
          <div className="mt-1 flex gap-1">
            <span className="rounded-full bg-conecta-primary/10 text-conecta-primary text-[10px] uppercase tracking-wide px-2 py-0.5">
              {tier}
            </span>
            {nivel && (
              <span className="rounded-full bg-conecta-accent/10 text-conecta-accent text-[10px] uppercase tracking-wide px-2 py-0.5">
                {nivel}
              </span>
            )}
          </div>
        </div>

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
          <div>
            <label className="block text-[10px] uppercase tracking-[0.18em] font-semibold text-conecta-primary mb-1">
              Filiais cobertas ({filiaisEscopo.length})
            </label>
            <select
              multiple
              className="w-full border border-conecta-primary/15 rounded-lg p-2 text-sm h-48"
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
          </div>
        )}

        {erro && <div className="text-rose-600 text-sm">{erro}</div>}

        <div className="flex justify-end gap-2 pt-2">
          <button onClick={onClose} className="px-3 py-2 text-sm text-conecta-muted hover:text-conecta-primary">
            Cancelar
          </button>
          <button
            onClick={submit}
            disabled={pending}
            className="px-4 py-2 rounded-lg bg-conecta-accent text-white text-sm font-display font-semibold hover:brightness-110 disabled:opacity-50 transition"
          >
            {pending ? 'Salvando…' : 'Salvar'}
          </button>
        </div>
      </div>
    </div>
  );
}
