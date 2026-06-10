# Indicadores — Banco de Horas Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Entregar o módulo `Indicadores` com a aba **Banco de Horas** funcional: import de planilha Excel (admin), comparativo entre o snapshot atual e o anterior, visualizações de resumo e detalhado com filtros, respeitando permissões admin × filial.

**Architecture:** Next.js 15 App Router + Server Actions. Duas tabelas snapshot (`bh_snapshot_atual`, `bh_snapshot_anterior`) + meta singleton (`bh_meta`). Import via `xlsx` em transação Drizzle. Página `/indicadores` com componente de abas (Radix Tabs, padrão já usado em `/escuta`). Gráficos com `recharts` (já em deps). Tabelas com `@tanstack/react-table` (já em deps).

**Tech Stack:** Next.js 15, React 19, Drizzle ORM 0.39, postgres-js, Tailwind, Radix UI, recharts, @tanstack/react-table, xlsx, zod, sonner (toasts).

**Branch:** `v5` (já criada).

**Spec base:** [docs/superpowers/specs/2026-06-10-indicadores-banco-horas-design.md](../specs/2026-06-10-indicadores-banco-horas-design.md)

---

## File Structure

**Backend / dados**
- Create `db/schema.ts` — *adicionar* tabelas `bhSnapshotAtual`, `bhSnapshotAnterior`, `bhMeta` (não criar arquivo novo).
- Create `db/migrations/0003_indicadores_bh.sql` — gerado por `drizzle-kit generate`.
- Create `lib/indicadores/bh-parser.ts` — parsing do Excel (header + linhas), conversão `HH:MM`→decimal, normalização de CODFILIAL.
- Create `lib/indicadores/bh-validators.ts` — schemas zod para o resultado do parser.
- Create `lib/indicadores/bh-queries.ts` — queries puras (sem `'use server'`) que montam resumo, top5, resumo por filial, detalhado.
- Create `actions/indicadores/bh.ts` — server actions: `importarBH`, `getResumoBH`, `getResumoPorFilial`, `getDetalhado`.

**Frontend**
- Create `app/(app)/indicadores/page.tsx` — server component, monta abas e injeta dados iniciais.
- Create `app/(app)/indicadores/IndicadoresTabs.tsx` — client component com Radix Tabs.
- Create `app/(app)/indicadores/bh/BancoHorasView.tsx` — client component da aba BH (orquestra subseções).
- Create `app/(app)/indicadores/bh/ImportarBHDialog.tsx` — dialog client para upload (admin).
- Create `app/(app)/indicadores/bh/CardsResumo.tsx` — os 4 cards de resumo.
- Create `app/(app)/indicadores/bh/RoscaTop5.tsx` — gráfico rosca reutilizável (recharts).
- Create `app/(app)/indicadores/bh/TabelaResumoFilial.tsx` — tabela resumo por filial.
- Create `app/(app)/indicadores/bh/TabelaDetalhado.tsx` — tabela detalhado com filtros + busca.
- Create `app/(app)/indicadores/bh/variacao.ts` — helpers puros de cálculo/formatação de variação.

**Navegação**
- Modify `components/layout/nav-config.ts` — adicionar item `Indicadores` em `FILIAL_NAV` e `ADMIN_NAV`.

**Testes**
- Create `lib/indicadores/__tests__/bh-parser.test.ts`
- Create `lib/indicadores/__tests__/bh-queries.test.ts`
- Create `app/(app)/indicadores/bh/__tests__/variacao.test.ts`

---

## Task 1: Schema das tabelas BH

**Files:**
- Modify: `db/schema.ts` (adicionar ao final)
- Create: `db/migrations/0003_indicadores_bh.sql`

- [ ] **Step 1: Adicionar tabelas em `db/schema.ts`**

No final do arquivo `db/schema.ts`, acrescentar:

```ts
// =====================================================
// Indicadores — Banco de Horas
// =====================================================

const bhSnapshotColumns = {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  filialId: uuid('filial_id').references(() => filiais.id, { onDelete: 'restrict' }),
  codfilialOrigem: text('codfilial_origem').notNull(),
  chapa: text('chapa').notNull(),
  nome: text('nome').notNull(),
  funcao: text('funcao'),
  secao: text('secao'),
  regional: text('regional'),
  bandeira: text('bandeira'),
  horasDecimal: numeric('horas_decimal', { precision: 10, scale: 2 }).notNull(),
  valorPgto: numeric('valor_pgto', { precision: 12, scale: 2 }).notNull().default('0'),
  situacao: text('situacao'),
} as const;

export const bhSnapshotAtual = pgTable('bh_snapshot_atual', bhSnapshotColumns, (t) => ({
  filialIdx: index('bh_atual_filial_idx').on(t.filialId),
  chapaIdx:  index('bh_atual_chapa_idx').on(t.chapa),
  secaoIdx:  index('bh_atual_secao_idx').on(t.secao),
  funcaoIdx: index('bh_atual_funcao_idx').on(t.funcao),
}));

export const bhSnapshotAnterior = pgTable('bh_snapshot_anterior', bhSnapshotColumns, (t) => ({
  chapaIdx: index('bh_anterior_chapa_idx').on(t.chapa),
}));

export const bhMeta = pgTable('bh_meta', {
  id: text('id').primaryKey(),
  ultimaAtualizacao: timestamp('ultima_atualizacao', { withTimezone: true }).notNull().defaultNow(),
  atualizadoPor: uuid('atualizado_por').references(() => admins.id, { onDelete: 'set null' }),
  totalLinhas: integer('total_linhas').notNull().default(0),
  totalFiliais: integer('total_filiais').notNull().default(0),
}, (t) => ({
  singleton: check('bh_meta_singleton', sql`${t.id} = 'singleton'`),
}));
```

- [ ] **Step 2: Gerar migration**

Run: `npm run db:generate`
Expected: cria `db/migrations/0003_*.sql` com `CREATE TABLE` para as três tabelas.

- [ ] **Step 3: Conferir migration gerada**

Abrir o arquivo gerado. Verificar:
- 3 `CREATE TABLE`s
- Índices `bh_atual_filial_idx`, `bh_atual_chapa_idx`, `bh_atual_secao_idx`, `bh_atual_funcao_idx`, `bh_anterior_chapa_idx`
- CHECK constraint `bh_meta_singleton`

Se o nome do arquivo não for `0003_indicadores_bh.sql`, **renomear** para esse nome (mantendo conteúdo).

- [ ] **Step 4: Aplicar migration**

Run: `npm run db:migrate`
Expected: sai sem erro; tabelas criadas no banco.

- [ ] **Step 5: Commit**

```bash
git add db/schema.ts db/migrations/0003_indicadores_bh.sql db/migrations/meta
git commit -m "feat(indicadores): tabelas snapshot e meta para Banco de Horas"
```

---

## Task 2: Parser do Excel (TDD)

**Files:**
- Create: `lib/indicadores/bh-validators.ts`
- Create: `lib/indicadores/bh-parser.ts`
- Create: `lib/indicadores/__tests__/bh-parser.test.ts`

- [ ] **Step 1: Criar validators zod**

`lib/indicadores/bh-validators.ts`:

