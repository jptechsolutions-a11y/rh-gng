/* eslint-disable */
// Gera docs/manual-usuario.pptx do zero usando pptxgenjs.
// Paleta: Perlog navy (#0B2447) + orange (#F37021).
// Rodar: node scripts/build-manual-pptx.js

const PptxGenJS = require('pptxgenjs');
const path = require('path');

const NAVY = '0B2447';
const NAVY2 = '0A1530';
const ORANGE = 'F37021';
const ORANGE_SOFT = 'FFE6D5';
const WHITE = 'FFFFFF';
const SLATE = '64748B';
const SOFT = 'F1F5F9';
const BORDER = 'E2E8F0';
const TEXT = '0F172A';

const OK = '059669';
const OK_BG = 'D1FAE5';
const BAD = '991B1B';
const BAD_BG = 'FEE2E2';
const WARN = '92400E';
const WARN_BG = 'FEF3C7';
const INFO = '075985';
const INFO_BG = 'E0F2FE';
const ROSE = '9F1239';
const ROSE_BG = 'FFE4E6';
const SKY = '0369A1';
const SKY_BG = 'E0F2FE';

const FONT_H = 'Calibri';
const FONT_B = 'Calibri';

const pres = new PptxGenJS();
pres.layout = 'LAYOUT_WIDE'; // 13.333 x 7.5 inches
pres.title = 'Manual RH G&G — Perlog';
pres.author = 'Grupo Perlog';
pres.company = 'Grupo Perlog';

const W = 13.333;
const H = 7.5;

// ---------- helpers ----------
function bgWhite(s) {
  s.background = { color: WHITE };
}
function bgNavy(s) {
  s.background = { color: NAVY };
}
function footer(s, page, total) {
  s.addText('Manual de uso · RH Gente & Gestão · Grupo Perlog', {
    x: 0.5, y: H - 0.4, w: 8, h: 0.3,
    fontFace: FONT_B, fontSize: 9, color: SLATE,
  });
  s.addText(`${page} / ${total}`, {
    x: W - 1.2, y: H - 0.4, w: 0.7, h: 0.3,
    fontFace: FONT_B, fontSize: 9, color: SLATE, align: 'right',
  });
}
function pageHeader(s, eyebrow, title) {
  s.addText(eyebrow, {
    x: 0.5, y: 0.35, w: 12, h: 0.3,
    fontFace: FONT_B, fontSize: 10, color: ORANGE, bold: true,
    charSpacing: 4,
  });
  s.addText(title, {
    x: 0.5, y: 0.65, w: 12, h: 0.7,
    fontFace: FONT_H, fontSize: 28, color: NAVY, bold: true,
  });
}
function pill(s, x, y, w, h, text, bg, fg) {
  s.addShape('roundRect', { x, y, w, h, fill: { color: bg }, line: { color: bg }, rectRadius: 0.12 });
  s.addText(text, { x, y, w, h, align: 'center', valign: 'middle',
    fontFace: FONT_B, fontSize: 10, color: fg, bold: true });
}
function card(s, x, y, w, h, opts = {}) {
  s.addShape('roundRect', {
    x, y, w, h,
    fill: { color: opts.fill || WHITE },
    line: { color: opts.border || BORDER, width: 1 },
    rectRadius: 0.12,
  });
}
function accentTopCard(s, x, y, w, h, accent = ORANGE) {
  card(s, x, y, w, h);
  s.addShape('rect', { x, y, w, h: 0.08, fill: { color: accent }, line: { color: accent } });
}

// =============================================================
// SLIDE 1 — CAPA
// =============================================================
{
  const s = pres.addSlide();
  bgNavy(s);
  // halo
  s.addShape('ellipse', {
    x: W - 4, y: -2, w: 7, h: 7,
    fill: { color: ORANGE, transparency: 80 }, line: { color: NAVY, transparency: 100 },
  });
  s.addShape('ellipse', {
    x: -2, y: H - 3, w: 5, h: 5,
    fill: { color: ORANGE, transparency: 88 }, line: { color: NAVY, transparency: 100 },
  });
  // tag
  s.addShape('roundRect', {
    x: 0.7, y: 0.7, w: 2.2, h: 0.45,
    fill: { color: ORANGE }, line: { color: ORANGE }, rectRadius: 0.2,
  });
  s.addText('GENTE & GESTÃO', {
    x: 0.7, y: 0.7, w: 2.2, h: 0.45, align: 'center', valign: 'middle',
    fontFace: FONT_B, fontSize: 11, color: WHITE, bold: true, charSpacing: 3,
  });
  s.addText('Manual de uso', {
    x: 0.7, y: 2.2, w: 11, h: 1.2,
    fontFace: FONT_H, fontSize: 56, color: WHITE, bold: true,
  });
  s.addText('Sistema RH G&G — Grupo Perlog', {
    x: 0.7, y: 3.4, w: 11, h: 0.7,
    fontFace: FONT_H, fontSize: 28, color: 'FFFFFF', transparency: 20,
  });
  s.addText('Entrevistas de seleção · Avaliação de desempenho', {
    x: 0.7, y: 4.15, w: 11, h: 0.5,
    fontFace: FONT_B, fontSize: 16, color: 'CBD5E1',
  });
  // version footer
  s.addShape('rect', { x: 0, y: H - 0.9, w: W, h: 0.04, fill: { color: ORANGE }, line: { color: ORANGE } });
  s.addText('rh-gng.vercel.app  ·  Edição 2026.06', {
    x: 0.7, y: H - 0.7, w: 6, h: 0.4,
    fontFace: FONT_B, fontSize: 12, color: 'CBD5E1',
  });
  s.addText('© Grupo Perlog', {
    x: W - 3.2, y: H - 0.7, w: 2.5, h: 0.4,
    fontFace: FONT_B, fontSize: 12, color: 'CBD5E1', align: 'right',
  });
}

// =============================================================
// SLIDE 2 — SUMÁRIO
// =============================================================
{
  const s = pres.addSlide();
  bgWhite(s);
  pageHeader(s, 'NAVEGAÇÃO', 'Sumário');

  const items = [
    ['01', 'Apresentação dos módulos'],
    ['02', 'Acesso e login'],
    ['03', 'Tela inicial — escolha do módulo'],
    ['04', 'Painel da filial'],
    ['05', 'Nova entrevista (4 etapas)'],
    ['06', 'Status da entrevista'],
    ['07', 'Histórico, Agenda e Banco de talentos'],
    ['08', 'Avaliação — visão geral'],
    ['09', 'Nova avaliação (3 etapas)'],
    ['10', 'Classificação e evolução'],
    ['11', 'Histórico e laudo da avaliação'],
    ['12', 'Relatórios'],
    ['13', 'Área administrativa'],
    ['14', 'Boas práticas e suporte'],
  ];
  const colCount = 2;
  const colW = 5.8;
  const rowH = 0.55;
  const startX = 0.7;
  const startY = 1.7;
  items.forEach((it, i) => {
    const col = i % colCount;
    const row = Math.floor(i / colCount);
    const x = startX + col * (colW + 0.4);
    const y = startY + row * (rowH + 0.1);
    s.addShape('roundRect', { x, y, w: 0.6, h: rowH, fill: { color: NAVY }, line: { color: NAVY }, rectRadius: 0.08 });
    s.addText(it[0], { x, y, w: 0.6, h: rowH, align: 'center', valign: 'middle', fontFace: FONT_B, fontSize: 14, color: WHITE, bold: true });
    s.addShape('roundRect', { x: x + 0.65, y, w: colW - 0.65, h: rowH, fill: { color: SOFT }, line: { color: BORDER }, rectRadius: 0.08 });
    s.addText(it[1], { x: x + 0.85, y, w: colW - 0.95, h: rowH, valign: 'middle', fontFace: FONT_B, fontSize: 13, color: NAVY });
  });
  footer(s, 2, 22);
}

