'use client';

import { useMemo, useState, useTransition } from 'react';
import { criarLider } from '@/actions/qlp/lideres';

interface FilialOpt {
  id: string;
  codigo: string;
  nome: string;
  regional: string | null;
}

export interface CandidatoColab {
  id: string;
  chapa: string;
  nome: string;
  funcao: string;
  codfilial: number;
  filial_id: string | null;
  tier_resolvido: string | null;
  nivel_resolvido: string | null;
}

type Tier = 'gerente' | 'subgerente' | 'coord';
type Escopo = 'nacional' | 'regional' | 'multi' | 'filial';

export function NovoLiderForm({
  filiais,
  candidatos,
}: {
  filiais: FilialOpt[];
  candidatos: CandidatoColab[];
}) {
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const [busca, setBusca] = useState('');
  const [colabSel, setColabSel] = useState<CandidatoColab | null>(null);
  const [tier, setTier] = useState<Tier>('coord');
  const [escopo, setEscopo] = useState<Escopo>('filial');
  const [regionalSel, setRegionalSel] = useState<string>('');
  const [filiaisEscopo, setFiliaisEscopo] = useState<string[]>([]);
  const [erro, setErro] = useState<string | null>(null);

  // Regionais únicas extraídas das filiais
  const regionais = useMemo(() => {
    const set = new Set<string>();
    for (const f of filiais) if (f.regional) set.add(f.regional);
    return Array.from(set).sort();
  }, [filiais]);

  // Ordena candidatos: gerentes/subg/coords primeiro
  const ordenados = useMemo(() => {
    const ordemTier: Record<string, number> = {
      gerente: 1,
      subgerente: 2,
      coord: 3,
      supervisor: 4,
      base: 5,
    };
    return [...candidatos].sort((a, b) => {
      const ta = ordemTier[a.tier_resolvido ?? 'base'] ?? 9;
      const tb = ordemTier[b.tier_resolvido ?? 'base'] ?? 9;
      if (ta !== tb) return ta - tb;
      return a.nome.localeCompare(b.nome, 'pt-BR');
    });
  }, [candidatos]);

  const filtrados = useMemo(() => {
    const q = busca.trim().toLowerCase();
    if (!q) return ordenados.slice(0, 200);
    return ordenados
      .filter((c) => `${c.chapa} ${c.nome} ${c.funcao}`.toLowerCase().includes(q))
      .slice(0, 200);
  }, [ordenados, busca]);

  function abrir() {
    setBusca('');
    setColabSel(null);
    setTier('coord');
    setEscopo('filial');
    setRegionalSel('');
    setFiliaisEscopo([]);
    setErro(null);
    setOpen(true);
  }

  function escolher(c: CandidatoColab) {
    setColabSel(c);
    setBusca('');
    const t = c.tier_resolvido;
    if (t === 'gerente' || t === 'subgerente' || t === 'coord') setTier(t);
    const n = c.nivel_resolvido;
    if (n === 'nacional') setEscopo('nacional');
    else setEscopo('filial');
    if (c.filial_id) setFiliaisEscopo([c.filial_id]);
  }

  function submit() {
    setErro(null);
    if (!colabSel) {
      setErro('selecione um colaborador');
      return;
    }

    const escopoNacional = escopo === 'nacional';
    let nivel: 'nacional' | 'regional' | null;
    if (tier === 'subgerente') {
      nivel = null;
    } else if (escopo === 'nacional') {
      nivel = 'nacional';
    } else {
      nivel = 'regional';
    }

    let filiaisFinal: string[];
    if (escopo === 'nacional') {
      filiaisFinal = [];
    } else if (escopo === 'filial') {
      if (!colabSel.filial_id) {
        setErro('colaborador sem filial associada — não dá pra usar escopo "Filial"');
        return;
      }
      filiaisFinal = [colabSel.filial_id];
    } else if (escopo === 'regional') {
      if (!regionalSel) {
        setErro('selecione uma regional');
        return;
      }
      filiaisFinal = filiais.filter((f) => f.regional === regionalSel).map((f) => f.id);
      if (filiaisFinal.length === 0) {
        setErro(`nenhuma filial cadastrada na regional "${regionalSel}"`);
        return;
      }
    } else {
      // multi
      if (filiaisEscopo.length === 0) {
        setErro('selecione ao menos uma filial');
        return;
      }
      filiaisFinal = filiaisEscopo;
    }

    start(async () => {
      try {
        await criarLider({
          colaboradorId: colabSel.id,
          tier,
          nivel,
          escopoNacional,
          filiaisEscopo: filiaisFinal,
        });
        setOpen(false);
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
        onClick={abrir}
      >
        + Novo líder
      </button>
    );
  }
  return (
    <div className="fixed inset-0 bg-conecta-primary/30 backdrop-blur-sm grid place-items-center z-50 p-4">
      <div className="bg-white rounded-2xl p-6 w-full max-w-lg space-y-3 shadow-2xl border border-conecta-primary/10 max-h-[90vh] overflow-y-auto">
        <h2 className="font-display text-lg font-extrabold text-conecta-primary">Novo líder</h2>

        {!colabSel ? (
          <div>
            <label className="block text-[10px] uppercase tracking-[0.18em] font-semibold text-conecta-primary mb-1">
              Colaborador
            </label>
            <input
              type="search"
              className="w-full border border-conecta-primary/15 rounded-lg p-2 text-sm focus:outline-none focus:border-conecta-accent/60"
              placeholder="Buscar por nome, chapa ou função…"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              autoFocus
            />
            <div className="mt-2 max-h-64 overflow-y-auto rounded-lg border border-conecta-primary/10 divide-y divide-conecta-primary/5">
              {filtrados.length === 0 ? (
                <p className="text-xs text-conecta-muted p-3">
                  Nenhum candidato encontrado. Refine a busca.
                </p>
              ) : (
                filtrados.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => escolher(c)}
                    className="w-full text-left p-2 hover:bg-conecta-primary/[0.04] transition"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-conecta-primary font-medium text-sm truncate">{c.nome}</span>
                      {c.tier_resolvido && c.tier_resolvido !== 'base' && (
                        <span className="rounded-full bg-conecta-accent/10 text-conecta-accent text-[10px] uppercase tracking-wide px-2 py-0.5 shrink-0">
                          {c.tier_resolvido}
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-conecta-muted truncate">
                      <span className="font-mono">{c.chapa}</span> · {c.funcao} · Filial {c.codfilial}
                    </div>
                  </button>
                ))
              )}
              {busca.trim() === '' && ordenados.length > 200 && (
                <p className="text-[11px] text-conecta-muted p-2 italic">
                  Mostrando os 200 primeiros. Digite para filtrar entre os {ordenados.length}.
                </p>
              )}
            </div>
          </div>
        ) : (
          <div className="rounded-lg bg-conecta-primary/5 border border-conecta-primary/10 p-3 flex items-start justify-between gap-2">
            <div className="min-w-0">
              <div className="font-medium text-conecta-primary truncate">{colabSel.nome}</div>
              <div className="text-xs text-conecta-muted truncate">
                <span className="font-mono">{colabSel.chapa}</span> · {colabSel.funcao} · Filial{' '}
                {colabSel.codfilial}
              </div>
            </div>
            <button
              onClick={() => setColabSel(null)}
              className="text-xs text-conecta-accent hover:underline shrink-0"
            >
              trocar
            </button>
          </div>
        )}

        <Field label="Tier de liderança">
          <select
            className="w-full border border-conecta-primary/15 rounded-lg p-2 text-sm bg-white"
            value={tier}
            onChange={(e) => setTier(e.target.value as Tier)}
          >
            <option value="gerente">Gerente</option>
            <option value="subgerente">Subgerente</option>
            <option value="coord">Coordenador</option>
          </select>
        </Field>

        <Field label="Escopo">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <EscopoOption
              titulo="Nacional"
              sub="Todas as filiais"
              ativo={escopo === 'nacional'}
              onClick={() => {
                setEscopo('nacional');
                setFiliaisEscopo([]);
              }}
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
              onClick={() => {
                setEscopo('filial');
                if (colabSel?.filial_id) setFiliaisEscopo([colabSel.filial_id]);
              }}
            />
          </div>
          <p className="text-[11px] text-conecta-muted mt-2">
            {escopo === 'nacional' && 'Líder cobre todas as filiais ativas.'}
            {escopo === 'regional' && 'Líder cobre todas as filiais de uma regional (AGP, SP, MS…).'}
            {escopo === 'multi' && 'Líder cobre uma seleção arbitrária de filiais (não-regional).'}
            {escopo === 'filial' &&
              `Líder atua só na própria filial do colaborador${colabSel ? ` (filial ${colabSel.codfilial})` : ''}.`}
          </p>
        </Field>

        {escopo === 'regional' && (
          <Field label="Regional">
            <select
              className="w-full border border-conecta-primary/15 rounded-lg p-2 text-sm bg-white"
              value={regionalSel}
              onChange={(e) => setRegionalSel(e.target.value)}
            >
              <option value="">— selecionar —</option>
              {regionais.map((r) => {
                const n = filiais.filter((f) => f.regional === r).length;
                return (
                  <option key={r} value={r}>
                    {r} ({n} filia{n === 1 ? 'l' : 'is'})
                  </option>
                );
              })}
            </select>
          </Field>
        )}

        {escopo === 'multi' && (
          <Field
            label={`Filiais cobertas ${filiaisEscopo.length > 0 ? `(${filiaisEscopo.length} selecionadas)` : ''}`}
          >
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
                  {f.codigo} — {f.nome} {f.regional ? `[${f.regional}]` : ''}
                </option>
              ))}
            </select>
            <p className="text-xs text-conecta-muted mt-1">Segure Ctrl/Cmd para selecionar múltiplas.</p>
          </Field>
        )}

        {erro && <div className="text-rose-600 text-sm">{erro}</div>}

        <div className="flex justify-end gap-2 pt-2">
          <button
            onClick={() => setOpen(false)}
            className="px-3 py-2 text-sm text-conecta-muted hover:text-conecta-primary"
          >
            Cancelar
          </button>
          <button
            onClick={submit}
            disabled={pending || !colabSel}
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
