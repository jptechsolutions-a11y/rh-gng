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
      <div className="rounded-2xl bg-white border border-conecta-primary/10 p-3 flex flex-wrap items-center gap-2">
        <input
          type="search"
          placeholder="Buscar por chapa, nome ou função…"
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          className="flex-1 min-w-[220px] rounded-lg border border-conecta-primary/15 px-3 py-2 text-sm focus:outline-none focus:border-conecta-accent/60"
        />
        <select
          value={tierFiltro}
          onChange={(e) => setTierFiltro(e.target.value)}
          className="rounded-lg border border-conecta-primary/15 px-3 py-2 text-sm bg-white"
        >
          <option value="">Todos os tiers</option>
          <option value="gerente">Gerente</option>
          <option value="subgerente">Subgerente</option>
          <option value="coord">Coord</option>
          <option value="supervisor">Supervisor</option>
          <option value="base">Base</option>
        </select>
        <label className="flex items-center gap-2 text-sm text-conecta-primary">
          <input
            type="checkbox"
            checked={semLider}
            onChange={(e) => setSemLider(e.target.checked)}
            className="accent-conecta-accent"
          />
          Apenas sem líder
        </label>
        <span className="ml-auto text-xs text-conecta-muted tabular-nums">
          {filtradas.length} / {rows.length}
        </span>
      </div>

      <div className="rounded-2xl bg-white border border-conecta-primary/10 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-conecta-primary/10 text-[11px] uppercase tracking-[0.12em] font-semibold text-conecta-muted">
              <th className="text-left p-3">Chapa</th>
              <th className="text-left p-3">Nome</th>
              <th className="text-left p-3">Função</th>
              <th className="text-left p-3">Filial</th>
              <th className="text-left p-3">Situação</th>
              <th className="text-left p-3">Líder</th>
              {podeEditar && <th className="text-right p-3">Ações</th>}
            </tr>
          </thead>
          <tbody>
            {filtradas.map((r) => (
              <tr key={r.id} className="border-b border-conecta-primary/5 hover:bg-conecta-primary/[0.02]">
                <td className="p-3 font-mono text-xs text-conecta-muted">{r.chapa}</td>
                <td className="p-3">
                  <Link href={`/qlp/${r.id}`} className="font-medium text-conecta-primary hover:text-conecta-accent">
                    {r.nome}
                  </Link>
                </td>
                <td className="p-3 text-conecta-text">{r.funcao}</td>
                <td className="p-3 text-conecta-text">{r.filial_codigo ?? '—'}</td>
                <td className="p-3 text-conecta-text">{r.situacao ?? '—'}</td>
                <td className="p-3">
                  {r.lider_nome ? (
                    <span>
                      <span className="text-[10px] uppercase tracking-[0.12em] text-conecta-muted mr-1">
                        [{r.lider_tier}]
                      </span>
                      {r.lider_nome}
                    </span>
                  ) : (
                    <span className="text-rose-600 text-xs">— sem líder —</span>
                  )}
                </td>
                {podeEditar && (
                  <td className="p-3 text-right">
                    <button
                      onClick={() => setAlvo(r)}
                      className="rounded-lg bg-conecta-accent text-white px-3 py-1.5 text-xs font-display font-semibold hover:brightness-110 transition"
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
          <p className="text-center text-sm text-conecta-muted py-8">
            Nenhum colaborador para os filtros aplicados.
          </p>
        )}
      </div>

      {alvo && <AtribuirLiderModal colaborador={alvo} onClose={() => setAlvo(null)} />}
    </>
  );
}