// =============================================================
// SLIDE 3 — APRESENTAÇÃO DOS MÓDULOS
// =============================================================
{
  const s = pres.addSlide();
  bgWhite(s);
  pageHeader(s, 'CAPÍTULO 1', 'O que é o sistema RH G&G');

  s.addText(
    'O RH G&G é o sistema interno do Grupo Perlog para dois processos. Cada filial vê apenas os seus dados; a administração central tem visão consolidada.',
    { x: 0.5, y: 1.6, w: 12, h: 0.8, fontFace: FONT_B, fontSize: 14, color: SLATE }
  );

  // dois cartões
  const cY = 2.7, cH = 3.6, gap = 0.4, cW = (W - 1.0 - gap) / 2;
  // card 1
  accentTopCard(s, 0.5, cY, cW, cH, ORANGE);
  s.addShape('roundRect', { x: 0.8, y: cY + 0.35, w: 0.7, h: 0.7, fill: { color: ORANGE }, line: { color: ORANGE }, rectRadius: 0.1 });
  s.addText('📋', { x: 0.8, y: cY + 0.35, w: 0.7, h: 0.7, align: 'center', valign: 'middle', fontSize: 26, color: WHITE });
  s.addText('Entrevistas', { x: 1.7, y: cY + 0.4, w: cW - 1.4, h: 0.5, fontFace: FONT_H, fontSize: 22, color: NAVY, bold: true });
  s.addText('Seleção de candidatos', { x: 1.7, y: cY + 0.85, w: cW - 1.4, h: 0.35, fontFace: FONT_B, fontSize: 12, color: SLATE });
  s.addText(
    [
      { text: '• Cadastro do candidato com LGPD\n', options: { color: TEXT } },
      { text: '• Roteiro por cargo (perguntas customizáveis)\n', options: { color: TEXT } },
      { text: '• Avaliação por critérios e nota geral\n', options: { color: TEXT } },
      { text: '• Decisão registrada com gestor e data\n', options: { color: TEXT } },
      { text: '• Geração de Word para impressão', options: { color: TEXT } },
    ],
    { x: 0.8, y: cY + 1.6, w: cW - 0.6, h: 1.8, fontFace: FONT_B, fontSize: 13, paraSpaceAfter: 4 }
  );

  // card 2
  const c2x = 0.5 + cW + gap;
  accentTopCard(s, c2x, cY, cW, cH, NAVY);
  s.addShape('roundRect', { x: c2x + 0.3, y: cY + 0.35, w: 0.7, h: 0.7, fill: { color: NAVY }, line: { color: NAVY }, rectRadius: 0.1 });
  s.addText('📊', { x: c2x + 0.3, y: cY + 0.35, w: 0.7, h: 0.7, align: 'center', valign: 'middle', fontSize: 26, color: WHITE });
  s.addText('Avaliação de Desempenho', { x: c2x + 1.2, y: cY + 0.4, w: cW - 1.4, h: 0.5, fontFace: FONT_H, fontSize: 22, color: NAVY, bold: true });
  s.addText('Avaliação de colaboradores', { x: c2x + 1.2, y: cY + 0.85, w: cW - 1.4, h: 0.35, fontFace: FONT_B, fontSize: 12, color: SLATE });
  s.addText(
    [
      { text: '• 6 competências e 31 fatores\n' },
      { text: '• Escala de 1 a 5\n' },
      { text: '• Feedback (pontos fortes, oportunidades)\n' },
      { text: '• Plano de Desenvolvimento Individual (PDI)\n' },
      { text: '• Histórico, radar e relatórios consolidados' },
    ],
    { x: c2x + 0.3, y: cY + 1.6, w: cW - 0.6, h: 1.8, fontFace: FONT_B, fontSize: 13, color: TEXT, paraSpaceAfter: 4 }
  );

  footer(s, 3, 22);
}

// =============================================================
// SLIDE 4 — ACESSO E LOGIN
// =============================================================
{
  const s = pres.addSlide();
  bgWhite(s);
  pageHeader(s, 'CAPÍTULO 2', 'Acesso ao sistema');

  // bullets esquerda
  s.addText('Endereço:', { x: 0.5, y: 1.6, w: 6, h: 0.4, fontFace: FONT_B, fontSize: 13, color: SLATE });
  s.addShape('roundRect', { x: 0.5, y: 2.0, w: 5.8, h: 0.45, fill: { color: SOFT }, line: { color: BORDER }, rectRadius: 0.08 });
  s.addText('rh-gng.vercel.app/login', { x: 0.6, y: 2.0, w: 5.6, h: 0.45, valign: 'middle', fontFace: 'Consolas', fontSize: 14, color: NAVY, bold: true });

  s.addText('Dois perfis de acesso', { x: 0.5, y: 2.7, w: 6, h: 0.4, fontFace: FONT_H, fontSize: 16, color: NAVY, bold: true });

  // perfil filial
  card(s, 0.5, 3.2, 5.8, 1.4);
  pill(s, 0.7, 3.35, 1.0, 0.35, 'FILIAL', ORANGE_SOFT, '9A3412');
  s.addText('Código + senha', { x: 1.85, y: 3.3, w: 4.2, h: 0.4, valign: 'middle', fontFace: FONT_B, fontSize: 13, color: NAVY, bold: true });
  s.addText('Vê apenas as entrevistas e avaliações da própria filial.',
    { x: 0.7, y: 3.85, w: 5.4, h: 0.6, fontFace: FONT_B, fontSize: 12, color: SLATE });

  // perfil admin
  card(s, 0.5, 4.8, 5.8, 1.4);
  pill(s, 0.7, 4.95, 1.45, 0.35, 'ADMIN', INFO_BG, INFO);
  s.addText('Usuário + senha', { x: 2.25, y: 4.9, w: 3.8, h: 0.4, valign: 'middle', fontFace: FONT_B, fontSize: 13, color: NAVY, bold: true });
  s.addText('Vê tudo, configura cargos, roteiros, competências e pessoas.',
    { x: 0.7, y: 5.45, w: 5.4, h: 0.6, fontFace: FONT_B, fontSize: 12, color: SLATE });

  // Mock login direita
  const mx = 7.0, my = 1.6, mw = 5.8, mh = 5.2;
  s.addShape('roundRect', { x: mx, y: my, w: mw, h: mh, fill: { color: NAVY }, line: { color: NAVY }, rectRadius: 0.12 });
  // card login
  s.addShape('roundRect', { x: mx + 1.0, y: my + 0.5, w: 3.8, h: 4.2, fill: { color: WHITE }, line: { color: WHITE }, rectRadius: 0.1 });
  pill(s, mx + 1.2, my + 0.7, 1.0, 0.3, 'PERLOG', ORANGE, WHITE);
  s.addText('Entrar no sistema', { x: mx + 1.2, y: my + 1.15, w: 3.4, h: 0.4, fontFace: FONT_H, fontSize: 16, color: NAVY, bold: true });
  s.addText('Gente & Gestão', { x: mx + 1.2, y: my + 1.5, w: 3.4, h: 0.3, fontFace: FONT_B, fontSize: 10, color: SLATE });
  // input 1
  s.addText('Código da filial / Usuário', { x: mx + 1.2, y: my + 1.95, w: 3.4, h: 0.3, fontFace: FONT_B, fontSize: 10, color: NAVY });
  s.addShape('roundRect', { x: mx + 1.2, y: my + 2.25, w: 3.4, h: 0.4, fill: { color: SOFT }, line: { color: BORDER }, rectRadius: 0.06 });
  // input 2
  s.addText('Senha', { x: mx + 1.2, y: my + 2.75, w: 3.4, h: 0.3, fontFace: FONT_B, fontSize: 10, color: NAVY });
  s.addShape('roundRect', { x: mx + 1.2, y: my + 3.05, w: 3.4, h: 0.4, fill: { color: SOFT }, line: { color: BORDER }, rectRadius: 0.06 });
  // checkbox
  s.addShape('rect', { x: mx + 1.2, y: my + 3.55, w: 0.2, h: 0.2, fill: { color: WHITE }, line: { color: BORDER } });
  s.addText('Lembrar senha (30 dias)', { x: mx + 1.45, y: my + 3.48, w: 2.8, h: 0.3, fontFace: FONT_B, fontSize: 10, color: SLATE });
  // botão entrar
  s.addShape('roundRect', { x: mx + 1.2, y: my + 3.9, w: 3.4, h: 0.5, fill: { color: ORANGE }, line: { color: ORANGE }, rectRadius: 0.06 });
  s.addText('Entrar', { x: mx + 1.2, y: my + 3.9, w: 3.4, h: 0.5, align: 'center', valign: 'middle', fontFace: FONT_B, fontSize: 14, color: WHITE, bold: true });

  footer(s, 4, 22);
}

// =============================================================
// SLIDE 5 — TELA INICIAL
// =============================================================
{
  const s = pres.addSlide();
  bgWhite(s);
  pageHeader(s, 'CAPÍTULO 3', 'Tela inicial — escolha do módulo');

  s.addText('Logo após o login você cai aqui. Cada cartão leva ao módulo correspondente. A barra lateral se adapta ao módulo que você abrir.',
    { x: 0.5, y: 1.55, w: 12, h: 0.7, fontFace: FONT_B, fontSize: 13, color: SLATE });

  // Mock fundo navy
  const mx = 0.5, my = 2.5, mw = 12.3, mh = 4.2;
  s.addShape('roundRect', { x: mx, y: my, w: mw, h: mh, fill: { color: NAVY }, line: { color: NAVY }, rectRadius: 0.12 });
  s.addText('BEM-VINDO DE VOLTA', { x: mx, y: my + 0.4, w: mw, h: 0.3, align: 'center', fontFace: FONT_B, fontSize: 11, color: ORANGE, charSpacing: 4, bold: true });
  s.addText('Para onde você quer ir?', { x: mx, y: my + 0.7, w: mw, h: 0.6, align: 'center', fontFace: FONT_H, fontSize: 24, color: WHITE, bold: true });
  // cards
  const c1x = mx + 2.0, c2x = mx + 6.7, cy = my + 1.7, cw = 3.6, ch = 2.0;
  s.addShape('roundRect', { x: c1x, y: cy, w: cw, h: ch, fill: { color: WHITE }, line: { color: WHITE }, rectRadius: 0.1 });
  s.addShape('roundRect', { x: c1x + 0.2, y: cy + 0.2, w: 0.7, h: 0.7, fill: { color: ORANGE }, line: { color: ORANGE }, rectRadius: 0.1 });
  s.addText('📋', { x: c1x + 0.2, y: cy + 0.2, w: 0.7, h: 0.7, align: 'center', valign: 'middle', fontSize: 22, color: WHITE });
  s.addText('Entrevistas', { x: c1x + 0.2, y: cy + 1.0, w: cw - 0.4, h: 0.4, fontFace: FONT_H, fontSize: 18, color: NAVY, bold: true });
  s.addText('Roteiro guiado · Banco · Word', { x: c1x + 0.2, y: cy + 1.4, w: cw - 0.4, h: 0.3, fontFace: FONT_B, fontSize: 11, color: SLATE });
  s.addText('Acessar entrevistas →', { x: c1x + 0.2, y: cy + ch - 0.4, w: cw - 0.4, h: 0.3, fontFace: FONT_B, fontSize: 11, color: ORANGE, bold: true });

  s.addShape('roundRect', { x: c2x, y: cy, w: cw, h: ch, fill: { color: WHITE }, line: { color: WHITE }, rectRadius: 0.1 });
  s.addShape('roundRect', { x: c2x + 0.2, y: cy + 0.2, w: 0.7, h: 0.7, fill: { color: NAVY }, line: { color: NAVY }, rectRadius: 0.1 });
  s.addText('📊', { x: c2x + 0.2, y: cy + 0.2, w: 0.7, h: 0.7, align: 'center', valign: 'middle', fontSize: 22, color: WHITE });
  s.addText('Avaliação de Desempenho', { x: c2x + 0.2, y: cy + 1.0, w: cw - 0.4, h: 0.4, fontFace: FONT_H, fontSize: 18, color: NAVY, bold: true });
  s.addText('6 competências · 31 fatores · 1–5', { x: c2x + 0.2, y: cy + 1.4, w: cw - 0.4, h: 0.3, fontFace: FONT_B, fontSize: 11, color: SLATE });
  s.addText('Acessar avaliações →', { x: c2x + 0.2, y: cy + ch - 0.4, w: cw - 0.4, h: 0.3, fontFace: FONT_B, fontSize: 11, color: NAVY, bold: true });

  footer(s, 5, 22);
}

