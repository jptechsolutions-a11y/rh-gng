import type { Resumo } from '@/lib/indicadores/bh-queries';
import type { ResumoInconsist } from '@/lib/indicadores/inconsist-queries';
import type { ResumoCursos } from '@/lib/indicadores/cursos-queries';
import type { ResumoFeriados } from '@/lib/indicadores/feriados-queries';
import type { Top5 } from './tipos';

const LIMIAR_ESTAVEL = 1; // |%| abaixo disso = "estável"

const nf = (n: number) => n.toLocaleString('pt-BR', { maximumFractionDigits: 1 });

/** Frase de tendência a partir de atual vs anterior. Verbo padrão: cresceu/caiu. */
function tendencia(
  atual: number,
  anterior: number,
  verbos: { subiu: string; caiu: string } = { subiu: 'cresceu', caiu: 'caiu' },
): string {
  if (!anterior) return 'sem base de comparação com o período anterior';
  const pct = ((atual - anterior) / anterior) * 100;
  if (Math.abs(pct) < LIMIAR_ESTAVEL) return 'manteve-se estável vs. o período anterior';
  const verbo = pct > 0 ? verbos.subiu : verbos.caiu;
  return `${verbo} ${nf(Math.abs(pct))}% vs. o período anterior`;
}

export function textoBH(atual: Resumo, anterior: Resumo, topSecoes: Top5): string {
  const t = tendencia(atual.totalHoras, anterior.totalHoras);
  const sec = topSecoes[0]
    ? ` Maior concentração em ${topSecoes[0].label} (${nf(topSecoes[0].valor)} h).`
    : '';
  return `Saldo de ${nf(atual.totalHoras)} h em ${atual.colaboradores} colaboradores; ${t}.${sec}`;
}

export function textoInconsist(resumo: ResumoInconsist, topTipos: Top5): string {
  const tipo = topTipos[0]
    ? ` Tipo predominante: ${topTipos[0].label} (${nf(topTipos[0].pct ?? 0)}%).`
    : '';
  return `${resumo.totalInconsist} inconsistências em ${resumo.colaboradores} colaboradores (média ${nf(resumo.mediaPorPessoa)} por pessoa).${tipo}`;
}

export function textoCursos(atual: ResumoCursos, anterior: ResumoCursos, topTipos: Top5): string {
  const t = tendencia(atual.totalPendencias, anterior.totalPendencias, { subiu: 'subiu', caiu: 'caiu' });
  const tipo = topTipos[0] ? ` Curso mais pendente: ${topTipos[0].label}.` : '';
  return `${atual.totalPendencias} pendências de treinamento em ${atual.colaboradores} colaboradores; ${t}.${tipo}`;
}

export function textoFeriados(resumo: ResumoFeriados, topSecoes: Top5): string {
  const sec = topSecoes[0]
    ? ` ${topSecoes[0].label} concentra ${nf(topSecoes[0].pct ?? 0)}% das pendências.`
    : '';
  return `${resumo.totalPendencias} pendências de feriado em ${resumo.colaboradores} colaboradores.${sec}`;
}

export function textoVagas(totalAbertas: number, porSecao: Top5): string {
  if (totalAbertas === 0) return 'Nenhuma vaga em aberto no quadro atual.';
  const sec = porSecao[0]
    ? ` ${porSecao[0].label} concentra ${nf(porSecao[0].pct ?? 0)}% do quadro em aberto.`
    : '';
  return `${totalAbertas} vagas em aberto.${sec}`;
}
