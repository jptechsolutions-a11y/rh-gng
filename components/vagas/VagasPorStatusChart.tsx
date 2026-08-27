'use client';

import { ClipboardList } from 'lucide-react';
import { VagasRankingBars } from './VagasRankingBars';

export function VagasPorStatusChart({ data }: { data: { status: string; total: number }[] }) {
  return (
    <VagasRankingBars
      titulo="Vagas por status"
      icon={ClipboardList}
      color="orange"
      labelWidthClass="w-40"
      data={data.map((d) => ({ label: d.status, total: d.total }))}
    />
  );
}