// =============================================================
// SLIDE 6 — PAINEL DA FILIAL
// =============================================================
{
  const s = pres.addSlide();
  bgWhite(s);
  pageHeader(s, 'CAPÍTULO 4', 'Painel da Filial');

  s.addText('Visão geral das entrevistas da sua filial. Cards de número, gráfico semanal, atalhos e lista das entrevistas recentes com busca rápida.',
    { x: 0.5, y: 1.55, w: 12, h: 0.6, fontFace: FONT_B, fontSize: 13, color: SLATE });

  // 4 stat cards
  const sY = 2.4, sH = 1.2, sW = 2.95, gap = 0.15;
  const labels = ['TOTAL', 'ÚLTIMOS 7 DIAS', 'APROVADOS', 'BANCO DE TALENTOS'];
  const values = ['128', '12', '37', '19'];
  const colors = [NAVY, NAVY, OK, ORANGE];
  for (let i = 0; i < 4; i++) {
    const x = 0.5 + i * (sW + gap);
    accentTopCard(s, x, sY, sW, sH, colors[i]);
    s.addText(labels[i], { x: x + 0.25, y: sY + 0.2, w: sW - 0.5, h: 0.3, fontFace: FONT_B, fontSize: 10, color: SLATE, charSpacing: 2, bold: true });
    s.addText(values[i], { x: x + 0.25, y: sY + 0.5, w: sW - 0.5, h: 0.7, fontFace: FONT_H, fontSize: 32, color: colors[i], bold: true });
  }

  // gráfico
  const gx = 0.5, gy = 3.8, gw = 8.2, gh = 2.4;
  accentTopCard(s, gx, gy, gw, gh, NAVY);
  s.addText('ENTREVISTAS POR SEMANA', { x: gx + 0.25, y: gy + 0.2, w: 4, h: 0.3, fontFace: FONT_B, fontSize: 10, color: SLATE, charSpacing: 2, bold: true });
  // chart
  pres.tableChart;
  s.addChart(pres.ChartType.line, [
    {
      name: 'Entrevistas',
      labels: ['−7', '−6', '−5', '−4', '−3', '−2', '−1', 'esta'],
      values: [8, 10, 7, 13, 11, 14, 9, 12],
    },
  ], {
    x: gx + 0.2, y: gy + 0.6, w: gw - 0.4, h: gh - 0.8,
    chartColors: [ORANGE], lineDataSymbol: 'circle', lineSize: 2,
    showLegend: false, showValue: true,
    catAxisLabelFontSize: 9, valAxisLabelFontSize: 9,
    catAxisLabelColor: SLATE, valAxisLabelColor: SLATE,
    valAxisMinVal: 0,
  });

  // atalhos
  const ax = 8.9, ay = 3.8, aw = 3.9, ah = 2.4;
  accentTopCard(s, ax, ay, aw, ah, ORANGE);
  s.addText('ATALHOS', { x: ax + 0.25, y: ay + 0.2, w: aw, h: 0.3, fontFace: FONT_B, fontSize: 10, color: SLATE, charSpacing: 2, bold: true });
  const btns = ['+ Nova entrevista', 'Histórico', 'Banco de talentos', 'Agenda'];
  const btnH = 0.35, btnGap = 0.08;
  btns.forEach((t, i) => {
    const isPrimary = i === 0;
    const yy = ay + 0.6 + i * (btnH + btnGap);
    s.addShape('roundRect', { x: ax + 0.25, y: yy, w: aw - 0.5, h: btnH, fill: { color: isPrimary ? ORANGE : WHITE }, line: { color: isPrimary ? ORANGE : BORDER }, rectRadius: 0.06 });
    s.addText(t, { x: ax + 0.25, y: yy, w: aw - 0.5, h: btnH, align: 'center', valign: 'middle', fontFace: FONT_B, fontSize: 11, color: isPrimary ? WHITE : NAVY, bold: isPrimary });
  });

  footer(s, 6, 22);
}

// =============================================================
// SLIDE 7 — NOVA ENTREVISTA: INTRO
// =============================================================
{
  const s = pres.addSlide();
  bgWhite(s);
  pageHeader(s, 'CAPÍTULO 5', 'Nova entrevista — 4 etapas');

  s.addText('O wizard guia você etapa por etapa. O botão CONTINUAR só libera quando os campos obrigatórios da etapa atual estão preenchidos.',
    { x: 0.5, y: 1.55, w: 12, h: 0.6, fontFace: FONT_B, fontSize: 13, color: SLATE });

  // Stepper visual
  const stY = 2.5, stH = 1.0, stW = 2.85, stGap = 0.2;
  const steps = [
    { n: 1, t: 'Identificação', d: 'CPF, dados pessoais e LGPD' },
    { n: 2, t: 'Perfil', d: 'Cargo, condições, currículo' },
    { n: 3, t: 'Roteiro', d: 'Perguntas por cargo' },
    { n: 4, t: 'Avaliação', d: 'Critérios, status e decisão' },
  ];
  steps.forEach((st, i) => {
    const x = 0.5 + i * (stW + stGap);
    const isActive = i === 0;
    s.addShape('roundRect', { x, y: stY, w: stW, h: stH, fill: { color: isActive ? ORANGE : WHITE }, line: { color: isActive ? ORANGE : BORDER, width: 1.5 }, rectRadius: 0.1 });
    s.addShape('ellipse', { x: x + 0.2, y: stY + 0.2, w: 0.55, h: 0.55, fill: { color: isActive ? WHITE : ORANGE }, line: { color: isActive ? WHITE : ORANGE } });
    s.addText(String(st.n), { x: x + 0.2, y: stY + 0.2, w: 0.55, h: 0.55, align: 'center', valign: 'middle', fontFace: FONT_B, fontSize: 16, color: isActive ? ORANGE : WHITE, bold: true });
    s.addText(st.t, { x: x + 0.85, y: stY + 0.15, w: stW - 0.95, h: 0.4, fontFace: FONT_B, fontSize: 14, color: isActive ? WHITE : NAVY, bold: true });
    s.addText(st.d, { x: x + 0.85, y: stY + 0.5, w: stW - 0.95, h: 0.45, fontFace: FONT_B, fontSize: 10, color: isActive ? 'FFE6D5' : SLATE });
  });

  // detalhe de cada etapa
  const dY = 3.8, dH = 2.7, dW = (W - 1.0 - 3 * 0.2) / 4;
  steps.forEach((st, i) => {
    const x = 0.5 + i * (dW + 0.2);
    accentTopCard(s, x, dY, dW, dH, NAVY);
    s.addText(`Etapa ${st.n}`, { x: x + 0.2, y: dY + 0.2, w: dW - 0.4, h: 0.3, fontFace: FONT_B, fontSize: 10, color: ORANGE, charSpacing: 2, bold: true });
    s.addText(st.t, { x: x + 0.2, y: dY + 0.5, w: dW - 0.4, h: 0.4, fontFace: FONT_H, fontSize: 14, color: NAVY, bold: true });
    const bullets = [
      ['CPF (busca duplicidade)', 'Nome, RG, contato', 'Cidade', 'Consentimento LGPD'],
      ['Cargo pretendido', 'Salário, escolaridade', 'Turnos, CNH, veículo', 'PCD, indicação, currículo'],
      ['Perguntas configuradas\npelo admin por cargo', 'Texto, múltipla escolha', 'Escala 1–5', 'Resposta livre'],
      ['Notas por critério', 'Observações finais', 'Status (ver próx. slide)', 'Gestor + data registrados'],
    ][i];
    s.addText(
      bullets.map((b) => ({ text: '• ' + b + '\n' })),
      { x: x + 0.2, y: dY + 0.95, w: dW - 0.4, h: dH - 1.0, fontFace: FONT_B, fontSize: 11, color: TEXT, paraSpaceAfter: 4 }
    );
  });

  footer(s, 7, 22);
}

