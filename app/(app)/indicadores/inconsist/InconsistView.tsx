'use client';

import type { DadosInconsist } from '@/actions/indicadores/inconsist';
import { CardsResumoInconsist } from './CardsResumo';
import { RoscaTop5Inconsist } from './RoscaTop5';
import { TabelaResumoFilialInconsist } from './TabelaResumoFilial';
import { TabelaDetalhadoInconsist } from './TabelaDetalhado';
import { ImportarInconsistDialog } from './ImportarInconsistDialog';

export function InconsistView({ dados, perfil }: { dados: DadosInconsist; perfil: 'admin' | 'filial' }) {
  const ts = dados.meta?.ultimaAtualizacao
    ? new Date(dados.meta.ultimaAtualizacao).toLocaleString('pt-BR')
    : null;
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="h-[2px] w-6 bg-conecta-accent" />
            <span className="font-display text-[10px] uppercase tracking-[0.32em] text-conecta-accent font-semibold">
              Inconsistências
            </span>
          </div>
          <h2 className="font-display text-[22px] font-extrabold text-conecta-primary tracking-tight mt-1.5">
            Visão geral
          </h2>
          <p className="text-[13px] text-conecta-muted mt-0.5">
            {ts ? `Última atualização: ${ts}${dados.meta?.atualizadoPorNome ? ` por ${dados.meta.atualizadoPorNome}` : ''}` : 'Sem dados importados.'}
          </p>
        </div>
        {perfil === 'admin' && <ImportarInconsistDialog />}
      </div>

      <CardsResumoInconsist r={dados.resumo} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <RoscaTop5Inconsist titulo="Top 5 funções (%)" dados={dados.topFuncoes} />
        <RoscaTop5Inconsist titulo="Top 5 seções (%)"  dados={dados.topSecoes} />
      </div>

      <TabelaResumoFilialInconsist rows={dados.porFilial} />

      <TabelaDetalhadoInconsist rows={dados.detalhado} funcoes={dados.filtros.funcoes} />
    </div>
  );
}
