'use client';

import { useMemo, useState } from 'react';
import { BarChart3, Users, AlertTriangle } from 'lucide-react';
import { SubTabs } from '@/components/ui/sub-tabs';
import { VagasQuadroTable, type VagaRow } from './VagasQuadroTable';
import { VagasPorStatusChart } from './VagasPorStatusChart';
import { VagasAbertoPorFilialChart } from './VagasAbertoPorFilialChart';
import { VagasAbertoPorSecaoChart } from './VagasAbertoPorSecaoChart';
import { VagasAbertoPorFuncaoChart } from './VagasAbertoPorFuncaoChart';
import type { VagaStatus } from '@/db/schema';

type SubTab = 'indicadores' | 'detalhado' | 'excedentes';

function chaveGrupo(r: VagaRow): string {
  return `${r.filialCodigo}::${r.funcao}::${r.secao ?? ''}`;
}

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

  // Só pra contar quantos grupos têm mais vagas ativas do que o alvo da
  // última planilha, e mostrar isso no rótulo da aba.
  const qtdExcedentes = useMemo(() => {
    const porGrupo = new Map<string, { total: number; alvo: number }>();
    for (const r of rows) {
      const chave = chaveGrupo(r);
      const g = porGrupo.get(chave) ?? { total: 0, alvo: r.emAbertoImportado };
      g.total += 1;
      porGrupo.set(chave, g);
    }
    let n = 0;
    for (const g of porGrupo.values()) if (g.total > g.alvo) n++;
    return n;
  }, [rows]);

  return (
    <div className="space-y-5">
      <SubTabs<SubTab>
        value={subTab}
        onChange={setSubTab}
        items={[
          { id: 'indicadores', label: 'Indicadores', icon: BarChart3 },
          { id: 'detalhado', label: 'Detalhado', icon: Users },
          { id: 'excedentes', label: `Excedentes${qtdExcedentes > 0 ? ` (${qtdExcedentes})` : ''}`, icon: AlertTriangle },
        ]}
      />

      {subTab === 'indicadores' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <VagasPorStatusChart data={chartStatus} />
          <VagasAbertoPorFilialChart data={chartFilial} />
          <VagasAbertoPorSecaoChart data={chartSecao} />
          <VagasAbertoPorFuncaoChart data={chartFuncao} />
        </div>
      )}

      {subTab === 'detalhado' && (
        <VagasQuadroTable rows={rows} statusOptions={statusOptions} podeEditar={podeEditar} />
      )}

      {subTab === 'excedentes' && (
        <VagasQuadroTable rows={rows} statusOptions={statusOptions} podeEditar={podeEditar} apenasExcedentes />
      )}
    </div>
  );
}