// =============================================================
// SLIDE 8 — STATUS DA ENTREVISTA
// =============================================================
{
  const s = pres.addSlide();
  bgWhite(s);
  pageHeader(s, 'CAPÍTULO 6', 'Status da entrevista');

  s.addText('O status é o coração do processo. Ele aparece colorido em todas as listagens e define onde o candidato aparece (painel, agenda, banco).',
    { x: 0.5, y: 1.55, w: 12, h: 0.6, fontFace: FONT_B, fontSize: 13, color: SLATE });

  const rows = [
    { status: 'EM ANÁLISE', bg: WARN_BG, fg: WARN,
      sig: 'Candidato cadastrado, aguardando decisão.',
      use: 'Logo após a primeira entrevista.',
      next: 'Agendar retorno → mover para Aprovado/Reprovado.' },
    { status: 'APROVADO', bg: OK_BG, fg: OK,
      sig: 'Candidato aprovado para contratação.',
      use: 'Gestor confirmou. Obrigatório informar nome.',
      next: 'Acompanhar admissão → Contratado.' },
    { status: 'REPROVADO', bg: BAD_BG, fg: BAD,
      sig: 'Não aprovado nesse processo.',
      use: 'Gestor confirmou. Registrar motivo.',
      next: 'Pode ir para Banco de Talentos.' },
    { status: 'BANCO DE TALENTOS', bg: ORANGE_SOFT, fg: '9A3412',
      sig: 'Perfil bom, sem vaga no momento.',
      use: 'Reservar candidato para vaga futura.',
      next: 'Aparece na lista do Banco de talentos.' },
    { status: 'CONTRATADO', bg: SKY_BG, fg: INFO,
      sig: 'Candidato admitido oficialmente.',
      use: 'Após assinatura do contrato.',
      next: 'Fecha o ciclo da entrevista.' },
  ];

  const headerY = 2.4;
  // header row
  const cols = [
    { x: 0.5, w: 2.1, t: 'STATUS' },
    { x: 2.7, w: 3.2, t: 'SIGNIFICADO' },
    { x: 6.0, w: 3.4, t: 'QUANDO USAR' },
    { x: 9.5, w: 3.3, t: 'PRÓXIMOS PASSOS' },
  ];
  s.addShape('rect', { x: 0.5, y: headerY, w: W - 1, h: 0.4, fill: { color: NAVY }, line: { color: NAVY } });
  cols.forEach((c) => {
    s.addText(c.t, { x: c.x + 0.1, y: headerY, w: c.w - 0.2, h: 0.4, valign: 'middle', fontFace: FONT_B, fontSize: 10, color: WHITE, bold: true, charSpacing: 2 });
  });

  rows.forEach((r, i) => {
    const y = headerY + 0.4 + i * 0.75;
    const stripe = i % 2 === 0 ? WHITE : SOFT;
    s.addShape('rect', { x: 0.5, y, w: W - 1, h: 0.75, fill: { color: stripe }, line: { color: BORDER } });
    // pill
    pill(s, cols[0].x + 0.1, y + 0.18, cols[0].w - 0.2, 0.4, r.status, r.bg, r.fg);
    s.addText(r.sig, { x: cols[1].x + 0.1, y, w: cols[1].w - 0.2, h: 0.75, valign: 'middle', fontFace: FONT_B, fontSize: 11, color: TEXT });
    s.addText(r.use, { x: cols[2].x + 0.1, y, w: cols[2].w - 0.2, h: 0.75, valign: 'middle', fontFace: FONT_B, fontSize: 11, color: TEXT });
    s.addText(r.next, { x: cols[3].x + 0.1, y, w: cols[3].w - 0.2, h: 0.75, valign: 'middle', fontFace: FONT_B, fontSize: 11, color: TEXT });
  });

  s.addShape('roundRect', { x: 0.5, y: headerY + 0.4 + 5 * 0.75 + 0.15, w: W - 1, h: 0.45, fill: { color: 'FFF7ED' }, line: { color: 'FED7AA' }, rectRadius: 0.06 });
  s.addText('Ao mudar para APROVADO ou REPROVADO, o sistema registra automaticamente a data e quem decidiu — esses dados ficam no histórico.',
    { x: 0.7, y: headerY + 0.4 + 5 * 0.75 + 0.15, w: W - 1.4, h: 0.45, valign: 'middle', fontFace: FONT_B, fontSize: 11, color: '7C2D12' });

  footer(s, 8, 22);
}

// =============================================================
// SLIDE 9 — HISTÓRICO
// =============================================================
{
  const s = pres.addSlide();
  bgWhite(s);
  pageHeader(s, 'CAPÍTULO 7', 'Histórico de entrevistas');

  s.addText('Lista completa com filtros — todas as entrevistas que sua filial já cadastrou. Exportação CSV/XLSX. Clique para abrir e gerar o Word.',
    { x: 0.5, y: 1.55, w: 12, h: 0.6, fontFace: FONT_B, fontSize: 13, color: SLATE });

  // Como usar
  const steps = ['Digite parte do nome, CPF ou cargo na busca.',
    'Filtre por status e período.',
    'Clique em FILTRAR — a lista atualiza.',
    'Exporte em CSV/XLSX se precisar de planilha.',
    'Abra a entrevista para editar ou gerar Word.'];
  steps.forEach((t, i) => {
    const y = 2.5 + i * 0.62;
    s.addShape('ellipse', { x: 0.6, y, w: 0.45, h: 0.45, fill: { color: ORANGE }, line: { color: ORANGE } });
    s.addText(String(i + 1), { x: 0.6, y, w: 0.45, h: 0.45, align: 'center', valign: 'middle', fontFace: FONT_B, fontSize: 13, color: WHITE, bold: true });
    s.addText(t, { x: 1.2, y, w: 4.8, h: 0.45, valign: 'middle', fontFace: FONT_B, fontSize: 12, color: TEXT });
  });

  // Mock tabela à direita
  const mx = 6.3, my = 2.4, mw = 6.5, mh = 4.4;
  card(s, mx, my, mw, mh);
  // header bar
  s.addShape('rect', { x: mx, y: my, w: mw, h: 0.4, fill: { color: SOFT }, line: { color: BORDER } });
  s.addText('Candidato', { x: mx + 0.15, y: my, w: 1.8, h: 0.4, valign: 'middle', fontFace: FONT_B, fontSize: 10, color: SLATE, bold: true });
  s.addText('Cargo', { x: mx + 2.1, y: my, w: 1.3, h: 0.4, valign: 'middle', fontFace: FONT_B, fontSize: 10, color: SLATE, bold: true });
  s.addText('Status', { x: mx + 3.5, y: my, w: 1.4, h: 0.4, valign: 'middle', fontFace: FONT_B, fontSize: 10, color: SLATE, bold: true });
  s.addText('Data', { x: mx + 5.05, y: my, w: 1.2, h: 0.4, valign: 'middle', fontFace: FONT_B, fontSize: 10, color: SLATE, bold: true });

  const rows = [
    ['Maria Silva', 'Aux. logístico', 'EM ANÁLISE', WARN_BG, WARN, '03/06/2026'],
    ['João Santos', 'Conferente', 'APROVADO', OK_BG, OK, '02/06/2026'],
    ['Ana Costa', 'Motorista', 'BANCO TALENTOS', ORANGE_SOFT, '9A3412', '31/05/2026'],
    ['Paulo Souza', 'Conferente', 'REPROVADO', BAD_BG, BAD, '28/05/2026'],
    ['Lucia Reis', 'Aux. logístico', 'CONTRATADO', SKY_BG, INFO, '25/05/2026'],
  ];
  rows.forEach((r, i) => {
    const y = my + 0.4 + i * 0.65;
    s.addShape('rect', { x: mx, y, w: mw, h: 0.65, fill: { color: i % 2 ? SOFT : WHITE }, line: { color: BORDER } });
    s.addText(r[0], { x: mx + 0.15, y, w: 1.85, h: 0.65, valign: 'middle', fontFace: FONT_B, fontSize: 11, color: NAVY, bold: true });
    s.addText(r[1], { x: mx + 2.1, y, w: 1.4, h: 0.65, valign: 'middle', fontFace: FONT_B, fontSize: 11, color: SLATE });
    pill(s, mx + 3.5, y + 0.18, 1.45, 0.32, r[2], r[3], r[4]);
    s.addText(r[5], { x: mx + 5.05, y, w: 1.3, h: 0.65, valign: 'middle', fontFace: FONT_B, fontSize: 11, color: SLATE });
  });

  footer(s, 9, 22);
}

