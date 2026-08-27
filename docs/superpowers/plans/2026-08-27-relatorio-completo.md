# Relatório Consolidado de Indicadores — Implementation Plan (revisão)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Transformar o módulo `/relatorio-completo` de "1 PowerPoint por filial" para **1 PowerPoint consolidado comparando todos os CDs**, com ranking por indicador (Banco de Horas, Inconsistências, Cursos Obrigatórios, Feriados Pendentes, Vagas em Aberto).

**Architecture:** `POST /api/relatorio-completo` (runtime Node) → `coletarContexto` (busca todas as filiais do escopo, JÁ EXISTE) → `coletarConsolidado` (ranqueia os CDs por indicador) → `gerarDeckConsolidado` (`pptxgenjs`, 9 slides) → devolve **um** `.pptx`.

**Tech Stack:** Next.js 15, Drizzle, `pptxgenjs@^4` (já instalado), Vitest.

**Spec:** `docs/superpowers/specs/2026-08-27-relatorio-completo-design.md`

**Contexto de estado atual:** a branch `feat/relatorio-completo` já tem uma implementação do modelo "por filial" (commits `2a3fd8d`..`4fbb169`). Esta revisão **reescreve** `tipos.ts`, `texto.ts`, `coletar.ts`, `pptx.ts`, `route.ts` e ajusta a UI. **NÃO mexer** em `ranking.ts` nem em `components/layout/nav-config.ts` (já corretos). Regra de ranking: **menor valor = melhor = posição 1**.

---

## File Structure

| Arquivo | Ação | Responsabilidade |
|---|---|---|
| `lib/relatorio-completo/ranking.ts` | manter | `posicaoNoRanking` — sem mudança |
| `lib/relatorio-completo/tipos.ts` | reescrever | `DadosConsolidado`, `RankingIndicador`, `CDIndicador` |
| `lib/relatorio-completo/texto.ts` | reescrever | `leituraRanking(chave, cds)` |
| `lib/relatorio-completo/coletar.ts` | reescrever parcialmente | manter `coletarContexto`; trocar `coletarFilial`/`montarResumoExecutivo` por `coletarConsolidado`/`montarRankingIndicador` |
| `lib/relatorio-completo/pptx.ts` | reescrever | manter helpers; `gerarDeckFilial` → `gerarDeckConsolidado` + `tabelaHeatmap` + `podio` |
| `app/api/relatorio-completo/route.ts` | reescrever | 1 `.pptx`, sem zip |
| `components/relatorio-completo/RelatorioCompletoClient.tsx` | ajustar | copy + exige ≥2 CDs + remove aviso de falhas |
| `app/(app)/relatorio-completo/page.tsx` | manter | já OK |
| `lib/relatorio-completo/*.test.ts` | reescrever `texto`/`coletar`/`pptx`; manter `ranking` | — |

**Ambiente:** path com `&` — usar Bash tool. vitest: `node "node_modules/vitest/vitest.mjs" run <path>`. typecheck: `node "node_modules/typescript/bin/tsc" --noEmit`. Está na branch `feat/relatorio-completo`.

---

## Task 1: `tipos.ts` — modelo consolidado

**Files:** Modify (overwrite): `lib/relatorio-completo/tipos.ts`

- [ ] **Step 1: Substituir o conteúdo inteiro**

```ts
export type Tendencia = 'melhorou' | 'piorou' | 'neutro';

export type Variacao = { deltaPct: number | null; tendencia: Tendencia };

export type ChaveIndicador = 'bh' | 'inconsist' | 'cursos' | 'feriados' | 'vagas';

export type CDIndicador = {
  filialId: string;
  codigo: string;
  nome: string;
  valor: number;                 // valor atual do indicador (menor = melhor)
  valorFmt: string;
  variacao: Variacao | null;     // null quando o indicador não tem histórico
  posicao: number;               // 1 = melhor
};

export type RankingIndicador = {
  chave: ChaveIndicador;
  titulo: string;
  temHistorico: boolean;
  semDados: boolean;             // nenhum CD tem dado deste indicador
  cds: CDIndicador[];            // ordenado por posicao asc
  leitura: string;
};

export type DadosConsolidado = {
  geradoEm: string;             // ISO
  totalCDs: number;
  rankings: RankingIndicador[]; // ordem: bh, inconsist, cursos, feriados, vagas
};
```

