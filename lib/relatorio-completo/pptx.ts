import PptxGenJS from 'pptxgenjs';
import { textoBH, textoInconsist, textoCursos, textoFeriados, textoVagas } from './texto';
import type { DadosFilialRelatorio, IndicadorResumo, Top5 } from './tipos';

const NAVY = '0B2447';
const ORANGE = 'F37021';
const WHITE = 'FFFFFF';
const SLATE = '64748B';
const SOFT = 'F1F5F9';
const BORDER = 'E2E8F0';
const TEXT = '0F172A';
const OK = '059669';
const BAD = 'B91C1C';
const FONT = 'Calibri';

const W = 13.333;
const H = 7.5;

function header(s: PptxGenJS.Slide, eyebrow: string, titulo: string, filial: string) {
  s.background = { color: WHITE };
  s.addShape('rect', { x: 0, y: 0, w: W, h: 0.9, fill: { color: NAVY }, line: { color: NAVY } });
  s.addText(eyebrow, { x: 0.5, y: 0.12, w: 8, h: 0.25, fontFace: FONT, fontSize: 9, color: ORANGE, bold: true, charSpacing: 3 });
  s.addText(titulo, { x: 0.5, y: 0.34, w: 9, h: 0.5, fontFace: FONT, fontSize: 22, color: WHITE, bold: true });
  s.addText(filial.toUpperCase(), { x: W - 4.5, y: 0.3, w: 4, h: 0.4, fontFace: FONT, fontSize: 11, color: 'CBD5E1', align: 'right', bold: true });
}

function footer(s: PptxGenJS.Slide, page: number, total: number) {
  s.addShape('line', { x: 0.5, y: H - 0.42, w: W - 1, h: 0, line: { color: BORDER, width: 1 } });
  s.addText('Relatório Completo de Indicadores · Gente & Gestão · Perlog', {
    x: 0.5, y: H - 0.38, w: 8, h: 0.25, fontFace: FONT, fontSize: 8, color: SLATE,
  });
  s.addText(`${page} / ${total}`, { x: W - 1.3, y: H - 0.38, w: 0.8, h: 0.25, fontFace: FONT, fontSize: 8, color: SLATE, align: 'right' });
}

function card(s: PptxGenJS.Slide, x: number, y: number, w: number, h: number, accent = ORANGE) {
  s.addShape('roundRect', { x, y, w, h, fill: { color: WHITE }, line: { color: BORDER, width: 1 }, rectRadius: 0.06 });
  s.addShape('rect', { x, y, w, h: 0.06, fill: { color: accent }, line: { color: accent } });
}

function chartBarras(s: PptxGenJS.Slide, x: number, y: number, w: number, h: number, titulo: string, dados: Top5) {
  card(s, x, y, w, h, NAVY);
  s.addText(titulo, { x: x + 0.2, y: y + 0.15, w: w - 0.4, h: 0.3, fontFace: FONT, fontSize: 10, color: SLATE, bold: true, charSpacing: 1 });
  const pontos = dados.filter((d) => d.label && d.valor > 0);
  if (pontos.length === 0) {
    s.addText('Sem dados', { x, y: y + h / 2 - 0.15, w, h: 0.3, align: 'center', italic: true, color: SLATE, fontFace: FONT, fontSize: 10 });
    return;
  }
  s.addChart('bar', [{ name: titulo, labels: pontos.map((d) => d.label), values: pontos.map((d) => d.valor) }], {
    x: x + 0.2, y: y + 0.5, w: w - 0.4, h: h - 0.7,
    barDir: 'bar', chartColors: [ORANGE], showLegend: false, showValue: true,
    catAxisLabelFontSize: 8, valAxisLabelFontSize: 8, catAxisLabelColor: SLATE, valAxisLabelColor: SLATE, valAxisMinVal: 0,
  });
}