// =============================================================
// SLIDE 10 — AGENDA + BANCO DE TALENTOS
// =============================================================
{
  const s = pres.addSlide();
  bgWhite(s);
  pageHeader(s, 'CAPÍTULO 7 · continuação', 'Agenda de retornos e Banco de talentos');

  // Agenda
  const ax = 0.5, ay = 1.7, aw = 6.0, ah = 5.0;
  accentTopCard(s, ax, ay, aw, ah, ORANGE);
  s.addText('📅  AGENDA DE RETORNOS', { x: ax + 0.25, y: ay + 0.2, w: aw, h: 0.4, fontFace: FONT_B, fontSize: 11, color: SLATE, bold: true, charSpacing: 2 });
  s.addText('Tudo que você marcou como “retorno” na etapa 4 aparece aqui, em ordem.',
    { x: ax + 0.25, y: ay + 0.6, w: aw - 0.5, h: 0.5, fontFace: FONT_B, fontSize: 12, color: TEXT });

  const agendaCards = [
    { label: 'HOJE', value: '3 retornos', bg: WARN_BG, fg: WARN },
    { label: 'PRÓXIMOS 7 DIAS', value: '11 retornos', bg: OK_BG, fg: OK },
    { label: 'ATRASADOS', value: '2 retornos', bg: BAD_BG, fg: BAD },
  ];
  agendaCards.forEach((c, i) => {
    const x = ax + 0.25 + i * 1.85;
    const y = ay + 1.35;
    s.addShape('roundRect', { x, y, w: 1.75, h: 0.95, fill: { color: c.bg }, line: { color: c.bg }, rectRadius: 0.08 });
    s.addText(c.label, { x, y: y + 0.1, w: 1.75, h: 0.3, align: 'center', fontFace: FONT_B, fontSize: 9, color: c.fg, bold: true, charSpacing: 2 });
    s.addText(c.value, { x, y: y + 0.4, w: 1.75, h: 0.45, align: 'center', fontFace: FONT_H, fontSize: 16, color: c.fg, bold: true });
  });

  // como usar
  const usa = ['Abra a Agenda na barra lateral.',
    'Visualize candidatos por data de retorno.',
    'Clique no candidato para abrir a entrevista.',
    'Após o contato, atualize o status.'];
  usa.forEach((t, i) => {
    const y = ay + 2.55 + i * 0.45;
    s.addShape('ellipse', { x: ax + 0.3, y, w: 0.35, h: 0.35, fill: { color: ORANGE }, line: { color: ORANGE } });
    s.addText(String(i + 1), { x: ax + 0.3, y, w: 0.35, h: 0.35, align: 'center', valign: 'middle', fontFace: FONT_B, fontSize: 11, color: WHITE, bold: true });
    s.addText(t, { x: ax + 0.75, y, w: aw - 1.0, h: 0.35, valign: 'middle', fontFace: FONT_B, fontSize: 12, color: TEXT });
  });

  // Banco de talentos
  const bx = 6.8, by = 1.7, bw = 6.0, bh = 5.0;
  accentTopCard(s, bx, by, bw, bh, NAVY);
  s.addText('👥  BANCO DE TALENTOS', { x: bx + 0.25, y: by + 0.2, w: bw, h: 0.4, fontFace: FONT_B, fontSize: 11, color: SLATE, bold: true, charSpacing: 2 });
  s.addText('Reúne candidatos com status BANCO DE TALENTOS para retomada futura.',
    { x: bx + 0.25, y: by + 0.6, w: bw - 0.5, h: 0.5, fontFace: FONT_B, fontSize: 12, color: TEXT });

  // 3 cards mini
  const minis = [
    ['Maria Silva', 'Aux. log. · Joinville'],
    ['Ana Costa', 'Motorista · Curitiba'],
    ['Rafael Mello', 'Conferente · Joinville'],
  ];
  minis.forEach((m, i) => {
    const y = by + 1.3 + i * 1.1;
    s.addShape('roundRect', { x: bx + 0.25, y, w: bw - 0.5, h: 0.95, fill: { color: SOFT }, line: { color: BORDER }, rectRadius: 0.08 });
    s.addShape('rect', { x: bx + 0.25, y, w: 0.1, h: 0.95, fill: { color: ORANGE }, line: { color: ORANGE } });
    s.addText(m[0], { x: bx + 0.5, y: y + 0.1, w: bw - 1.0, h: 0.35, fontFace: FONT_B, fontSize: 13, color: NAVY, bold: true });
    s.addText(m[1], { x: bx + 0.5, y: y + 0.45, w: bw - 1.0, h: 0.3, fontFace: FONT_B, fontSize: 11, color: SLATE });
    pill(s, bx + 0.5, y + 0.65, 1.6, 0.25, 'BANCO DE TALENTOS', ORANGE_SOFT, '9A3412');
  });

  footer(s, 10, 22);
}

// =============================================================
// SLIDE 11 — AVALIAÇÃO: VISÃO GERAL
// =============================================================
{
  const s = pres.addSlide();
  bgWhite(s);
  pageHeader(s, 'CAPÍTULO 8', 'Avaliação de Desempenho — Visão geral');

  s.addText('Ao escolher o módulo Avaliação na tela Início, a barra lateral muda para o contexto desse módulo. O atalho “Voltar ao início” aparece no topo.',
    { x: 0.5, y: 1.55, w: 12, h: 0.6, fontFace: FONT_B, fontSize: 13, color: SLATE });

  // três stat cards
  const stats = [
    { label: 'AVALIAÇÕES NO ANO', value: '86', color: NAVY },
    { label: 'MÉDIA GERAL', value: '4,12', color: OK },
    { label: 'PREDOMINANTE', value: 'BOM', color: SKY },
  ];
  stats.forEach((st, i) => {
    const x = 0.5 + i * 4.2;
    const y = 2.4;
    accentTopCard(s, x, y, 4.0, 1.6, st.color);
    s.addText(st.label, { x: x + 0.25, y: y + 0.25, w: 3.5, h: 0.3, fontFace: FONT_B, fontSize: 10, color: SLATE, charSpacing: 2, bold: true });
    s.addText(st.value, { x: x + 0.25, y: y + 0.6, w: 3.5, h: 0.9, fontFace: FONT_H, fontSize: 40, color: st.color, bold: true });
  });

  // últimas avaliações tabela
  const tx = 0.5, ty = 4.4, tw = W - 1, th = 2.4;
  s.addShape('rect', { x: tx, y: ty, w: tw, h: 0.4, fill: { color: NAVY }, line: { color: NAVY } });
  const tcols = [
    { x: tx + 0.2, w: 3.0, t: 'COLABORADOR' },
    { x: tx + 3.4, w: 2.4, t: 'GESTOR' },
    { x: tx + 5.9, w: 2.0, t: 'PONTUAÇÃO' },
    { x: tx + 8.0, w: 2.8, t: 'CLASSIFICAÇÃO' },
    { x: tx + 10.9, w: 1.2, t: 'DATA' },
  ];
  tcols.forEach((c) => s.addText(c.t, { x: c.x, y: ty, w: c.w, h: 0.4, valign: 'middle', fontFace: FONT_B, fontSize: 10, color: WHITE, bold: true, charSpacing: 2 }));

  const arows = [
    ['Lucas Almeida', 'M. Souza', '4,7', 'EXCELENTE', OK_BG, OK, '02/06'],
    ['Camila Reis', 'C. Lima', '3,8', 'BOM', SKY_BG, INFO, '31/05'],
    ['Pedro Henrique', 'A. Dias', '2,9', 'REGULAR', WARN_BG, WARN, '28/05'],
    ['Beatriz Cunha', 'M. Souza', '2,1', 'PRECISA MELHORAR', ROSE_BG, ROSE, '25/05'],
  ];
  arows.forEach((r, i) => {
    const y = ty + 0.4 + i * 0.5;
    s.addShape('rect', { x: tx, y, w: tw, h: 0.5, fill: { color: i % 2 ? SOFT : WHITE }, line: { color: BORDER } });
    s.addText(r[0], { x: tcols[0].x, y, w: tcols[0].w, h: 0.5, valign: 'middle', fontFace: FONT_B, fontSize: 11, color: NAVY, bold: true });
    s.addText(r[1], { x: tcols[1].x, y, w: tcols[1].w, h: 0.5, valign: 'middle', fontFace: FONT_B, fontSize: 11, color: SLATE });
    s.addText(r[2], { x: tcols[2].x, y, w: tcols[2].w, h: 0.5, valign: 'middle', fontFace: FONT_B, fontSize: 13, color: NAVY, bold: true });
    pill(s, tcols[3].x, y + 0.1, 2.6, 0.3, r[3], r[4], r[5]);
    s.addText(r[6], { x: tcols[4].x, y, w: tcols[4].w, h: 0.5, valign: 'middle', fontFace: FONT_B, fontSize: 11, color: SLATE });
  });

  footer(s, 11, 22);
}

