# Relatório Completo de Indicadores — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Novo módulo admin `/relatorio-completo` que gera um PowerPoint por filial resumindo os 5 indicadores de Gente & Gestão (Banco de Horas, Inconsistências, Cursos Obrigatórios, Feriados Pendentes, Quadro de Vagas), várias filiais empacotadas num `.zip`.

**Architecture:** Route handler `POST /api/relatorio-completo` (runtime Node) coleta dados reusando `lib/indicadores/*-db` + `*-queries` escopados por filial, monta cada deck com `pptxgenjs` e devolve `.pptx` (1 filial) ou `.zip` via `jszip` (2+). UI é um client component com multi-seleção de filiais que faz `fetch` e dispara o download do blob.

**Tech Stack:** Next.js 15 (App Router, route handlers), TypeScript, Drizzle ORM, `pptxgenjs@^4`, `jszip`, Vitest.

**Spec:** `docs/superpowers/specs/2026-08-27-relatorio-completo-design.md`

---

## File Structure

| Arquivo | Responsabilidade |
|---|---|
| `lib/relatorio-completo/tipos.ts` | Tipos compartilhados (`DadosFilialRelatorio`, sub-tipos por slide, `IndicadorResumo`) |
| `lib/relatorio-completo/ranking.ts` | `posicaoNoRanking()` — puro, testável |
| `lib/relatorio-completo/texto.ts` | Frases de leitura por regras sobre números — puro, testável |
| `lib/relatorio-completo/coletar.ts` | (server) `coletarContexto()` + `coletarFilial()` — fetch + agregação |
| `lib/relatorio-completo/pptx.ts` | Motor de slides: helpers + `gerarDeckFilial()` → `Uint8Array` |
| `app/api/relatorio-completo/route.ts` | `POST` handler: guard admin, loop, zip, resposta |
| `app/(app)/relatorio-completo/page.tsx` | Server component: guard admin, lista filiais visíveis |
| `components/relatorio-completo/RelatorioCompletoClient.tsx` | Client: seleção de filiais, botão gerar, download |
| `components/layout/nav-config.ts` | Item novo em `ADMIN_NAV` |
| `lib/relatorio-completo/*.test.ts` | Testes unitários (`texto`, `ranking`, smoke de `pptx`) |

---

## Task 1: Dependências e tipos

**Files:**
- Modify: `package.json`
- Create: `lib/relatorio-completo/tipos.ts`

- [ ] **Step 1: Instalar pptxgenjs e promover jszip**

Run (PowerShell — o `&` no path quebra shims via cmd, mas `npm install` costuma funcionar; se falhar, rodar `node node_modules/npm/bin/npm-cli.js install ...`):

```bash
npm install pptxgenjs@^4.0.1 jszip@^3.10.1
```

Expected: `package.json` passa a listar `pptxgenjs` e `jszip` em `dependencies`; `node_modules/pptxgenjs` existe.

- [ ] **Step 2: Verificar instalação**

Run: `node -e "require('pptxgenjs'); require('jszip'); console.log('ok')"`
Expected: imprime `ok`

- [ ] **Step 3: Criar os tipos compartilhados**

Create `lib/relatorio-completo/tipos.ts`:

```ts
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
```

- [ ] **Step 4: Typecheck**

Run: `node "node_modules/typescript/bin/tsc" --noEmit`
Expected: sem erros novos referentes a `lib/relatorio-completo/tipos.ts`

- [ ] **Step 5: Commit**

```bash
git add package.json package-lock.json lib/relatorio-completo/tipos.ts
git commit -m "feat(relatorio-completo): dependencias (pptxgenjs, jszip) e tipos"
```

---

## Task 2: `ranking.ts` — posição no ranking

**Files:**
- Create: `lib/relatorio-completo/ranking.ts`
- Test: `lib/relatorio-completo/ranking.test.ts`

Regra: menor valor = melhor = posição 1. Empates recebem a mesma posição (dense rank). Se só há uma filial no conjunto, retorna `null`.

- [ ] **Step 1: Write the failing test**

Create `lib/relatorio-completo/ranking.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { posicaoNoRanking } from './ranking';

describe('posicaoNoRanking', () => {
  const totais = [
    { filialId: 'a', valor: 30 },
    { filialId: 'b', valor: 10 },
    { filialId: 'c', valor: 20 },
  ];

  it('menor valor = posicao 1', () => {
    expect(posicaoNoRanking('b', totais)).toEqual({ posicao: 1, total: 3 });
  });

  it('maior valor = ultima posicao', () => {
    expect(posicaoNoRanking('a', totais)).toEqual({ posicao: 3, total: 3 });
  });

  it('empate recebe mesma posicao (dense rank)', () => {
    const t = [
      { filialId: 'a', valor: 10 },
      { filialId: 'b', valor: 10 },
      { filialId: 'c', valor: 40 },
    ];
    expect(posicaoNoRanking('b', t)).toEqual({ posicao: 1, total: 3 });
    expect(posicaoNoRanking('c', t)).toEqual({ posicao: 2, total: 3 });
  });

  it('conjunto com uma filial retorna posicao null', () => {
    expect(posicaoNoRanking('a', [{ filialId: 'a', valor: 5 }])).toEqual({ posicao: null, total: 1 });
  });

  it('filial ausente do conjunto retorna posicao null', () => {
    expect(posicaoNoRanking('z', totais)).toEqual({ posicao: null, total: 3 });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node "node_modules/vitest/vitest.mjs" run lib/relatorio-completo/ranking.test.ts`
Expected: FAIL — `Cannot find module './ranking'`

- [ ] **Step 3: Write minimal implementation**

Create `lib/relatorio-completo/ranking.ts`:

