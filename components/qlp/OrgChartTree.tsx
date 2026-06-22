'use client';

import Link from 'next/link';
import { useState } from 'react';

export interface LiderCard {
  id: string;
  colaborador_id: string;
  tier: string;
  nivel: string | null;
  escopo_nacional: boolean;
  filiais_escopo_count: number;
  nome: string;
  funcao: string;
  codfilial: number;
  qtd_diretos: number;
  qtd_total: number;
}

const ORDEM = ['gerente', 'subgerente', 'coord', 'supervisor'] as const;
const LABEL: Record<string, string> = {
  gerente: 'Gerentes',
  subgerente: 'Subgerentes',
  coord: 'Coordenadores',
  supervisor: 'Supervisores',
};

export function OrgChartTree({ lideres }: { lideres: LiderCard[] }) {
  const [filtro, setFiltro] = useState('');
  const filtrados = lideres.filter((l) =>
    !filtro.trim() ? true : `${l.nome} ${l.funcao}`.toLowerCase().includes(filtro.toLowerCase()),
  );

  return (
    <div className="space-y-4">
      <input
        type="search"
        placeholder="Buscar líder por nome ou função…"
        value={filtro}
        onChange={(e) => setFiltro(e.target.value)}
        className="w-full sm:max-w-md rounded-lg border border-slate-300 px-3 py-2 text-sm"
      />

      <div className="overflow-x-auto pb-4">
        <div className="flex gap-6 min-w-fit">
          {ORDEM.map((tier) => {
            const grupo = filtrados.filter((l) => l.tier === tier);
            return (
              <div key={tier} className="min-w-[260px]">
                <div className="text-xs uppercase font-semibold text-slate-500 mb-2">
                  {LABEL[tier]} <span className="text-slate-400 font-normal">({grupo.length})</span>
                </div>
                <div className="space-y-2">
                  {grupo.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-slate-200 p-3 text-xs text-slate-400">
                      vazio
                    </div>
                  ) : (
                    grupo.map((l) => <Card key={l.id} lider={l} />)
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function Card({ lider }: { lider: LiderCard }) {
  return (
    <Link
      href={`/qlp/${lider.colaborador_id}`}
      className="block rounded-xl border border-slate-200 bg-white p-3 hover:border-slate-300 hover:shadow-sm transition"
    >
      <div className="text-sm font-medium text-slate-900 leading-tight">{lider.nome}</div>
      <div className="text-xs text-slate-500 mt-1 leading-tight">{lider.funcao}</div>
      <div className="text-xs text-slate-400 mt-1">Filial {lider.codfilial}</div>
      <div className="flex items-center gap-1 flex-wrap mt-2">
        <span className="rounded bg-slate-100 text-slate-700 text-xs px-2 py-0.5 tabular-nums">
          {lider.qtd_diretos} diretos
        </span>
        <span className="rounded bg-slate-100 text-slate-700 text-xs px-2 py-0.5 tabular-nums">
          {lider.qtd_total} total
        </span>
        {lider.escopo_nacional ? (
          <span className="rounded bg-violet-100 text-violet-900 text-xs px-2 py-0.5">nacional</span>
        ) : (
          <span className="rounded bg-amber-50 text-amber-900 text-xs px-2 py-0.5">
            {lider.filiais_escopo_count} filial(is)
          </span>
        )}
      </div>
    </Link>
  );
}
