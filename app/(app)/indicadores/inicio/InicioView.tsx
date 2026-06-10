import { Clock, AlertTriangle } from 'lucide-react';
import type { RankingsBundle } from '@/actions/indicadores/rankings';
import { RankingBars } from './RankingBars';

function formatHoras(n: number): string {
  const sign = n < 0 ? '-' : '';
  const abs = Math.abs(n);
  const totalMin = Math.round(abs * 60);
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  return `${sign}${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

function formatDec(n: number): string {
  return n.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function InicioView({ dados }: { dados: RankingsBundle }) {
  const tsBH = dados.meta.bh?.ultimaAtualizacao
    ? new Date(dados.meta.bh.ultimaAtualizacao).toLocaleString('pt-BR') : null;
  const tsInc = dados.meta.inconsist?.ultimaAtualizacao
    ? new Date(dados.meta.inconsist.ultimaAtualizacao).toLocaleString('pt-BR') : null;
  const ultimaSync = [tsBH, tsInc].filter(Boolean)[0] ?? null;

  return (
    <div className="space-y-6">
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <span className="h-[2px] w-6 bg-conecta-accent" />
          <span className="font-display text-[10px] uppercase tracking-[0.32em] text-conecta-accent font-semibold">
            Início
          </span>
        </div>
        <h2 className="font-display text-[22px] font-extrabold text-conecta-primary tracking-tight mt-1.5">
          Ranking das filiais
        </h2>
        <p className="text-[13px] text-conecta-muted mt-0.5">
          {ultimaSync ? `Última sincronização: ${ultimaSync}` : 'Sem dados importados.'}
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <RankingBars
          titulo="Ranking Banco de Horas"
          icon={Clock}
          items={dados.bh.items}
          format={(n) => formatHoras(n)}
          color="navy"
        />
        <RankingBars
          titulo="Ranking Inconsistências (média/pessoa)"
          icon={AlertTriangle}
          items={dados.inconsist.items}
          format={(n) => formatDec(n)}
          color="orange"
        />
      </div>
    </div>
  );
}