```ts
export type TotalFilial = { filialId: string; valor: number };

/**
 * Posição da filial no ranking — menor valor é melhor (posição 1).
 * Dense rank: empates compartilham a posição. `posicao` é null quando o
 * conjunto tem menos de 2 filiais ou a filial não está nele.
 */
export function posicaoNoRanking(
  filialId: string,
  totais: TotalFilial[],
): { posicao: number | null; total: number } {
  const total = totais.length;
  const alvo = totais.find((t) => t.filialId === filialId);
  if (total < 2 || !alvo) return { posicao: null, total };

  const valoresUnicos = [...new Set(totais.map((t) => t.valor))].sort((a, b) => a - b);
  const posicao = valoresUnicos.indexOf(alvo.valor) + 1;
  return { posicao, total };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node "node_modules/vitest/vitest.mjs" run lib/relatorio-completo/ranking.test.ts`
Expected: PASS (5 tests)

- [ ] **Step 5: Commit**

```bash
git add lib/relatorio-completo/ranking.ts lib/relatorio-completo/ranking.test.ts
git commit -m "feat(relatorio-completo): helper de posicao no ranking"
```

---

## Task 3: `texto.ts` — frases de leitura

**Files:**
- Create: `lib/relatorio-completo/texto.ts`
- Test: `lib/relatorio-completo/texto.test.ts`

Uma função por indicador. Todas recebem os mesmos objetos de resumo já usados pelo `coletar` e retornam uma string curta (1–2 frases). Limiar de variação: `|deltaPct| < 1` → "estável".

- [ ] **Step 1: Write the failing test**

Create `lib/relatorio-completo/texto.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { textoBH, textoInconsist, textoCursos, textoFeriados, textoVagas } from './texto';

describe('textoBH', () => {
  it('descreve saldo, colaboradores e seção líder com variação de alta', () => {
    const t = textoBH(
      { colaboradores: 12, totalHoras: 340, valorTotal: 0, encargos: 0, valorComEncargos: 0, mediaHoras: 0 },
      { colaboradores: 10, totalHoras: 300, valorTotal: 0, encargos: 0, valorComEncargos: 0, mediaHoras: 0 },
      [{ label: 'LOGISTICA', valor: 200 }],
    );
    expect(t).toContain('340');
    expect(t).toContain('12 colaboradores');
    expect(t).toContain('LOGISTICA');
    expect(t).toMatch(/cresceu 13,3%/i);
  });

  it('variação < 1% vira "estável"', () => {
    const base = { colaboradores: 5, totalHoras: 100, valorTotal: 0, encargos: 0, valorComEncargos: 0, mediaHoras: 0 };
    expect(textoBH(base, base, [])).toMatch(/estável/i);
  });

  it('sem período anterior (zeros) não quebra', () => {
    const zero = { colaboradores: 0, totalHoras: 0, valorTotal: 0, encargos: 0, valorComEncargos: 0, mediaHoras: 0 };
    const atual = { colaboradores: 3, totalHoras: 50, valorTotal: 0, encargos: 0, valorComEncargos: 0, mediaHoras: 0 };
    expect(() => textoBH(atual, zero, [])).not.toThrow();
  });
});

describe('textoInconsist', () => {
  it('cita total, colaboradores e tipo predominante', () => {
    const t = textoInconsist(
      { colaboradores: 8, totalInconsist: 20, mediaPorPessoa: 2.5 },
      [{ label: 'FALTA DE MARCACAO', valor: 12, pct: 60 }],
    );
    expect(t).toContain('20');
    expect(t).toContain('8 colaboradores');
    expect(t).toMatch(/FALTA DE MARCACAO.*60%/);
  });

  it('sem tipos não quebra', () => {
    expect(() => textoInconsist({ colaboradores: 0, totalInconsist: 0, mediaPorPessoa: 0 }, [])).not.toThrow();
  });
});

describe('textoCursos', () => {
  it('cita pendências e variação vs anterior', () => {
    const t = textoCursos(
      { colaboradores: 10, totalPendencias: 15, mediaPorPessoa: 1.5 },
      { colaboradores: 10, totalPendencias: 30, mediaPorPessoa: 3 },
      [{ label: 'NR-11', valor: 8, pct: 53 }],
    );
    expect(t).toContain('15');
    expect(t).toMatch(/caiu 50%/i);
    expect(t).toContain('NR-11');
  });
});

describe('textoFeriados', () => {
  it('cita total e seção líder', () => {
    const t = textoFeriados(
      { colaboradores: 6, totalPendencias: 9, valorTotal: 1200, mediaPorPessoa: 1.5 },
      [{ label: 'EXPEDICAO', valor: 5, pct: 55 }],
    );
    expect(t).toContain('9');
    expect(t).toContain('EXPEDICAO');
  });
});

describe('textoVagas', () => {
  it('cita total de abertas e seção concentradora', () => {
    const t = textoVagas(7, [{ label: 'OPERACAO', valor: 4, pct: 57 }]);
    expect(t).toContain('7');
    expect(t).toContain('OPERACAO');
  });

  it('zero vagas retorna frase neutra', () => {
    expect(textoVagas(0, [])).toMatch(/nenhuma vaga em aberto/i);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node "node_modules/vitest/vitest.mjs" run lib/relatorio-completo/texto.test.ts`
Expected: FAIL — `Cannot find module './texto'`

- [ ] **Step 3: Write minimal implementation**

Create `lib/relatorio-completo/texto.ts`:

```ts
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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node "node_modules/vitest/vitest.mjs" run lib/relatorio-completo/texto.test.ts`
Expected: PASS. Se o teste `cresceu 13,3%` falhar por arredondamento, ajustar o `nf` (o valor esperado é `(340-300)/300*100 = 13.33…` → `13,3`).

- [ ] **Step 5: Commit**