- [ ] **Step 2: Typecheck** — `node "node_modules/typescript/bin/tsc" --noEmit`. Vai QUEBRAR em `texto.ts`, `coletar.ts`, `pptx.ts` (ainda no modelo antigo). Isso é esperado — as próximas tasks corrigem. Confirmar que o único arquivo novo (`tipos.ts`) não tem erro próprio de sintaxe.

- [ ] **Step 3: Commit**

```
git add lib/relatorio-completo/tipos.ts
git commit -m "refactor(relatorio-completo): tipos do modelo consolidado"
```

---

## Task 2: `texto.ts` — frases de ranking

**Files:**
- Modify (overwrite): `lib/relatorio-completo/texto.ts`
- Modify (overwrite): `lib/relatorio-completo/texto.test.ts`

- [ ] **Step 1: Reescrever o teste**

```ts
import { describe, it, expect } from 'vitest';
import { leituraRanking } from './texto';
import type { CDIndicador } from './tipos';

const cd = (over: Partial<CDIndicador>): CDIndicador => ({
  filialId: 'x', codigo: '001', nome: 'CD X', valor: 0, valorFmt: '0',
  variacao: null, posicao: 1, ...over,
});

describe('leituraRanking', () => {
  it('cita líder, lanterna e amplitude', () => {
    const cds = [
      cd({ nome: 'JOINVILLE', valor: 100, valorFmt: '100 h', posicao: 1 }),
      cd({ nome: 'CURITIBA', valor: 400, valorFmt: '400 h', posicao: 2 }),
    ];
    const t = leituraRanking('bh', cds);
    expect(t).toContain('JOINVILLE');
    expect(t).toContain('CURITIBA');
    expect(t).toMatch(/4[.,]0×/);
  });

  it('para indicador com histórico cita maior evolução e maior piora', () => {
    const cds = [
      cd({ nome: 'A', valor: 10, valorFmt: '10', posicao: 1, variacao: { deltaPct: -30, tendencia: 'melhorou' } }),
      cd({ nome: 'B', valor: 50, valorFmt: '50', posicao: 2, variacao: { deltaPct: 25, tendencia: 'piorou' } }),
    ];
    const t = leituraRanking('cursos', cds);
    expect(t).toMatch(/A.*30%/);
    expect(t).toMatch(/B.*25%/);
  });

  it('um único CD não quebra', () => {
    expect(() => leituraRanking('vagas', [cd({ nome: 'SÓ EU', valor: 3, valorFmt: '3', posicao: 1 })])).not.toThrow();
  });

  it('líder zerado usa frase alternativa de amplitude', () => {
    const cds = [
      cd({ nome: 'A', valor: 0, valorFmt: '0', posicao: 1 }),
      cd({ nome: 'B', valor: 5, valorFmt: '5', posicao: 2 }),
    ];
    expect(leituraRanking('feriados', cds)).toMatch(/zerou/i);
  });

  it('lista vazia retorna frase neutra', () => {
    expect(leituraRanking('bh', [])).toMatch(/sem cds/i);
  });
});
```

- [ ] **Step 2: Rodar → FAIL**

`node "node_modules/vitest/vitest.mjs" run lib/relatorio-completo/texto.test.ts`

- [ ] **Step 3: Reescrever a implementação**

```ts
import type { CDIndicador, ChaveIndicador } from './tipos';

const nf = (n: number) => n.toLocaleString('pt-BR', { maximumFractionDigits: 1 });
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
    if (lider.valor > 0) amplitude = ` Amplitude de ${nf(lanterna.valor / lider.valor)}× entre o melhor e o pior.`;
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
```

- [ ] **Step 4: Rodar → PASS** (`node "node_modules/vitest/vitest.mjs" run lib/relatorio-completo/texto.test.ts`). Typecheck ainda quebra em `coletar.ts`/`pptx.ts` — ok.

- [ ] **Step 5: Commit**