function leitura(s: PptxGenJS.Slide, texto: string, atualizadoEm: string | null) {
  s.addShape('roundRect', { x: 0.5, y: H - 1.55, w: W - 1, h: 0.95, fill: { color: SOFT }, line: { color: BORDER, width: 1 }, rectRadius: 0.06 });
  s.addText(texto, { x: 0.75, y: H - 1.5, w: W - 1.5, h: 0.6, fontFace: FONT, fontSize: 11, color: TEXT, valign: 'middle' });
  if (atualizadoEm) {
    const d = new Date(atualizadoEm).toLocaleString('pt-BR');
    s.addText(`Atualizado em ${d}`, { x: 0.75, y: H - 0.95, w: W - 1.5, h: 0.25, fontFace: FONT, fontSize: 8, color: SLATE });
  }
}

function statCards(s: PptxGenJS.Slide, y: number, cards: { rotulo: string; valor: string; cor?: string }[]) {
  const gap = 0.2;
  const cw = (W - 1 - gap * (cards.length - 1)) / cards.length;
  cards.forEach((c, i) => {
    const x = 0.5 + i * (cw + gap);
    card(s, x, y, cw, 1.3, c.cor ?? ORANGE);
    s.addText(c.rotulo, { x: x + 0.2, y: y + 0.2, w: cw - 0.4, h: 0.3, fontFace: FONT, fontSize: 9, color: SLATE, bold: true, charSpacing: 1 });
    s.addText(c.valor, { x: x + 0.2, y: y + 0.5, w: cw - 0.4, h: 0.7, fontFace: FONT, fontSize: 26, color: c.cor ?? NAVY, bold: true });
  });
}

function slideResumoExecutivo(pres: PptxGenJS, d: DadosFilialRelatorio, page: number, total: number) {
  const s = pres.addSlide();
  header(s, 'VISÃO GERAL', 'Resumo executivo', d.filial.nome);
  const gap = 0.18;
  const cw = (W - 1 - gap * 4) / 5;
  d.resumoExecutivo.forEach((ind: IndicadorResumo, i) => {
    const x = 0.5 + i * (cw + gap);
    card(s, x, 1.3, cw, 2.6, NAVY);
    s.addText(ind.titulo.toUpperCase(), { x: x + 0.15, y: 1.45, w: cw - 0.3, h: 0.5, fontFace: FONT, fontSize: 8, color: SLATE, bold: true });
    s.addText(ind.valorFmt, { x: x + 0.15, y: 2.0, w: cw - 0.3, h: 0.6, fontFace: FONT, fontSize: 20, color: NAVY, bold: true });
    if (ind.variacao && ind.variacao.deltaPct !== null) {
      const up = ind.variacao.tendencia === 'piorou';
      s.addText(`${up ? '▲' : '▼'} ${Math.abs(ind.variacao.deltaPct).toLocaleString('pt-BR')}%`, {
        x: x + 0.15, y: 2.6, w: cw - 0.3, h: 0.3, fontFace: FONT, fontSize: 10, color: up ? BAD : OK, bold: true,
      });
    }
    if (ind.posicao) {
      s.addText(`${ind.posicao}º de ${ind.totalFiliais} filiais`, {
        x: x + 0.15, y: 3.0, w: cw - 0.3, h: 0.3, fontFace: FONT, fontSize: 8, color: SLATE,
      });
    }
  });
  chartBarras(s, 0.5, 4.2, W - 1, 2.5, 'POSIÇÃO NO RANKING — QUANTO MENOR, MELHOR',
    d.resumoExecutivo.filter((i) => i.posicao).map((i) => ({ label: `${i.titulo}`, valor: i.posicao ?? 0 })));
  footer(s, page, total);
}