```ts
import { z } from 'zod';

export const BH_HEADER = [
  'REGIONAL', 'BANDEIRA', 'CODFILIAL', 'CHAPA', 'NOME',
  'FUNCAO', 'SECAO', 'TOTAL_EM_HORA', 'TOTAL_NEGATIVO',
  'VAL_PGTO_BHS', 'SITUACAO',
] as const;

export const BHRowSchema = z.object({
  regional: z.string().nullable(),
  bandeira: z.string().nullable(),
  codfilial: z.string().min(1),
  chapa: z.string().min(1),
  nome: z.string().min(1),
  funcao: z.string().nullable(),
  secao: z.string().nullable(),
  horasDecimal: z.number().nonnegative(),
  valorPgto: z.number().nonnegative(),
  situacao: z.string().nullable(),
});
export type BHRow = z.infer<typeof BHRowSchema>;

export type BHParseResult = {
  rows: BHRow[];
  warnings: Array<{ linha: number; motivo: string }>;
};
```

- [ ] **Step 2: Escrever os testes do parser**

`lib/indicadores/__tests__/bh-parser.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { parseHHMM, normalizeCodfilial, parseBHWorkbook } from '../bh-parser';
import * as XLSX from 'xlsx';
import { BH_HEADER } from '../bh-validators';

function workbookFromRows(rows: unknown[][]) {
  const ws = XLSX.utils.aoa_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Sheet');
  return wb;
}

describe('parseHHMM', () => {
  it('converte HH:MM para decimal', () => {
    expect(parseHHMM('12:30')).toBe(12.5);
    expect(parseHHMM('00:00')).toBe(0);
    expect(parseHHMM('41:45')).toBe(41.75);
  });
  it('aceita número (já decimal)', () => {
    expect(parseHHMM(2.5)).toBe(2.5);
  });
  it('retorna null em valor inválido', () => {
    expect(parseHHMM('abc')).toBeNull();
    expect(parseHHMM(null)).toBeNull();
  });
});

describe('normalizeCodfilial', () => {
  it('converte número em string sem padding', () => {
    expect(normalizeCodfilial(20)).toBe('20');
    expect(normalizeCodfilial(364)).toBe('364');
  });
  it('preserva string e tira espaços', () => {
    expect(normalizeCodfilial('  20 ')).toBe('20');
  });
});

describe('parseBHWorkbook', () => {
  const baseRow = [
    'DF', 'PERLOG', 364, '03204142', 'JEFERSON',
    'SUPERVISOR', 'ABASTECIMENTO', '12:19', 0, 590.26, 'ATIVO',
  ];

  it('parseia linhas válidas', () => {
    const wb = workbookFromRows([BH_HEADER as unknown as string[], baseRow]);
    const out = parseBHWorkbook(wb);
    expect(out.rows).toHaveLength(1);
    expect(out.rows[0]).toMatchObject({
      codfilial: '364',
      chapa: '03204142',
      nome: 'JEFERSON',
      horasDecimal: 12 + 19/60,
      valorPgto: 590.26,
    });
    expect(out.warnings).toHaveLength(0);
  });

  it('rejeita header divergente', () => {
    const wb = workbookFromRows([['FOO', 'BAR'], ['x', 'y']]);
    expect(() => parseBHWorkbook(wb)).toThrow(/header/i);
  });

  it('gera warning em linha com HORA inválida e segue', () => {
    const bad = [...baseRow]; bad[7] = 'NAO_HORA';
    const wb = workbookFromRows([BH_HEADER as unknown as string[], bad, baseRow]);
    const out = parseBHWorkbook(wb);
    expect(out.rows).toHaveLength(1);
    expect(out.warnings).toHaveLength(1);
    expect(out.warnings[0].motivo).toMatch(/hora/i);
  });

  it('pula linha de Total Geral (CHAPA vazia)', () => {
    const total = [...baseRow]; total[3] = ''; total[4] = '';
    const wb = workbookFromRows([BH_HEADER as unknown as string[], baseRow, total]);
    const out = parseBHWorkbook(wb);
    expect(out.rows).toHaveLength(1);
    expect(out.warnings).toHaveLength(0);
  });

  it('ignora TOTAL_NEGATIVO (não soma no horasDecimal)', () => {
    const neg = [...baseRow]; neg[7] = '00:00'; neg[8] = -2.85;
    const wb = workbookFromRows([BH_HEADER as unknown as string[], neg]);
    const out = parseBHWorkbook(wb);
    expect(out.rows[0].horasDecimal).toBe(0);
  });
});
```

- [ ] **Step 3: Rodar testes — devem falhar (módulo não existe)**

Run: `npm test -- bh-parser`
Expected: FAIL `Cannot find module '../bh-parser'`.

- [ ] **Step 4: Implementar parser**

`lib/indicadores/bh-parser.ts`:

```ts
import * as XLSX from 'xlsx';
import { BH_HEADER, BHRowSchema, type BHParseResult, type BHRow } from './bh-validators';

export function parseHHMM(v: unknown): number | null {
  if (typeof v === 'number' && Number.isFinite(v)) return Math.max(0, v);
  if (typeof v !== 'string') return null;
  const m = v.trim().match(/^(\d+):(\d{1,2})$/);
  if (!m) return null;
  const h = Number(m[1]); const min = Number(m[2]);
  if (!Number.isFinite(h) || !Number.isFinite(min) || min >= 60) return null;
  return Math.round((h + min / 60) * 100) / 100;
}

export function normalizeCodfilial(v: unknown): string {
  if (v == null) return '';
  return String(v).trim();
}

export function parseBHWorkbook(wb: XLSX.WorkBook): BHParseResult {
  const sheetName = wb.SheetNames[0];
  if (!sheetName) throw new Error('Planilha vazia');
  const ws = wb.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json<unknown[]>(ws, { header: 1, defval: null });
  if (rows.length === 0) throw new Error('Planilha sem linhas');

  const header = (rows[0] as unknown[]).map((c) => String(c ?? '').trim().toUpperCase());
  for (let i = 0; i < BH_HEADER.length; i++) {
    if (header[i] !== BH_HEADER[i]) {
      throw new Error(`Header inválido: esperado ${BH_HEADER.join(', ')} | recebido ${header.join(', ')}`);
    }
  }

  const out: BHRow[] = [];
  const warnings: BHParseResult['warnings'] = [];

  for (let i = 1; i < rows.length; i++) {
    const r = rows[i] as unknown[];
    const chapa = String(r[3] ?? '').trim();
    const nome  = String(r[4] ?? '').trim();
    if (!chapa || !nome) continue; // linha de totalização ou em branco

    const horas = parseHHMM(r[7]);
    if (horas == null) {
      warnings.push({ linha: i + 1, motivo: `TOTAL_EM_HORA inválido (${String(r[7])})` });
      continue;
    }

    const valor = typeof r[9] === 'number' ? r[9] : Number(r[9] ?? 0);
    const row: BHRow = {
      regional:  r[0] == null ? null : String(r[0]),
      bandeira:  r[1] == null ? null : String(r[1]),
      codfilial: normalizeCodfilial(r[2]),
      chapa,
      nome,
      funcao:    r[5] == null ? null : String(r[5]),
      secao:     r[6] == null ? null : String(r[6]),
      horasDecimal: horas,
      valorPgto: Number.isFinite(valor) ? valor : 0,
      situacao:  r[10] == null ? null : String(r[10]),
    };
    const parsed = BHRowSchema.safeParse(row);
    if (!parsed.success) {
      warnings.push({ linha: i + 1, motivo: parsed.error.issues[0]?.message ?? 'inválido' });
      continue;
    }
    out.push(parsed.data);
  }

  return { rows: out, warnings };
}
```

- [ ] **Step 5: Rodar testes — devem passar**

Run: `npm test -- bh-parser`
Expected: PASS — todos os testes verdes.

- [ ] **Step 6: Commit**