```bash
git add lib/relatorio-completo/texto.ts lib/relatorio-completo/texto.test.ts
git commit -m "feat(relatorio-completo): frases de leitura por indicador"
```

---

## Task 4: `coletar.ts` — coleta e agregação por filial

**Files:**
- Create: `lib/relatorio-completo/coletar.ts`
- Test: `lib/relatorio-completo/coletar.test.ts`

Não hita o banco: `coletarContexto` faz os fetches uma vez (todas as filiais do escopo), `coletarFilial` filtra em memória e agrega. A parte testável é `montarResumoExecutivo` (pura).

Verificar antes de escrever:
- `fetchSnapshotRows(table, filialIds?)` — `lib/indicadores/bh-db.ts`
- `fetchInconsistRows(filialIds?)`, `fetchCursosRows(table, filialIds?)`, `fetchFeriadosRows(filialIds?)`
- `agregarResumo` / `top5Por` (bh), `agregarResumoInconsist` / `top5PorInconsist`, `agregarResumoCursos` / `top5PorCursos`, `agregarResumoFeriados` / `top5PorFeriados`
- metas: `schema.bhMeta`, `schema.inconsistMeta`, `schema.cursosMeta`, `schema.feriadosMeta` (campo `ultimaAtualizacao`, filtro `id = 'singleton'` no bh; conferir os demais em `actions/indicadores/*.ts`)
- vagas: replicar a query de `app/(app)/vagas/page.tsx` (join `vagas`→`filiais`→`vagasStatus`→`vagasQuadroLinhas`, `ativa = true`), status "aberta" = `vagasStatus.sistema === true`

- [ ] **Step 1: Write the failing test (parte pura)**

Create `lib/relatorio-completo/coletar.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { montarResumoExecutivo } from './coletar';

describe('montarResumoExecutivo', () => {
  const entrada = {
    filialId: 'f1',
    totaisPorIndicador: {
      bh:        [{ filialId: 'f1', valor: 100 }, { filialId: 'f2', valor: 50 }],
      inconsist: [{ filialId: 'f1', valor: 5 },   { filialId: 'f2', valor: 9 }],
      cursos:    [{ filialId: 'f1', valor: 8 },   { filialId: 'f2', valor: 8 }],
      feriados:  [{ filialId: 'f1', valor: 2 },   { filialId: 'f2', valor: 7 }],
      vagas:     [{ filialId: 'f1', valor: 3 },   { filialId: 'f2', valor: 1 }],
    },
    valores: { bh: 100, inconsist: 5, cursos: 8, feriados: 2, vagas: 3 },
    variacoes: {
      bh:     { deltaPct: 12.5, tendencia: 'piorou' as const },
      cursos: { deltaPct: -50, tendencia: 'melhorou' as const },
    },
  };

  it('gera 5 cards com posição e variação corretas', () => {
    const cards = montarResumoExecutivo(entrada);
    expect(cards.map((c) => c.chave)).toEqual(['bh', 'inconsist', 'cursos', 'feriados', 'vagas']);

    const bh = cards.find((c) => c.chave === 'bh')!;
    expect(bh.posicao).toBe(2);          // 100 > 50 → 2º de 2
    expect(bh.variacao).toEqual({ deltaPct: 12.5, tendencia: 'piorou' });

    const feriados = cards.find((c) => c.chave === 'feriados')!;
    expect(feriados.posicao).toBe(1);    // 2 < 7
    expect(feriados.variacao).toBeNull(); // sem histórico
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node "node_modules/vitest/vitest.mjs" run lib/relatorio-completo/coletar.test.ts`
Expected: FAIL — `Cannot find module './coletar'`

- [ ] **Step 3: Write implementation**

Create `lib/relatorio-completo/coletar.ts`:

```ts
import 'server-only';
import { and, eq, inArray } from 'drizzle-orm';
import { db, schema } from '@/db/client';
import { fetchSnapshotRows } from '@/lib/indicadores/bh-db';
import { fetchInconsistRows } from '@/lib/indicadores/inconsist-db';
import { fetchCursosRows } from '@/lib/indicadores/cursos-db';
import { fetchFeriadosRows } from '@/lib/indicadores/feriados-db';
import { agregarResumo, top5Por } from '@/lib/indicadores/bh-queries';
import { agregarResumoInconsist, top5PorInconsist } from '@/lib/indicadores/inconsist-queries';
import { agregarResumoCursos, top5PorCursos } from '@/lib/indicadores/cursos-queries';
import { agregarResumoFeriados, top5PorFeriados } from '@/lib/indicadores/feriados-queries';
import { posicaoNoRanking, type TotalFilial } from './ranking';
import type { DadosFilialRelatorio, IndicadorResumo } from './tipos';

type Chave = IndicadorResumo['chave'];

const TITULOS: Record<Chave, string> = {
  bh: 'Banco de Horas',
  inconsist: 'Inconsistências',
  cursos: 'Cursos Obrigatórios',
  feriados: 'Feriados Pendentes',
  vagas: 'Vagas em Aberto',
};

const fmtHoras = (h: number) => `${h.toLocaleString('pt-BR', { maximumFractionDigits: 0 })} h`;
const fmtInt = (n: number) => n.toLocaleString('pt-BR');

// ---------- parte pura (testada) ----------

export type EntradaResumoExecutivo = {
  filialId: string;
  totaisPorIndicador: Record<Chave, TotalFilial[]>;
  valores: Record<Chave, number>;
  variacoes: Partial<Record<Chave, { deltaPct: number | null; tendencia: 'melhorou' | 'piorou' | 'neutro' }>>;
};

export function montarResumoExecutivo(e: EntradaResumoExecutivo): IndicadorResumo[] {
  const ordem: Chave[] = ['bh', 'inconsist', 'cursos', 'feriados', 'vagas'];
  return ordem.map((chave) => {
    const { posicao, total } = posicaoNoRanking(e.filialId, e.totaisPorIndicador[chave]);
    const valor = e.valores[chave];
    const valorFmt = chave === 'bh' ? fmtHoras(valor) : fmtInt(valor);
    return {
      chave,
      titulo: TITULOS[chave],
      valorFmt,
      variacao: e.variacoes[chave] ?? null,
      posicao,
      totalFiliais: total,
    };
  });
}

// ---------- contexto (fetch único p/ todo o escopo) ----------

export type Contexto = Awaited<ReturnType<typeof coletarContexto>>;

export async function coletarContexto(escopo: string[] | null) {
  const [bhAtual, bhAnterior, inconsist, cursosAtual, cursosAnterior, feriados] = await Promise.all([
    fetchSnapshotRows(schema.bhSnapshotAtual, escopo),
    fetchSnapshotRows(schema.bhSnapshotAnterior, escopo),
    fetchInconsistRows(escopo),
    fetchCursosRows(schema.cursosSnapshotAtual, escopo),
    fetchCursosRows(schema.cursosSnapshotAnterior, escopo),
    fetchFeriadosRows(escopo),
  ]);

  const vagasCond = [eq(schema.vagas.ativa, true)];
  if (escopo) vagasCond.push(inArray(schema.vagas.filialId, escopo));
  const vagas = await db
    .select({
      filialId: schema.vagas.filialId,
      statusId: schema.vagas.statusId,
      statusNome: schema.vagasStatus.nome,
      statusSistema: schema.vagasStatus.sistema,
      secao: schema.vagas.secao,
    })
    .from(schema.vagas)
    .innerJoin(schema.vagasStatus, eq(schema.vagasStatus.id, schema.vagas.statusId))
    .where(and(...vagasCond));

  const metas = await Promise.all([
    db.select({ ts: schema.bhMeta.ultimaAtualizacao }).from(schema.bhMeta).limit(1),
    db.select({ ts: schema.inconsistMeta.ultimaAtualizacao }).from(schema.inconsistMeta).limit(1),
    db.select({ ts: schema.cursosMeta.ultimaAtualizacao }).from(schema.cursosMeta).limit(1),
    db.select({ ts: schema.feriadosMeta.ultimaAtualizacao }).from(schema.feriadosMeta).limit(1),
  ]);

  return {
    bhAtual, bhAnterior, inconsist, cursosAtual, cursosAnterior, feriados, vagas,
    meta: {
      bh: metas[0][0]?.ts?.toISOString() ?? null,
      inconsist: metas[1][0]?.ts?.toISOString() ?? null,
      cursos: metas[2][0]?.ts?.toISOString() ?? null,
      feriados: metas[3][0]?.ts?.toISOString() ?? null,
    },
  };
}

// ---------- por filial ----------

const somaHoras = (rows: { filialId: string | null; horasDecimal: number }[]) => {
  const m = new Map<string, number>();
  for (const r of rows) if (r.filialId) m.set(r.filialId, (m.get(r.filialId) ?? 0) + r.horasDecimal);
  return [...m.entries()].map(([filialId, valor]) => ({ filialId, valor }));
};
const contaPorFilial = (rows: { filialId: string | null }[]): TotalFilial[] => {
  const m = new Map<string, number>();
  for (const r of rows) if (r.filialId) m.set(r.filialId, (m.get(r.filialId) ?? 0) + 1);
  return [...m.entries()].map(([filialId, valor]) => ({ filialId, valor }));
};

export function coletarFilial(
  filial: { id: string; codigo: string; nome: string },
  ctx: Contexto,
): DadosFilialRelatorio {
  const id = filial.id;
  const only = <T extends { filialId: string | null }>(rows: T[]) => rows.filter((r) => r.filialId === id);

  const bhRows = only(ctx.bhAtual);
  const bhRowsAnt = only(ctx.bhAnterior);
  const incRows = only(ctx.inconsist);
  const cursosRows = only(ctx.cursosAtual);
  const cursosRowsAnt = only(ctx.cursosAnterior);
  const ferRows = only(ctx.feriados);
  const vagasRows = ctx.vagas.filter((v) => v.filialId === id);
  const vagasAbertas = vagasRows.filter((v) => v.statusSistema);

  const bhResumo = agregarResumo(bhRows);
  const bhResumoAnt = agregarResumo(bhRowsAnt);
  const cursosResumo = agregarResumoCursos(cursosRows);
  const cursosResumoAnt = agregarResumoCursos(cursosRowsAnt);
  const incResumo = agregarResumoInconsist(incRows);
  const ferResumo = agregarResumoFeriados(ferRows);

  const porSecaoMap = new Map<string, number>();
  for (const v of vagasAbertas) {
    const k = (v.secao ?? 'Sem seção').trim() || 'Sem seção';
    porSecaoMap.set(k, (porSecaoMap.get(k) ?? 0) + 1);
  }
  const totalVagas = vagasAbertas.length || 1;
  const porSecao = [...porSecaoMap.entries()]
    .map(([label, valor]) => ({ label, valor, pct: Math.round((valor / totalVagas) * 1000) / 10 }))
    .sort((a, b) => b.valor - a.valor)
    .slice(0, 5);
  const porStatusMap = new Map<string, number>();
  for (const v of vagasRows) porStatusMap.set(v.statusNome, (porStatusMap.get(v.statusNome) ?? 0) + 1);
  const porStatus = [...porStatusMap.entries()]
    .map(([label, valor]) => ({ label, valor }))
    .sort((a, b) => b.valor - a.valor);

  const pct = (a: number, b: number) => (b ? Math.round(((a - b) / b) * 1000) / 10 : null);
  const tend = (d: number | null): 'melhorou' | 'piorou' | 'neutro' =>
    d === null || Math.abs(d) < 1 ? 'neutro' : d > 0 ? 'piorou' : 'melhorou';
  const bhPct = pct(bhResumo.totalHoras, bhResumoAnt.totalHoras);
  const cursosPct = pct(cursosResumo.totalPendencias, cursosResumoAnt.totalPendencias);

  const resumoExecutivo = montarResumoExecutivo({
    filialId: id,
    totaisPorIndicador: {
      bh: somaHoras(ctx.bhAtual),
      inconsist: contaPorFilial(ctx.inconsist),
      cursos: contaPorFilial(ctx.cursosAtual),
      feriados: contaPorFilial(ctx.feriados),
      vagas: contaPorFilial(ctx.vagas.filter((v) => v.statusSistema)),
    },
    valores: {
      bh: bhResumo.totalHoras,
      inconsist: incResumo.totalInconsist,
      cursos: cursosResumo.totalPendencias,
      feriados: ferResumo.totalPendencias,
      vagas: vagasAbertas.length,
    },
    variacoes: {
      bh: { deltaPct: bhPct, tendencia: tend(bhPct) },
      cursos: { deltaPct: cursosPct, tendencia: tend(cursosPct) },
    },
  });

  return {
    filial,
    geradoEm: new Date().toISOString(),
    resumoExecutivo,
    bh: bhRows.length ? { resumo: bhResumo, resumoAnterior: bhResumoAnt, topSecoes: top5Por(bhRows, 'secao'), atualizadoEm: ctx.meta.bh } : null,
    inconsist: incRows.length ? { resumo: incResumo, topTipos: top5PorInconsist(incRows, 'tipo'), atualizadoEm: ctx.meta.inconsist } : null,
    cursos: cursosRows.length ? { resumo: cursosResumo, resumoAnterior: cursosResumoAnt, topTipos: top5PorCursos(cursosRows, 'tipo'), atualizadoEm: ctx.meta.cursos } : null,
    feriados: ferRows.length ? { resumo: ferResumo, topSecoes: top5PorFeriados(ferRows, 'secao'), atualizadoEm: ctx.meta.feriados } : null,
    vagas: vagasRows.length ? { totalAbertas: vagasAbertas.length, porStatus, porSecao } : null,
  };
}
```