export async function gerarDeckFilial(d: DadosFilialRelatorio): Promise<Uint8Array> {
  const pres = new PptxGenJS();
  pres.layout = 'LAYOUT_WIDE';
  pres.title = `Relatório Completo — ${d.filial.nome}`;
  pres.company = 'Grupo Perlog';
  pres.author = 'Gente & Gestão';

  const TOTAL = 8;

  // 1 — Capa
  {
    const s = pres.addSlide();
    s.background = { color: NAVY };
    s.addShape('rect', { x: 0.7, y: 0.7, w: 2.6, h: 0.45, fill: { color: ORANGE }, line: { color: ORANGE }, rectRadius: 0.2 });
    s.addText('GENTE & GESTÃO', { x: 0.7, y: 0.7, w: 2.6, h: 0.45, align: 'center', valign: 'middle', fontFace: FONT, fontSize: 11, color: WHITE, bold: true, charSpacing: 2 });
    s.addText('Relatório Completo de Indicadores', { x: 0.7, y: 2.4, w: 11.5, h: 1.1, fontFace: FONT, fontSize: 40, color: WHITE, bold: true });
    s.addText(`${d.filial.nome} · Filial ${d.filial.codigo}`, { x: 0.7, y: 3.7, w: 11.5, h: 0.7, fontFace: FONT, fontSize: 24, color: ORANGE, bold: true });
    const dt = new Date(d.geradoEm).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });
    s.addText(`Gerado em ${dt}`, { x: 0.7, y: 4.5, w: 11.5, h: 0.4, fontFace: FONT, fontSize: 12, color: 'CBD5E1' });
    s.addShape('rect', { x: 0, y: H - 0.9, w: W, h: 0.05, fill: { color: ORANGE }, line: { color: ORANGE } });
  }

  // 2 — Resumo executivo
  slideResumoExecutivo(pres, d, 2, TOTAL);

  // 3 — Banco de Horas
  {
    const s = pres.addSlide();
    header(s, 'INDICADOR 01', 'Banco de Horas', d.filial.nome);
    if (d.bh) {
      statCards(s, 1.2, [
        { rotulo: 'COLABORADORES C/ SALDO', valor: d.bh.resumo.colaboradores.toLocaleString('pt-BR') },
        { rotulo: 'TOTAL DE HORAS', valor: `${d.bh.resumo.totalHoras.toLocaleString('pt-BR', { maximumFractionDigits: 0 })} h` },
        { rotulo: 'VALOR C/ ENCARGOS', valor: d.bh.resumo.valorComEncargos.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }) },
      ]);
      chartBarras(s, 0.5, 2.7, W - 1, 2.4, 'TOP 5 SEÇÕES POR HORAS', d.bh.topSecoes);
      leitura(s, textoBH(d.bh.resumo, d.bh.resumoAnterior, d.bh.topSecoes), d.bh.atualizadoEm);
    } else {
      s.addText('Sem dados importados para esta filial.', { x: 0.5, y: 3.2, w: W - 1, h: 0.5, align: 'center', italic: true, color: SLATE, fontFace: FONT, fontSize: 12 });
    }
    footer(s, 3, TOTAL);
  }

  // 4 — Inconsistências
  {
    const s = pres.addSlide();
    header(s, 'INDICADOR 02', 'Inconsistências', d.filial.nome);
    if (d.inconsist) {
      statCards(s, 1.2, [
        { rotulo: 'TOTAL DE INCONSISTÊNCIAS', valor: d.inconsist.resumo.totalInconsist.toLocaleString('pt-BR'), cor: BAD },
        { rotulo: 'COLABORADORES', valor: d.inconsist.resumo.colaboradores.toLocaleString('pt-BR') },
        { rotulo: 'MÉDIA POR PESSOA', valor: d.inconsist.resumo.mediaPorPessoa.toLocaleString('pt-BR') },
      ]);
      chartBarras(s, 0.5, 2.7, W - 1, 2.4, 'TOP 5 TIPOS', d.inconsist.topTipos);
      leitura(s, textoInconsist(d.inconsist.resumo, d.inconsist.topTipos), d.inconsist.atualizadoEm);
    } else {
      s.addText('Sem dados importados para esta filial.', { x: 0.5, y: 3.2, w: W - 1, h: 0.5, align: 'center', italic: true, color: SLATE, fontFace: FONT, fontSize: 12 });
    }
    footer(s, 4, TOTAL);
  }

  // 5 — Cursos Obrigatórios
  {
    const s = pres.addSlide();
    header(s, 'INDICADOR 03', 'Cursos Obrigatórios', d.filial.nome);
    if (d.cursos) {
      statCards(s, 1.2, [
        { rotulo: 'PENDÊNCIAS', valor: d.cursos.resumo.totalPendencias.toLocaleString('pt-BR'), cor: BAD },
        { rotulo: 'PERÍODO ANTERIOR', valor: d.cursos.resumoAnterior.totalPendencias.toLocaleString('pt-BR') },
        { rotulo: 'COLABORADORES', valor: d.cursos.resumo.colaboradores.toLocaleString('pt-BR') },
      ]);
      chartBarras(s, 0.5, 2.7, W - 1, 2.4, 'TOP 5 CURSOS/TIPOS', d.cursos.topTipos);
      leitura(s, textoCursos(d.cursos.resumo, d.cursos.resumoAnterior, d.cursos.topTipos), d.cursos.atualizadoEm);
    } else {
      s.addText('Sem dados importados para esta filial.', { x: 0.5, y: 3.2, w: W - 1, h: 0.5, align: 'center', italic: true, color: SLATE, fontFace: FONT, fontSize: 12 });
    }
    footer(s, 5, TOTAL);
  }

  // 6 — Feriados Pendentes
  {
    const s = pres.addSlide();
    header(s, 'INDICADOR 04', 'Feriados Pendentes', d.filial.nome);
    if (d.feriados) {
      statCards(s, 1.2, [
        { rotulo: 'PENDÊNCIAS', valor: d.feriados.resumo.totalPendencias.toLocaleString('pt-BR'), cor: BAD },
        { rotulo: 'COLABORADORES', valor: d.feriados.resumo.colaboradores.toLocaleString('pt-BR') },
        { rotulo: 'VALOR TOTAL', valor: d.feriados.resumo.valorTotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }) },
      ]);
      chartBarras(s, 0.5, 2.7, W - 1, 2.4, 'TOP 5 SEÇÕES', d.feriados.topSecoes);
      leitura(s, textoFeriados(d.feriados.resumo, d.feriados.topSecoes), d.feriados.atualizadoEm);
    } else {
      s.addText('Sem dados importados para esta filial.', { x: 0.5, y: 3.2, w: W - 1, h: 0.5, align: 'center', italic: true, color: SLATE, fontFace: FONT, fontSize: 12 });
    }
    footer(s, 6, TOTAL);
  }

  // 7 — Quadro de Vagas
  {
    const s = pres.addSlide();
    header(s, 'INDICADOR 05', 'Quadro de Vagas', d.filial.nome);
    if (d.vagas) {
      statCards(s, 1.2, [
        { rotulo: 'VAGAS EM ABERTO', valor: d.vagas.totalAbertas.toLocaleString('pt-BR'), cor: ORANGE },
        { rotulo: 'SEÇÕES COM VAGA', valor: d.vagas.porSecao.length.toLocaleString('pt-BR') },
      ]);
      chartBarras(s, 0.5, 2.7, 6.2, 2.4, 'POR STATUS', d.vagas.porStatus);
      chartBarras(s, 7.1, 2.7, W - 7.6, 2.4, 'POR SEÇÃO (ABERTAS)', d.vagas.porSecao);
      leitura(s, textoVagas(d.vagas.totalAbertas, d.vagas.porSecao), null);
    } else {
      s.addText('Nenhuma vaga ativa para esta filial.', { x: 0.5, y: 3.2, w: W - 1, h: 0.5, align: 'center', italic: true, color: SLATE, fontFace: FONT, fontSize: 12 });
    }
    footer(s, 7, TOTAL);
  }

  // 8 — Encerramento
  {
    const s = pres.addSlide();
    s.background = { color: NAVY };
    s.addText('Gente & Gestão · Perlog', { x: 0.5, y: 2.6, w: W - 1, h: 1, align: 'center', fontFace: FONT, fontSize: 34, color: ORANGE, bold: true });
    s.addText('Fim do relatório', { x: 0.5, y: 3.8, w: W - 1, h: 0.5, align: 'center', fontFace: FONT, fontSize: 14, color: 'CBD5E1', charSpacing: 3 });
  }

  const buf = (await pres.write({ outputType: 'nodebuffer' })) as Buffer;
  return new Uint8Array(buf);
}