```bash
git add lib/indicadores/bh-validators.ts lib/indicadores/bh-parser.ts lib/indicadores/__tests__/bh-parser.test.ts
git commit -m "feat(indicadores): parser do excel BH com testes"
```

---

## Task 3: Helpers de variação (TDD)

**Files:**
- Create: `app/(app)/indicadores/bh/variacao.ts`
- Create: `app/(app)/indicadores/bh/__tests__/variacao.test.ts`

- [ ] **Step 1: Escrever testes**

`app/(app)/indicadores/bh/__tests__/variacao.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { calcVariacao, formatHoras, formatBRL } from '../variacao';

describe('calcVariacao', () => {
  it('saldo aumentou → piorou (vermelho)', () => {
    expect(calcVariacao(10, 5)).toEqual({ delta: 5, deltaPct: 100, tendencia: 'piorou' });
  });
  it('saldo diminuiu → melhorou (verde)', () => {
    expect(calcVariacao(5, 10)).toEqual({ delta: -5, deltaPct: -50, tendencia: 'melhorou' });
  });
  it('sem mudança → neutro', () => {
    expect(calcVariacao(7, 7)).toEqual({ delta: 0, deltaPct: 0, tendencia: 'neutro' });
  });
  it('anterior zero e atual >0 → piorou, pct null', () => {
    expect(calcVariacao(3, 0)).toEqual({ delta: 3, deltaPct: null, tendencia: 'piorou' });
  });
  it('sem anterior (novo) → piorou e pct null', () => {
    expect(calcVariacao(2, null)).toEqual({ delta: 2, deltaPct: null, tendencia: 'piorou' });
  });
});

describe('formatHoras', () => {
  it('formata com 2 casas e h', () => {
    expect(formatHoras(12.5)).toBe('12,50 h');
    expect(formatHoras(0)).toBe('0,00 h');
  });
});

describe('formatBRL', () => {
  it('formata em real', () => {
    expect(formatBRL(1234.5)).toMatch(/R\$\s?1\.234,50/);
  });
});
```

- [ ] **Step 2: Rodar — devem falhar**

Run: `npm test -- variacao`
Expected: FAIL `Cannot find module '../variacao'`.

- [ ] **Step 3: Implementar**

`app/(app)/indicadores/bh/variacao.ts`:

```ts
export type Tendencia = 'melhorou' | 'piorou' | 'neutro';
export type Variacao = { delta: number; deltaPct: number | null; tendencia: Tendencia };

export function calcVariacao(atual: number, anterior: number | null): Variacao {
  const delta = atual - (anterior ?? 0);
  let tendencia: Tendencia = 'neutro';
  if (delta > 0) tendencia = 'piorou';
  else if (delta < 0) tendencia = 'melhorou';

  const deltaPct = anterior && anterior !== 0
    ? Math.round((delta / anterior) * 1000) / 10
    : null;

  return { delta: Math.round(delta * 100) / 100, deltaPct, tendencia };
}

export function formatHoras(n: number): string {
  return `${n.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} h`;
}

export function formatBRL(n: number): string {
  return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}
```

- [ ] **Step 4: Rodar — devem passar**

Run: `npm test -- variacao`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add app/\(app\)/indicadores/bh/variacao.ts app/\(app\)/indicadores/bh/__tests__/variacao.test.ts
git commit -m "feat(indicadores): helpers de variacao e formatacao"
```

---

## Task 4: Queries puras (TDD com banco real opcional)

**Files:**
- Create: `lib/indicadores/bh-queries.ts`
- Create: `lib/indicadores/__tests__/bh-queries.test.ts`

> **Nota:** Os testes desta task validam *só a lógica de agregação* sobre arrays em memória — não tocam o banco. As queries Drizzle reais são exercitadas integração no Task 5 (server actions).

- [ ] **Step 1: Escrever os testes (lógica pura)**

`lib/indicadores/__tests__/bh-queries.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import {
  agregarResumo, top5Por, agregarResumoPorFilial, montarDetalhado,
  type SnapshotRow,
} from '../bh-queries';

const row = (over: Partial<SnapshotRow> = {}): SnapshotRow => ({
  filialId: 'f1', filialNome: 'Filial 1', filialCodigo: '1',
  chapa: '001', nome: 'Ana', funcao: 'CONFERENTE', secao: 'RECEB',
  horasDecimal: 10, valorPgto: 100, ...over,
});

describe('agregarResumo', () => {
  it('calcula 4 indicadores (média só de >0)', () => {
    const rows = [row({ horasDecimal: 10 }), row({ chapa: '2', horasDecimal: 0 }), row({ chapa: '3', horasDecimal: 5 })];
    const r = agregarResumo(rows);
    expect(r.colaboradores).toBe(3);
    expect(r.totalHoras).toBe(15);
    expect(r.valorTotal).toBe(300);
    expect(r.mediaHoras).toBe(7.5); // (10+5)/2
  });
  it('mediaHoras = 0 quando ninguém tem saldo', () => {
    const r = agregarResumo([row({ horasDecimal: 0 })]);
    expect(r.mediaHoras).toBe(0);
  });
});

describe('top5Por', () => {
  it('retorna top 5 sem agrupamento de "outros"', () => {
    const rows = [
      row({ funcao: 'A', horasDecimal: 10 }), row({ funcao: 'A', horasDecimal: 5 }),
      row({ funcao: 'B', horasDecimal: 12 }), row({ funcao: 'C', horasDecimal: 8 }),
      row({ funcao: 'D', horasDecimal: 6 }), row({ funcao: 'E', horasDecimal: 4 }),
      row({ funcao: 'F', horasDecimal: 3 }),
    ];
    const top = top5Por(rows, 'funcao');
    expect(top.map(t => t.label)).toEqual(['A','B','C','D','E']);
    expect(top[0]).toEqual({ label: 'A', valor: 15 });
  });
  it('ignora null/empty', () => {
    const rows = [row({ funcao: null, horasDecimal: 5 }), row({ funcao: 'A', horasDecimal: 3 })];
    expect(top5Por(rows, 'funcao')).toEqual([{ label: 'A', valor: 3 }]);
  });
});

describe('agregarResumoPorFilial', () => {
  it('faz join por filialId e calcula variação', () => {
    const atual    = [row({ filialId: 'f1', horasDecimal: 8 }), row({ filialId: 'f2', horasDecimal: 5 })];
    const anterior = [row({ filialId: 'f1', horasDecimal: 10 })];
    const r = agregarResumoPorFilial(atual, anterior);
    const f1 = r.find(x => x.filialId === 'f1')!;
    const f2 = r.find(x => x.filialId === 'f2')!;
    expect(f1.saldoAtual).toBe(8);
    expect(f1.saldoAnterior).toBe(10);
    expect(f1.variacao.tendencia).toBe('melhorou');
    expect(f2.saldoAnterior).toBe(0);
    expect(f2.variacao.tendencia).toBe('piorou');
  });
});

describe('montarDetalhado', () => {
  it('faz join por chapa, marca novo, omite saídas', () => {
    const atual    = [row({ chapa: 'A', horasDecimal: 5 }), row({ chapa: 'B', horasDecimal: 3 })];
    const anterior = [row({ chapa: 'A', horasDecimal: 8 }), row({ chapa: 'C', horasDecimal: 1 })];
    const r = montarDetalhado(atual, anterior);
    expect(r).toHaveLength(2);
    const A = r.find(x => x.chapa === 'A')!;
    const B = r.find(x => x.chapa === 'B')!;
    expect(A.saldoAnterior).toBe(8);
    expect(A.novo).toBe(false);
    expect(B.saldoAnterior).toBeNull();
    expect(B.novo).toBe(true);
  });
});
```

- [ ] **Step 2: Rodar — falham**

Run: `npm test -- bh-queries`
Expected: FAIL — módulo não existe.

- [ ] **Step 3: Implementar `bh-queries.ts`**

`lib/indicadores/bh-queries.ts`:

```ts
import { db, schema } from '@/db/client';
import { eq, sql } from 'drizzle-orm';
import { calcVariacao, type Variacao } from '@/app/(app)/indicadores/bh/variacao';