- [ ] **Step 4: Run test + typecheck**

Run: `node "node_modules/vitest/vitest.mjs" run lib/relatorio-completo/coletar.test.ts`
Expected: PASS (1 test).

Run: `node "node_modules/typescript/bin/tsc" --noEmit`
Expected: sem erros. Corrigir nomes de schema/meta divergentes conferindo `actions/indicadores/*.ts` e `db/schema.ts` (ex.: se `cursosSnapshotAnterior`/`feriadosMeta` tiverem outro nome, ajustar os imports).

- [ ] **Step 5: Commit**

```bash
git add lib/relatorio-completo/coletar.ts lib/relatorio-completo/coletar.test.ts
git commit -m "feat(relatorio-completo): coleta e agregacao por filial"
```

---

## Task 5: `pptx.ts` — motor de slides

**Files:**
- Create: `lib/relatorio-completo/pptx.ts`
- Test: `lib/relatorio-completo/pptx.test.ts`

Estilo portado de `Desktop/JP/Produtividade-Perlog-main/.../utils/pptxExportCompleto.ts`. Paleta da marca G&G (de `scripts/build-manual-pptx.js`): navy `0B2447`, orange `F37021`.

Deck: capa → resumo executivo → BH → Inconsistências → Cursos → Feriados → Vagas → encerramento (8 slides).

- [ ] **Step 1: Write the smoke test**

Create `lib/relatorio-completo/pptx.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { gerarDeckFilial } from './pptx';
import type { DadosFilialRelatorio } from './tipos';

const base: DadosFilialRelatorio = {
  filial: { id: 'f1', codigo: '001', nome: 'Joinville' },
  geradoEm: new Date('2026-08-27').toISOString(),
  resumoExecutivo: [
    { chave: 'bh', titulo: 'Banco de Horas', valorFmt: '340 h', variacao: { deltaPct: 13.3, tendencia: 'piorou' }, posicao: 2, totalFiliais: 9 },
    { chave: 'inconsist', titulo: 'Inconsistências', valorFmt: '20', variacao: null, posicao: 3, totalFiliais: 9 },
    { chave: 'cursos', titulo: 'Cursos Obrigatórios', valorFmt: '15', variacao: { deltaPct: -50, tendencia: 'melhorou' }, posicao: 1, totalFiliais: 9 },
    { chave: 'feriados', titulo: 'Feriados Pendentes', valorFmt: '9', variacao: null, posicao: 4, totalFiliais: 9 },
    { chave: 'vagas', titulo: 'Vagas em Aberto', valorFmt: '7', variacao: null, posicao: 5, totalFiliais: 9 },
  ],
  bh: { resumo: { colaboradores: 12, totalHoras: 340, valorTotal: 0, encargos: 0, valorComEncargos: 0, mediaHoras: 0 }, resumoAnterior: { colaboradores: 10, totalHoras: 300, valorTotal: 0, encargos: 0, valorComEncargos: 0, mediaHoras: 0 }, topSecoes: [{ label: 'LOGISTICA', valor: 200, valorPgto: 0 }], atualizadoEm: '2026-08-25T12:00:00.000Z' },
  inconsist: { resumo: { colaboradores: 8, totalInconsist: 20, mediaPorPessoa: 2.5 }, topTipos: [{ label: 'FALTA MARCACAO', valor: 12, pct: 60 }], atualizadoEm: null },
  cursos: { resumo: { colaboradores: 10, totalPendencias: 15, mediaPorPessoa: 1.5 }, resumoAnterior: { colaboradores: 10, totalPendencias: 30, mediaPorPessoa: 3 }, topTipos: [{ label: 'NR-11', valor: 8, pct: 53 }], atualizadoEm: null },
  feriados: { resumo: { colaboradores: 6, totalPendencias: 9, valorTotal: 1200, mediaPorPessoa: 1.5 }, topSecoes: [{ label: 'EXPEDICAO', valor: 5, pct: 55 }], atualizadoEm: null },
  vagas: { totalAbertas: 7, porStatus: [{ label: 'Em aberto', valor: 7 }], porSecao: [{ label: 'OPERACAO', valor: 4, pct: 57 }] },
};

describe('gerarDeckFilial', () => {
  it('retorna um Uint8Array não-vazio', async () => {
    const out = await gerarDeckFilial(base);
    expect(out).toBeInstanceOf(Uint8Array);
    expect(out.byteLength).toBeGreaterThan(2000);
  });

  it('não quebra quando um indicador está sem dados', async () => {
    const semDados: DadosFilialRelatorio = { ...base, bh: null, vagas: null };
    const out = await gerarDeckFilial(semDados);
    expect(out.byteLength).toBeGreaterThan(2000);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node "node_modules/vitest/vitest.mjs" run lib/relatorio-completo/pptx.test.ts`