// =============================================================
// SLIDE 12 — NOVA AVALIAÇÃO INTRO
// =============================================================
{
  const s = pres.addSlide();
  bgWhite(s);
  pageHeader(s, 'CAPÍTULO 9', 'Nova avaliação — 3 etapas');

  s.addText('Wizard que conduz o gestor pelas etapas. Só libera CONTINUAR quando os 31 fatores estão respondidos.',
    { x: 0.5, y: 1.55, w: 12, h: 0.6, fontFace: FONT_B, fontSize: 13, color: SLATE });

  const steps = [
    { n: 1, t: 'Identificação', d: 'Matrículas do avaliado e do gestor' },
    { n: 2, t: 'Avaliação', d: '31 fatores em 6 competências' },
    { n: 3, t: 'Feedback', d: 'Pontos fortes, oportunidades e PDI' },
  ];
  const stY = 2.4, stH = 1.2, stW = 4.0, stGap = 0.25;
  steps.forEach((st, i) => {
    const x = 0.5 + i * (stW + stGap);
    const isActive = i === 0;
    s.addShape('roundRect', { x, y: stY, w: stW, h: stH, fill: { color: isActive ? NAVY : WHITE }, line: { color: isActive ? NAVY : BORDER, width: 1.5 }, rectRadius: 0.1 });
    s.addShape('ellipse', { x: x + 0.25, y: stY + 0.25, w: 0.7, h: 0.7, fill: { color: isActive ? WHITE : NAVY }, line: { color: isActive ? WHITE : NAVY } });
    s.addText(String(st.n), { x: x + 0.25, y: stY + 0.25, w: 0.7, h: 0.7, align: 'center', valign: 'middle', fontFace: FONT_B, fontSize: 20, color: isActive ? NAVY : WHITE, bold: true });
    s.addText(st.t, { x: x + 1.05, y: stY + 0.2, w: stW - 1.2, h: 0.45, fontFace: FONT_B, fontSize: 16, color: isActive ? WHITE : NAVY, bold: true });
    s.addText(st.d, { x: x + 1.05, y: stY + 0.6, w: stW - 1.2, h: 0.5, fontFace: FONT_B, fontSize: 11, color: isActive ? 'CBD5E1' : SLATE });
  });

  // detalhe
  const dY = 3.9, dH = 2.7;
  const details = [
    {
      title: 'Etapa 1 — Identificação',
      bullets: [
        'Matrícula do avaliado → busca pessoa cadastrada.',
        'Mostra nome e função abaixo do campo.',
        'Matrícula do gestor → mesmo processo.',
        'Avaliado e gestor não podem ser a mesma pessoa.',
      ],
    },
    {
      title: 'Etapa 2 — 6 competências, 31 fatores',
      bullets: [
        'Cada fator com nota de 1 a 5.',
        'Barra de progresso mostra X/31 respondidos.',
        'Só libera próximo passo se 100% preenchido.',
        'Possível retornar e ajustar antes de salvar.',
      ],
    },
    {
      title: 'Etapa 3 — Feedback e PDI',
      bullets: [
        'Pontos fortes — o que o colaborador faz bem.',
        'Oportunidades — o que precisa evoluir.',
        'Comentários gerais do gestor.',
        'PDI pode ser editado depois do salvamento.',
      ],
    },
  ];
  details.forEach((d, i) => {
    const x = 0.5 + i * (stW + stGap);
    accentTopCard(s, x, dY, stW, dH, ORANGE);
    s.addText(d.title, { x: x + 0.25, y: dY + 0.25, w: stW - 0.5, h: 0.4, fontFace: FONT_B, fontSize: 13, color: NAVY, bold: true });
    s.addText(d.bullets.map((b) => ({ text: '• ' + b + '\n' })),
      { x: x + 0.25, y: dY + 0.75, w: stW - 0.5, h: dH - 0.85, fontFace: FONT_B, fontSize: 11, color: TEXT, paraSpaceAfter: 4 });
  });

  footer(s, 12, 22);
}

// =============================================================
// SLIDE 13 — ESCALA DE NOTAS
// =============================================================
{
  const s = pres.addSlide();
  bgWhite(s);
  pageHeader(s, 'CAPÍTULO 9 · continuação', 'Escala de notas — 1 a 5');

  s.addText('Use uma régua consistente. Quanto mais alinhado o time estiver com essas referências, mais comparáveis ficam as avaliações entre filiais.',
    { x: 0.5, y: 1.55, w: 12, h: 0.6, fontFace: FONT_B, fontSize: 13, color: SLATE });

  const escala = [
    { n: 5, t: 'Excede consistentemente o esperado', cor: OK, bg: OK_BG },
    { n: 4, t: 'Acima do esperado, padrão alto', cor: SKY, bg: SKY_BG },
    { n: 3, t: 'Atende ao esperado', cor: '7C2D12', bg: 'FEF3C7' },
    { n: 2, t: 'Abaixo do esperado, precisa de apoio', cor: WARN, bg: 'FED7AA' },
    { n: 1, t: 'Muito abaixo, requer ação imediata', cor: BAD, bg: BAD_BG },
  ];
  escala.forEach((e, i) => {
    const y = 2.4 + i * 0.9;
    s.addShape('roundRect', { x: 0.5, y, w: W - 1, h: 0.75, fill: { color: e.bg }, line: { color: e.bg }, rectRadius: 0.1 });
    s.addShape('ellipse', { x: 0.7, y: y + 0.075, w: 0.6, h: 0.6, fill: { color: e.cor }, line: { color: e.cor } });
    s.addText(String(e.n), { x: 0.7, y: y + 0.075, w: 0.6, h: 0.6, align: 'center', valign: 'middle', fontFace: FONT_H, fontSize: 22, color: WHITE, bold: true });
    s.addText(e.t, { x: 1.55, y, w: W - 2.5, h: 0.75, valign: 'middle', fontFace: FONT_B, fontSize: 16, color: e.cor, bold: true });
  });

  footer(s, 13, 22);
}

// =============================================================
// SLIDE 14 — CLASSIFICAÇÃO
// =============================================================
{
  const s = pres.addSlide();
  bgWhite(s);
  pageHeader(s, 'CAPÍTULO 10', 'Classificação automática');

  s.addText('O sistema calcula a média dos 31 fatores e enquadra o colaborador em uma das 4 faixas. A classificação aparece no laudo e nos relatórios.',
    { x: 0.5, y: 1.55, w: 12, h: 0.6, fontFace: FONT_B, fontSize: 13, color: SLATE });

  // 4 quadrantes
  const grid = [
    { range: '≥ 4,50', name: 'EXCELENTE', desc: 'Desempenho de referência. Candidato a promoção e mentoria.', cor: OK, bg: OK_BG },
    { range: '3,50 a 4,49', name: 'BOM', desc: 'Atende com folga. Reconhecer e manter.', cor: SKY, bg: SKY_BG },
    { range: '2,50 a 3,49', name: 'REGULAR', desc: 'Atende com ressalvas. Foco em PDI.', cor: WARN, bg: WARN_BG },
    { range: '< 2,50', name: 'PRECISA MELHORAR', desc: 'Acompanhamento próximo. Meta clara para próxima avaliação.', cor: ROSE, bg: ROSE_BG },
  ];
  const qW = 6.0, qH = 2.0, qGap = 0.3;
  grid.forEach((g, i) => {
    const x = 0.5 + (i % 2) * (qW + qGap);
    const y = 2.4 + Math.floor(i / 2) * (qH + qGap);
    s.addShape('roundRect', { x, y, w: qW, h: qH, fill: { color: g.bg }, line: { color: g.bg }, rectRadius: 0.12 });
    s.addShape('roundRect', { x, y, w: 0.15, h: qH, fill: { color: g.cor }, line: { color: g.cor }, rectRadius: 0.0 });
    s.addText(g.range, { x: x + 0.4, y: y + 0.15, w: 2.2, h: 0.3, fontFace: 'Consolas', fontSize: 12, color: g.cor, bold: true });
    s.addText(g.name, { x: x + 0.4, y: y + 0.5, w: qW - 0.6, h: 0.55, fontFace: FONT_H, fontSize: 24, color: g.cor, bold: true });
    s.addText(g.desc, { x: x + 0.4, y: y + 1.1, w: qW - 0.6, h: 0.8, fontFace: FONT_B, fontSize: 12, color: TEXT });
  });

  footer(s, 14, 22);
}

// =============================================================
// SLIDE 15 — EVOLUÇÃO
// =============================================================
{
  const s = pres.addSlide();
  bgWhite(s);
  pageHeader(s, 'CAPÍTULO 10 · continuação', 'Indicador de evolução');

  s.addText('Sempre que existe uma avaliação anterior, o sistema compara as duas pontuações e classifica a evolução. Filtra ruído estatístico com ±0,30.',
    { x: 0.5, y: 1.55, w: 12, h: 0.6, fontFace: FONT_B, fontSize: 13, color: SLATE });

  const evo = [
    { sym: '🔰', name: 'PRIMEIRA', desc: 'Sem histórico anterior — esta é a primeira avaliação do colaborador.', cor: INFO, bg: INFO_BG },
    { sym: '↑',  name: 'POSITIVA',  desc: 'Pontuação subiu pelo menos 0,30 em relação à última.', cor: OK, bg: OK_BG },
    { sym: '→',  name: 'ESTÁVEL',   desc: 'Variação dentro de ±0,30. Performance se mantém.', cor: WARN, bg: WARN_BG },
    { sym: '↓',  name: 'NEGATIVA',  desc: 'Pontuação caiu pelo menos 0,30. Sinal para conversa.', cor: ROSE, bg: ROSE_BG },
  ];
  evo.forEach((e, i) => {
    const y = 2.4 + i * 1.05;
    s.addShape('roundRect', { x: 0.5, y, w: W - 1, h: 0.85, fill: { color: e.bg }, line: { color: e.bg }, rectRadius: 0.1 });
    s.addShape('ellipse', { x: 0.7, y: y + 0.1, w: 0.65, h: 0.65, fill: { color: e.cor }, line: { color: e.cor } });
    s.addText(e.sym, { x: 0.7, y: y + 0.1, w: 0.65, h: 0.65, align: 'center', valign: 'middle', fontFace: FONT_H, fontSize: 22, color: WHITE, bold: true });
    s.addText(e.name, { x: 1.55, y: y + 0.1, w: 3.0, h: 0.4, fontFace: FONT_H, fontSize: 18, color: e.cor, bold: true });
    s.addText(e.desc, { x: 1.55, y: y + 0.45, w: W - 2.5, h: 0.4, fontFace: FONT_B, fontSize: 13, color: TEXT });
  });

  s.addShape('roundRect', { x: 0.5, y: 6.7, w: W - 1, h: 0.5, fill: { color: 'ECFEFF' }, line: { color: 'A5F3FC' }, rectRadius: 0.06 });
  s.addText('Por que 0,30? Esse limite filtra variações pequenas (ruído natural entre dois ciclos), destacando mudanças realmente significativas.',
    { x: 0.7, y: 6.7, w: W - 1.4, h: 0.5, valign: 'middle', fontFace: FONT_B, fontSize: 12, color: '155E75' });

  footer(s, 15, 22);
}

