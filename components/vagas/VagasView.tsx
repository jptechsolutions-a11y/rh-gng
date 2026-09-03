'use client';

import { useState } from 'react';
import { BarChart3, Users } from 'lucide-react';
import { SubTabs } from '@/components/ui/sub-tabs';
import { VagasQuadroTable, type VagaRow } from './VagasQuadroTable';
import { VagasPorStatusChart } from './VagasPorStatusChart';
import { VagasAbertoPorFilialChart } from './VagasAbertoPorFilialChart';
import { VagasAbertoPorSecaoChart } from './VagasAbertoPorSecaoChart';
import { VagasAbertoPorFuncaoChart } from './VagasAbertoPorFuncaoChart';
import type { VagaStatus } from '@/db/schema';

type SubTab = 'indicadores' | 'detalhado';

export function VagasView({
  rows,
  statusOptions,
  podeEditar,
  chartStatus,
  chartFilial,
  chartSecao,
  chartFuncao,
}: {
  rows: VagaRow[];
  statusOptions: VagaStatus[];
  podeEditar: boolean;
  chartStatus: { status: string; total: number }[];
  chartFilial: { filial: string; total: number }[];
  chartSecao: { secao: string; total: number }[];
  chartFuncao: { funcao: string; total: number }[];
}) {
  const [subTab, setSubTab] = useState<SubTab>('indicadores');

  return (
    <div className="space-y-5">
      <SubTabs<SubTab>
        value={subTab}
        onChange={setSubTab}
        items={[
          { id: 'indicadores', label: 'Indicadores', icon: BarChart3 },
          { id: 'detalhado', label: 'Detalhado', icon: Users },
        ]}
      />

      {subTab === 'indicadores' ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <VagasPorStatusChart data={chartStatus} />
          <VagasAbertoPorFilialChart data={chartFilial} />
          <VagasAbertoPorSecaoChart data={chartSecao} />
          <VagasAbertoPorFuncaoChart data={chartFuncao} />
        </div>
      ) : (
        <VagasQuadroTable rows={rows} statusOptions={statusOptions} podeEditar={podeEditar} />
      )}
    </div>
  );
}