Expected: FAIL — `Cannot find module './pptx'`

- [ ] **Step 3: Write implementation**

Create `lib/relatorio-completo/pptx.ts`:

```ts
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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node "node_modules/vitest/vitest.mjs" run lib/relatorio-completo/pptx.test.ts`
Expected: PASS (2 tests).

Se `pres.write({ outputType: 'nodebuffer' })` não existir na versão instalada do pptxgenjs, trocar por `pres.stream()` (retorna `Promise<Blob | Buffer>`) — checar a assinatura em `node_modules/pptxgenjs/types/index.d.ts` e ajustar. Se `addChart('bar', ...)` reclamar de tipo, usar `pres.ChartType.bar`.

- [ ] **Step 5: Commit**

```bash
git add lib/relatorio-completo/pptx.ts lib/relatorio-completo/pptx.test.ts
git commit -m "feat(relatorio-completo): motor de slides pptxgenjs"
```

---

## Task 6: Route handler `POST /api/relatorio-completo`

**Files:**
- Create: `app/api/relatorio-completo/route.ts`

- [ ] **Step 1: Escrever o handler**

Create `app/api/relatorio-completo/route.ts`:

```ts
import { NextRequest, NextResponse } from 'next/server';
import JSZip from 'jszip';
import { and, asc, eq, inArray } from 'drizzle-orm';
import { requireSession, getFiliaisVisiveis } from '@/lib/auth/session';
import { db, schema } from '@/db/client';
import { coletarContexto, coletarFilial } from '@/lib/relatorio-completo/coletar';
import { gerarDeckFilial } from '@/lib/relatorio-completo/pptx';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const PPTX_MIME = 'application/vnd.openxmlformats-officedocument.presentationml.presentation';

export async function POST(req: NextRequest) {
  const s = await requireSession(); // não passa 'admin' p/ evitar redirect de visualizador
  if (s.perfil !== 'admin') {
    return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 });
  }

  let body: { filialIds?: unknown };
  try { body = await req.json(); } catch { return NextResponse.json({ error: 'JSON inválido' }, { status: 400 }); }
  const pedidos = Array.isArray(body.filialIds) ? body.filialIds.filter((x): x is string => typeof x === 'string') : [];
  if (pedidos.length === 0) return NextResponse.json({ error: 'Selecione ao menos uma filial' }, { status: 400 });

  const escopo = getFiliaisVisiveis(s); // admin → null (todas)
  const cond = [eq(schema.filiais.ativa, true), inArray(schema.filiais.id, pedidos)];
  if (escopo) cond.push(inArray(schema.filiais.id, escopo));
  const filiais = await db
    .select({ id: schema.filiais.id, codigo: schema.filiais.codigo, nome: schema.filiais.nome })
    .from(schema.filiais)
    .where(and(...cond))
    .orderBy(asc(schema.filiais.codigo));

  if (filiais.length === 0) return NextResponse.json({ error: 'Nenhuma filial válida no seu escopo' }, { status: 400 });

  const ctx = await coletarContexto(escopo);
  const stamp = new Date().toISOString().slice(0, 10);
  const slug = (str: string) => str.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-zA-Z0-9]+/g, '_');

  const decks: { nome: string; bytes: Uint8Array }[] = [];
  const falhas: string[] = [];
  for (const f of filiais) {
    try {
      const dados = coletarFilial(f, ctx);
      decks.push({ nome: `Relatorio_Completo_${f.codigo}_${slug(f.nome)}.pptx`, bytes: await gerarDeckFilial(dados) });
    } catch (e) {
      falhas.push(`${f.codigo} ${f.nome}: ${e instanceof Error ? e.message : 'erro'}`);
    }
  }

  if (decks.length === 0) {
    return NextResponse.json({ error: 'Falha ao gerar todos os decks', detalhes: falhas }, { status: 500 });
  }

  if (decks.length === 1) {
    return new NextResponse(decks[0].bytes, {
      status: 200,
      headers: {
        'Content-Type': PPTX_MIME,
        'Content-Disposition': `attachment; filename="${decks[0].nome}"`,
        'Cache-Control': 'no-store',
        ...(falhas.length ? { 'X-Relatorio-Falhas': String(falhas.length) } : {}),
      },
    });
  }

  const zip = new JSZip();
  for (const d of decks) zip.file(d.nome, d.bytes);
  if (falhas.length) zip.file('_falhas.txt', falhas.join('\n'));
  const zipBytes = await zip.generateAsync({ type: 'nodebuffer' });

  return new NextResponse(new Uint8Array(zipBytes), {
    status: 200,
    headers: {
      'Content-Type': 'application/zip',
      'Content-Disposition': `attachment; filename="Relatorio_Completo_Indicadores_${stamp}.zip"`,
      'Cache-Control': 'no-store',
    },
  });
}
```

