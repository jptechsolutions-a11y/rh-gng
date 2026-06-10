'use client';

import type { DadosBH } from '@/actions/indicadores/bh';
import { CardsResumo } from './CardsResumo';

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
        {perfil === 'admin' && <div data-testid="slot-importar" />}
      </div>
      <CardsResumo r={dados.resumo} />
    </div>
  );
}
