import PptxGenJS from 'pptxgenjs';
import type { DadosConsolidado, RankingIndicador } from './tipos';

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

const heat = (posicao: number, total: number): string => {
  if (total < 2) return WHITE;
  const p = (posicao - 1) / (total - 1);
  if (p <= 0.2) return 'D4EDDA';
  if (p <= 0.4) return 'E2F0D9';
  if (p <= 0.6) return 'FFF2CC';
  if (p <= 0.8) return 'FCE4D6';
  return 'F8CEC7';
};

function header(s: PptxGenJS.Slide, eyebrow: string, titulo: string) {
  s.background = { color: WHITE };
  s.addShape('rect', { x: 0, y: 0, w: W, h: 0.9, fill: { color: NAVY }, line: { color: NAVY } });
  s.addText(eyebrow, { x: 0.5, y: 0.12, w: 10, h: 0.25, fontFace: FONT, fontSize: 9, color: ORANGE, bold: true, charSpacing: 3 });
  s.addText(titulo, { x: 0.5, y: 0.34, w: 12, h: 0.5, fontFace: FONT, fontSize: 22, color: WHITE, bold: true });
}

function footer(s: PptxGenJS.Slide, page: number, total: number) {
  s.addShape('line', { x: 0.5, y: H - 0.42, w: W - 1, h: 0, line: { color: BORDER, width: 1 } });
  s.addText('Relatório Consolidado de Indicadores · Gente & Gestão · Perlog', {
    x: 0.5, y: H - 0.38, w: 9, h: 0.25, fontFace: FONT, fontSize: 8, color: SLATE,
  });
  s.addText(`${page} / ${total}`, { x: W - 1.3, y: H - 0.38, w: 0.8, h: 0.25, fontFace: FONT, fontSize: 8, color: SLATE, align: 'right' });
}

function card(s: PptxGenJS.Slide, x: number, y: number, w: number, h: number, accent = ORANGE) {
  s.addShape('roundRect', { x, y, w, h, fill: { color: WHITE }, line: { color: BORDER, width: 1 }, rectRadius: 0.06 });
  s.addShape('rect', { x, y, w, h: 0.06, fill: { color: accent }, line: { color: accent } });
}

function pill(s: PptxGenJS.Slide, x: number, y: number, w: number, texto: string, bg: string, fg: string) {
  s.addShape('roundRect', { x, y, w, h: 0.4, fill: { color: bg }, line: { color: bg }, rectRadius: 0.1 });
  s.addText(texto, { x: x + 0.1, y, w: w - 0.2, h: 0.4, valign: 'middle', fontFace: FONT, fontSize: 10, color: fg, bold: true });
}

const posMedia = (d: DadosConsolidado, filialId: string): number => {
  const ps = d.rankings
    .map((r) => r.cds.find((c) => c.filialId === filialId)?.posicao)
    .filter((p): p is number => typeof p === 'number');
  return ps.length ? ps.reduce((a, b) => a + b, 0) / ps.length : 0;
};

function tabelaHeatmap(s: PptxGenJS.Slide, d: DadosConsolidado) {
  const filiais = d.rankings[0]?.cds.map((c) => ({ filialId: c.filialId, codigo: c.codigo, nome: c.nome })) ?? [];
  const ordenadas = [...filiais].sort((a, b) => posMedia(d, a.filialId) - posMedia(d, b.filialId));
  const total = filiais.length;

  const head = ['CD', ...d.rankings.map((r) => r.titulo), 'Pos. média'];
  const rows: PptxGenJS.TableRow[] = [
    head.map((t, i) => ({ text: t, options: { bold: true, color: WHITE, fill: { color: NAVY }, align: (i === 0 ? 'left' : 'center') as PptxGenJS.HAlign, fontSize: 8, valign: 'middle' as PptxGenJS.VAlign } })),
  ];

  for (const f of ordenadas) {
    const cells: PptxGenJS.TableCell[] = [{ text: `${f.codigo} ${f.nome}`, options: { bold: true, color: NAVY, fontSize: 9 } }];
    for (const r of d.rankings) {
      const cd = r.cds.find((c) => c.filialId === f.filialId);
      cells.push({
        text: cd ? cd.valorFmt : '—',
        options: { align: 'center' as PptxGenJS.HAlign, bold: true, color: NAVY, fontSize: 9, fill: { color: cd ? heat(cd.posicao, total) : WHITE } },
      });
    }
    cells.push({ text: posMedia(d, f.filialId).toFixed(1), options: { align: 'center' as PptxGenJS.HAlign, bold: true, color: SLATE, fontSize: 9 } });
    rows.push(cells);
  }

  const h = Math.min(5.6, 0.4 + rows.length * 0.32);
  s.addTable(rows, {
    x: 0.4, y: 1.1, w: W - 0.8, h,
    fontFace: FONT, fontSize: 9,
    border: { type: 'solid', color: BORDER, pt: 0.5 },
    colW: [3.0, ...d.rankings.map(() => (W - 0.8 - 3.0 - 1.1) / d.rankings.length), 1.1],
  });
  s.addText('Verde = melhor posição · Vermelho = pior. Ranking por menor valor.', {
    x: 0.4, y: 1.1 + h + 0.1, w: W - 0.8, h: 0.3, fontFace: FONT, fontSize: 8, italic: true, color: SLATE,
  });
}

