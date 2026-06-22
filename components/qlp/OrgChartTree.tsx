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
      <div className="rounded-2xl bg-white border border-conecta-primary/10 p-3">
        <input
          type="search"
          placeholder="Buscar líder por nome ou função…"
          value={filtro}
          onChange={(e) => setFiltro(e.target.value)}
          className="w-full sm:max-w-md rounded-lg border border-conecta-primary/15 px-3 py-2 text-sm focus:outline-none focus:border-conecta-accent/60"
        />
      </div>

      <div className="overflow-x-auto pb-4">
        <div className="flex gap-4 min-w-fit">
          {ORDEM.map((tier) => {
            const grupo = filtrados.filter((l) => l.tier === tier);
            return (
              <div key={tier} className="min-w-[260px]">
                <div className="font-display text-[11px] uppercase tracking-[0.22em] font-semibold text-conecta-muted mb-2">
                  {LABEL[tier]}{' '}
                  <span className="text-conecta-muted/60 font-normal">({grupo.length})</span>
                </div>
                <div className="space-y-2">
                  {grupo.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-conecta-primary/15 p-3 text-xs text-conecta-muted/60">
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
      className="block rounded-2xl bg-white border border-conecta-primary/10 p-3 hover:border-conecta-accent/40 hover:shadow-[0_12px_28px_-12px_rgba(13,43,107,0.25)] transition-all"
    >
      <div className="text-[14px] font-display font-extrabold text-conecta-primary leading-tight">
        {lider.nome}
      </div>
      <div className="text-[12px] text-conecta-muted mt-0.5 leading-tight">{lider.funcao}</div>
      <div className="text-[11px] text-conecta-muted/70 mt-1">Filial {lider.codfilial}</div>
      <div className="flex items-center gap-1 flex-wrap mt-2">
        <span className="rounded-full bg-conecta-primary/5 text-conecta-primary text-[11px] px-2 py-0.5 tabular-nums font-semibold">
          {lider.qtd_diretos} diretos
        </span>
        <span className="rounded-full bg-conecta-accent/10 text-conecta-accent text-[11px] px-2 py-0.5 tabular-nums font-semibold">
          {lider.qtd_total} total
        </span>
        {lider.escopo_nacional ? (
          <span className="rounded-full bg-violet-100 text-violet-900 text-[10px] px-2 py-0.5 uppercase tracking-wide">
            nacional
          </span>
        ) : (
          <span className="rounded-full bg-amber-50 text-amber-900 text-[10px] px-2 py-0.5">
            {lider.filiais_escopo_count} filial(is)
          </span>
        )}
      </div>
    </Link>
  );
}
