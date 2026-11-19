'use client';

import { useMemo, useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Pencil, Plus, Search, Trash2 } from 'lucide-react';
import { ConectaCard, SectionHeader } from '@/components/ui/conecta-card';
import { excluirLancamentoComite } from '@/actions/comite/lancamentos';
import { fmtTempo, nomeMes, type ComiteLancamento } from '@/lib/comite/tipos';

/** Lançamentos do mês com editar/excluir. */
export function ComiteLista({ lancamentos, mes, meses }: { lancamentos: ComiteLancamento[]; mes: string; meses: string[] }) {
  const router = useRouter();
  const [busca, setBusca] = useState('');
  const [, iniciar] = useTransition();
  const [erro, setErro] = useState<string | null>(null);

  const lista = useMemo(() => {
    const q = busca.trim().toLowerCase();
    return lancamentos.filter((l) => !q || l.nome.toLowerCase().includes(q) || l.chapa.includes(q) || l.filial.includes(q));
  }, [lancamentos, busca]);

  function excluir(l: ComiteLancamento) {
    if (!confirm(`Excluir o lançamento de ${l.nome}? Essa ação não pode ser desfeita.`)) return;
    iniciar(async () => {
      const r = await excluirLancamentoComite(l.id);
      if (!r.ok) return setErro(r.erro);
      router.refresh();
    });
  }

  const opcoes = meses.includes(mes) ? meses : [mes, ...meses];

  return (
    <ConectaCard noPadding>
      <div className="p-5 pb-3 space-y-3">
        <div className="flex flex-wrap items-center gap-3">
          <SectionHeader label={`Lançamentos de ${nomeMes(mes)} (${lista.length})`} />
          <div className="ml-auto flex items-center gap-2">
            <select value={mes} onChange={(e) => router.push(`/comite/lancamentos?mes=${e.target.value}`)} className="rounded-lg border border-conecta-primary/15 px-3 py-1.5 text-sm font-semibold text-conecta-primary">
              {opcoes.map((m) => <option key={m} value={m}>{nomeMes(m)}</option>)}
            </select>
            <Link href="/comite/lancar" className="inline-flex items-center gap-1.5 rounded-lg bg-conecta-accent text-white px-3 py-1.5 text-[11px] font-display font-semibold uppercase tracking-[0.12em] hover:brightness-110">
              <Plus className="h-3.5 w-3.5" /> Novo lançamento
            </Link>
          </div>
        </div>
        <div className="relative max-w-sm">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-conecta-muted" />
          <input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar nome, matrícula ou filial…" className="w-full rounded-lg border border-conecta-primary/15 pl-8 pr-3 py-1.5 text-sm" />
        </div>
        {erro && <div className="rounded-lg bg-rose-50 border border-rose-200 text-rose-900 p-2 text-sm">{erro}</div>}
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-[10px] font-display uppercase tracking-[0.18em] text-conecta-muted border-y border-conecta-primary/10 bg-slate-50">
              <th className="px-5 py-2">Colaborador</th>
              <th className="px-3 py-2">Filial</th>
              <th className="px-3 py-2">Função</th>
              <th className="px-3 py-2 text-center">Susp.</th>
              <th className="px-3 py-2 text-center">Adv.</th>
              <th className="px-3 py-2">Tempo de empresa</th>
              <th className="px-3 py-2">Lançado por</th>
              <th className="px-3 py-2 text-right">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-conecta-primary/8">
            {lista.map((l) => (
              <tr key={l.id} className="hover:bg-slate-50/70">
                <td className="px-5 py-2">
                  <div className="font-semibold text-conecta-primary">{l.nome}</div>
                  <div className="text-[11px] text-conecta-muted tabular-nums">{l.chapa}</div>
                </td>
                <td className="px-3 py-2 tabular-nums">{l.filial}</td>
                <td className="px-3 py-2">{l.funcao}</td>
                <td className="px-3 py-2 text-center tabular-nums">{l.suspensoes}</td>
                <td className="px-3 py-2 text-center tabular-nums">{l.advertencias}</td>
                <td className="px-3 py-2">{fmtTempo(l.tempoMeses)}</td>
                <td className="px-3 py-2 text-[12px] text-conecta-muted">{l.criadoPor}</td>
                <td className="px-3 py-2 text-right whitespace-nowrap">
                  <Link href={`/comite/${l.id}/editar`} className="inline-flex items-center gap-1 text-conecta-primary hover:text-conecta-accent font-semibold mr-3">
                    <Pencil className="h-3.5 w-3.5" /> Editar
                  </Link>
                  <button type="button" onClick={() => excluir(l)} className="inline-flex items-center gap-1 text-rose-700 hover:underline font-semibold">
                    <Trash2 className="h-3.5 w-3.5" /> Excluir
                  </button>
                </td>
              </tr>
            ))}
            {lista.length === 0 && (
              <tr><td colSpan={8} className="px-5 py-10 text-center text-conecta-muted">Nenhum lançamento neste mês.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </ConectaCard>
  );
}