export type SnapshotRow = {
  filialId: string | null;
  filialNome: string | null;
  filialCodigo: string | null;
  chapa: string;
  nome: string;
  funcao: string | null;
  secao: string | null;
  horasDecimal: number;
  valorPgto: number;
};

export type Resumo = {
  colaboradores: number;
  totalHoras: number;
  valorTotal: number;
  mediaHoras: number;
};

export function agregarResumo(rows: SnapshotRow[]): Resumo {
  const totalHoras = rows.reduce((a, r) => a + r.horasDecimal, 0);
  const valorTotal = rows.reduce((a, r) => a + r.valorPgto, 0);
  const comSaldo = rows.filter((r) => r.horasDecimal > 0);
  const mediaHoras = comSaldo.length === 0 ? 0 : totalHoras / comSaldo.length;
  return {
    colaboradores: rows.length,
    totalHoras: round2(totalHoras),
    valorTotal: round2(valorTotal),
    mediaHoras: round2(mediaHoras),
  };
}

export function top5Por(rows: SnapshotRow[], campo: 'funcao' | 'secao'): Array<{ label: string; valor: number }> {
  const map = new Map<string, number>();
  for (const r of rows) {
    const k = (r[campo] ?? '').trim();
    if (!k) continue;
    map.set(k, (map.get(k) ?? 0) + r.horasDecimal);
  }
  return [...map.entries()]
    .map(([label, valor]) => ({ label, valor: round2(valor) }))
    .sort((a, b) => b.valor - a.valor)
    .slice(0, 5);
}

export type ResumoFilial = {
  filialId: string | null;
  filialNome: string | null;
  saldoAtual: number;
  saldoAnterior: number;
  variacao: Variacao;
};

export function agregarResumoPorFilial(atual: SnapshotRow[], anterior: SnapshotRow[]): ResumoFilial[] {
  const sumBy = (rows: SnapshotRow[]) => {
    const m = new Map<string, { nome: string | null; total: number }>();
    for (const r of rows) {
      const key = r.filialId ?? `__sem__:${r.filialCodigo ?? ''}`;
      const cur = m.get(key) ?? { nome: r.filialNome, total: 0 };
      cur.total += r.horasDecimal;
      m.set(key, cur);
    }
    return m;
  };
  const A = sumBy(atual);
  const B = sumBy(anterior);
  const keys = new Set<string>([...A.keys(), ...B.keys()]);
  const out: ResumoFilial[] = [];
  for (const k of keys) {
    const a = A.get(k); const b = B.get(k);
    const saldoAtual    = round2(a?.total ?? 0);
    const saldoAnterior = round2(b?.total ?? 0);
    out.push({
      filialId: k.startsWith('__sem__') ? null : k,
      filialNome: a?.nome ?? b?.nome ?? null,
      saldoAtual, saldoAnterior,
      variacao: calcVariacao(saldoAtual, saldoAnterior),
    });
  }
  return out.sort((x, y) => (y.saldoAtual - x.saldoAtual));
}

export type DetalhadoRow = SnapshotRow & {
  saldoAnterior: number | null;
  variacao: Variacao;
  novo: boolean;
};

export function montarDetalhado(atual: SnapshotRow[], anterior: SnapshotRow[]): DetalhadoRow[] {
  const ant = new Map<string, number>();
  for (const r of anterior) ant.set(r.chapa, (ant.get(r.chapa) ?? 0) + r.horasDecimal);
  return atual.map((r) => {
    const prev = ant.has(r.chapa) ? round2(ant.get(r.chapa)!) : null;
    return {
      ...r,
      saldoAnterior: prev,
      variacao: calcVariacao(r.horasDecimal, prev),
      novo: prev == null,
    };
  });
}

function round2(n: number) { return Math.round(n * 100) / 100; }

// ---- Acesso ao banco ----

export async function fetchSnapshotRows(
  table: typeof schema.bhSnapshotAtual | typeof schema.bhSnapshotAnterior,
  filialId?: string,
): Promise<SnapshotRow[]> {
  const q = db
    .select({
      filialId: table.filialId,
      filialNome: schema.filiais.nome,
      filialCodigo: schema.filiais.codigo,
      chapa: table.chapa,
      nome: table.nome,
      funcao: table.funcao,
      secao: table.secao,
      horasDecimal: sql<string>`${table.horasDecimal}`,
      valorPgto: sql<string>`${table.valorPgto}`,
    })
    .from(table)
    .leftJoin(schema.filiais, eq(table.filialId, schema.filiais.id));

  const rows = filialId
    ? await q.where(eq(table.filialId, filialId))
    : await q;

  return rows.map((r) => ({
    filialId: r.filialId,
    filialNome: r.filialNome,
    filialCodigo: r.filialCodigo,
    chapa: r.chapa,
    nome: r.nome,
    funcao: r.funcao,
    secao: r.secao,
    horasDecimal: Number(r.horasDecimal),
    valorPgto: Number(r.valorPgto),
  }));
}
```

- [ ] **Step 4: Rodar — devem passar**

Run: `npm test -- bh-queries`
Expected: PASS — funções puras agora existem e os testes verdes.

- [ ] **Step 5: Commit**

```bash
git add lib/indicadores/bh-queries.ts lib/indicadores/__tests__/bh-queries.test.ts
git commit -m "feat(indicadores): agregacoes e queries de BH"
```

---

## Task 5: Server actions

**Files:**
- Create: `actions/indicadores/bh.ts`

- [ ] **Step 1: Criar arquivo de actions**

`actions/indicadores/bh.ts`:

```ts
'use server';

import { db, schema } from '@/db/client';
import { eq, sql } from 'drizzle-orm';
import * as XLSX from 'xlsx';
import { requireSession } from '@/lib/auth/session';
import { revalidatePath } from 'next/cache';
import { parseBHWorkbook } from '@/lib/indicadores/bh-parser';
import {
  agregarResumo, top5Por, agregarResumoPorFilial, montarDetalhado, fetchSnapshotRows,
  type Resumo, type ResumoFilial, type DetalhadoRow,
} from '@/lib/indicadores/bh-queries';

export type ImportarBHResult = {
  inserted: number;
  warnings: Array<{ linha?: number; chapa?: string; motivo: string }>;
};

