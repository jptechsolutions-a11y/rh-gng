'use client';

import { useMemo, useState, useTransition } from 'react';
import { editarEscopoLider } from '@/actions/qlp/lideres';

interface FilialOpt {
  id: string;
  codigo: string;
  nome: string;
}

type Escopo = 'nacional' | 'regional' | 'filial';

export function EditarLiderModal({
  liderId,
  nome,
  funcao,
  tier,
  nivel,
  escopoNacionalInicial,
  filiaisEscopoInicial,
  colaboradorFilialId,
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
  colaboradorFilialId: string | null;
  filiais: FilialOpt[];
  onClose: () => void;
}) {
  // Inferir escopo inicial
  const escopoInicial: Escopo = useMemo(() => {
    if (escopoNacionalInicial) return 'nacional';
    if (
      filiaisEscopoInicial.length === 1 &&
      colaboradorFilialId &&
      filiaisEscopoInicial[0] === colaboradorFilialId
    ) {
      return 'filial';
    }
    return 'regional';
  }, [escopoNacionalInicial, filiaisEscopoInicial, colaboradorFilialId]);

  const [escopo, setEscopo] = useState<Escopo>(escopoInicial);
  const [filiaisEscopo, setFiliaisEscopo] = useState<string[]>(filiaisEscopoInicial);
  const [erro, setErro] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function submit() {
    setErro(null);
    let filiais: string[];
    if (escopo === 'nacional') {
      filiais = [];
    } else if (escopo === 'filial') {
      if (!colaboradorFilialId) {
        setErro('colaborador sem filial associada — escolha Regional ou Nacional');
        return;
      }
      filiais = [colaboradorFilialId];
    } else {
      if (filiaisEscopo.length === 0) {
        setErro('selecione ao menos uma filial');
        return;
      }
      filiais = filiaisEscopo;
    }
    start(async () => {
      try {
        await editarEscopoLider({
          liderId,
          escopoNacional: escopo === 'nacional',
          filiaisEscopo: filiais,
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

        <div>
          <label className="block text-[10px] uppercase tracking-[0.18em] font-semibold text-conecta-primary mb-1">
            Escopo
          </label>
          <div className="grid grid-cols-3 gap-2">
            <EscopoOption
              titulo="Nacional"
              sub="Todas as filiais"
              ativo={escopo === 'nacional'}
              onClick={() => setEscopo('nacional')}
            />
            <EscopoOption
              titulo="Regional"
              sub="Várias filiais"
              ativo={escopo === 'regional'}
              onClick={() => setEscopo('regional')}
            />
            <EscopoOption
              titulo="Filial"
              sub="Só a unidade dele"
              ativo={escopo === 'filial'}
              onClick={() => setEscopo('filial')}
            />
          </div>
        </div>

        {escopo === 'regional' && (
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

        {escopo === 'filial' && (
          <p className="text-[11px] text-conecta-muted">
            Vai cobrir apenas a filial atual do colaborador
            {colaboradorFilialId
              ? ' (definida no quadro Perlog).'
              : ' — atenção: colaborador sem filial associada.'}
          </p>
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

function EscopoOption({
  titulo,
  sub,
  ativo,
  onClick,
}: {
  titulo: string;
  sub: string;
  ativo: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        'rounded-lg border p-2 text-left transition ' +
        (ativo
          ? 'border-conecta-accent bg-conecta-accent/5 ring-1 ring-conecta-accent/40'
          : 'border-conecta-primary/15 hover:border-conecta-primary/30 bg-white')
      }
    >
      <div className={'text-sm font-display font-semibold ' + (ativo ? 'text-conecta-accent' : 'text-conecta-primary')}>
        {titulo}
      </div>
      <div className="text-[11px] text-conecta-muted leading-tight mt-0.5">{sub}</div>
    </button>
  );
}
