'use client';

import { LayoutGrid } from 'lucide-react';
import { VagasRankingBars } from './VagasRankingBars';

export function VagasAbertoPorSecaoChart({ data }: { data: { secao: string; total: number }[] }) {
  return (
    <VagasRankingBars
      titulo="Vagas em aberto por seção (top 10)"
      icon={LayoutGrid}
      labelWidthClass="w-32"
      data={data.map((d) => ({ label: d.secao, total: d.total }))}
    />
  );
}