```
git add lib/relatorio-completo/texto.ts lib/relatorio-completo/texto.test.ts
git commit -m "refactor(relatorio-completo): frases de leitura de ranking"
```

---

## Task 3: `coletar.ts` — `coletarConsolidado`

**Files:**
- Modify: `lib/relatorio-completo/coletar.ts` (manter `coletarContexto` + imports; trocar o resto)
- Modify (overwrite): `lib/relatorio-completo/coletar.test.ts`

### Fatos verificados (confie)

- `coletarContexto(escopo)` retorna `{ bhAtual, bhAnterior, inconsist, cursosAtual, cursosAnterior, feriados, vagas, meta:{bh,inconsist,cursos,feriados} }`. Rows de bh têm `filialId: string|null` e `horasDecimal: number`. Rows de inconsist/cursos/feriados têm `filialId: string|null`. `vagas` = `{ filialId, statusId, statusNome, statusSistema, secao }[]`. `meta.*` = string ISO ou null.
- `agregarResumo(rows).totalHoras` (bh-queries) — soma de horas arredondada.
- `posicaoNoRanking(filialId, totais: {filialId,valor}[]) → { posicao: number|null; total: number }` (menor valor = posição 1; <2 itens → null).

- [ ] **Step 1: Reescrever o teste (parte pura)**

```ts
import { describe, it, expect } from 'vitest';
import { montarRankingIndicador } from './coletar';

describe('montarRankingIndicador', () => {
  const cds = [
    { filialId: 'a', codigo: '001', nome: 'A' },
    { filialId: 'b', codigo: '002', nome: 'B' },
    { filialId: 'c', codigo: '003', nome: 'C' },
  ];

  it('ordena por valor asc e atribui posições', () => {
    const r = montarRankingIndicador({
      chave: 'inconsist', titulo: 'Inconsistências', temHistorico: false,
      metaNula: false, cds,
      valorAtual: new Map([['a', 30], ['b', 10], ['c', 20]]),
      valorAnterior: new Map(),
      fmt: (n) => String(n),
    });
    expect(r.cds.map((c) => c.nome)).toEqual(['B', 'C', 'A']);
    expect(r.cds.map((c) => c.posicao)).toEqual([1, 2, 3]);
    expect(r.cds[0]!.variacao).toBeNull();
    expect(r.semDados).toBe(false);
  });

  it('com histórico calcula deltaPct e tendência', () => {
    const r = montarRankingIndicador({
      chave: 'bh', titulo: 'Banco de Horas', temHistorico: true,
      metaNula: false, cds,
      valorAtual: new Map([['a', 120], ['b', 100], ['c', 90]]),
      valorAnterior: new Map([['a', 100], ['b', 100], ['c', 120]]),
      fmt: (n) => `${n} h`,
    });
    const a = r.cds.find((c) => c.nome === 'A')!;
    expect(a.variacao).toEqual({ deltaPct: 20, tendencia: 'piorou' });
    const c = r.cds.find((c) => c.nome === 'C')!;
    expect(c.variacao!.tendencia).toBe('melhorou');
  });

  it('todos zerados + meta nula ⇒ semDados', () => {
    const r = montarRankingIndicador({
      chave: 'feriados', titulo: 'Feriados', temHistorico: false,
      metaNula: true, cds,
      valorAtual: new Map(), valorAnterior: new Map(),
      fmt: (n) => String(n),
    });
    expect(r.semDados).toBe(true);
    expect(r.cds.every((c) => c.valor === 0)).toBe(true);
  });
});
```

- [ ] **Step 2: Rodar → FAIL**

- [ ] **Step 3: Reescrever `coletar.ts`**

Manter as linhas 1-98 (imports + `coletarContexto` inteiro) **exatamente como estão**. Substituir tudo a partir de `// ---------- por filial ----------` (linha 100) para baixo por:

