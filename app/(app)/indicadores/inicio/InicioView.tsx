import { Clock, AlertTriangle, GraduationCap, CalendarOff } from 'lucide-react';
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

function formatInt(n: number): string {
  return n.toLocaleString('pt-BR');
}

export function InicioView({ dados }: { dados: RankingsBundle }) {
  const tsBH = dados.meta.bh?.ultimaAtualizacao
    ? new Date(dados.meta.bh.ultimaAtualizacao).toLocaleString('pt-BR') : null;
  const tsInc = dados.meta.inconsist?.ultimaAtualizacao
    ? new Date(dados.meta.inconsist.ultimaAtualizacao).toLocaleString('pt-BR') : null;
  const tsCursos = dados.meta.cursos?.ultimaAtualizacao
    ? new Date(dados.meta.cursos.ultimaAtualizacao).toLocaleString('pt-BR') : null;
  const tsFeriados = dados.meta.feriados?.ultimaAtualizacao
    ? new Date(dados.meta.feriados.ultimaAtualizacao).toLocaleString('pt-BR') : null;
  const ultimaSync = [tsBH, tsInc, tsCursos, tsFeriados].filter(Boolean)[0] ?? null;

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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <RankingBars
          titulo="Ranking Banco de Horas"
          icon={Clock}
          items={dados.bh.items}
          format={(n) => formatHoras(n)}
          color="navy"
        />
        <RankingBars
          titulo="Ranking Inconsistências"
          icon={AlertTriangle}
          items={dados.inconsist.items}
          format={(n) => formatInt(n)}
          color="orange"
        />
        <RankingBars
          titulo="Ranking Cursos Obrigatórios"
          icon={GraduationCap}
          items={dados.cursos.items}
          format={(n) => formatInt(n)}
          color="orange"
        />
        <RankingBars
          titulo="Ranking Feriados Pendentes"
          icon={CalendarOff}
          items={dados.feriados.items}
          format={(n) => formatInt(n)}
          color="navy"
        />
      </div>
    </div>
  );
}