function slideRanking(pres: PptxGenJS, r: RankingIndicador, page: number, total: number) {
  const s = pres.addSlide();
  header(s, `RANKING ${String(page - 2).padStart(2, '0')}`, `Ranking — ${r.titulo}`);

  if (r.semDados || r.cds.length === 0) {
    s.addText('Sem dados importados para este indicador.', {
      x: 0.5, y: 3.2, w: W - 1, h: 0.5, align: 'center', italic: true, color: SLATE, fontFace: FONT, fontSize: 12,
    });
    footer(s, page, total);
    return;
  }

  const lider = r.cds[0]!;
  const lanterna = r.cds[r.cds.length - 1]!;

  card(s, 0.5, 1.1, W - 1, 3.5, NAVY);
  s.addText('COLOCAÇÃO POR CD (MENOR = MELHOR)', { x: 0.7, y: 1.25, w: W - 1.4, h: 0.3, fontFace: FONT, fontSize: 9, color: SLATE, bold: true, charSpacing: 1 });
  s.addChart('bar', [{
    name: r.titulo,
    labels: r.cds.map((c) => `${c.codigo} ${c.nome}`),
    values: r.cds.map((c) => c.valor),
  }], {
    x: 0.7, y: 1.6, w: W - 1.4, h: 2.9,
    barDir: 'bar', chartColors: [ORANGE], showLegend: false, showValue: true,
    catAxisLabelFontSize: 7, valAxisLabelFontSize: 7, catAxisLabelColor: SLATE, valAxisLabelColor: SLATE, valAxisMinVal: 0,
  });

  pill(s, 0.5, 4.8, 6.1, `🥇 Melhor: ${lider.nome} — ${lider.valorFmt}`, 'D1FAE5', OK);
  pill(s, 6.8, 4.8, 6.0, `🔻 Atenção: ${lanterna.nome} — ${lanterna.valorFmt}`, 'FEE2E2', BAD);

  if (r.temHistorico) {
    const comVar = r.cds.filter((c) => c.variacao && c.variacao.deltaPct !== null);
    const evo = [...comVar].sort((a, b) => (a.variacao!.deltaPct ?? 0) - (b.variacao!.deltaPct ?? 0))[0];
    const pio = [...comVar].sort((a, b) => (b.variacao!.deltaPct ?? 0) - (a.variacao!.deltaPct ?? 0))[0];
    const fmtP = (n: number) => `${n > 0 ? '+' : ''}${n.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}%`;
    const partes: string[] = [];
    if (evo && (evo.variacao!.deltaPct ?? 0) < 0) partes.push(`Maior evolução: ${evo.nome} (${fmtP(evo.variacao!.deltaPct!)})`);
    if (pio && (pio.variacao!.deltaPct ?? 0) > 0) partes.push(`Maior piora: ${pio.nome} (${fmtP(pio.variacao!.deltaPct!)})`);
    if (partes.length) s.addText(partes.join('   ·   '), { x: 0.5, y: 5.4, w: W - 1, h: 0.3, fontFace: FONT, fontSize: 10, color: NAVY, bold: true });
  }

  s.addShape('roundRect', { x: 0.5, y: 5.85, w: W - 1, h: 0.95, fill: { color: SOFT }, line: { color: BORDER, width: 1 }, rectRadius: 0.06 });
  s.addText(r.leitura, { x: 0.75, y: 5.9, w: W - 1.5, h: 0.85, fontFace: FONT, fontSize: 10, color: TEXT, valign: 'middle' });

  footer(s, page, total);
}

