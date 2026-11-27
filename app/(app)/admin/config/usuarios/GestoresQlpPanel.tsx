'use client';

import { useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { AlertTriangle, CheckCircle2, Loader2, UsersRound } from 'lucide-react';
import { ConectaCard, SectionHeader } from '@/components/ui/conecta-card';
import {
  conferirGestoresQlp, gerarUsuariosGestores, type PlanoGestor, type ResumoGestores,
} from '@/actions/usuarios-gestores';

type Filtro = 'todos' | 'novo' | 'repetido' | 'existente' | 'sem_filial';

const ROTULO_TIER: Record<string, string> = { gerente: 'Gerente', subgerente: 'Subgerente', coord: 'Coordenador', supervisor: 'Supervisor' };

/** Gera os usuários de gestor a partir dos líderes do QLP (supervisor para cima), conferindo antes. */
export function GestoresQlpPanel() {
  const router = useRouter();
  const [carregando, iniciarConferencia] = useTransition();
  const [gerando, setGerando] = useState(false);
  const [itens, setItens] = useState<PlanoGestor[] | null>(null);
  const [resumo, setResumo] = useState<ResumoGestores | null>(null);
  const [filtro, setFiltro] = useState<Filtro>('novo');
  const [msg, setMsg] = useState<{ tipo: 'ok' | 'erro'; texto: string } | null>(null);

  function conferir() {
    setMsg(null);
    iniciarConferencia(async () => {
      const r = await conferirGestoresQlp();
      if (!r.ok) return setMsg({ tipo: 'erro', texto: r.erro });
      setItens(r.itens);
      setResumo(r.resumo);
      setFiltro(r.resumo.novos > 0 ? 'novo' : 'todos');
    });
  }

  async function gerar() {
    if (!resumo) return;
    if (!confirm(`Criar ${resumo.novos} usuário(s) de gestor?`)) return;
    setGerando(true);
    setMsg(null);
    let criados = 0;
    let atualizadas = 0;
    // A função do servidor cria em lotes; repete até acabar.
    for (let volta = 0; volta < 50; volta++) {
      const r = await gerarUsuariosGestores();
      if (!r.ok) { setGerando(false); return setMsg({ tipo: 'erro', texto: `${r.erro} (criados até aqui: ${criados})` }); }
      criados += r.criados;
      atualizadas += r.filiaisAtualizadas;
      if (r.restantes === 0 || r.criados === 0) break;
    }
    setGerando(false);
    setMsg({ tipo: 'ok', texto: `${criados} usuário(s) criado(s)${atualizadas ? ` e ${atualizadas} com filiais atualizadas` : ''}.` });
    const c = await conferirGestoresQlp();
    if (c.ok) { setItens(c.itens); setResumo(c.resumo); setFiltro('todos'); }
    router.refresh();
  }

  const lista = useMemo(() => {
    if (!itens) return [];
    return itens.filter((i) =>
      filtro === 'todos' ? true : filtro === 'repetido' ? i.repetido : i.situacao === filtro,
    );
  }, [itens, filtro]);

  const chips: { valor: Filtro; rotulo: string; n: number }[] = resumo ? [
    { valor: 'novo', rotulo: 'A criar', n: resumo.novos },
    { valor: 'repetido', rotulo: 'Nome repetido', n: resumo.repetidos },
    { valor: 'existente', rotulo: 'Já existem', n: resumo.existentes },
    { valor: 'sem_filial', rotulo: 'Sem filial', n: resumo.semFilial },
    { valor: 'todos', rotulo: 'Todos', n: resumo.total },
  ] : [];

  return (
    <ConectaCard>
      <SectionHeader label="Usuários de gestor (do QLP)" icon={UsersRound} />
      <p className="mt-3 text-sm text-conecta-muted">
        Cria um usuário para cada líder ativo do QLP de <strong>supervisor para cima</strong>, com as mesmas filiais do QLP.
        Usuário: <code className="rounded bg-slate-100 px-1">primeiro.ultimo</code>. Senha:{' '}
        <code className="rounded bg-slate-100 px-1">4 últimos dígitos da matrícula + código da filial + primeiro nome</code>{' '}
        (ex.: <code className="rounded bg-slate-100 px-1">0004230juliano</code>). Nome já usado ganha um número no fim
        (<code className="rounded bg-slate-100 px-1">maria.silva2</code>). Confira a lista antes de gerar.
      </p>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <button type="button" onClick={conferir} disabled={carregando || gerando} className="inline-flex items-center gap-2 rounded-lg bg-conecta-primary text-white px-4 py-2.5 text-[12px] font-display font-semibold uppercase tracking-[0.12em] hover:brightness-110 disabled:opacity-60">
          {carregando && <Loader2 className="h-4 w-4 animate-spin" />} {itens ? 'Conferir de novo' : 'Conferir líderes do QLP'}
        </button>
        {resumo && resumo.novos > 0 && (
          <button type="button" onClick={() => void gerar()} disabled={gerando || carregando} className="inline-flex items-center gap-2 rounded-lg bg-conecta-accent text-white px-4 py-2.5 text-[12px] font-display font-semibold uppercase tracking-[0.12em] hover:brightness-110 disabled:opacity-60">
            {gerando && <Loader2 className="h-4 w-4 animate-spin" />} Gerar {resumo.novos} usuário(s)
          </button>
        )}
        {resumo && resumo.filiaisDesatualizadas > 0 && resumo.novos === 0 && (
          <button type="button" onClick={() => void gerar()} disabled={gerando} className="inline-flex items-center gap-2 rounded-lg border border-conecta-accent text-conecta-accent px-4 py-2.5 text-[12px] font-display font-semibold uppercase tracking-[0.12em] hover:bg-conecta-accent/5 disabled:opacity-60">
            {gerando && <Loader2 className="h-4 w-4 animate-spin" />} Atualizar filiais de {resumo.filiaisDesatualizadas} gestor(es)
          </button>
        )}
      </div>

      {msg && (
        <div role="alert" className={`mt-3 flex items-start gap-2 rounded-lg border p-3 text-sm ${msg.tipo === 'ok' ? 'border-emerald-200 bg-emerald-50 text-emerald-900' : 'border-rose-200 bg-rose-50 text-rose-900'}`}>
          {msg.tipo === 'ok' ? <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" /> : <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />} {msg.texto}
        </div>
      )}

      {itens && resumo && (
        <div className="mt-4 space-y-3">
          {resumo.repetidos > 0 && (
            <div className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-950">
              {resumo.repetidos} {resumo.repetidos === 1 ? 'líder tem' : 'líderes têm'} o mesmo nome base de outro usuário: o usuário ganhou um número no fim. Veja em “Nome repetido”.
            </div>
          )}
          {resumo.semFilial > 0 && (
            <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-900">
              {resumo.semFilial} {resumo.semFilial === 1 ? 'líder está' : 'líderes estão'} sem filial no QLP e não ganham usuário até o QLP ser corrigido.
            </div>
          )}

          <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
            {chips.map((c) => (
              <button key={c.valor} type="button" onClick={() => setFiltro(c.valor)} aria-pressed={filtro === c.valor}
                className={`shrink-0 rounded-full border px-3.5 py-1.5 text-[12px] font-display font-semibold ${filtro === c.valor ? 'border-conecta-primary bg-conecta-primary text-white' : 'border-conecta-primary/15 bg-white text-conecta-primary'}`}>
                {c.rotulo} <span className="tabular-nums opacity-80">({c.n})</span>
              </button>
            ))}
          </div>

          <div className="overflow-x-auto rounded-lg border border-conecta-primary/10">
            <table className="w-full min-w-[720px] text-sm">
              <thead>
                <tr className="bg-slate-50 text-left text-[10px] font-display uppercase tracking-[0.18em] text-conecta-muted">
                  <th className="px-3 py-2">Líder</th>
                  <th className="px-3 py-2">Cargo</th>
                  <th className="px-3 py-2">Filiais</th>
                  <th className="px-3 py-2">Usuário</th>
                  <th className="px-3 py-2">Senha inicial</th>
                  <th className="px-3 py-2">Situação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-conecta-primary/8">
                {lista.map((i) => (
                  <tr key={i.chapa}>
                    <td className="px-3 py-2">
                      <div className="font-semibold text-conecta-primary">{i.nome}</div>
                      <div className="text-[11px] text-conecta-muted tabular-nums">{i.chapa}</div>
                    </td>
                    <td className="px-3 py-2">{ROTULO_TIER[i.tier] ?? i.tier}</td>
                    <td className="px-3 py-2 text-[12px]">{i.nacional ? 'Todas (nacional)' : i.filiaisCodigos.join(', ') || '—'}</td>
                    <td className="px-3 py-2 font-mono text-[13px]">{i.usuario}</td>
                    <td className="px-3 py-2 font-mono text-[13px]">{i.senha ?? '—'}</td>
                    <td className="px-3 py-2 text-[12px]">
                      {i.situacao === 'novo' && <span className="rounded-full bg-sky-50 px-2 py-0.5 font-semibold text-sky-800">a criar</span>}
                      {i.situacao === 'existente' && <span className="rounded-full bg-emerald-50 px-2 py-0.5 font-semibold text-emerald-800">já existe</span>}
                      {i.situacao === 'sem_filial' && <span className="rounded-full bg-rose-50 px-2 py-0.5 font-semibold text-rose-800">sem filial</span>}
                      {i.repetido && <span className="ml-1 rounded-full bg-amber-50 px-2 py-0.5 font-semibold text-amber-800">nome repetido</span>}
                      {i.filiaisDesatualizadas && <span className="ml-1 rounded-full bg-orange-50 px-2 py-0.5 font-semibold text-orange-800">filiais mudaram</span>}
                    </td>
                  </tr>
                ))}
                {lista.length === 0 && <tr><td colSpan={6} className="px-3 py-8 text-center text-conecta-muted">Nada nesta visão.</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </ConectaCard>
  );
}