```ts
// ---------- ranking por indicador (parte pura, testada) ----------

import { calcVariacao } from '@/app/(app)/indicadores/bh/variacao';
import type {
  CDIndicador, ChaveIndicador, DadosConsolidado, RankingIndicador,
} from './tipos';
import { posicaoNoRanking } from './ranking';

type CDBasico = { filialId: string; codigo: string; nome: string };

export type EntradaRanking = {
  chave: ChaveIndicador;
  titulo: string;
  temHistorico: boolean;
  metaNula: boolean;
  cds: CDBasico[];
  valorAtual: Map<string, number>;
  valorAnterior: Map<string, number>;
  fmt: (n: number) => string;
};

export function montarRankingIndicador(e: EntradaRanking): RankingIndicador {
  const totais = e.cds.map((c) => ({ filialId: c.filialId, valor: e.valorAtual.get(c.filialId) ?? 0 }));

  const cds: CDIndicador[] = e.cds
    .map((c): CDIndicador => {
      const valor = e.valorAtual.get(c.filialId) ?? 0;
      const { posicao } = posicaoNoRanking(c.filialId, totais);
      let variacao = null as CDIndicador['variacao'];
      if (e.temHistorico) {
        const v = calcVariacao(valor, e.valorAnterior.get(c.filialId) ?? 0);
        variacao = { deltaPct: v.deltaPct, tendencia: v.tendencia };
      }
      return {
        filialId: c.filialId, codigo: c.codigo, nome: c.nome,
        valor, valorFmt: e.fmt(valor),
        variacao,
        posicao: posicao ?? 1,
      };
    })
    .sort((a, b) => a.valor - b.valor || a.nome.localeCompare(b.nome));

  const semDados = e.metaNula && cds.every((c) => c.valor === 0);

  return {
    chave: e.chave,
    titulo: e.titulo,
    temHistorico: e.temHistorico,
    semDados,
    cds,
    leitura: leituraRanking(e.chave, cds),
  };
}

// ---------- consolidado (orquestra fetch + ranking) ----------

const fmtHoras = (n: number) => `${n.toLocaleString('pt-BR', { maximumFractionDigits: 0 })} h`;
const fmtInt = (n: number) => n.toLocaleString('pt-BR');

const contarPorFilial = (rows: { filialId: string | null }[], pred: (r: any) => boolean = () => true) => {
  const m = new Map<string, number>();
  for (const r of rows) if (r.filialId && pred(r)) m.set(r.filialId, (m.get(r.filialId) ?? 0) + 1);
  return m;
};
const somarHorasPorFilial = (rows: { filialId: string | null; horasDecimal: number }[]) => {
  const m = new Map<string, number>();
  for (const r of rows) if (r.filialId) m.set(r.filialId, Math.round((m.get(r.filialId) ?? 0) + r.horasDecimal));
  return m;
};

export function coletarConsolidado(ctx: Contexto, cds: CDBasico[]): DadosConsolidado {
  const rankings: RankingIndicador[] = [
    montarRankingIndicador({
      chave: 'bh', titulo: 'Banco de Horas', temHistorico: true, metaNula: ctx.meta.bh === null, cds,
      valorAtual: somarHorasPorFilial(ctx.bhAtual), valorAnterior: somarHorasPorFilial(ctx.bhAnterior),
      fmt: fmtHoras,
    }),
    montarRankingIndicador({
      chave: 'inconsist', titulo: 'Inconsistências', temHistorico: false, metaNula: ctx.meta.inconsist === null, cds,
      valorAtual: contarPorFilial(ctx.inconsist), valorAnterior: new Map(), fmt: fmtInt,
    }),
    montarRankingIndicador({
      chave: 'cursos', titulo: 'Cursos Obrigatórios', temHistorico: true, metaNula: ctx.meta.cursos === null, cds,
      valorAtual: contarPorFilial(ctx.cursosAtual), valorAnterior: contarPorFilial(ctx.cursosAnterior), fmt: fmtInt,
    }),
    montarRankingIndicador({
      chave: 'feriados', titulo: 'Feriados Pendentes', temHistorico: false, metaNula: ctx.meta.feriados === null, cds,
      valorAtual: contarPorFilial(ctx.feriados), valorAnterior: new Map(), fmt: fmtInt,
    }),
    montarRankingIndicador({
      chave: 'vagas', titulo: 'Vagas em Aberto', temHistorico: false, metaNula: false, cds,
      valorAtual: contarPorFilial(ctx.vagas, (r) => r.statusSistema === true), valorAnterior: new Map(), fmt: fmtInt,
    }),
  ];

  return { geradoEm: new Date().toISOString(), totalCDs: cds.length, rankings };
}
```