function slidePodio(pres: PptxGenJS, d: DadosConsolidado, page: number, total: number) {
  const s = pres.addSlide();
  header(s, 'DESTAQUES', 'Pódio — melhor CD por indicador');
  const gap = 0.2;
  const cw = (W - 1 - gap * 4) / 5;
  d.rankings.forEach((r, i) => {
    const x = 0.5 + i * (cw + gap);
    card(s, x, 1.4, cw, 4.2, NAVY);
    s.addText(r.titulo.toUpperCase(), { x: x + 0.15, y: 1.6, w: cw - 0.3, h: 0.6, fontFace: FONT, fontSize: 8, color: SLATE, bold: true });
    s.addText('🏆', { x: x + 0.15, y: 2.4, w: cw - 0.3, h: 0.7, align: 'center', fontSize: 28 });
    const campeao = !r.semDados && r.cds[0] ? r.cds[0] : null;
    s.addText(campeao ? campeao.nome : '—', { x: x + 0.1, y: 3.3, w: cw - 0.2, h: 0.9, align: 'center', fontFace: FONT, fontSize: 13, color: NAVY, bold: true });
    s.addText(campeao ? campeao.valorFmt : '', { x: x + 0.1, y: 4.2, w: cw - 0.2, h: 0.4, align: 'center', fontFace: FONT, fontSize: 12, color: OK, bold: true });
  });
  footer(s, page, total);
}

export async function gerarDeckConsolidado(d: DadosConsolidado): Promise<Uint8Array> {
  const pres = new PptxGenJS();
  pres.layout = 'LAYOUT_WIDE';
  pres.title = 'Relatório Consolidado de Indicadores';
  pres.company = 'Grupo Perlog';
  pres.author = 'Gente & Gestão';

  const TOTAL = 9;

  {
    const s = pres.addSlide();
    s.background = { color: NAVY };
    s.addShape('rect', { x: 0.7, y: 0.7, w: 2.6, h: 0.45, fill: { color: ORANGE }, line: { color: ORANGE }, rectRadius: 0.2 });
    s.addText('GENTE & GESTÃO', { x: 0.7, y: 0.7, w: 2.6, h: 0.45, align: 'center', valign: 'middle', fontFace: FONT, fontSize: 11, color: WHITE, bold: true, charSpacing: 2 });
    s.addText('Relatório Consolidado de Indicadores', { x: 0.7, y: 2.4, w: 11.9, h: 1.1, fontFace: FONT, fontSize: 38, color: WHITE, bold: true });
    s.addText(`${d.totalCDs} CDs comparados`, { x: 0.7, y: 3.7, w: 11.9, h: 0.7, fontFace: FONT, fontSize: 24, color: ORANGE, bold: true });
    const dt = new Date(d.geradoEm).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });
    s.addText(`Gerado em ${dt}`, { x: 0.7, y: 4.5, w: 11.9, h: 0.4, fontFace: FONT, fontSize: 12, color: 'CBD5E1' });
    s.addShape('rect', { x: 0, y: H - 0.9, w: W, h: 0.05, fill: { color: ORANGE }, line: { color: ORANGE } });
  }

  {
    const s = pres.addSlide();
    header(s, 'VISÃO GERAL', 'Comparativo dos CDs');
    tabelaHeatmap(s, d);
    footer(s, 2, TOTAL);
  }

  d.rankings.forEach((r, i) => slideRanking(pres, r, 3 + i, TOTAL));

  slidePodio(pres, d, 8, TOTAL);

  {
    const s = pres.addSlide();
    s.background = { color: NAVY };
    s.addText('Gente & Gestão · Perlog', { x: 0.5, y: 2.6, w: W - 1, h: 1, align: 'center', fontFace: FONT, fontSize: 34, color: ORANGE, bold: true });
    s.addText('Fim do relatório consolidado', { x: 0.5, y: 3.8, w: W - 1, h: 0.5, align: 'center', fontFace: FONT, fontSize: 14, color: 'CBD5E1', charSpacing: 3 });
  }

  const buf = (await pres.write({ outputType: 'nodebuffer' })) as Buffer;
  return new Uint8Array(buf);
}
