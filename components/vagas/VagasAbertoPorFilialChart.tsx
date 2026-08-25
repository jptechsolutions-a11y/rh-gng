'use client';

import { Building2 } from 'lucide-react';
import { VagasRankingBars } from './VagasRankingBars';

export function VagasAbertoPorFilialChart({ data }: { data: { filial: string; total: number }[] }) {
  return (
    <VagasRankingBars
      titulo="Vagas em aberto por filial"
      icon={Building2}
      labelWidthClass="w-12"
      data={data.map((d) => ({ label: d.filial, total: d.total }))}
    />
  );
}