- [ ] **Step 2: Typecheck**

Run: `node "node_modules/typescript/bin/tsc" --noEmit`
Expected: sem erros. Ajustar import de `JSZip` se o typecheck reclamar (`import JSZip = require('jszip')` ou `import * as JSZip`).

- [ ] **Step 3: Commit**

```bash
git add app/api/relatorio-completo/route.ts
git commit -m "feat(relatorio-completo): route handler POST (pptx + zip)"
```

---

## Task 7: UI — página e client component

**Files:**
- Create: `app/(app)/relatorio-completo/page.tsx`
- Create: `components/relatorio-completo/RelatorioCompletoClient.tsx`

- [ ] **Step 1: Página server component**

Create `app/(app)/relatorio-completo/page.tsx`:

```tsx
import { asc } from 'drizzle-orm';
import { requireSession, getFiliaisVisiveis } from '@/lib/auth/session';
import { db, schema } from '@/db/client';
import { eq, inArray, and } from 'drizzle-orm';
import { TopBar } from '@/components/layout/TopBar';
import { RelatorioCompletoClient } from '@/components/relatorio-completo/RelatorioCompletoClient';

export const dynamic = 'force-dynamic';

export default async function RelatorioCompletoPage() {
  const s = await requireSession('admin');
  const escopo = getFiliaisVisiveis(s);

  const cond = [eq(schema.filiais.ativa, true)];
  if (escopo) cond.push(inArray(schema.filiais.id, escopo));
  const filiais = await db
    .select({ id: schema.filiais.id, codigo: schema.filiais.codigo, nome: schema.filiais.nome })
    .from(schema.filiais)
    .where(and(...cond))
    .orderBy(asc(schema.filiais.codigo));

  return (
    <>
      <TopBar titulo="Relatório Completo" subtitulo="Gente & Gestão · Perlog" badge="ADMIN" />
      <div className="p-4 lg:p-6">
        <RelatorioCompletoClient filiais={filiais} />
      </div>
    </>
  );
}
```

- [ ] **Step 2: Client component**

Create `components/relatorio-completo/RelatorioCompletoClient.tsx`:

```tsx
'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { FileBarChart, Loader2 } from 'lucide-react';
import { ConectaCard, SectionHeader } from '@/components/ui/conecta-card';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/cn';

type Filial = { id: string; codigo: string; nome: string };

export function RelatorioCompletoClient({ filiais }: { filiais: Filial[] }) {
  const [sel, setSel] = useState<Set<string>>(() => new Set(filiais.map((f) => f.id)));
  const [gerando, setGerando] = useState(false);

  const toggle = (id: string) =>
    setSel((prev) => {
      const n = new Set(prev);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  const todas = sel.size === filiais.length;
  const toggleTodas = () => setSel(todas ? new Set() : new Set(filiais.map((f) => f.id)));

  const gerar = async () => {
    if (sel.size === 0) { toast.error('Selecione ao menos uma filial'); return; }
    setGerando(true);
    try {
      const res = await fetch('/api/relatorio-completo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filialIds: [...sel] }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error ?? `Falha (${res.status})`);
      }
      const blob = await res.blob();
      const cd = res.headers.get('Content-Disposition') ?? '';
      const nome = /filename="([^"]+)"/.exec(cd)?.[1] ?? 'Relatorio_Completo.pptx';
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = nome; a.click();
      URL.revokeObjectURL(url);
      if (res.headers.get('X-Relatorio-Falhas')) toast.warning('Algumas filiais falharam — ver arquivo _falhas.txt');
      else toast.success('Relatório gerado');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erro ao gerar');
    } finally {
      setGerando(false);
    }
  };

  return (
    <ConectaCard>
      <SectionHeader eyebrow="Apresentação" titulo="Gerar relatório de indicadores" />
      <p className="text-[13px] text-conecta-muted mt-1">
        Um PowerPoint por filial com resumo executivo e um slide por indicador
        (Banco de Horas, Inconsistências, Cursos, Feriados, Vagas). Mais de uma filial
        é entregue num arquivo <code>.zip</code>.
      </p>

      <div className="mt-4 flex items-center justify-between">
        <button type="button" onClick={toggleTodas} className="text-[13px] font-medium text-conecta-accent">
          {todas ? 'Limpar seleção' : 'Selecionar todas'}
        </button>
        <span className="text-[12px] text-conecta-muted">{sel.size} de {filiais.length}</span>
      </div>

      <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
        {filiais.map((f) => {
          const on = sel.has(f.id);
          return (
            <label
              key={f.id}
              className={cn(
                'flex items-center gap-2 rounded-lg border px-3 py-2 text-[13px] cursor-pointer transition-colors',
                on ? 'border-conecta-accent bg-conecta-accent/5' : 'border-conecta-border',
              )}
            >
              <input type="checkbox" checked={on} onChange={() => toggle(f.id)} className="accent-conecta-accent" />
              <span className="font-medium text-conecta-primary">{f.codigo}</span>
              <span className="text-conecta-muted truncate">{f.nome}</span>
            </label>
          );
        })}
      </div>

      <Button onClick={gerar} disabled={gerando} className="mt-5">
        {gerando ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileBarChart className="h-4 w-4" />}
        {gerando ? `Gerando ${sel.size} deck(s)…` : 'Gerar relatório'}
      </Button>
    </ConectaCard>
  );
}
```

- [ ] **Step 3: Typecheck**

