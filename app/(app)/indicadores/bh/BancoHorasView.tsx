'use client';

import type { DadosBH } from '@/actions/indicadores/bh';
import { CardsResumo } from './CardsResumo';
import { RoscaTop5 } from './RoscaTop5';
import { TabelaResumoFilial } from './TabelaResumoFilial';
import { TabelaDetalhado } from './TabelaDetalhado';
import { ImportarBHDialog } from './ImportarBHDialog';

export function BancoHorasView({ dados, perfil }: { dados: DadosBH; perfil: 'admin' | 'filial' }) {
  const ts = dados.meta?.ultimaAtualizacao
    ? new Date(dados.meta.ultimaAtualizacao).toLocaleString('pt-BR')
    : null;
  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-xl font-semibold">Banco de Horas</h2>
          <p className="text-sm text-muted-foreground">
            {ts ? `Última atualização: ${ts}${dados.meta?.atualizadoPorNome ? ` por ${dados.meta.atualizadoPorNome}` : ''}` : 'Sem dados importados'}
          </p>
        </div>
        {perfil === 'admin' && <ImportarBHDialog />}
      </div>

      <CardsResumo r={dados.resumo} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <RoscaTop5 titulo="Top 5 funções (horas)" dados={dados.topFuncoes} />
        <RoscaTop5 titulo="Top 5 seções (horas)"  dados={dados.topSecoes} />
      </div>

      <TabelaResumoFilial rows={dados.porFilial} />

      <TabelaDetalhado rows={dados.detalhado} secoes={dados.filtros.secoes} funcoes={dados.filtros.funcoes} />
    </div>
  );
}
