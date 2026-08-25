'use client';

import { Briefcase } from 'lucide-react';
import { VagasRankingBars } from './VagasRankingBars';

export function VagasAbertoPorFuncaoChart({ data }: { data: { funcao: string; total: number }[] }) {
  return (
    <VagasRankingBars
      titulo="Vagas em aberto por função (top 10)"
      icon={Briefcase}
      labelWidthClass="w-32"
      data={data.map((d) => ({ label: d.funcao, total: d.total }))}
    />
  );
}