export async function importarBH(formData: FormData): Promise<ImportarBHResult> {
  const s = await requireSession('admin');
  const file = formData.get('arquivo');
  if (!(file instanceof File)) throw new Error('Arquivo ausente');
  const buf = Buffer.from(await file.arrayBuffer());
  const wb = XLSX.read(buf, { type: 'buffer' });
  const { rows, warnings } = parseBHWorkbook(wb);

  const codigos = [...new Set(rows.map((r) => r.codfilial))];
  const filiaisDb = codigos.length
    ? await db.select({ id: schema.filiais.id, codigo: schema.filiais.codigo })
        .from(schema.filiais)
        .where(sql`${schema.filiais.codigo} = ANY(${codigos})`)
    : [];
  const mapFilial = new Map(filiaisDb.map((f) => [f.codigo, f.id]));

  const allWarnings: ImportarBHResult['warnings'] = warnings.slice();
  const inserts = rows.map((r) => {
    const fid = mapFilial.get(r.codfilial) ?? null;
    if (!fid) allWarnings.push({ chapa: r.chapa, motivo: `Filial ${r.codfilial} não cadastrada` });
    return {
      filialId: fid,
      codfilialOrigem: r.codfilial,
      chapa: r.chapa,
      nome: r.nome,
      funcao: r.funcao,
      secao: r.secao,
      regional: r.regional,
      bandeira: r.bandeira,
      horasDecimal: r.horasDecimal.toFixed(2),
      valorPgto: r.valorPgto.toFixed(2),
      situacao: r.situacao,
    };
  });

  await db.transaction(async (tx) => {
    await tx.execute(sql`TRUNCATE TABLE ${schema.bhSnapshotAnterior}`);
    await tx.execute(sql`INSERT INTO ${schema.bhSnapshotAnterior}
      SELECT * FROM ${schema.bhSnapshotAtual}`);
    await tx.execute(sql`TRUNCATE TABLE ${schema.bhSnapshotAtual}`);
    if (inserts.length) {
      // chunk de 500 para evitar parâmetros demais
      for (let i = 0; i < inserts.length; i += 500) {
        await tx.insert(schema.bhSnapshotAtual).values(inserts.slice(i, i + 500));
      }
    }
    const totalFiliais = new Set(inserts.map((i) => i.filialId).filter(Boolean)).size;
    await tx.insert(schema.bhMeta).values({
      id: 'singleton',
      ultimaAtualizacao: new Date(),
      atualizadoPor: s.adminId,
      totalLinhas: inserts.length,
      totalFiliais,
    }).onConflictDoUpdate({
      target: schema.bhMeta.id,
      set: {
        ultimaAtualizacao: new Date(),
        atualizadoPor: s.adminId,
        totalLinhas: inserts.length,
        totalFiliais,
      },
    });
  });

  revalidatePath('/indicadores');
  return { inserted: inserts.length, warnings: allWarnings };
}

export type DadosBH = {
  meta: { ultimaAtualizacao: string | null; atualizadoPorNome: string | null } | null;
  resumo: Resumo;
  topFuncoes: Array<{ label: string; valor: number }>;
  topSecoes: Array<{ label: string; valor: number }>;
  porFilial: ResumoFilial[];
  detalhado: DetalhadoRow[];
  filtros: { funcoes: string[]; secoes: string[] };
};

export async function getDadosBH(): Promise<DadosBH> {
  const s = await requireSession();
  const isAdmin = s.perfil === 'admin';
  const filialFiltro = isAdmin ? undefined : s.filialId;

  // Resumo/top/porFilial sempre consideram TODAS as filiais (acesso global).
  const atualGlobal = await fetchSnapshotRows(schema.bhSnapshotAtual);
  const anteriorGlobal = await fetchSnapshotRows(schema.bhSnapshotAnterior);

  // Detalhado é filtrado pela filial quando não-admin.
  const atualDet = filialFiltro
    ? await fetchSnapshotRows(schema.bhSnapshotAtual, filialFiltro)
    : atualGlobal;
  const anteriorDet = filialFiltro
    ? await fetchSnapshotRows(schema.bhSnapshotAnterior, filialFiltro)
    : anteriorGlobal;

  const metaRow = await db
    .select({ ts: schema.bhMeta.ultimaAtualizacao, nome: schema.admins.nome })
    .from(schema.bhMeta)
    .leftJoin(schema.admins, eq(schema.bhMeta.atualizadoPor, schema.admins.id))
    .where(eq(schema.bhMeta.id, 'singleton'));

  const meta = metaRow[0]
    ? { ultimaAtualizacao: metaRow[0].ts.toISOString(), atualizadoPorNome: metaRow[0].nome }
    : null;

  const detalhado = montarDetalhado(atualDet, anteriorDet);
  const funcoes = [...new Set(detalhado.map((d) => d.funcao).filter((x): x is string => !!x))].sort();
  const secoes  = [...new Set(detalhado.map((d) => d.secao ).filter((x): x is string => !!x))].sort();

  return {
    meta,
    resumo: agregarResumo(atualGlobal),
    topFuncoes: top5Por(atualGlobal, 'funcao'),
    topSecoes:  top5Por(atualGlobal, 'secao'),
    porFilial:  agregarResumoPorFilial(atualGlobal, anteriorGlobal),
    detalhado,
    filtros: { funcoes, secoes },
  };
}
```

- [ ] **Step 2: Type-check**

Run: `npm run typecheck`
Expected: sai sem erro.

- [ ] **Step 3: Commit**

```bash
git add actions/indicadores/bh.ts
git commit -m "feat(indicadores): server actions de import e leitura do BH"
```

---

## Task 6: Cards de resumo + página com abas

**Files:**
- Create: `app/(app)/indicadores/page.tsx`
- Create: `app/(app)/indicadores/IndicadoresTabs.tsx`
- Create: `app/(app)/indicadores/bh/BancoHorasView.tsx`
- Create: `app/(app)/indicadores/bh/CardsResumo.tsx`

- [ ] **Step 1: Criar a página servidora**

`app/(app)/indicadores/page.tsx`:

```tsx
import { requireSession } from '@/lib/auth/session';
import { getDadosBH } from '@/actions/indicadores/bh';
import { IndicadoresTabs } from './IndicadoresTabs';

export const dynamic = 'force-dynamic';

export default async function IndicadoresPage() {
  const s = await requireSession();
  const dados = await getDadosBH();
  return (
    <main className="container mx-auto px-4 py-6">
      <h1 className="text-2xl font-semibold mb-4">Indicadores</h1>
      <IndicadoresTabs dados={dados} perfil={s.perfil} />
    </main>
  );
}
```

- [ ] **Step 2: Criar o componente de abas**

`app/(app)/indicadores/IndicadoresTabs.tsx`:

```tsx
'use client';

import * as Tabs from '@radix-ui/react-tabs';
import type { DadosBH } from '@/actions/indicadores/bh';
import { BancoHorasView } from './bh/BancoHorasView';

const TRIGGER = 'px-4 py-2 text-sm font-medium border-b-2 border-transparent data-[state=active]:border-emerald-600 data-[state=active]:text-emerald-700 text-muted-foreground hover:text-foreground transition';

export function IndicadoresTabs({ dados, perfil }: { dados: DadosBH; perfil: 'admin' | 'filial' }) {
  return (
    <Tabs.Root defaultValue="bh" className="w-full">
      <Tabs.List className="flex gap-2 border-b mb-6">
        <Tabs.Trigger value="bh" className={TRIGGER}>Banco de Horas</Tabs.Trigger>
        <Tabs.Trigger value="ind2" className={TRIGGER} disabled>Indicador 2</Tabs.Trigger>
        <Tabs.Trigger value="ind3" className={TRIGGER} disabled>Indicador 3</Tabs.Trigger>
      </Tabs.List>
      <Tabs.Content value="bh">
        <BancoHorasView dados={dados} perfil={perfil} />
      </Tabs.Content>
    </Tabs.Root>
  );
}
```

- [ ] **Step 3: Criar CardsResumo**

`app/(app)/indicadores/bh/CardsResumo.tsx`:

```tsx
import type { Resumo } from '@/lib/indicadores/bh-queries';
import { formatBRL, formatHoras } from './variacao';
import { Users, Clock, Wallet, TrendingUp } from 'lucide-react';