E adicionar, logo abaixo dos imports do topo do arquivo (perto da linha 13), o import de `leituraRanking`:
```ts
import { leituraRanking } from './texto';
```
(Se o `import` de `calcVariacao` / tipos / ranking / texto ficar melhor agrupado no topo com os outros imports, mover para lá — só não deixar `import` no meio do arquivo se o lint reclamar. `import/first` costuma exigir imports no topo.)

- [ ] **Step 4: Rodar teste + typecheck**

`node "node_modules/vitest/vitest.mjs" run lib/relatorio-completo/coletar.test.ts` → PASS (3 testes).
`node "node_modules/typescript/bin/tsc" --noEmit` → ainda quebra em `pptx.ts` (próxima task). Confirmar que `coletar.ts` e `texto.ts` não têm erro.

Se `calcVariacao` não existir em `@/app/(app)/indicadores/bh/variacao`, procurar o caminho certo (`grep -rn "export function calcVariacao" lib app`). Retorna `{ delta, deltaPct: number|null, tendencia: 'melhorou'|'piorou'|'neutro' }`.

- [ ] **Step 5: Commit**

```
git add lib/relatorio-completo/coletar.ts lib/relatorio-completo/coletar.test.ts
git commit -m "refactor(relatorio-completo): coletarConsolidado (ranking dos CDs)"
```

---

## Task 4: `pptx.ts` — `gerarDeckConsolidado`

**Files:**
- Modify (overwrite): `lib/relatorio-completo/pptx.ts`
- Modify (overwrite): `lib/relatorio-completo/pptx.test.ts`

### Fatos verificados (pptxgenjs 4.0.1)

- `import PptxGenJS from 'pptxgenjs'`; `await pres.write({ outputType: 'nodebuffer' })` → `Buffer`.
- `slide.addChart('bar', [{name,labels,values}], { barDir: 'bar', ... })` — string OK.
- `slide.addTable(rows, { x,y,w, colW, fontSize, border, fontFace })` onde cada célula é `{ text: string, options?: { fill?: { color }, color?, bold?, align? } }`.
- `slide.addShape('roundRect'|'rect'|'line', {...})` — string OK.
- `PptxGenJS.Slide` para anotar params.

- [ ] **Step 1: Reescrever o smoke test**

```ts
import { describe, it, expect } from 'vitest';
import JSZip from 'jszip';
import { gerarDeckConsolidado } from './pptx';
import type { DadosConsolidado, RankingIndicador } from './tipos';

const rk = (over: Partial<RankingIndicador>): RankingIndicador => ({
  chave: 'inconsist', titulo: 'Inconsistências', temHistorico: false, semDados: false,
  leitura: 'CD A lidera.',
  cds: [
    { filialId: 'a', codigo: '001', nome: 'A', valor: 10, valorFmt: '10', variacao: null, posicao: 1 },
    { filialId: 'b', codigo: '002', nome: 'B', valor: 30, valorFmt: '30', variacao: null, posicao: 2 },
  ],
  ...over,
});

const base: DadosConsolidado = {
  geradoEm: new Date('2026-08-27').toISOString(),
  totalCDs: 2,
  rankings: [
    rk({ chave: 'bh', titulo: 'Banco de Horas', temHistorico: true, cds: [
      { filialId: 'a', codigo: '001', nome: 'A', valor: 100, valorFmt: '100 h', variacao: { deltaPct: -10, tendencia: 'melhorou' }, posicao: 1 },
      { filialId: 'b', codigo: '002', nome: 'B', valor: 400, valorFmt: '400 h', variacao: { deltaPct: 12, tendencia: 'piorou' }, posicao: 2 },
    ] }),
    rk({ chave: 'inconsist', titulo: 'Inconsistências' }),
    rk({ chave: 'cursos', titulo: 'Cursos Obrigatórios', temHistorico: true }),
    rk({ chave: 'feriados', titulo: 'Feriados Pendentes' }),
    rk({ chave: 'vagas', titulo: 'Vagas em Aberto' }),
  ],
};

describe('gerarDeckConsolidado', () => {
  it('produz um pptx de 9 slides', async () => {
    const bytes = await gerarDeckConsolidado(base);
    expect(bytes).toBeInstanceOf(Uint8Array);
    const zip = await JSZip.loadAsync(bytes);
    const slides = Object.keys(zip.files).filter((f) => /ppt\/slides\/slide\d+\.xml$/.test(f));
    expect(slides.length).toBe(9);
  });

  it('não quebra com indicador semDados nem com 1 CD', async () => {
    const d: DadosConsolidado = {
      ...base,
      rankings: base.rankings.map((r, i) =>
        i === 1 ? { ...r, semDados: true, cds: [] } : { ...r, cds: [r.cds[0]!] },
      ),
    };
    const bytes = await gerarDeckConsolidado(d);
    expect(bytes.byteLength).toBeGreaterThan(2000);
  });
});
```