Run: `node "node_modules/typescript/bin/tsc" --noEmit`
Expected: sem erros. Conferir as props reais de `ConectaCard`/`SectionHeader` em `components/ui/conecta-card.tsx` e ajustar (`eyebrow`/`titulo` podem ter outro nome); conferir se `Button` aceita `children` com ícone + texto como nos outros módulos.

- [ ] **Step 4: Commit**

```bash
git add "app/(app)/relatorio-completo/page.tsx" components/relatorio-completo/RelatorioCompletoClient.tsx
git commit -m "feat(relatorio-completo): pagina e client de geracao"
```

---

## Task 8: Navegação

**Files:**
- Modify: `components/layout/nav-config.ts:24-30`

- [ ] **Step 1: Adicionar item ao ADMIN_NAV**

Em `components/layout/nav-config.ts`, adicionar `FileBarChart` ao import de `lucide-react` (linha ~1-8) e o item ao array `ADMIN_NAV`:

```ts
export const ADMIN_NAV: NavItem[] = [
  { href: '/admin',              label: 'Dashboard',          icon: LayoutDashboard },
  { href: '/admin/busca',        label: 'Busca global',       icon: Users },
  { href: '/admin/relatorios',   label: 'Relatórios',         icon: FileText },
  { href: '/relatorio-completo', label: 'Relatório Completo',  icon: FileBarChart },
  { href: '/admin/config',       label: 'Configuração',       icon: Settings },
  { href: '/admin/seguranca',    label: 'Segurança',          icon: ShieldCheck },
];
```

- [ ] **Step 2: Verificar o active-state no Sidebar**

Ler `components/layout/Sidebar.tsx:204-226`. O item `/relatorio-completo` não é `isRoot`, não tem query → cai no ramo `active = pathname === hrefPath || pathname.startsWith(hrefPath + '/')`. Nenhuma mudança necessária. Confirmar visualmente no Step 3 da Task 9.

- [ ] **Step 3: Typecheck + commit**

Run: `node "node_modules/typescript/bin/tsc" --noEmit`
Expected: sem erros.

```bash
git add components/layout/nav-config.ts
git commit -m "feat(relatorio-completo): item no menu admin"
```

---

## Task 9: Verificação end-to-end

**Files:** nenhum (verificação)

- [ ] **Step 1: Suíte de testes completa**

Run: `node "node_modules/vitest/vitest.mjs" run`
Expected: todos os testes passam, incluindo os 4 novos arquivos em `lib/relatorio-completo/`.

- [ ] **Step 2: Typecheck + build**

Garantir que o dev server NÃO está rodando (ver `memory/build-gotchas.md`).

Run: `node "node_modules/typescript/bin/tsc" --noEmit`
Run: `node "node_modules/next/dist/bin/next" build`
Expected: build conclui sem erro; a rota `/api/relatorio-completo` e a página `/relatorio-completo` aparecem no output.

- [ ] **Step 3: Teste manual no preview**

1. `preview_start` com o dev server (`rh-gng-dev` / porta 4000).
2. Logar como admin. Confirmar o item **Relatório Completo** no menu lateral e o estado ativo ao abri-lo.
3. Selecionar 1 filial → **Gerar relatório** → baixa um `.pptx`. Abrir num PowerPoint/Google Slides: 8 slides, gráficos renderizam, textos de leitura coerentes.
4. Selecionar 3 filiais → baixa um `.zip` com 3 `.pptx`.
5. Selecionar uma filial sem dados importados → deck gera com os avisos "Sem dados importados".
6. `read_network_requests` para conferir status 200 e `Content-Type` corretos.

- [ ] **Step 4: Commit final (se houve ajustes)**

```bash
git add -A
git commit -m "test(relatorio-completo): ajustes pos-verificacao e2e"
```

---

## Self-Review

**Cobertura da spec:**
- Motor pptxgenjs no servidor → Task 5 + 6 ✓
- Deck: capa + resumo executivo + 5 indicadores + encerramento → Task 5 (`gerarDeckFilial`) ✓
- Coleta reusando `lib/indicadores/*` escopado por filial → Task 4 ✓
- Variação vs. anterior só p/ BH e Cursos → Task 4 (`variacoes` só popula `bh`/`cursos`); demais cards `variacao: null` ✓
- Posição no ranking (menor = melhor) → Task 2 ✓
- Textos por regras, sem IA → Task 3 ✓
- 1 filial = `.pptx`, 2+ = `.zip` → Task 6 ✓
- Rota `/relatorio-completo`, admin-only → Task 6 (403) + Task 7 (`requireSession('admin')`) ✓
- Item no menu → Task 8 ✓
- Slide sem dados → Task 5 (ramos `else`) + Task 9 Step 3 item 5 ✓
- Dependência pptxgenjs + caveat `&` no path → Task 1 ✓
- Testes (`texto`, `coletar`, smoke `pptx`) → Tasks 3, 4, 5 ✓

**Placeholders:** nenhum "TBD"/"TODO"; todos os passos de código têm código completo. Pontos com "conferir/ajustar" trazem o arquivo exato e o que checar (nomes de schema que só existem no banco real).

**Consistência de tipos:** `DadosFilialRelatorio` e sub-tipos definidos na Task 1 e usados igual nas Tasks 4/5. `posicaoNoRanking` retorna `{ posicao, total }` — consumido assim na Task 4. `gerarDeckFilial` retorna `Uint8Array` — usado assim nas Tasks 5/6. `Top5` tem `pct?`/`valorPgto?` opcionais, compatível com o retorno de `top5Por*` (bh usa `valorPgto`, os demais usam `pct`).

**Riscos conhecidos (repassados da spec):** formato dos gráficos PPTX gerados no servidor (validar no Step 3 da Task 9); `maxDuration` da Vercel se o lote for grande; nomes exatos de `schema.*Meta` / `*SnapshotAnterior` (conferir na Task 4 Step 4).
