import type { Resumo } from '@/lib/indicadores/bh-queries';
import type { ResumoInconsist } from '@/lib/indicadores/inconsist-queries';
import type { ResumoCursos } from '@/lib/indicadores/cursos-queries';
import type { ResumoFeriados } from '@/lib/indicadores/feriados-queries';

export type Top5 = Array<{ label: string; valor: number; pct?: number; valorPgto?: number }>;

/** Card do resumo executivo. `variacao` nulo = indicador sem histórico. */
export type IndicadorResumo = {
  chave: 'bh' | 'inconsist' | 'cursos' | 'feriados' | 'vagas';
  titulo: string;
  valorFmt: string;
  variacao: { deltaPct: number | null; tendencia: 'melhorou' | 'piorou' | 'neutro' } | null;
  posicao: number | null;   // 1 = melhor (menor valor); null = filial única/sem dados
  totalFiliais: number;
};

export type SlideBH = {
  resumo: Resumo;
  resumoAnterior: Resumo;
  topSecoes: Top5;
  atualizadoEm: string | null;
};
export type SlideInconsist = {
  resumo: ResumoInconsist;
  topTipos: Top5;
  atualizadoEm: string | null;
};
export type SlideCursos = {
  resumo: ResumoCursos;
  resumoAnterior: ResumoCursos;
  topTipos: Top5;
  atualizadoEm: string | null;
};
export type SlideFeriados = {
  resumo: ResumoFeriados;
  topSecoes: Top5;
  atualizadoEm: string | null;
};
export type SlideVagas = {
  totalAbertas: number;
  porStatus: Array<{ label: string; valor: number }>;
  porSecao: Top5;
};

export type DadosFilialRelatorio = {
  filial: { id: string; codigo: string; nome: string };
  geradoEm: string;                 // ISO
  resumoExecutivo: IndicadorResumo[];
  bh: SlideBH | null;               // null = sem dados importados p/ a filial
  inconsist: SlideInconsist | null;
  cursos: SlideCursos | null;
  feriados: SlideFeriados | null;
  vagas: SlideVagas | null;
};