- [ ] **Step 2: Rodar → FAIL**

- [ ] **Step 3: Escrever a implementação**

```ts
import PptxGenJS from 'pptxgenjs';
import type { DadosConsolidado, RankingIndicador, CDIndicador } from './tipos';

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

// heatmap: menor posição = melhor = verde
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
    head.map((t, i) => ({ text: t, options: { bold: true, color: WHITE, fill: { color: NAVY }, align: i === 0 ? 'left' : 'center', fontSize: 8, valign: 'middle' } })),
  ];

  for (const f of ordenadas) {
    const cells: PptxGenJS.TableCell[] = [{ text: `${f.codigo} ${f.nome}`, options: { bold: true, color: NAVY, fontSize: 9 } }];
    for (const r of d.rankings) {
      const cd = r.cds.find((c) => c.filialId === f.filialId);
      cells.push({
        text: cd ? cd.valorFmt : '—',
        options: { align: 'center', bold: true, color: NAVY, fontSize: 9, fill: { color: cd ? heat(cd.posicao, total) : WHITE } },
      });
    }
    cells.push({ text: posMedia(d, f.filialId).toFixed(1), options: { align: 'center', bold: true, color: SLATE, fontSize: 9 } });
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

  // gráfico de barras — todos os CDs, melhor no topo
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

  // 1 — Capa
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

  // 2 — Visão geral comparativa
  {
    const s = pres.addSlide();
    header(s, 'VISÃO GERAL', 'Comparativo dos CDs');
    tabelaHeatmap(s, d);
    footer(s, 2, TOTAL);
  }

  // 3..7 — Ranking por indicador
  d.rankings.forEach((r, i) => slideRanking(pres, r, 3 + i, TOTAL));

  // 8 — Pódio
  slidePodio(pres, d, 8, TOTAL);

  // 9 — Encerramento
  {
    const s = pres.addSlide();
    s.background = { color: NAVY };
    s.addText('Gente & Gestão · Perlog', { x: 0.5, y: 2.6, w: W - 1, h: 1, align: 'center', fontFace: FONT, fontSize: 34, color: ORANGE, bold: true });
    s.addText('Fim do relatório consolidado', { x: 0.5, y: 3.8, w: W - 1, h: 0.5, align: 'center', fontFace: FONT, fontSize: 14, color: 'CBD5E1', charSpacing: 3 });
  }

  const buf = (await pres.write({ outputType: 'nodebuffer' })) as Buffer;
  return new Uint8Array(buf);
}
```

Se `PptxGenJS.TableRow` / `PptxGenJS.TableCell` não forem os nomes exatos dos tipos, checar `node_modules/pptxgenjs/types/index.d.ts` (podem ser `TableRow` = `TableCell[]`) e ajustar; em último caso tipar as `rows` como `any[][]`. Anotar no relatório.

- [ ] **Step 4: Rodar smoke + suíte + typecheck**

`node "node_modules/vitest/vitest.mjs" run lib/relatorio-completo/` → todos passam.
`node "node_modules/typescript/bin/tsc" --noEmit` → **agora** deve estar limpo (todos os arquivos migrados). Se ainda quebrar em `route.ts`, é a próxima task.

- [ ] **Step 5: Commit**

