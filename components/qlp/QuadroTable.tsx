'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { AtribuirLiderModal } from './AtribuirLiderModal';

export interface QuadroRow {
  id: string;
  chapa: string;
  nome: string;
  funcao: string;
  secao: string | null;
  situacao: string | null;
  tier_resolvido: string | null;
  filial_codigo: string | null;
  lider_nome: string | null;
  lider_tier: string | null;
  lider_id: string | null;
}

export function QuadroTable({ rows, podeEditar }: { rows: QuadroRow[]; podeEditar: boolean }) {
  const [alvo, setAlvo] = useState<QuadroRow | null>(null);
  const [busca, setBusca] = useState('');
  const [semLider, setSemLider] = useState(false);
  const [tierFiltro, setTierFiltro] = useState<string>('');

  const filtradas = useMemo(() => {
    const q = busca.trim().toLowerCase();
    return rows.filter((r) => {
      if (semLider && r.lider_id) return false;
      if (tierFiltro && r.tier_resolvido !== tierFiltro) return false;
      if (q) {
        const blob = `${r.chapa} ${r.nome} ${r.funcao}`.toLowerCase();
        if (!blob.includes(q)) return false;
      }
      return true;
    });
  }, [rows, busca, semLider, tierFiltro]);

  return (
    <>
      <div className="flex flex-wrap items-center gap-2 mb-3">
        <input
          type="search"
          placeholder="Buscar por chapa, nome ou função…"
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          className="flex-1 min-w-[200px] rounded-lg border border-slate-300 px-3 py-2 text-sm"
        />
        <select
          value={tierFiltro}
          onChange={(e) => setTierFiltro(e.target.value)}
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
        >
          <option value="">Todos os tiers</option>
          <option value="gerente">Gerente</option>
          <option value="subgerente">Subgerente</option>
          <option value="coord">Coord</option>
          <option value="supervisor">Supervisor</option>
          <option value="base">Base</option>
        </select>
        <label className="flex items-center gap-2 text-sm text-slate-700">
          <input type="checkbox" checked={semLider} onChange={(e) => setSemLider(e.target.checked)} />
          Apenas sem líder
        </label>
        <span className="ml-auto text-sm text-slate-500 tabular-nums">
          {filtradas.length} / {rows.length}
        </span>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-50">
            <tr className="border-b border-slate-200 text-slate-600">
              <th className="text-left p-3 font-medium">Chapa</th>
              <th className="text-left p-3 font-medium">Nome</th>
              <th className="text-left p-3 font-medium">Função</th>
              <th className="text-left p-3 font-medium">Filial</th>
              <th className="text-left p-3 font-medium">Situação</th>
              <th className="text-left p-3 font-medium">Líder</th>
              {podeEditar && <th className="text-right p-3 font-medium">Ações</th>}
            </tr>
          </thead>
          <tbody>
            {filtradas.map((r) => (
              <tr key={r.id} className="border-b border-slate-100 hover:bg-slate-50">
                <td className="p-3 font-mono text-xs text-slate-600">{r.chapa}</td>
                <td className="p-3">
                  <Link href={`/qlp/${r.id}`} className="font-medium text-slate-900 hover:underline">
                    {r.nome}
                  </Link>
                </td>
                <td className="p-3 text-slate-700">{r.funcao}</td>
                <td className="p-3 text-slate-700">{r.filial_codigo ?? '—'}</td>
                <td className="p-3 text-slate-700">{r.situacao ?? '—'}</td>
                <td className="p-3">
                  {r.lider_nome ? (
                    <span>
                      <span className="text-xs text-slate-500 mr-1">[{r.lider_tier}]</span>
                      {r.lider_nome}
                    </span>
                  ) : (
                    <span className="text-rose-600 text-xs">— sem líder —</span>
                  )}
                </td>
                {podeEditar && (
                  <td className="p-3 text-right">
                    <button
                      className="rounded bg-slate-900 text-white px-2 py-1 text-xs hover:bg-slate-800"
                      onClick={() => setAlvo(r)}
                    >
                      {r.lider_id ? 'Mover' : 'Atribuir líder'}
                    </button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
        {filtradas.length === 0 && (
          <p className="text-center text-sm text-slate-500 py-8">Nenhum colaborador para os filtros aplicados.</p>
        )}
      </div>

      {alvo && <AtribuirLiderModal colaborador={alvo} onClose={() => setAlvo(null)} />}
    </>
  );
}