function Card({ icon, label, valor }: { icon: React.ReactNode; label: string; valor: string }) {
  return (
    <div className="rounded-lg border bg-card p-4 flex items-start gap-3">
      <div className="rounded-md bg-emerald-50 text-emerald-700 p-2">{icon}</div>
      <div>
        <div className="text-sm text-muted-foreground">{label}</div>
        <div className="text-xl font-semibold">{valor}</div>
      </div>
    </div>
  );
}

export function CardsResumo({ r }: { r: Resumo }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <Card icon={<Users className="size-5" />}      label="Colaboradores"        valor={r.colaboradores.toLocaleString('pt-BR')} />
      <Card icon={<Clock className="size-5" />}      label="Total de horas"       valor={formatHoras(r.totalHoras)} />
      <Card icon={<Wallet className="size-5" />}     label="Valor a pagar"        valor={formatBRL(r.valorTotal)} />
      <Card icon={<TrendingUp className="size-5" />} label="Média h/colaborador"  valor={formatHoras(r.mediaHoras)} />
    </div>
  );
}
```

- [ ] **Step 4: Criar BancoHorasView (placeholder das demais seções, pra montar o esqueleto)**

`app/(app)/indicadores/bh/BancoHorasView.tsx`:

```tsx
'use client';

import type { DadosBH } from '@/actions/indicadores/bh';
import { CardsResumo } from './CardsResumo';

export function BancoHorasView({ dados, perfil }: { dados: DadosBH; perfil: 'admin' | 'filial' }) {
  const ts = dados.meta?.ultimaAtualizacao
    ? new Date(dados.meta.ultimaAtualizacao).toLocaleString('pt-BR')
    : null;
  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-xl font-semibold">Banco de Horas</h2>
          <p className="text-sm text-muted-foreground">
            {ts ? `Última atualização: ${ts}${dados.meta?.atualizadoPorNome ? ` por ${dados.meta.atualizadoPorNome}` : ''}` : 'Sem dados importados'}
          </p>
        </div>
        {perfil === 'admin' && <div data-testid="slot-importar" />}
      </div>
      <CardsResumo r={dados.resumo} />
    </div>
  );
}
```

- [ ] **Step 5: Type-check + smoke**

Run: `npm run typecheck`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add app/\(app\)/indicadores
git commit -m "feat(indicadores): pagina com abas e cards de resumo do BH"
```

---

## Task 7: Gráficos rosca Top 5

**Files:**
- Create: `app/(app)/indicadores/bh/RoscaTop5.tsx`
- Modify: `app/(app)/indicadores/bh/BancoHorasView.tsx`

- [ ] **Step 1: Criar componente de rosca**

`app/(app)/indicadores/bh/RoscaTop5.tsx`:

```tsx
'use client';

import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import { formatHoras } from './variacao';

const COLORS = ['#059669', '#0ea5e9', '#22c55e', '#0284c7', '#10b981']; // verdes + azuis (identidade)

export function RoscaTop5({ titulo, dados }: { titulo: string; dados: Array<{ label: string; valor: number }> }) {
  return (
    <div className="rounded-lg border bg-card p-4">
      <h3 className="font-medium mb-3">{titulo}</h3>
      {dados.length === 0 ? (
        <p className="text-sm text-muted-foreground py-12 text-center">Sem dados</p>
      ) : (
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={dados} dataKey="valor" nameKey="label" innerRadius={55} outerRadius={90} paddingAngle={2}>
                {dados.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Pie>
              <Tooltip formatter={(v: number) => formatHoras(v)} />
              <Legend verticalAlign="bottom" height={36} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Adicionar as 2 roscas em `BancoHorasView`**

Substituir o conteúdo de `app/(app)/indicadores/bh/BancoHorasView.tsx` por:

```tsx
'use client';

import type { DadosBH } from '@/actions/indicadores/bh';
import { CardsResumo } from './CardsResumo';
import { RoscaTop5 } from './RoscaTop5';

