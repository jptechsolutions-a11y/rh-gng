'use client';

import { useMemo, useState, useTransition } from 'react';
import { editarEscopoLider } from '@/actions/qlp/lideres';

interface FilialOpt {
  id: string;
  codigo: string;
  nome: string;
  regional: string | null;
}

type Escopo = 'nacional' | 'regional' | 'multi' | 'filial';

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
  const regionais = useMemo(() => {
    const set = new Set<string>();
    for (const f of filiais) if (f.regional) set.add(f.regional);
    return Array.from(set).sort();
  }, [filiais]);

  // Mapa filial.id → regional
  const filialRegional = useMemo(() => {
    const m = new Map<string, string | null>();
    for (const f of filiais) m.set(f.id, f.regional);
    return m;
  }, [filiais]);

  // Inferir escopo inicial
  const { escopoInicial, regionaisIniciais } = useMemo(() => {
    if (escopoNacionalInicial || nivel === 'nacional') {
      return { escopoInicial: 'nacional' as Escopo, regionaisIniciais: [] as string[] };
    }
    if (nivel === 'filial') {
      return { escopoInicial: 'filial' as Escopo, regionaisIniciais: [] as string[] };
    }
    if (nivel === 'regional') {
      const regsUnicas = Array.from(new Set(
        filiaisEscopoInicial.map((id) => filialRegional.get(id)).filter((r): r is string => r != null)
      ));
      return { escopoInicial: 'regional' as Escopo, regionaisIniciais: regsUnicas };
    }
    if (nivel === 'multi') {
      return { escopoInicial: 'multi' as Escopo, regionaisIniciais: [] as string[] };
    }

    // Fallback de retrocompatibilidade
    if (
      filiaisEscopoInicial.length === 1 &&
      colaboradorFilialId &&
      filiaisEscopoInicial[0] === colaboradorFilialId
    ) {
      return { escopoInicial: 'filial' as Escopo, regionaisIniciais: [] as string[] };
    }
    // Cobre uma ou mais regionais inteiras?
    if (filiaisEscopoInicial.length > 0) {
      const regsUnicas = Array.from(new Set(
        filiaisEscopoInicial.map((id) => filialRegional.get(id)).filter((r): r is string => r != null)
      ));
      if (regsUnicas.length > 0) {
        const filiaisDasRegionais = filiais.filter((f) => f.regional && regsUnicas.includes(f.regional)).map((f) => f.id);
        const cobreTodas = filiaisDasRegionais.every((id) => filiaisEscopoInicial.includes(id)) &&
                           filiaisDasRegionais.length === filiaisEscopoInicial.length;
        if (cobreTodas) {
          return { escopoInicial: 'regional' as Escopo, regionaisIniciais: regsUnicas };
        }
      }
    }
    return { escopoInicial: 'multi' as Escopo, regionaisIniciais: [] as string[] };
  }, [escopoNacionalInicial, nivel, filiaisEscopoInicial, colaboradorFilialId, filialRegional, filiais]);

  const [escopo, setEscopo] = useState<Escopo>(escopoInicial);
  const [regionaisSel, setRegionaisSel] = useState<string[]>(regionaisIniciais);
  const [filiaisEscopo, setFiliaisEscopo] = useState<string[]>(filiaisEscopoInicial);
  const [erro, setErro] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function submit() {
    setErro(null);
    let filiaisFinal: string[];
    if (escopo === 'nacional') {
      filiaisFinal = [];
    } else if (escopo === 'filial') {
      if (!colaboradorFilialId) {
        setErro('colaborador sem filial associada — escolha Regional, Multi-filial ou Nacional');
        return;
      }
      filiaisFinal = [colaboradorFilialId];
    } else if (escopo === 'regional') {
      if (regionaisSel.length === 0) {
        setErro('selecione ao menos uma regional');
        return;
      }
      filiaisFinal = filiais.filter((f) => f.regional && regionaisSel.includes(f.regional)).map((f) => f.id);
      if (filiaisFinal.length === 0) {
        setErro('nenhuma filial cadastrada nas regionais selecionadas');
        return;
      }
    } else {
      if (filiaisEscopo.length === 0) {
        setErro('selecione ao menos uma filial');
        return;
      }
      filiaisFinal = filiaisEscopo;
    }

    let nivelFinal: 'nacional' | 'regional' | 'multi' | 'filial' | null = null;
    if (tier !== 'subgerente') {
      if (escopo === 'nacional') nivelFinal = 'nacional';
      else if (escopo === 'regional') nivelFinal = 'regional';
      else if (escopo === 'multi') nivelFinal = 'multi';
      else nivelFinal = 'filial';
    }

    start(async () => {
      try {
        await editarEscopoLider({
          liderId,
          escopoNacional: escopo === 'nacional',
          filiaisEscopo: filiaisFinal,
          nivel: nivelFinal,
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
      <div className="bg-white rounded-2xl p-6 w-full max-w-lg space-y-3 shadow-2xl border border-conecta-primary/10 max-h-[90vh] overflow-y-auto">
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
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <EscopoOption
              titulo="Nacional"
              sub="Todas as filiais"
              ativo={escopo === 'nacional'}
              onClick={() => setEscopo('nacional')}
            />
            <EscopoOption
              titulo="Regional"
              sub="Toda a regional"
              ativo={escopo === 'regional'}
              onClick={() => setEscopo('regional')}
            />
            <EscopoOption
              titulo="Multi-filial"
              sub="Várias filiais"
              ativo={escopo === 'multi'}
              onClick={() => setEscopo('multi')}
            />
            <EscopoOption
              titulo="Filial"
              sub="Só a dele"
              ativo={escopo === 'filial'}
              onClick={() => setEscopo('filial')}
            />
          </div>
        </div>

        {escopo === 'regional' && (
          <div>
            <label className="block text-[10px] uppercase tracking-[0.18em] font-semibold text-conecta-primary mb-1">
              Regionais cobertas {regionaisSel.length > 0 ? `(${regionaisSel.length} selecionadas)` : ''}
            </label>
            <select
              multiple
              className="w-full border border-conecta-primary/15 rounded-lg p-2 text-sm h-32 bg-white"
              value={regionaisSel}
              onChange={(e) =>
                setRegionaisSel(Array.from(e.target.selectedOptions).map((o) => o.value))
              }
            >
              {regionais.map((r) => {
                const n = filiais.filter((f) => f.regional === r).length;
                return (
                  <option key={r} value={r}>
                    {r} ({n} filia{n === 1 ? 'l' : 'is'})
                  </option>
                );
              })}
            </select>
            <p className="text-xs text-conecta-muted mt-1">Segure Ctrl/Cmd para selecionar múltiplas.</p>
          </div>
        )}

        {escopo === 'multi' && (
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
                  {f.codigo} — {f.nome} {f.regional ? `[${f.regional}]` : ''}
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
      <div
        className={
          'text-sm font-display font-semibold ' +
          (ativo ? 'text-conecta-accent' : 'text-conecta-primary')
        }
      >
        {titulo}
      </div>
      <div className="text-[11px] text-conecta-muted leading-tight mt-0.5">{sub}</div>
    </button>
  );
}
