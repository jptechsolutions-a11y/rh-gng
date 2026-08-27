import type { CDIndicador, ChaveIndicador } from './tipos';

const nf = (n: number) => n.toLocaleString('pt-BR', { maximumFractionDigits: 1 });
const nf1 = (n: number) =>
  n.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
const pctFmt = (p: number) => `${p > 0 ? '+' : ''}${nf(p)}%`;

const COM_HISTORICO: ChaveIndicador[] = ['bh', 'cursos'];

export function leituraRanking(chave: ChaveIndicador, cds: CDIndicador[]): string {
  if (cds.length === 0) return 'Sem CDs para comparar neste indicador.';

  const lider = cds[0]!;
  const lanterna = cds[cds.length - 1]!;

  let base = `${lider.nome} lidera com ${lider.valorFmt}`;
  if (cds.length > 1) base += `; ${lanterna.nome} é o ponto de atenção (${lanterna.valorFmt}).`;
  else base += '.';

  let amplitude = '';
  if (cds.length > 1) {
    if (lider.valor > 0) amplitude = ` Amplitude de ${nf1(lanterna.valor / lider.valor)}× entre o melhor e o pior.`;
    else if (lanterna.valor > 0) amplitude = ' O melhor CD zerou o indicador.';
  }

  let deltas = '';
  if (COM_HISTORICO.includes(chave)) {
    const comVar = cds.filter((c) => c.variacao && c.variacao.deltaPct !== null);
    if (comVar.length > 0) {
      const evolucao = [...comVar].sort((a, b) => (a.variacao!.deltaPct ?? 0) - (b.variacao!.deltaPct ?? 0))[0]!;
      const piora = [...comVar].sort((a, b) => (b.variacao!.deltaPct ?? 0) - (a.variacao!.deltaPct ?? 0))[0]!;
      if (evolucao.variacao!.deltaPct! < 0) deltas += ` Maior evolução: ${evolucao.nome} (${pctFmt(evolucao.variacao!.deltaPct!)}).`;
      if (piora.variacao!.deltaPct! > 0) deltas += ` Maior piora: ${piora.nome} (${pctFmt(piora.variacao!.deltaPct!)}).`;
    }
  }

  return base + amplitude + deltas;
}