// =============================================================
// SLIDE 16 — HISTÓRICO E LAUDO
// =============================================================
{
  const s = pres.addSlide();
  bgWhite(s);
  pageHeader(s, 'CAPÍTULO 11', 'Histórico e laudo da avaliação');

  s.addText('Cada avaliação salva pode ser aberta novamente e gera um laudo completo, pronto para impressão.',
    { x: 0.5, y: 1.55, w: 12, h: 0.6, fontFace: FONT_B, fontSize: 13, color: SLATE });

  const blocks = [
    { t: 'Cabeçalho do laudo', d: 'Avaliado, gestor, filial e data — identificação completa.' },
    { t: 'Notas por competência', d: 'Detalhamento dos 31 fatores agrupados nas 6 competências.' },
    { t: 'Radar de competências', d: 'Gráfico visual mostrando o equilíbrio entre as 6 competências.' },
    { t: 'Feedback escrito', d: 'Pontos fortes, oportunidades e comentários do gestor.' },
    { t: 'PDI editável', d: 'Plano de Desenvolvimento Individual pode ser ajustado depois.' },
    { t: 'Evolução', d: 'Comparação automática com a avaliação anterior.' },
  ];
  blocks.forEach((b, i) => {
    const col = i % 2;
    const row = Math.floor(i / 2);
    const x = 0.5 + col * 6.3;
    const y = 2.4 + row * 1.5;
    accentTopCard(s, x, y, 6.0, 1.3, NAVY);
    s.addText(b.t, { x: x + 0.3, y: y + 0.2, w: 5.5, h: 0.4, fontFace: FONT_H, fontSize: 15, color: NAVY, bold: true });
    s.addText(b.d, { x: x + 0.3, y: y + 0.65, w: 5.5, h: 0.55, fontFace: FONT_B, fontSize: 12, color: SLATE });
  });

  s.addShape('roundRect', { x: 0.5, y: 6.85, w: W - 1, h: 0.4, fill: { color: ORANGE_SOFT }, line: { color: ORANGE_SOFT }, rectRadius: 0.06 });
  s.addText('🖨  Botão IMPRIMIR LAUDO gera versão otimizada para uma página A4.',
    { x: 0.7, y: 6.85, w: W - 1.4, h: 0.4, valign: 'middle', fontFace: FONT_B, fontSize: 12, color: '9A3412', bold: true });

  footer(s, 16, 22);
}

// =============================================================
// SLIDE 17 — RELATÓRIOS
// =============================================================
{
  const s = pres.addSlide();
  bgWhite(s);
  pageHeader(s, 'CAPÍTULO 12', 'Relatórios consolidados');

  s.addText('Três abas para visão estratégica das avaliações — disponíveis no menu “Relatórios” do módulo Avaliação.',
    { x: 0.5, y: 1.55, w: 12, h: 0.6, fontFace: FONT_B, fontSize: 13, color: SLATE });

  // cards
  const tabs = [
    { t: 'Por filial', d: 'Média de cada filial em barras.\nUtil para benchmark entre regionais.', icon: '🏢' },
    { t: 'Por competência', d: 'Quais das 6 competências têm médias mais altas e mais baixas.', icon: '🎯' },
    { t: 'Ranking', d: 'Top 10 e Bottom 10 colaboradores. Identifica talentos e prioridades.', icon: '🏆' },
  ];
  tabs.forEach((tb, i) => {
    const x = 0.5 + i * 4.2;
    const y = 2.4;
    accentTopCard(s, x, y, 4.0, 2.0, ORANGE);
    s.addShape('ellipse', { x: x + 0.3, y: y + 0.3, w: 0.7, h: 0.7, fill: { color: ORANGE_SOFT }, line: { color: ORANGE_SOFT } });
    s.addText(tb.icon, { x: x + 0.3, y: y + 0.3, w: 0.7, h: 0.7, align: 'center', valign: 'middle', fontSize: 22 });
    s.addText(tb.t, { x: x + 1.15, y: y + 0.35, w: 2.7, h: 0.5, fontFace: FONT_H, fontSize: 18, color: NAVY, bold: true });
    s.addText(tb.d, { x: x + 0.3, y: y + 1.1, w: 3.5, h: 0.85, fontFace: FONT_B, fontSize: 12, color: TEXT });
  });

  // mock gráfico de barras
  const cx = 0.5, cy = 4.6, cw = W - 1, ch = 2.2;
  accentTopCard(s, cx, cy, cw, ch, NAVY);
  s.addText('PRÉVIA — MÉDIA POR FILIAL', { x: cx + 0.3, y: cy + 0.2, w: 4, h: 0.3, fontFace: FONT_B, fontSize: 10, color: SLATE, bold: true, charSpacing: 2 });

  s.addChart(pres.ChartType.bar, [
    {
      name: 'Média',
      labels: ['F045', 'F067', 'F091', 'F112', 'F138', 'F160', 'F181', 'F209'],
      values: [4.12, 4.34, 4.51, 3.78, 4.20, 4.44, 4.26, 4.39],
    },
  ], {
    x: cx + 0.3, y: cy + 0.55, w: cw - 0.6, h: ch - 0.7,
    barDir: 'col', barGapWidthPct: 50,
    chartColors: [NAVY],
    showLegend: false, showValue: true,
    dataLabelFormatCode: '0.00',
    catAxisLabelFontSize: 10, valAxisLabelFontSize: 9,
    catAxisLabelColor: SLATE, valAxisLabelColor: SLATE,
    valAxisMinVal: 0, valAxisMaxVal: 5,
  });

  footer(s, 17, 22);
}

// =============================================================
// SLIDE 18 — ADMIN
// =============================================================
{
  const s = pres.addSlide();
  bgWhite(s);
  pageHeader(s, 'CAPÍTULO 13', 'Área administrativa');

  s.addText('Apenas usuários com perfil ADMIN veem essa área — concentra configurações do sistema e visão consolidada de todas as filiais.',
    { x: 0.5, y: 1.55, w: 12, h: 0.6, fontFace: FONT_B, fontSize: 13, color: SLATE });

  const adminCards = [
    { t: 'Dashboard', d: 'Totais de todas as filiais, métricas gerais e alertas.', icon: '📊' },
    { t: 'Busca global', d: 'Buscar candidato por CPF ou nome em qualquer filial.', icon: '🔎' },
    { t: 'Relatórios', d: 'Consolidado e exportação de entrevistas.', icon: '📈' },
    { t: 'Configuração', d: 'Filiais, cargos, roteiros, critérios, opções, pessoas, competências.', icon: '⚙' },
    { t: 'Segurança', d: 'Sessões ativas, reset de senhas, logs de acesso.', icon: '🛡' },
    { t: 'Avaliação · admin', d: 'Pessoas avaliáveis e cadastro de competências/fatores.', icon: '🎯' },
  ];
  adminCards.forEach((c, i) => {
    const col = i % 3;
    const row = Math.floor(i / 3);
    const x = 0.5 + col * 4.2;
    const y = 2.4 + row * 2.0;
    accentTopCard(s, x, y, 4.0, 1.8, NAVY);
    s.addShape('ellipse', { x: x + 0.3, y: y + 0.3, w: 0.65, h: 0.65, fill: { color: NAVY }, line: { color: NAVY } });
    s.addText(c.icon, { x: x + 0.3, y: y + 0.3, w: 0.65, h: 0.65, align: 'center', valign: 'middle', fontSize: 20, color: WHITE });
    s.addText(c.t, { x: x + 1.1, y: y + 0.35, w: 2.7, h: 0.45, fontFace: FONT_H, fontSize: 16, color: NAVY, bold: true });
    s.addText(c.d, { x: x + 0.3, y: y + 1.05, w: 3.5, h: 0.7, fontFace: FONT_B, fontSize: 11, color: TEXT });
  });

  s.addShape('roundRect', { x: 0.5, y: 6.6, w: W - 1, h: 0.6, fill: { color: 'FFF7ED' }, line: { color: 'FED7AA' }, rectRadius: 0.06 });
  s.addText('Atenção: mudanças em CARGOS, ROTEIRO ou CRITÉRIOS valem para as próximas entrevistas. As já salvas mantêm a versão original.',
    { x: 0.7, y: 6.6, w: W - 1.4, h: 0.6, valign: 'middle', fontFace: FONT_B, fontSize: 12, color: '7C2D12' });

  footer(s, 18, 22);
}