```
git add lib/relatorio-completo/pptx.ts lib/relatorio-completo/pptx.test.ts
git commit -m "refactor(relatorio-completo): gerarDeckConsolidado (9 slides, heatmap + pódio)"
```

---

## Task 5: `route.ts` — deck único

**Files:** Modify (overwrite): `app/api/relatorio-completo/route.ts`

- [ ] **Step 1: Substituir o conteúdo inteiro**

```ts
import { NextRequest, NextResponse } from 'next/server';
import { and, asc, eq, inArray } from 'drizzle-orm';
import { requireSession, getFiliaisVisiveis } from '@/lib/auth/session';
import { db, schema } from '@/db/client';
import { coletarContexto, coletarConsolidado } from '@/lib/relatorio-completo/coletar';
import { gerarDeckConsolidado } from '@/lib/relatorio-completo/pptx';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const PPTX_MIME = 'application/vnd.openxmlformats-officedocument.presentationml.presentation';

export async function POST(req: NextRequest) {
  const s = await requireSession();
  if (s.perfil !== 'admin') return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 });

  let body: { filialIds?: unknown } = {};
  try { body = await req.json(); } catch { /* body vazio ⇒ todos */ }
  const pedidos = Array.isArray(body.filialIds)
    ? body.filialIds.filter((x): x is string => typeof x === 'string')
    : [];

  const escopo = getFiliaisVisiveis(s); // admin → null (todas)
  const cond = [eq(schema.filiais.ativa, true)];
  if (escopo) cond.push(inArray(schema.filiais.id, escopo));
  if (pedidos.length > 0) cond.push(inArray(schema.filiais.id, pedidos));

  const filiais = await db
    .select({ id: schema.filiais.id, codigo: schema.filiais.codigo, nome: schema.filiais.nome })
    .from(schema.filiais)
    .where(and(...cond))
    .orderBy(asc(schema.filiais.codigo));

  if (filiais.length < 2) {
    return NextResponse.json({ error: 'Selecione ao menos 2 CDs para comparar' }, { status: 400 });
  }

  const ctx = await coletarContexto(escopo);
  const dados = coletarConsolidado(ctx, filiais);
  const bytes = await gerarDeckConsolidado(dados);

  const stamp = new Date().toISOString().slice(0, 10);
  return new NextResponse(new Uint8Array(bytes), {
    status: 200,
    headers: {
      'Content-Type': PPTX_MIME,
      'Content-Disposition': `attachment; filename="Relatorio_Consolidado_Indicadores_${stamp}.pptx"`,
      'Cache-Control': 'no-store',
    },
  });
}
```

- [ ] **Step 2: Typecheck** — `node "node_modules/typescript/bin/tsc" --noEmit` → limpo.

- [ ] **Step 3: Commit**

```
git add app/api/relatorio-completo/route.ts
git commit -m "refactor(relatorio-completo): rota devolve um pptx consolidado (sem zip)"
```

---

## Task 6: UI — copy e regra de ≥2 CDs

**Files:** Modify: `components/relatorio-completo/RelatorioCompletoClient.tsx`

- [ ] **Step 1: Ajustes pontuais**

No arquivo atual:

1. Trocar o parágrafo descritivo por:
   ```tsx
   <p className="text-[13px] text-conecta-muted mt-1">
     Um PowerPoint consolidado comparando os CDs selecionados, com tabela geral
     e um ranking por indicador (Banco de Horas, Inconsistências, Cursos,
     Feriados, Vagas). Selecione ao menos 2 CDs.
   </p>
   ```

2. Na função `gerar`, trocar a checagem inicial:
   ```tsx
   if (sel.size < 2) {
     toast.error('Selecione ao menos 2 CDs para comparar');
     return;
   }
   ```

3. Remover o bloco do header de falhas (não existe mais):
   ```tsx
   // REMOVER estas linhas:
   if (res.headers.get('X-Relatorio-Falhas')) toast.warning('Algumas filiais falharam — ver arquivo _falhas.txt no .zip');
   else toast.success('Relatório gerado');
   // SUBSTITUIR por:
   toast.success('Relatório consolidado gerado');
   ```

