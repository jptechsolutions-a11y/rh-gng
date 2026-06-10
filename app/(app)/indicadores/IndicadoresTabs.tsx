'use client';

import * as Tabs from '@radix-ui/react-tabs';
import type { DadosBH } from '@/actions/indicadores/bh';
import { BancoHorasView } from './bh/BancoHorasView';

const TRIGGER = 'px-4 py-2 text-sm font-medium border-b-2 border-transparent data-[state=active]:border-emerald-600 data-[state=active]:text-emerald-700 text-muted-foreground hover:text-foreground transition';

export function IndicadoresTabs({ dados, perfil }: { dados: DadosBH; perfil: 'admin' | 'filial' }) {
  return (
    <Tabs.Root defaultValue="bh" className="w-full">
      <Tabs.List className="flex gap-2 border-b mb-6">
        <Tabs.Trigger value="bh" className={TRIGGER}>Banco de Horas</Tabs.Trigger>
        <Tabs.Trigger value="ind2" className={TRIGGER} disabled>Indicador 2</Tabs.Trigger>
        <Tabs.Trigger value="ind3" className={TRIGGER} disabled>Indicador 3</Tabs.Trigger>
      </Tabs.List>
      <Tabs.Content value="bh">
        <BancoHorasView dados={dados} perfil={perfil} />
      </Tabs.Content>
    </Tabs.Root>
  );
}