export function BancoHorasView({ dados, perfil }: { dados: DadosBH; perfil: 'admin' | 'filial' }) {
  const ts = dados.meta?.ultimaAtualizacao
    ? new Date(dados.meta.ultimaAtualizacao).toLocaleString('pt-BR')
    : null;
  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-xl font-semibold">Banco de Horas</h2>
          <p className="text-sm text-muted-foreground">
            {ts ? `Última atualização: ${ts}${dados.meta?.atualizadoPorNome ? ` por ${dados.meta.atualizadoPorNome}` : ''}` : 'Sem dados importados'}
          </p>
        </div>
        {perfil === 'admin' && <div data-testid="slot-importar" />}
      </div>

      <CardsResumo r={dados.resumo} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <RoscaTop5 titulo="Top 5 funções (horas)" dados={dados.topFuncoes} />
        <RoscaTop5 titulo="Top 5 seções (horas)"  dados={dados.topSecoes} />
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Type-check**

Run: `npm run typecheck`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add app/\(app\)/indicadores/bh/RoscaTop5.tsx app/\(app\)/indicadores/bh/BancoHorasView.tsx
git commit -m "feat(indicadores): graficos rosca top5 funcao/secao"
```

---

## Task 8: Tabela resumo por filial

**Files:**
- Create: `app/(app)/indicadores/bh/TabelaResumoFilial.tsx`
- Modify: `app/(app)/indicadores/bh/BancoHorasView.tsx`

- [ ] **Step 1: Criar componente**

`app/(app)/indicadores/bh/TabelaResumoFilial.tsx`:

```tsx
import type { ResumoFilial } from '@/lib/indicadores/bh-queries';
import { formatHoras } from './variacao';
import { ArrowDownRight, ArrowUpRight, Minus } from 'lucide-react';

function CelulaVariacao({ v }: { v: ResumoFilial['variacao'] }) {
  const tone = v.tendencia === 'melhorou' ? 'text-emerald-700'
    : v.tendencia === 'piorou' ? 'text-red-700'
    : 'text-muted-foreground';
  const Icon = v.tendencia === 'melhorou' ? ArrowDownRight
    : v.tendencia === 'piorou' ? ArrowUpRight
    : Minus;
  const sinal = v.delta > 0 ? '+' : '';
  return (
    <span className={`inline-flex items-center gap-1 ${tone}`}>
      <Icon className="size-4" />
      {sinal}{formatHoras(v.delta)}
      {v.deltaPct != null && <span className="text-xs">({sinal}{v.deltaPct}%)</span>}
    </span>
  );
}

export function TabelaResumoFilial({ rows }: { rows: ResumoFilial[] }) {
  return (
    <div className="rounded-lg border bg-card overflow-hidden">
      <div className="px-4 py-3 border-b">
        <h3 className="font-medium">Resumo por filial</h3>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted/40">
            <tr className="text-left">
              <th className="px-4 py-2">Filial</th>
              <th className="px-4 py-2 text-right">Saldo anterior</th>
              <th className="px-4 py-2 text-right">Saldo atual</th>
              <th className="px-4 py-2 text-right">Variação</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.filialId ?? r.filialNome ?? Math.random()} className="border-t">
                <td className="px-4 py-2">{r.filialNome ?? '—'}</td>
                <td className="px-4 py-2 text-right">{formatHoras(r.saldoAnterior)}</td>
                <td className="px-4 py-2 text-right">{formatHoras(r.saldoAtual)}</td>
                <td className="px-4 py-2 text-right"><CelulaVariacao v={r.variacao} /></td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr><td colSpan={4} className="px-4 py-8 text-center text-muted-foreground">Sem dados</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Inserir em `BancoHorasView`**

No `BancoHorasView.tsx`, importar `TabelaResumoFilial` e adicioná-la abaixo do grid das roscas:

```tsx
import { TabelaResumoFilial } from './TabelaResumoFilial';
// ...
<TabelaResumoFilial rows={dados.porFilial} />
```

- [ ] **Step 3: Type-check**

Run: `npm run typecheck`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add app/\(app\)/indicadores/bh/TabelaResumoFilial.tsx app/\(app\)/indicadores/bh/BancoHorasView.tsx
git commit -m "feat(indicadores): tabela resumo por filial com variacao"
```

---

## Task 9: Tabela detalhado com filtros + busca

**Files:**
- Create: `app/(app)/indicadores/bh/TabelaDetalhado.tsx`
- Modify: `app/(app)/indicadores/bh/BancoHorasView.tsx`

- [ ] **Step 1: Criar componente**

`app/(app)/indicadores/bh/TabelaDetalhado.tsx`:

```tsx
'use client';

import { useMemo, useState } from 'react';
import type { DetalhadoRow } from '@/lib/indicadores/bh-queries';
import { formatBRL, formatHoras } from './variacao';
import { ArrowDownRight, ArrowUpRight, Minus, Search } from 'lucide-react';

function CelulaVariacao({ v }: { v: DetalhadoRow['variacao'] }) {
  const tone = v.tendencia === 'melhorou' ? 'text-emerald-700'
    : v.tendencia === 'piorou' ? 'text-red-700'
    : 'text-muted-foreground';
  const Icon = v.tendencia === 'melhorou' ? ArrowDownRight
    : v.tendencia === 'piorou' ? ArrowUpRight
    : Minus;
  const sinal = v.delta > 0 ? '+' : '';
  return (
    <span className={`inline-flex items-center gap-1 ${tone}`}>
      <Icon className="size-4" />
      {sinal}{formatHoras(v.delta)}
    </span>
  );
}

export function TabelaDetalhado({
  rows, secoes, funcoes,
}: {
  rows: DetalhadoRow[];
  secoes: string[];
  funcoes: string[];
}) {
  const [secao, setSecao] = useState('');
  const [funcao, setFuncao] = useState('');
  const [busca, setBusca] = useState('');

  const filtrados = useMemo(() => {
    const q = busca.trim().toLowerCase();
    return rows.filter((r) => {
      if (secao && r.secao !== secao) return false;
      if (funcao && r.funcao !== funcao) return false;
      if (q && !r.nome.toLowerCase().includes(q) && !r.chapa.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [rows, secao, funcao, busca]);

  return (
    <div className="rounded-lg border bg-card overflow-hidden">
      <div className="px-4 py-3 border-b flex flex-wrap items-center gap-3 justify-between">
        <h3 className="font-medium">Detalhado por colaborador</h3>
        <div className="flex flex-wrap gap-2 items-center">
          <select className="border rounded-md px-2 py-1 text-sm" value={secao} onChange={(e) => setSecao(e.target.value)}>
            <option value="">Todas as seções</option>
            {secoes.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
          <select className="border rounded-md px-2 py-1 text-sm" value={funcao} onChange={(e) => setFuncao(e.target.value)}>
            <option value="">Todas as funções</option>
            {funcoes.map((f) => <option key={f} value={f}>{f}</option>)}
          </select>
          <div className="relative">
            <Search className="size-4 absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              className="border rounded-md pl-7 pr-2 py-1 text-sm w-56"
              placeholder="Nome ou matrícula"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
            />
          </div>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted/40 text-left">
            <tr>
              <th className="px-4 py-2">Colaborador</th>
              <th className="px-4 py-2">Matrícula</th>
              <th className="px-4 py-2">Função</th>
              <th className="px-4 py-2">Seção</th>
              <th className="px-4 py-2 text-right">Valor a receber</th>
              <th className="px-4 py-2 text-right">Saldo anterior</th>
              <th className="px-4 py-2 text-right">Saldo atual</th>
              <th className="px-4 py-2 text-right">Variação</th>
            </tr>
          </thead>
          <tbody>
            {filtrados.map((r) => (
              <tr key={`${r.filialId}-${r.chapa}`} className="border-t">
                <td className="px-4 py-2">
                  {r.nome}
                  {r.novo && <span className="ml-2 inline-block text-xs px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-700">novo</span>}
                </td>
                <td className="px-4 py-2 font-mono text-xs">{r.chapa}</td>
                <td className="px-4 py-2">{r.funcao ?? '—'}</td>
                <td className="px-4 py-2">{r.secao ?? '—'}</td>
                <td className="px-4 py-2 text-right">{formatBRL(r.valorPgto)}</td>
                <td className="px-4 py-2 text-right">{r.saldoAnterior == null ? '—' : formatHoras(r.saldoAnterior)}</td>
                <td className="px-4 py-2 text-right">{formatHoras(r.horasDecimal)}</td>
                <td className="px-4 py-2 text-right"><CelulaVariacao v={r.variacao} /></td>
              </tr>
            ))}
            {filtrados.length === 0 && (
              <tr><td colSpan={8} className="px-4 py-8 text-center text-muted-foreground">Nenhum resultado</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Inserir em `BancoHorasView`**

Adicionar import e renderização ao final do `div.space-y-6`:

```tsx
import { TabelaDetalhado } from './TabelaDetalhado';
// ...
<TabelaDetalhado rows={dados.detalhado} secoes={dados.filtros.secoes} funcoes={dados.filtros.funcoes} />
```

- [ ] **Step 3: Type-check**

Run: `npm run typecheck`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add app/\(app\)/indicadores/bh/TabelaDetalhado.tsx app/\(app\)/indicadores/bh/BancoHorasView.tsx
git commit -m "feat(indicadores): tabela detalhada com filtros e busca"
```

---

## Task 10: Dialog de import (admin)

**Files:**
- Create: `app/(app)/indicadores/bh/ImportarBHDialog.tsx`
- Modify: `app/(app)/indicadores/bh/BancoHorasView.tsx`

- [ ] **Step 1: Criar dialog**

`app/(app)/indicadores/bh/ImportarBHDialog.tsx`:

```tsx
'use client';

import { useState, useTransition } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { Upload } from 'lucide-react';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import { importarBH, type ImportarBHResult } from '@/actions/indicadores/bh';

export function ImportarBHDialog() {
  const [open, setOpen] = useState(false);
  const [arquivo, setArquivo] = useState<File | null>(null);
  const [resultado, setResultado] = useState<ImportarBHResult | null>(null);
  const [pending, start] = useTransition();
  const router = useRouter();

  function submit() {
    if (!arquivo) { toast.error('Selecione um arquivo'); return; }
    const fd = new FormData();
    fd.append('arquivo', arquivo);
    start(async () => {
      try {
        const r = await importarBH(fd);
        setResultado(r);
        toast.success(`Importado: ${r.inserted} colaboradores`);
        router.refresh();
      } catch (e) {
        toast.error(e instanceof Error ? e.message : 'Falha ao importar');
      }
    });
  }

  return (
    <Dialog.Root open={open} onOpenChange={(o) => { setOpen(o); if (!o) { setArquivo(null); setResultado(null); } }}>
      <Dialog.Trigger asChild>
        <button className="inline-flex items-center gap-2 rounded-md bg-emerald-600 text-white px-3 py-2 text-sm hover:bg-emerald-700">
          <Upload className="size-4" /> Importar BH
        </button>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/40" />
        <Dialog.Content className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-card border rounded-lg w-[min(560px,95vw)] p-5 shadow-lg">
          <Dialog.Title className="text-lg font-semibold">Importar Banco de Horas</Dialog.Title>
          <Dialog.Description className="text-sm text-muted-foreground mb-4">
            Selecione a planilha (.xls ou .xlsx) no formato BH PERLOG. O snapshot atual virará o anterior.
          </Dialog.Description>

          <input
            type="file"
            accept=".xls,.xlsx,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            onChange={(e) => setArquivo(e.target.files?.[0] ?? null)}
            className="block w-full text-sm"
          />

          {resultado && (
            <div className="mt-4 max-h-48 overflow-y-auto text-sm space-y-1 border rounded-md p-2">
              <div><b>{resultado.inserted}</b> linhas importadas.</div>
              {resultado.warnings.length > 0 && (
                <>
                  <div className="font-medium mt-2">Avisos ({resultado.warnings.length}):</div>
                  <ul className="list-disc pl-5 text-xs text-muted-foreground">
                    {resultado.warnings.slice(0, 50).map((w, i) => (
                      <li key={i}>{w.chapa ? `chapa ${w.chapa}: ` : w.linha ? `linha ${w.linha}: ` : ''}{w.motivo}</li>
                    ))}
                    {resultado.warnings.length > 50 && <li>… (+{resultado.warnings.length - 50} avisos)</li>}
                  </ul>
                </>
              )}
            </div>
          )}

          <div className="mt-5 flex justify-end gap-2">
            <Dialog.Close asChild>
              <button className="rounded-md border px-3 py-2 text-sm">Fechar</button>
            </Dialog.Close>
            <button
              onClick={submit}
              disabled={pending || !arquivo}
              className="rounded-md bg-emerald-600 text-white px-3 py-2 text-sm hover:bg-emerald-700 disabled:opacity-50"
            >
              {pending ? 'Importando…' : 'Importar'}
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
```

- [ ] **Step 2: Substituir o slot em `BancoHorasView`**

Trocar `<div data-testid="slot-importar" />` por `<ImportarBHDialog />` e importar:

```tsx
import { ImportarBHDialog } from './ImportarBHDialog';
// ...
{perfil === 'admin' && <ImportarBHDialog />}
```

- [ ] **Step 3: Type-check**

Run: `npm run typecheck`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add app/\(app\)/indicadores/bh/ImportarBHDialog.tsx app/\(app\)/indicadores/bh/BancoHorasView.tsx
git commit -m "feat(indicadores): dialog admin para import do BH"
```

---

## Task 11: Item de navegação

**Files:**
- Modify: `components/layout/nav-config.ts`

- [ ] **Step 1: Adicionar `Indicadores` em ambas as navs**

No topo do arquivo, garantir que `BarChart3` está no import do `lucide-react` (já está). Acrescentar item em `FILIAL_NAV` (após `/painel`, antes de `/guia-rapido`) e em `ADMIN_NAV` (após `/admin/relatorios`):

```ts
export const FILIAL_NAV: NavItem[] = [
  { href: '/painel',          label: 'Painel',            icon: LayoutDashboard },
  { href: '/indicadores',     label: 'Indicadores',       icon: BarChart3 },
  { href: '/guia-rapido',     label: 'Guia Rápido',       icon: BookOpen },
  { href: '/entrevista/nova', label: 'Nova entrevista',   icon: ClipboardList },
  { href: '/historico',       label: 'Histórico',         icon: History },
  { href: '/agenda',          label: 'Agenda',            icon: CalendarClock },
  { href: '/banco-talentos',  label: 'Banco de talentos', icon: Users },
];

export const ADMIN_NAV: NavItem[] = [
  { href: '/admin',            label: 'Dashboard',    icon: LayoutDashboard },
  { href: '/admin/busca',      label: 'Busca global', icon: Users },
  { href: '/admin/relatorios', label: 'Relatórios',   icon: FileText },
  { href: '/indicadores',      label: 'Indicadores',  icon: BarChart3 },
  { href: '/admin/config',     label: 'Configuração', icon: Settings },
  { href: '/admin/seguranca',  label: 'Segurança',    icon: ShieldCheck },
];
```

- [ ] **Step 2: Type-check**

Run: `npm run typecheck`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add components/layout/nav-config.ts
git commit -m "feat(indicadores): item no menu de filial e admin"
```

---

## Task 12: Verificação end-to-end no navegador

**Files:** nenhum

- [ ] **Step 1: Subir dev server**

Run: `npm run dev`
Expected: starts em `http://localhost:3000`.

- [ ] **Step 2: Login como admin → `/indicadores`**

Verificar:
- Aba "Banco de Horas" ativa.
- Cards mostram 0/—/R$ 0,00 se não houver dados ainda. Texto "Sem dados importados".
- Botão "Importar BH" visível.

- [ ] **Step 3: Importar `C:\Users\juliano.correa\Desktop\Ref\BH PERLOG.xls`**

Verificar:
- Toast de sucesso com N linhas.
- Cards atualizam.
- Roscas renderizam top 5 com legendas em verde/azul.
- Tabela "Resumo por filial" lista filiais ordenadas por saldo atual.
- Tabela "Detalhado" lista colaboradores. Variação na primeira import: todos com badge "novo" (saldo anterior vazio) — esperado.

- [ ] **Step 4: Reimportar o mesmo arquivo**

Verificar:
- Variação por filial = 0 (neutro).
- Detalhado: todos com saldo anterior preenchido, variação = 0 h.

- [ ] **Step 5: Logar como filial e abrir `/indicadores`**

Verificar:
- Cards e roscas continuam mostrando dados **globais** (resumo da rede).
- Tabela "Resumo por filial" mostra **todas** as filiais.
- Tabela "Detalhado" lista **só os colaboradores da filial logada**.
- Botão "Importar BH" **não** aparece.
- Filtros (Seção, Função, busca por nome/matrícula) funcionam.

- [ ] **Step 6: Sem commit (apenas validação)**

Se algo divergir, voltar à task correspondente e ajustar.

---

## Task 13: Push da branch e abrir PR (sob confirmação do usuário)

- [ ] **Step 1: Confirmar com o usuário** se deve abrir PR `v5 → main` ou só pushar.

- [ ] **Step 2: Push**

```bash
git push -u origin v5
```

- [ ] **Step 3 (opcional): Abrir PR**

```bash
gh pr create --base main --head v5 --title "feat(indicadores): aba Banco de Horas" --body "$(cat <<'EOF'
## Summary
- Novo módulo /indicadores com aba Banco de Horas
- Import de planilha BH PERLOG (admin); snapshot atual ↔ anterior para variação
- Resumo, roscas Top 5, resumo por filial, detalhado com filtros e busca
- Permissões: admin vê tudo; filial vê resumo global e detalhado restrito à sua filial

## Test plan
- [ ] Login admin, importar BH PERLOG, conferir cards/roscas/tabelas
- [ ] Reimportar e validar variação neutra
- [ ] Login filial, conferir restrição do detalhado e ausência do botão importar
EOF
)"
```

---

## Notas de implementação

- **TOTAL_NEGATIVO ignorado** por decisão de produto (só saldo positivo a receber).
- **Histórico de 1 nível** — cada novo import descarta o "anterior" antigo. Suficiente para o caso atual; se virar requisito, migrar para tabela versionada.
- **Filiais não mapeadas** entram com `filial_id = NULL` e somam em uma linha "—" no resumo por filial; warnings indicam quais.
- **Zero-padding do CODFILIAL:** o parser não aplica padding. Se em produção os códigos `filiais.codigo` tiverem zeros à esquerda (ex.: `"0020"`) e o excel trouxer `20`, ajustar `normalizeCodfilial` para padronizar (ex.: `padStart(4, '0')`). Confirmar no momento do Task 12.