// =============================================================
// SLIDE 19 — BOAS PRÁTICAS
// =============================================================
{
  const s = pres.addSlide();
  bgWhite(s);
  pageHeader(s, 'CAPÍTULO 14', 'Boas práticas');

  const items = [
    { icon: '🔐', t: 'Senha segura', d: 'Não compartilhe. Troque a cada 90 dias. Marque “Lembrar senha” só em equipamentos confiáveis.' },
    { icon: '📝', t: 'LGPD sempre', d: 'Marque o consentimento na etapa 1 da entrevista — exigência legal.' },
    { icon: '👤', t: 'Gestor aprovador', d: 'Em Aprovado/Reprovado, registre o gestor responsável. Esse dado fica no histórico.' },
    { icon: '🗓', t: 'Use a agenda', d: 'Marque data de retorno na etapa 4 da entrevista. A agenda vai te lembrar.' },
    { icon: '⭐', t: 'Banco de talentos', d: 'Use quando o perfil é bom mas a vaga não existe agora. Vai reaparecer no banco.' },
    { icon: '📊', t: 'Avaliação consistente', d: 'Use a escala 1–5 de forma criteriosa. Evite só notas 4 e 5 — perde poder de comparação.' },
    { icon: '🔄', t: 'Comparação ano a ano', d: 'Refaça a avaliação no mesmo período do ano — o indicador de Evolução fica mais útil.' },
    { icon: '🖨', t: 'PDF dos laudos', d: 'Imprima → Salvar como PDF. Use para arquivar e enviar por e-mail.' },
  ];
  items.forEach((it, i) => {
    const col = i % 2;
    const row = Math.floor(i / 2);
    const x = 0.5 + col * 6.3;
    const y = 1.7 + row * 1.3;
    s.addShape('roundRect', { x, y, w: 6.0, h: 1.1, fill: { color: SOFT }, line: { color: BORDER }, rectRadius: 0.1 });
    s.addShape('ellipse', { x: x + 0.2, y: y + 0.25, w: 0.6, h: 0.6, fill: { color: ORANGE }, line: { color: ORANGE } });
    s.addText(it.icon, { x: x + 0.2, y: y + 0.25, w: 0.6, h: 0.6, align: 'center', valign: 'middle', fontSize: 18 });
    s.addText(it.t, { x: x + 0.95, y: y + 0.15, w: 4.95, h: 0.4, fontFace: FONT_B, fontSize: 13, color: NAVY, bold: true });
    s.addText(it.d, { x: x + 0.95, y: y + 0.5, w: 4.95, h: 0.55, fontFace: FONT_B, fontSize: 11, color: TEXT });
  });

  footer(s, 19, 22);
}

// =============================================================
// SLIDE 20 — GLOSSÁRIO
// =============================================================
{
  const s = pres.addSlide();
  bgWhite(s);
  pageHeader(s, 'CAPÍTULO 15', 'Glossário');

  const termos = [
    ['Filial', 'Unidade do Grupo Perlog. Tem código (F045) e login próprio.'],
    ['Candidato', 'Pessoa entrevistada.'],
    ['Avaliado', 'Colaborador que recebe a avaliação de desempenho.'],
    ['Gestor aprovador', 'Quem decidiu Aprovado/Reprovado — registrado com data.'],
    ['Roteiro', 'Perguntas configuradas pelo admin por cargo (etapa 3 da entrevista).'],
    ['Critério', 'Item de avaliação da etapa 4 da entrevista — nota numérica.'],
    ['Competência', 'Agrupamento de fatores na Avaliação. São 6.'],
    ['Fator', 'Item individual avaliado em nota 1–5. São 31 ao todo.'],
    ['Pontuação', 'Média dos 31 fatores — vai de 1,00 a 5,00.'],
    ['Classificação', 'Faixa: EXCELENTE / BOM / REGULAR / PRECISA MELHORAR.'],
    ['Evolução', 'Comparação com a avaliação anterior do mesmo colaborador.'],
    ['PDI', 'Plano de Desenvolvimento Individual. Definido após o feedback.'],
    ['Banco de talentos', 'Candidatos guardados para vagas futuras.'],
    ['LGPD', 'Consentimento do candidato para uso dos dados (etapa 1).'],
  ];
  const colW = 6.0;
  termos.forEach((p, i) => {
    const col = i % 2;
    const row = Math.floor(i / 2);
    const x = 0.5 + col * (colW + 0.3);
    const y = 1.65 + row * 0.7;
    s.addShape('rect', { x, y, w: 1.7, h: 0.55, fill: { color: NAVY }, line: { color: NAVY } });
    s.addText(p[0], { x: x + 0.1, y, w: 1.5, h: 0.55, valign: 'middle', fontFace: FONT_B, fontSize: 11, color: WHITE, bold: true });
    s.addShape('rect', { x: x + 1.7, y, w: colW - 1.7, h: 0.55, fill: { color: SOFT }, line: { color: BORDER } });
    s.addText(p[1], { x: x + 1.85, y, w: colW - 1.95, h: 0.55, valign: 'middle', fontFace: FONT_B, fontSize: 11, color: TEXT });
  });

  footer(s, 20, 22);
}

// =============================================================
// SLIDE 21 — SUPORTE
// =============================================================
{
  const s = pres.addSlide();
  bgWhite(s);
  pageHeader(s, 'CAPÍTULO 16', 'Suporte e canais de ajuda');

  const blocks = [
    { t: 'Antes de pedir suporte', items: [
      'Atualize a página com Ctrl + F5.',
      'Tente em janela anônima do Chrome.',
      'Verifique a internet local.',
      'Anote a hora aproximada do erro.',
    ] },
    { t: 'Ao relatar um problema', items: [
      'Capture a tela completa (Print).',
      'Informe seu código de filial.',
      'Descreva o que estava fazendo.',
      'Envie ao administrador de TI ou RH.',
    ] },
    { t: 'Acesso e senhas', items: [
      'Esqueci a senha → pedir reset ao admin.',
      'Sair sempre ao terminar (botão Sair).',
      'Nunca compartilhe credenciais.',
      'Sessões antigas podem ser encerradas pelo admin.',
    ] },
    { t: 'Documentos gerados', items: [
      'Word de entrevista editável no Office.',
      'Laudo de avaliação otimizado para A4.',
      'Use “Salvar como PDF” na impressão.',
      'Exportação CSV/XLSX no histórico.',
    ] },
  ];
  blocks.forEach((b, i) => {
    const col = i % 2;
    const row = Math.floor(i / 2);
    const x = 0.5 + col * 6.3;
    const y = 1.7 + row * 2.5;
    accentTopCard(s, x, y, 6.0, 2.3, ORANGE);
    s.addText(b.t, { x: x + 0.3, y: y + 0.25, w: 5.5, h: 0.45, fontFace: FONT_H, fontSize: 16, color: NAVY, bold: true });
    s.addText(b.items.map((it) => ({ text: '• ' + it + '\n' })),
      { x: x + 0.3, y: y + 0.85, w: 5.5, h: 1.4, fontFace: FONT_B, fontSize: 12, color: TEXT, paraSpaceAfter: 4 });
  });

  footer(s, 21, 22);
}

// =============================================================
// SLIDE 22 — FECHAMENTO
// =============================================================
{
  const s = pres.addSlide();
  bgNavy(s);
  s.addShape('ellipse', {
    x: -3, y: -2, w: 8, h: 8,
    fill: { color: ORANGE, transparency: 85 }, line: { color: NAVY, transparency: 100 },
  });
  s.addShape('ellipse', {
    x: W - 3, y: H - 4, w: 7, h: 7,
    fill: { color: ORANGE, transparency: 90 }, line: { color: NAVY, transparency: 100 },
  });
  s.addText('Tudo certo!', { x: 0.7, y: 1.8, w: W - 1.4, h: 1.2, fontFace: FONT_H, fontSize: 56, color: WHITE, bold: true });
  s.addText('Você agora conhece as duas trilhas do sistema. Em caso de dúvida, volte a este manual ou procure o administrador da sua filial.',
    { x: 0.7, y: 3.1, w: W - 1.4, h: 1.0, fontFace: FONT_B, fontSize: 18, color: 'CBD5E1' });

  // 3 lembretes
  const lembrar = [
    { t: '4 etapas', d: 'Wizard das entrevistas' },
    { t: '3 etapas', d: 'Wizard das avaliações' },
    { t: '5 status', d: 'Da entrevista' },
  ];
  lembrar.forEach((l, i) => {
    const x = 0.7 + i * 4.2;
    const y = 4.8;
    s.addShape('roundRect', { x, y, w: 3.9, h: 1.3, fill: { color: 'FFFFFF', transparency: 88 }, line: { color: ORANGE, width: 1.5 }, rectRadius: 0.12 });
    s.addText(l.t, { x: x + 0.3, y: y + 0.2, w: 3.5, h: 0.55, fontFace: FONT_H, fontSize: 26, color: ORANGE, bold: true });
    s.addText(l.d, { x: x + 0.3, y: y + 0.8, w: 3.5, h: 0.4, fontFace: FONT_B, fontSize: 14, color: 'CBD5E1' });
  });

  s.addShape('rect', { x: 0, y: H - 0.5, w: W, h: 0.04, fill: { color: ORANGE }, line: { color: ORANGE } });
  s.addText('rh-gng.vercel.app  ·  © Grupo Perlog · Gente & Gestão', {
    x: 0.7, y: H - 0.45, w: W - 1.4, h: 0.35, fontFace: FONT_B, fontSize: 12, color: 'CBD5E1',
  });
}

// ---------- SAVE ----------
const outPath = path.resolve(__dirname, '..', 'docs', 'manual-usuario.pptx');
pres.writeFile({ fileName: outPath }).then((f) => {
  console.log('OK:', f);
}).catch((e) => {
  console.error('FAIL:', e);
  process.exit(1);
});