4. Fallback do nome do arquivo:
   ```tsx
   const nome = /filename="([^"]+)"/.exec(cd)?.[1] ?? 'Relatorio_Consolidado_Indicadores.pptx';
   ```

5. Texto do botão:
   ```tsx
   {gerando ? 'Gerando relatório…' : 'Gerar relatório consolidado'}
   ```

6. Heading do card: trocar `Gerar relatório de indicadores` por `Relatório consolidado de indicadores`.

- [ ] **Step 2: Typecheck** — limpo.

- [ ] **Step 3: Commit**

```
git add components/relatorio-completo/RelatorioCompletoClient.tsx
git commit -m "refactor(relatorio-completo): UI do deck consolidado"
```

---

## Task 7: Verificação end-to-end

- [ ] **Step 1: Suíte + typecheck**

`node "node_modules/vitest/vitest.mjs" run` → tudo passa (inclui `ranking`, `texto`, `coletar`, `pptx` novos).
`node "node_modules/typescript/bin/tsc" --noEmit` → limpo.

- [ ] **Step 2: Build**

Dev server NÃO pode estar rodando. `node "node_modules/next/dist/bin/next" build` → conclui; `/relatorio-completo` e `/api/relatorio-completo` no output.

- [ ] **Step 3: Preview manual**

1. `preview_start` (`rh-gng-dev`), logar como admin.
2. Abrir `/relatorio-completo` — card "Relatório consolidado de indicadores", lista de CDs, todos marcados.
3. Selecionar só 1 CD → botão gera → toast de erro "ao menos 2 CDs".
4. Selecionar todos → **Gerar relatório consolidado** → baixa **um** `.pptx`.
5. Abrir no PowerPoint: 9 slides — capa, tabela heatmap com todos os CDs coloridos, 5 slides de ranking (barras + pills + leitura; BH e Cursos com a linha de evolução/piora), pódio com 5 🏆, encerramento.
6. `read_network_requests`: `POST /api/relatorio-completo` → 200, `Content-Type` pptx.

- [ ] **Step 4: Commit final se houver ajuste**

```
git add -A && git commit -m "test(relatorio-completo): ajustes pos-verificacao"
```

---

## Self-Review

**Cobertura da spec:**
- Deck único consolidado, sem zip → Task 4 + 5 ✓
- 9 slides: capa / tabela heatmap / 5 ranking / pódio / encerramento → Task 4 ✓
- Ranking menor = melhor → `montarRankingIndicador` usa `posicaoNoRanking` (que já ordena asc) + `.sort((a,b)=>a.valor-b.valor)` ✓
- Valor atual + variação (só BH e Cursos) → `temHistorico` true só p/ bh/cursos; `calcVariacao` ✓
- Heatmap verde=melhor → `heat(posicao,total)` com verde no p baixo ✓
- Pódio 🏆 nº1 por indicador → `slidePodio` ✓
- semDados → slide com aviso; pódio mostra "—" → Task 4 ✓
- Rota sem jszip / X-Relatorio-Falhas → Task 5 remove ✓
- UI exige ≥2 CDs → Task 6 ✓
- `ranking.ts` e `nav-config.ts` intactos → nenhuma task mexe ✓
- Testes reescritos p/ `texto`/`coletar`/`pptx`; `ranking.test.ts` mantido → Tasks 2-4 ✓

**Placeholders:** nenhum. Pontos "conferir" apontam arquivo exato + o que checar (nomes de tipo do pptxgenjs, caminho de `calcVariacao`).

**Consistência de tipos:** `DadosConsolidado`/`RankingIndicador`/`CDIndicador` definidos na Task 1, usados igual em 3/4/5. `montarRankingIndicador` recebe `EntradaRanking` (Task 3) e devolve `RankingIndicador`. `gerarDeckConsolidado(d: DadosConsolidado): Promise<Uint8Array>` — consumido assim na Task 5. `coletarContexto` (inalterado) → `Contexto` → `coletarConsolidado(ctx, filiais)`.

**Riscos:** legibilidade da tabela/gráfico com ~15 CDs (validar Task 7 Step 3); nomes de tipo `TableRow`/`TableCell` do pptxgenjs (fallback `any[][]`).
