# Quadro de Vagas — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Novo módulo "Quadro de Vagas" — importa a planilha de quadro (limite/potencial/alocados/em aberto por filial+função+seção), explode cada `EM ABERTO` em vagas individuais com status próprio, permite Gente & Gestão atualizar o status vaga a vaga, e mostra dois gráficos (vagas por status, vagas em aberto por filial).

**Architecture:** Segue exatamente o padrão do módulo QLP existente (`app/(app)/qlp`, `actions/qlp`, `lib/qlp`): parser XLSX dedicado, lógica de import pura e testável separada da camada de banco, Server Actions com `requireSession`, páginas Server Component que fazem a query e passam para Client Components de UI. Módulo aberto a todo usuário autenticado (sem gate em `filiais_modulos`), com escopo de dados via `getFiliaisVisiveis`.

**Tech Stack:** Next.js (App Router), Drizzle ORM + Postgres (Supabase), `xlsx` para parsing, Recharts para os gráficos, Vitest para testes, Tailwind (padrão visual "Conecta").

**Referência:** spec aprovada em [`docs/superpowers/specs/2026-08-25-quadro-de-vagas-design.md`](../specs/2026-08-25-quadro-de-vagas-design.md).

**⚠️ Nota de ambiente (Windows, path com `&`):** o path do projeto (`C:\Users\juliano.correa\Desktop\G&G`) quebra `npm run <script>` via cmd.exe (trunca em `&`). Em TODO passo deste plano que rodar teste, typecheck, build ou drizzle-kit, use invocação direta do Node (funciona no Bash tool do Claude Code, que usa Git Bash, não cmd.exe):
- Testes: `node "node_modules/vitest/vitest.mjs" run <path>`
- Typecheck: `node "node_modules/typescript/bin/tsc" --noEmit`
- Migrations: `node "node_modules/drizzle-kit/bin.cjs" generate` / `... migrate`
- **Nunca** rodar build enquanto o dev server (`next dev`) estiver de pé — corrompe o `.next`.

---

## File Structure

**Novos arquivos:**
- `db/migrations/00XX_vagas_quadro.sql` — gerado por `drizzle-kit generate` + seed manual dos status padrão.
- `lib/vagas/xls-parser.ts` + `lib/vagas/xls-parser.test.ts` — parse da planilha.
- `lib/vagas/reconciliar.ts` + `lib/vagas/reconciliar.test.ts` — lógica pura de diff (criar/fechar vagas).
- `lib/vagas/import-sync.ts` — orquestração de banco (preview + apply), usa `reconciliar.ts`.
- `actions/vagas/importar.ts` — Server Actions de import (admin only).
- `actions/vagas/status.ts` — Server Actions do catálogo de status (admin only).
- `actions/vagas/vagas.ts` — Server Action `atualizarStatusVaga`.
- `components/vagas/ImportVagasPreview.tsx` — upload + preview + confirmar (mirror de `ImportPreview.tsx`).
- `components/vagas/VagasQuadroTable.tsx` — tabela filtrável com select de status inline.
- `components/vagas/StatusCatalogoManager.tsx` — CRUD do catálogo (admin).
- `components/vagas/VagasPorStatusChart.tsx` — gráfico de barras (Recharts).
- `components/vagas/VagasAbertoPorFilialChart.tsx` — gráfico de barras (Recharts).
- `app/(app)/vagas/layout.tsx` — guard `requireSession()`.
- `app/(app)/vagas/page.tsx` — dashboard (gráficos + tabela).
- `app/(app)/vagas/importar/page.tsx` — guard admin + `ImportVagasPreview`.
- `app/(app)/vagas/status/page.tsx` — guard admin + `StatusCatalogoManager`.

**Arquivos modificados:**
- `db/schema.ts` — 4 tabelas novas (`vagasStatus`, `vagasQuadroImports`, `vagasQuadroLinhas`, `vagas`) + tipos exportados.
- `components/layout/nav-config.ts` — `VAGAS_NAV_BASE` + `VAGAS_NAV_ADMIN_EXTRAS`.
- `components/layout/Sidebar.tsx` — wiring do novo menu contextual.
- `app/inicio/page.tsx` — novo card "Quadro de Vagas".

---

## Task 1: Schema do banco

**Files:**
- Modify: `db/schema.ts`

- [ ] **Step 1: Adicionar as 4 tabelas no final de `db/schema.ts`**

Abra `db/schema.ts`, confira o import no topo (linha 1-5) já traz `pgTable, uuid, text, boolean, timestamp, integer, jsonb, index, uniqueIndex` — todos usados aqui. Adicione ao final do arquivo (depois do último `export const transporteChamada = ...`):

```ts
// ============================================================
// Quadro de Vagas — import do quadro (limite/potencial/em aberto)
// e status individual por vaga em aberto
// ============================================================

export const vagasStatus = pgTable('vagas_status', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  nome: text('nome').notNull().unique(),
  ordem: integer('ordem').notNull().default(0),
  sistema: boolean('sistema').notNull().default(false), // true só para "Em aberto" — protegido
  ativo: boolean('ativo').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const vagasQuadroImports = pgTable('vagas_quadro_imports', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  arquivoNome: text('arquivo_nome').notNull(),
  importadoPorNome: text('importado_por_nome').notNull(),
  totalLinhas: integer('total_linhas').notNull(),
  vagasCriadas: integer('vagas_criadas').notNull().default(0),
  vagasFechadas: integer('vagas_fechadas').notNull().default(0),
  filiaisDesconhecidas: jsonb('filiais_desconhecidas').$type<string[]>().notNull().default([]),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const vagasQuadroLinhas = pgTable('vagas_quadro_linhas', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  filialId: uuid('filial_id').notNull().references(() => filiais.id, { onDelete: 'restrict' }),
  regional: text('regional'),
  bandeira: text('bandeira'),
  funcao: text('funcao').notNull(),
  secao: text('secao'),
  limite: integer('limite').notNull().default(0),
  potencial: integer('potencial').notNull().default(0),
  alocados: integer('alocados').notNull().default(0),
  afastados: integer('afastados').notNull().default(0),
  emAbertoImportado: integer('em_aberto_importado').notNull().default(0),
  ultimaImportId: uuid('ultima_import_id').references(() => vagasQuadroImports.id),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  unq: uniqueIndex('vagas_quadro_linhas_unq').on(t.filialId, t.funcao, t.secao),
  filialIdx: index('vagas_quadro_linhas_filial_idx').on(t.filialId),
}));

export const vagas = pgTable('vagas', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  linhaId: uuid('linha_id').notNull().references(() => vagasQuadroLinhas.id, { onDelete: 'cascade' }),
  filialId: uuid('filial_id').notNull().references(() => filiais.id, { onDelete: 'restrict' }),
  funcao: text('funcao').notNull(),
  secao: text('secao'),
  statusId: uuid('status_id').notNull().references(() => vagasStatus.id, { onDelete: 'restrict' }),
  statusAtualizadoEm: timestamp('status_atualizado_em', { withTimezone: true }).notNull().defaultNow(),
  statusAtualizadoPorNome: text('status_atualizado_por_nome'),
  ativa: boolean('ativa').notNull().default(true),
  motivoFechamento: text('motivo_fechamento'),
  origemImportId: uuid('origem_import_id').references(() => vagasQuadroImports.id),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  linhaIdx: index('vagas_linha_idx').on(t.linhaId),
  filialIdx: index('vagas_filial_idx').on(t.filialId),
  statusIdx: index('vagas_status_idx').on(t.statusId),
  ativaIdx: index('vagas_ativa_idx').on(t.ativa),
}));

export type VagaStatus = typeof vagasStatus.$inferSelect;
export type VagaQuadroLinha = typeof vagasQuadroLinhas.$inferSelect;
export type Vaga = typeof vagas.$inferSelect;
```

- [ ] **Step 2: Typecheck**

Run: `node "node_modules/typescript/bin/tsc" --noEmit`
Expected: sem erros novos relacionados a `db/schema.ts`.

- [ ] **Step 3: Gerar a migration**

Run: `node "node_modules/drizzle-kit/bin.cjs" generate`
Expected: cria um novo arquivo em `db/migrations/00XX_<nome>.sql` (drizzle escolhe o nome) com `CREATE TABLE` para as 4 tabelas novas.

- [ ] **Step 4: Adicionar seed dos status padrão ao final do arquivo de migration gerado**

Abra o arquivo `db/migrations/00XX_<nome>.sql` recém-criado e adicione ao final (depois do SQL gerado pelo drizzle):

```sql
-- Seed do catálogo de status — "Em aberto" é o status inicial obrigatório
-- de toda vaga nova (sistema=true, protegido contra exclusão/renomeação).
INSERT INTO vagas_status (nome, ordem, sistema, ativo) VALUES
  ('Em aberto', 0, true, true),
  ('Em processo de documentação', 1, false, true),
  ('Entrevista agendada', 2, false, true),
  ('Aguardando aprovação', 3, false, true),
  ('Preenchida', 4, false, true)
ON CONFLICT (nome) DO NOTHING;
```

- [ ] **Step 5: Aplicar a migration**

Run: `node "node_modules/drizzle-kit/bin.cjs" migrate`
Expected: saída confirmando a migration aplicada, sem erros.

- [ ] **Step 6: Commit**

```bash
git add db/schema.ts db/migrations
git commit -m "feat(vagas): schema do módulo Quadro de Vagas

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

## Task 2: Parser da planilha

**Files:**
- Create: `lib/vagas/xls-parser.ts`
- Test: `lib/vagas/xls-parser.test.ts`

- [ ] **Step 1: Escrever o teste primeiro**

Crie `lib/vagas/xls-parser.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import * as XLSX from 'xlsx';
import { parseQuadroVagas } from './xls-parser';

function buildXlsx(rows: Record<string, unknown>[]): Buffer {
  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Sheet');
  return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }) as Buffer;
}

const linhaBase = {
  REGIONAL: 'DF',
  BANDEIRA: 'PERLOG',
  FILIAL: '364',
  NOME_FUNCAO: 'AUX. ADMINISTRATIVO',
  DESC_SECAO: 'OPERACIONAL (OPERACAO)',
  'EM ABERTO': 2,
  LIMITE: 4,
  POTENCIAL: 4,
  ALOCADOS: 3,
  AFASTADOS: 1,
};

describe('parseQuadroVagas', () => {
  it('lê os campos de uma linha válida', () => {
    const buf = buildXlsx([linhaBase]);
    const linhas = parseQuadroVagas(buf);
    expect(linhas).toHaveLength(1);
    expect(linhas[0]).toEqual({
      regional: 'DF',
      bandeira: 'PERLOG',
      filialCodigo: '364',
      funcao: 'AUX. ADMINISTRATIVO',
      secao: 'OPERACIONAL (OPERACAO)',
      emAberto: 2,
      limite: 4,
      potencial: 4,
      alocados: 3,
      afastados: 1,
    });
  });

  it('secao fica null quando a coluna vem vazia', () => {
    const buf = buildXlsx([{ ...linhaBase, DESC_SECAO: '' }]);
    const linhas = parseQuadroVagas(buf);
    expect(linhas[0]?.secao).toBeNull();
  });

  it('ignora linha sem FILIAL', () => {
    const buf = buildXlsx([{ ...linhaBase, FILIAL: '' }]);
    const linhas = parseQuadroVagas(buf);
    expect(linhas).toHaveLength(0);
  });

  it('ignora linha sem NOME_FUNCAO', () => {
    const buf = buildXlsx([{ ...linhaBase, NOME_FUNCAO: '' }]);
    const linhas = parseQuadroVagas(buf);
    expect(linhas).toHaveLength(0);
  });

  it('EM ABERTO ausente vira 0', () => {
    const { ['EM ABERTO']: _omit, ...semEmAberto } = linhaBase;
    const buf = buildXlsx([semEmAberto]);
    const linhas = parseQuadroVagas(buf);
    expect(linhas[0]?.emAberto).toBe(0);
  });
});
```

- [ ] **Step 2: Rodar o teste e confirmar que falha**

Run: `node "node_modules/vitest/vitest.mjs" run lib/vagas/xls-parser.test.ts`
Expected: FAIL — `Cannot find module './xls-parser'`.

- [ ] **Step 3: Implementar o parser**

Crie `lib/vagas/xls-parser.ts`:

```ts
import * as XLSX from 'xlsx';

export interface LinhaQuadroVagas {
  regional: string;
  bandeira: string;
  filialCodigo: string;
  funcao: string;
  secao: string | null;
  emAberto: number;
  limite: number;
  potencial: number;
  alocados: number;
  afastados: number;
}

function asString(v: unknown): string {
  if (v == null) return '';
  return String(v).trim();
}

function asOptionalString(v: unknown): string | null {
  const s = asString(v);
  return s === '' ? null : s;
}

function asInt(v: unknown): number {
  if (v == null || v === '') return 0;
  const n = Number(v);
  return Number.isFinite(n) ? Math.trunc(n) : 0;
}

export function parseQuadroVagas(buf: Buffer | ArrayBuffer): LinhaQuadroVagas[] {
  const wb = XLSX.read(buf, { type: 'buffer', codepage: 1252, cellDates: false });
  const sheetName = wb.SheetNames[0];
  if (!sheetName) throw new Error('Planilha sem abas');
  const ws = wb.Sheets[sheetName];
  if (!ws) throw new Error('Aba vazia');
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { defval: null });

  return rows
    .map((r) => {
      const upper = new Map(Object.entries(r).map(([k, v]) => [k.toUpperCase().trim(), v]));
      return {
        regional: asString(upper.get('REGIONAL')),
        bandeira: asString(upper.get('BANDEIRA')),
        filialCodigo: asString(upper.get('FILIAL')),
        funcao: asString(upper.get('NOME_FUNCAO')),
        secao: asOptionalString(upper.get('DESC_SECAO')),
        emAberto: asInt(upper.get('EM ABERTO')),
        limite: asInt(upper.get('LIMITE')),
        potencial: asInt(upper.get('POTENCIAL')),
        alocados: asInt(upper.get('ALOCADOS')),
        afastados: asInt(upper.get('AFASTADOS')),
      };
    })
    .filter((r) => r.filialCodigo !== '' && r.funcao !== '');
}
```

- [ ] **Step 4: Rodar o teste e confirmar que passa**

Run: `node "node_modules/vitest/vitest.mjs" run lib/vagas/xls-parser.test.ts`
Expected: PASS — 5 testes passando.

- [ ] **Step 5: Commit**

```bash
git add lib/vagas/xls-parser.ts lib/vagas/xls-parser.test.ts
git commit -m "feat(vagas): parser da planilha de quadro

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

## Task 3: Lógica pura de reconciliação (criar/fechar vagas)

**Files:**
- Create: `lib/vagas/reconciliar.ts`
- Test: `lib/vagas/reconciliar.test.ts`

- [ ] **Step 1: Escrever o teste primeiro**

Crie `lib/vagas/reconciliar.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { planejarReconciliacao, type VagaAbertaExistente } from './reconciliar';

function vaga(id: string, diasAtras: number): VagaAbertaExistente {
  const createdAt = new Date(Date.now() - diasAtras * 86_400_000);
  return { id, createdAt };
}

describe('planejarReconciliacao', () => {
  it('target maior que o atual → cria o delta, não fecha nada', () => {
    const atuais = [vaga('a', 5)];
    const r = planejarReconciliacao(atuais, 3);
    expect(r).toEqual({ criar: 2, fecharIds: [] });
  });

  it('target igual ao atual → nada a fazer', () => {
    const atuais = [vaga('a', 5), vaga('b', 2)];
    const r = planejarReconciliacao(atuais, 2);
    expect(r).toEqual({ criar: 0, fecharIds: [] });
  });

  it('target menor → fecha as mais antigas primeiro', () => {
    // b é a mais antiga (10 dias), depois a (5), depois c (1)
    const atuais = [vaga('a', 5), vaga('b', 10), vaga('c', 1)];
    const r = planejarReconciliacao(atuais, 1);
    expect(r.criar).toBe(0);
    expect(r.fecharIds).toEqual(['b', 'a']);
  });

  it('target 0 e nenhuma vaga aberta → nada a fazer', () => {
    const r = planejarReconciliacao([], 0);
    expect(r).toEqual({ criar: 0, fecharIds: [] });
  });

  it('target 0 com vagas abertas → fecha todas', () => {
    const atuais = [vaga('a', 5), vaga('b', 1)];
    const r = planejarReconciliacao(atuais, 0);
    expect(r.criar).toBe(0);
    expect(r.fecharIds.sort()).toEqual(['a', 'b']);
  });

  it('nenhuma vaga aberta e target positivo → cria todas', () => {
    const r = planejarReconciliacao([], 4);
    expect(r).toEqual({ criar: 4, fecharIds: [] });
  });
});
```

- [ ] **Step 2: Rodar o teste e confirmar que falha**

Run: `node "node_modules/vitest/vitest.mjs" run lib/vagas/reconciliar.test.ts`
Expected: FAIL — `Cannot find module './reconciliar'`.

- [ ] **Step 3: Implementar**

Crie `lib/vagas/reconciliar.ts`:

```ts
export interface VagaAbertaExistente {
  id: string;
  createdAt: Date;
}

export interface PlanoReconciliacao {
  criar: number;
  fecharIds: string[];
}

/**
 * Calcula o que fazer para que o nº de vagas "Em aberto" de uma combinação
 * (filial+função+seção) bata com `targetEmAberto` (valor vindo da planilha
 * importada).
 *
 * - target > atual  → cria o delta com status "Em aberto".
 * - target < atual  → fecha as vagas "Em aberto" MAIS ANTIGAS primeiro
 *   (nunca inclui vagas com outro status — quem chama só deve passar as
 *   que já estão "Em aberto").
 * - target === atual → nada a fazer.
 */
export function planejarReconciliacao(
  abertasAtuais: VagaAbertaExistente[],
  targetEmAberto: number,
): PlanoReconciliacao {
  const delta = targetEmAberto - abertasAtuais.length;
  if (delta > 0) return { criar: delta, fecharIds: [] };
  if (delta === 0) return { criar: 0, fecharIds: [] };

  const maisAntigasPrimeiro = [...abertasAtuais].sort(
    (a, b) => a.createdAt.getTime() - b.createdAt.getTime(),
  );
  const fecharIds = maisAntigasPrimeiro.slice(0, -delta).map((v) => v.id);
  return { criar: 0, fecharIds };
}
```

- [ ] **Step 4: Rodar o teste e confirmar que passa**

Run: `node "node_modules/vitest/vitest.mjs" run lib/vagas/reconciliar.test.ts`
Expected: PASS — 6 testes passando.

- [ ] **Step 5: Commit**

```bash
git add lib/vagas/reconciliar.ts lib/vagas/reconciliar.test.ts
git commit -m "feat(vagas): lógica pura de reconciliação de vagas abertas

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

## Task 4: Orquestração de import (preview + apply)

**Files:**
- Create: `lib/vagas/import-sync.ts`

Este arquivo faz I/O de banco — segue o padrão de `lib/qlp/import-sync.ts` (sem teste unitário direto; a lógica de decisão já está coberta por `reconciliar.test.ts`). Validação manual fica para a Task 8 (smoke test via UI).

- [ ] **Step 1: Implementar**

Crie `lib/vagas/import-sync.ts`:

```ts
import 'server-only';
import { and, eq, inArray, notInArray, sql } from 'drizzle-orm';
import { db, schema } from '@/db/client';
import type { LinhaQuadroVagas } from './xls-parser';
import { planejarReconciliacao } from './reconciliar';

export interface ImportSummaryVagas {
  totalLinhas: number;
  linhasValidas: number;
  filiaisDesconhecidas: string[];
  vagasCriadas: number;
  vagasFechadas: number;
  linhasZeradas: number;
}

interface ResolvidoLinha {
  linha: LinhaQuadroVagas;
  filialId: string;
}

async function resolverFiliais(
  linhas: LinhaQuadroVagas[],
): Promise<{ resolvidas: ResolvidoLinha[]; filiaisDesconhecidas: string[] }> {
  const codigos = Array.from(new Set(linhas.map((l) => l.filialCodigo)));
  const encontradas = codigos.length
    ? await db
        .select({ id: schema.filiais.id, codigo: schema.filiais.codigo })
        .from(schema.filiais)
        .where(inArray(schema.filiais.codigo, codigos))
    : [];
  const mapa = new Map(encontradas.map((f) => [f.codigo, f.id]));

  const resolvidas: ResolvidoLinha[] = [];
  const desconhecidasSet = new Set<string>();
  for (const linha of linhas) {
    const filialId = mapa.get(linha.filialCodigo);
    if (filialId) {
      resolvidas.push({ linha, filialId });
    } else {
      desconhecidasSet.add(linha.filialCodigo);
    }
  }
  return { resolvidas, filiaisDesconhecidas: Array.from(desconhecidasSet) };
}

async function contarAbertasAtuais(linhaIds: string[]): Promise<Map<string, number>> {
  if (linhaIds.length === 0) return new Map();
  const rows = await db
    .select({
      linhaId: schema.vagas.linhaId,
      total: sql<number>`count(*)`.as('total'),
    })
    .from(schema.vagas)
    .innerJoin(schema.vagasStatus, eq(schema.vagasStatus.id, schema.vagas.statusId))
    .where(
      and(
        eq(schema.vagas.ativa, true),
        eq(schema.vagasStatus.sistema, true),
        inArray(schema.vagas.linhaId, linhaIds),
      ),
    )
    .groupBy(schema.vagas.linhaId);
  return new Map(rows.map((r) => [r.linhaId, Number(r.total)]));
}

/**
 * Pré-visualização: não escreve no banco. Resolve filiais e calcula quantas
 * vagas seriam criadas/fechadas, incluindo o zeramento de combinações que
 * existiam antes e não aparecem mais na planilha.
 */
export async function previewImportVagas(linhas: LinhaQuadroVagas[]): Promise<ImportSummaryVagas> {
  const { resolvidas, filiaisDesconhecidas } = await resolverFiliais(linhas);

  const existentes = await db
    .select({
      id: schema.vagasQuadroLinhas.id,
      filialId: schema.vagasQuadroLinhas.filialId,
      funcao: schema.vagasQuadroLinhas.funcao,
      secao: schema.vagasQuadroLinhas.secao,
    })
    .from(schema.vagasQuadroLinhas);
  const existentesMap = new Map(
    existentes.map((e) => [`${e.filialId}::${e.funcao}::${e.secao ?? ''}`, e.id]),
  );

  const chavesNaPlanilha = new Set<string>();
  let vagasCriadas = 0;
  let vagasFechadas = 0;

  const linhaIdsExistentesNaPlanilha: string[] = [];
  for (const { linha, filialId } of resolvidas) {
    const chave = `${filialId}::${linha.funcao}::${linha.secao ?? ''}`;
    chavesNaPlanilha.add(chave);
    const linhaId = existentesMap.get(chave);
    if (linhaId) linhaIdsExistentesNaPlanilha.push(linhaId);
  }

  const contagens = await contarAbertasAtuais(linhaIdsExistentesNaPlanilha);

  for (const { linha, filialId } of resolvidas) {
    const chave = `${filialId}::${linha.funcao}::${linha.secao ?? ''}`;
    const linhaId = existentesMap.get(chave);
    const atual = linhaId ? (contagens.get(linhaId) ?? 0) : 0;
    const delta = linha.emAberto - atual;
    if (delta > 0) vagasCriadas += delta;
    else if (delta < 0) vagasFechadas += -delta;
  }

  // Linhas existentes cuja combinação não aparece mais na planilha → target 0.
  const linhasAusentes = existentes.filter(
    (e) => !chavesNaPlanilha.has(`${e.filialId}::${e.funcao}::${e.secao ?? ''}`),
  );
  const contagensAusentes = await contarAbertasAtuais(linhasAusentes.map((l) => l.id));
  let linhasZeradas = 0;
  for (const l of linhasAusentes) {
    const atual = contagensAusentes.get(l.id) ?? 0;
    if (atual > 0) {
      vagasFechadas += atual;
      linhasZeradas += 1;
    }
  }

  return {
    totalLinhas: linhas.length,
    linhasValidas: resolvidas.length,
    filiaisDesconhecidas,
    vagasCriadas,
    vagasFechadas,
    linhasZeradas,
  };
}

/**
 * Aplica o import em uma transação: upsert das linhas do quadro, cria/fecha
 * vagas conforme `planejarReconciliacao`, zera combinações ausentes da nova
 * planilha e grava o registro em `vagas_quadro_imports`.
 */
export async function aplicarImportVagas(
  linhas: LinhaQuadroVagas[],
  opts: { arquivoNome: string; importadoPorNome: string },
): Promise<ImportSummaryVagas> {
  const { resolvidas, filiaisDesconhecidas } = await resolverFiliais(linhas);

  return db.transaction(async (tx) => {
    const statusEmAberto = await tx.query.vagasStatus.findFirst({
      where: eq(schema.vagasStatus.sistema, true),
    });
    if (!statusEmAberto) {
      throw new Error('catálogo de status sem o status "Em aberto" — rode a migration de seed');
    }

    const importRow = await tx
      .insert(schema.vagasQuadroImports)
      .values({
        arquivoNome: opts.arquivoNome,
        importadoPorNome: opts.importadoPorNome,
        totalLinhas: linhas.length,
        filiaisDesconhecidas,
      })
      .returning({ id: schema.vagasQuadroImports.id });
    const importId = importRow[0]!.id;

    let vagasCriadas = 0;
    let vagasFechadas = 0;
    const linhaIdsTocadas = new Set<string>();

    for (const { linha, filialId } of resolvidas) {
      const upsert = await tx
        .insert(schema.vagasQuadroLinhas)
        .values({
          filialId,
          regional: linha.regional || null,
          bandeira: linha.bandeira || null,
          funcao: linha.funcao,
          secao: linha.secao,
          limite: linha.limite,
          potencial: linha.potencial,
          alocados: linha.alocados,
          afastados: linha.afastados,
          emAbertoImportado: linha.emAberto,
          ultimaImportId: importId,
        })
        .onConflictDoUpdate({
          target: [
            schema.vagasQuadroLinhas.filialId,
            schema.vagasQuadroLinhas.funcao,
            schema.vagasQuadroLinhas.secao,
          ],
          set: {
            regional: linha.regional || null,
            bandeira: linha.bandeira || null,
            limite: linha.limite,
            potencial: linha.potencial,
            alocados: linha.alocados,
            afastados: linha.afastados,
            emAbertoImportado: linha.emAberto,
            ultimaImportId: importId,
            updatedAt: new Date(),
          },
        })
        .returning({ id: schema.vagasQuadroLinhas.id });
      const linhaId = upsert[0]!.id;
      linhaIdsTocadas.add(linhaId);

      const abertas = await tx
        .select({ id: schema.vagas.id, createdAt: schema.vagas.createdAt })
        .from(schema.vagas)
        .innerJoin(schema.vagasStatus, eq(schema.vagasStatus.id, schema.vagas.statusId))
        .where(
          and(
            eq(schema.vagas.linhaId, linhaId),
            eq(schema.vagas.ativa, true),
            eq(schema.vagasStatus.sistema, true),
          ),
        );

      const plano = planejarReconciliacao(abertas, linha.emAberto);

      if (plano.criar > 0) {
        await tx.insert(schema.vagas).values(
          Array.from({ length: plano.criar }, () => ({
            linhaId,
            filialId,
            funcao: linha.funcao,
            secao: linha.secao,
            statusId: statusEmAberto.id,
            origemImportId: importId,
          })),
        );
        vagasCriadas += plano.criar;
      }
      if (plano.fecharIds.length > 0) {
        await tx
          .update(schema.vagas)
          .set({ ativa: false, motivoFechamento: 'ajuste_importacao' })
          .where(inArray(schema.vagas.id, plano.fecharIds));
        vagasFechadas += plano.fecharIds.length;
      }
    }

    // Zera (fecha) combinações que existiam antes e não vieram nesta planilha.
    let linhasZeradas = 0;
    const linhasAusentes = await tx
      .select({ id: schema.vagasQuadroLinhas.id })
      .from(schema.vagasQuadroLinhas)
      .where(
        linhaIdsTocadas.size > 0
          ? notInArray(schema.vagasQuadroLinhas.id, Array.from(linhaIdsTocadas))
          : sql`true`,
      );
    for (const l of linhasAusentes) {
      const abertas = await tx
        .select({ id: schema.vagas.id, createdAt: schema.vagas.createdAt })
        .from(schema.vagas)
        .innerJoin(schema.vagasStatus, eq(schema.vagasStatus.id, schema.vagas.statusId))
        .where(
          and(
            eq(schema.vagas.linhaId, l.id),
            eq(schema.vagas.ativa, true),
            eq(schema.vagasStatus.sistema, true),
          ),
        );
      if (abertas.length === 0) continue;
      const plano = planejarReconciliacao(abertas, 0);
      await tx
        .update(schema.vagas)
        .set({ ativa: false, motivoFechamento: 'ajuste_importacao' })
        .where(inArray(schema.vagas.id, plano.fecharIds));
      vagasFechadas += plano.fecharIds.length;
      linhasZeradas += 1;
    }

    await tx
      .update(schema.vagasQuadroImports)
      .set({ vagasCriadas, vagasFechadas })
      .where(eq(schema.vagasQuadroImports.id, importId));

    return {
      totalLinhas: linhas.length,
      linhasValidas: resolvidas.length,
      filiaisDesconhecidas,
      vagasCriadas,
      vagasFechadas,
      linhasZeradas,
    };
  });
}
```

- [ ] **Step 2: Typecheck**

Run: `node "node_modules/typescript/bin/tsc" --noEmit`
Expected: sem erros novos em `lib/vagas/import-sync.ts`. Se `onConflictDoUpdate` reclamar do `target`, confira que `vagas_quadro_linhas_unq` foi criado como `uniqueIndex` (não `index`) na Task 1 — é isso que o Drizzle exige para inferir o conflito.

- [ ] **Step 3: Commit**

```bash
git add lib/vagas/import-sync.ts
git commit -m "feat(vagas): orquestração de import com preview e apply

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

## Task 5: Server Actions — import, status, atualização de vaga

**Files:**
- Create: `actions/vagas/importar.ts`
- Create: `actions/vagas/status.ts`
- Create: `actions/vagas/vagas.ts`

- [ ] **Step 1: `actions/vagas/importar.ts`**

```ts
'use server';

import { revalidatePath } from 'next/cache';
import { requireSession } from '@/lib/auth/session';
import { parseQuadroVagas } from '@/lib/vagas/xls-parser';
import { previewImportVagas, aplicarImportVagas, type ImportSummaryVagas } from '@/lib/vagas/import-sync';

export type { ImportSummaryVagas };

export async function previewImportVagasAction(formData: FormData): Promise<ImportSummaryVagas> {
  await requireSession('admin');
  const file = formData.get('arquivo') as File | null;
  if (!file) throw new Error('arquivo ausente');
  const buf = Buffer.from(await file.arrayBuffer());
  const linhas = parseQuadroVagas(buf);
  return previewImportVagas(linhas);
}

export async function aplicarImportVagasAction(formData: FormData): Promise<ImportSummaryVagas> {
  const s = await requireSession('admin');
  const file = formData.get('arquivo') as File | null;
  if (!file) throw new Error('arquivo ausente');
  const buf = Buffer.from(await file.arrayBuffer());
  const linhas = parseQuadroVagas(buf);
  const summary = await aplicarImportVagas(linhas, {
    arquivoNome: file.name,
    importadoPorNome: s.nome ?? s.usuario,
  });
  revalidatePath('/vagas');
  revalidatePath('/vagas/importar');
  return summary;
}
```

- [ ] **Step 2: `actions/vagas/status.ts`**

```ts
'use server';

import { revalidatePath } from 'next/cache';
import { desc, eq } from 'drizzle-orm';
import { db, schema } from '@/db/client';
import { requireSession } from '@/lib/auth/session';

export async function listarStatusVagas() {
  await requireSession();
  return db.select().from(schema.vagasStatus).orderBy(schema.vagasStatus.ordem);
}

export async function criarStatusVaga(nome: string) {
  await requireSession('admin');
  const nomeLimpo = nome.trim();
  if (!nomeLimpo) throw new Error('nome do status é obrigatório');

  const max = await db
    .select({ ordem: schema.vagasStatus.ordem })
    .from(schema.vagasStatus)
    .orderBy(desc(schema.vagasStatus.ordem))
    .limit(1);
  const ordem = (max[0]?.ordem ?? 0) + 1;

  await db.insert(schema.vagasStatus).values({ nome: nomeLimpo, ordem, sistema: false, ativo: true });
  revalidatePath('/vagas/status');
  revalidatePath('/vagas');
}

export async function editarStatusVaga(id: string, nome: string, ordem: number) {
  await requireSession('admin');
  const atual = await db.query.vagasStatus.findFirst({ where: eq(schema.vagasStatus.id, id) });
  if (!atual) throw new Error('status não encontrado');
  if (atual.sistema) throw new Error('status "Em aberto" não pode ser renomeado');

  const nomeLimpo = nome.trim();
  if (!nomeLimpo) throw new Error('nome do status é obrigatório');

  await db.update(schema.vagasStatus).set({ nome: nomeLimpo, ordem }).where(eq(schema.vagasStatus.id, id));
  revalidatePath('/vagas/status');
  revalidatePath('/vagas');
}

export async function alternarAtivoStatusVaga(id: string, ativo: boolean) {
  await requireSession('admin');
  const atual = await db.query.vagasStatus.findFirst({ where: eq(schema.vagasStatus.id, id) });
  if (!atual) throw new Error('status não encontrado');
  if (atual.sistema && !ativo) throw new Error('status "Em aberto" não pode ser desativado');

  await db.update(schema.vagasStatus).set({ ativo }).where(eq(schema.vagasStatus.id, id));
  revalidatePath('/vagas/status');
  revalidatePath('/vagas');
}

export async function excluirStatusVaga(id: string) {
  await requireSession('admin');
  const atual = await db.query.vagasStatus.findFirst({ where: eq(schema.vagasStatus.id, id) });
  if (!atual) throw new Error('status não encontrado');
  if (atual.sistema) throw new Error('status "Em aberto" não pode ser excluído');

  const emUso = await db
    .select({ id: schema.vagas.id })
    .from(schema.vagas)
    .where(eq(schema.vagas.statusId, id))
    .limit(1);
  if (emUso.length > 0) {
    throw new Error('status em uso por vagas — desative em vez de excluir');
  }

  await db.delete(schema.vagasStatus).where(eq(schema.vagasStatus.id, id));
  revalidatePath('/vagas/status');
}
```

- [ ] **Step 3: `actions/vagas/vagas.ts`**

```ts
'use server';

import { revalidatePath } from 'next/cache';
import { eq } from 'drizzle-orm';
import { db, schema } from '@/db/client';
import { requireSession } from '@/lib/auth/session';

export async function atualizarStatusVaga(vagaId: string, statusId: string) {
  const s = await requireSession();
  if (s.perfil === 'visualizador') throw new Error('perfil somente leitura');

  const vaga = await db.query.vagas.findFirst({ where: eq(schema.vagas.id, vagaId) });
  if (!vaga) throw new Error('vaga não encontrada');
  if (s.perfil === 'filial' && vaga.filialId !== s.filialId) {
    throw new Error('sem permissão para vagas de outra filial');
  }

  const status = await db.query.vagasStatus.findFirst({ where: eq(schema.vagasStatus.id, statusId) });
  if (!status || !status.ativo) throw new Error('status inválido ou inativo');

  const nomeAtor = s.perfil === 'admin' ? (s.nome ?? s.usuario) : s.filialNome;

  await db
    .update(schema.vagas)
    .set({ statusId, statusAtualizadoEm: new Date(), statusAtualizadoPorNome: nomeAtor })
    .where(eq(schema.vagas.id, vagaId));

  revalidatePath('/vagas');
}
```

- [ ] **Step 4: Typecheck**

Run: `node "node_modules/typescript/bin/tsc" --noEmit`
Expected: sem erros novos nos 3 arquivos criados.

- [ ] **Step 5: Commit**

```bash
git add actions/vagas
git commit -m "feat(vagas): server actions de import, catálogo de status e atualização de vaga

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

## Task 6: Componentes de UI

**Files:**
- Create: `components/vagas/ImportVagasPreview.tsx`
- Create: `components/vagas/StatusCatalogoManager.tsx`
- Create: `components/vagas/VagasQuadroTable.tsx`
- Create: `components/vagas/VagasPorStatusChart.tsx`
- Create: `components/vagas/VagasAbertoPorFilialChart.tsx`

- [ ] **Step 1: `components/vagas/ImportVagasPreview.tsx`** (mirror de `components/qlp/ImportPreview.tsx`)

```tsx
'use client';

import { useState, useTransition } from 'react';
import {
  previewImportVagasAction,
  aplicarImportVagasAction,
  type ImportSummaryVagas,
} from '@/actions/vagas/importar';

export function ImportVagasPreview() {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<ImportSummaryVagas | null>(null);
  const [pending, start] = useTransition();
  const [erro, setErro] = useState<string | null>(null);
  const [sucesso, setSucesso] = useState<string | null>(null);

  async function onPreview() {
    if (!file) return;
    setErro(null);
    setSucesso(null);
    const fd = new FormData();
    fd.append('arquivo', file);
    start(async () => {
      try {
        const p = await previewImportVagasAction(fd);
        setPreview(p);
      } catch (e) {
        setErro(e instanceof Error ? e.message : 'erro ao processar');
      }
    });
  }

  async function onApply() {
    if (!file) return;
    if (!confirm('Aplicar este import? Vagas "Em aberto" serão criadas/fechadas automaticamente conforme a planilha.')) return;
    setErro(null);
    const fd = new FormData();
    fd.append('arquivo', file);
    start(async () => {
      try {
        const r = await aplicarImportVagasAction(fd);
        setSucesso(
          `Import aplicado: ${r.vagasCriadas} vagas criadas, ${r.vagasFechadas} fechadas automaticamente, ${r.linhasZeradas} combinações zeradas.`,
        );
        setPreview(null);
        setFile(null);
      } catch (e) {
        setErro(e instanceof Error ? e.message : 'erro ao aplicar');
      }
    });
  }

  return (
    <div className="space-y-4">
      <div className="rounded-2xl bg-white border border-conecta-primary/10 p-4">
        <label className="block text-[11px] uppercase tracking-[0.18em] font-semibold text-conecta-primary mb-2">
          Planilha do Quadro de Vagas
        </label>
        <input
          type="file"
          accept=".xls,.xlsx"
          onChange={(e) => {
            setFile(e.target.files?.[0] ?? null);
            setPreview(null);
            setSucesso(null);
          }}
          className="block w-full text-sm text-conecta-text file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-conecta-primary file:text-white hover:file:brightness-110 file:font-display file:font-semibold file:cursor-pointer"
        />
        <div className="flex gap-2 mt-3">
          <button
            disabled={!file || pending}
            onClick={onPreview}
            className="rounded-lg bg-conecta-primary text-white px-4 py-2 text-sm font-display font-semibold hover:brightness-110 disabled:opacity-50 transition"
          >
            {pending && !preview ? 'Processando…' : 'Pré-visualizar'}
          </button>
          {preview && (
            <button
              disabled={pending}
              onClick={onApply}
              className="rounded-lg bg-conecta-accent text-white px-4 py-2 text-sm font-display font-semibold hover:brightness-110 disabled:opacity-50 transition"
            >
              {pending ? 'Aplicando…' : 'Aplicar import'}
            </button>
          )}
        </div>
      </div>

      {erro && (
        <div className="rounded-2xl bg-rose-50 border border-rose-200 text-rose-900 p-3 text-sm">{erro}</div>
      )}
      {sucesso && (
        <div className="rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 p-3 text-sm">
          {sucesso}
        </div>
      )}

      {preview && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Stat label="Total no arquivo" value={preview.totalLinhas} />
          <Stat label="Linhas válidas" value={preview.linhasValidas} />
          <Stat label="Vagas a criar" value={preview.vagasCriadas} tone="emerald" />
          <Stat label="Vagas a fechar" value={preview.vagasFechadas} tone="amber" />
          <Stat label="Combinações zeradas" value={preview.linhasZeradas} tone="amber" />
          <Stat label="Filiais desconhecidas" value={preview.filiaisDesconhecidas.length} tone="rose" />
          {preview.filiaisDesconhecidas.length > 0 && (
            <div className="col-span-full rounded-2xl bg-rose-50 border border-rose-200 text-rose-900 p-3 text-sm">
              Códigos de filial não cadastrados (linhas ignoradas): {preview.filiaisDesconhecidas.join(', ')}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function Stat({
  label,
  value,
  tone = 'slate',
}: {
  label: string;
  value: number;
  tone?: 'slate' | 'emerald' | 'amber' | 'rose';
}) {
  const toneClass: Record<typeof tone, string> = {
    slate: 'bg-white text-conecta-primary border-conecta-primary/10',
    emerald: 'bg-emerald-50 text-emerald-900 border-emerald-200',
    amber: 'bg-amber-50 text-amber-900 border-amber-200',
    rose: 'bg-rose-50 text-rose-900 border-rose-200',
  };
  return (
    <div className={`rounded-2xl border p-3 ${toneClass[tone]}`}>
      <div className="text-[10px] uppercase tracking-[0.18em] font-semibold">{label}</div>
      <div className="font-display text-2xl font-extrabold mt-1 tabular-nums">{value}</div>
    </div>
  );
}
```

- [ ] **Step 2: `components/vagas/StatusCatalogoManager.tsx`**

```tsx
'use client';

import { useState, useTransition } from 'react';
import { Trash2, Pencil, Plus, X, Check } from 'lucide-react';
import { ConectaCard, SectionHeader } from '@/components/ui/conecta-card';
import {
  criarStatusVaga,
  editarStatusVaga,
  alternarAtivoStatusVaga,
  excluirStatusVaga,
} from '@/actions/vagas/status';
import type { VagaStatus } from '@/db/schema';

export function StatusCatalogoManager({ statusInicial }: { statusInicial: VagaStatus[] }) {
  const [lista, setLista] = useState(statusInicial);
  const [novoNome, setNovoNome] = useState('');
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [editNome, setEditNome] = useState('');
  const [pending, start] = useTransition();
  const [erro, setErro] = useState<string | null>(null);

  function refrescarLocal(fn: (l: VagaStatus[]) => VagaStatus[]) {
    setLista((l) => fn(l));
  }

  function onCriar() {
    const nome = novoNome.trim();
    if (!nome) return;
    setErro(null);
    start(async () => {
      try {
        await criarStatusVaga(nome);
        setNovoNome('');
        refrescarLocal((l) => [
          ...l,
          { id: crypto.randomUUID(), nome, ordem: l.length, sistema: false, ativo: true, createdAt: new Date() },
        ]);
      } catch (e) {
        setErro(e instanceof Error ? e.message : 'erro ao criar status');
      }
    });
  }

  function onSalvarEdicao(id: string) {
    const nome = editNome.trim();
    if (!nome) return;
    const ordemAtual = lista.find((s) => s.id === id)?.ordem ?? 0;
    setErro(null);
    start(async () => {
      try {
        await editarStatusVaga(id, nome, ordemAtual);
        refrescarLocal((l) => l.map((s) => (s.id === id ? { ...s, nome } : s)));
        setEditandoId(null);
      } catch (e) {
        setErro(e instanceof Error ? e.message : 'erro ao editar status');
      }
    });
  }

  function onAlternarAtivo(id: string, ativo: boolean) {
    setErro(null);
    start(async () => {
      try {
        await alternarAtivoStatusVaga(id, ativo);
        refrescarLocal((l) => l.map((s) => (s.id === id ? { ...s, ativo } : s)));
      } catch (e) {
        setErro(e instanceof Error ? e.message : 'erro ao alterar status');
      }
    });
  }

  function onExcluir(id: string) {
    if (!confirm('Excluir este status? Só é possível se nenhuma vaga estiver usando ele.')) return;
    setErro(null);
    start(async () => {
      try {
        await excluirStatusVaga(id);
        refrescarLocal((l) => l.filter((s) => s.id !== id));
      } catch (e) {
        setErro(e instanceof Error ? e.message : 'erro ao excluir status');
      }
    });
  }

  return (
    <ConectaCard noPadding>
      <div className="p-5 space-y-4">
        <SectionHeader label="Catálogo de status" />

        {erro && (
          <div className="rounded-2xl bg-rose-50 border border-rose-200 text-rose-900 p-3 text-sm">{erro}</div>
        )}

        <div className="flex gap-2">
          <input
            value={novoNome}
            onChange={(e) => setNovoNome(e.target.value)}
            placeholder="Novo status (ex.: Exames admissionais)"
            className="flex-1 rounded-lg border border-conecta-primary/15 px-3 py-2 text-sm"
          />
          <button
            type="button"
            disabled={pending || !novoNome.trim()}
            onClick={onCriar}
            className="inline-flex items-center gap-1.5 rounded-lg bg-conecta-accent text-white px-3 py-2 text-sm font-display font-semibold hover:brightness-110 disabled:opacity-50"
          >
            <Plus className="h-4 w-4" /> Incluir
          </button>
        </div>

        <ul className="divide-y divide-conecta-primary/8">
          {lista
            .slice()
            .sort((a, b) => a.ordem - b.ordem)
            .map((s) => (
              <li key={s.id} className="py-2.5 flex items-center gap-3">
                {editandoId === s.id ? (
                  <>
                    <input
                      value={editNome}
                      onChange={(e) => setEditNome(e.target.value)}
                      className="flex-1 rounded-lg border border-conecta-primary/15 px-2 py-1.5 text-sm"
                    />
                    <button type="button" onClick={() => onSalvarEdicao(s.id)} disabled={pending} className="text-emerald-700">
                      <Check className="h-4 w-4" />
                    </button>
                    <button type="button" onClick={() => setEditandoId(null)} className="text-slate-500">
                      <X className="h-4 w-4" />
                    </button>
                  </>
                ) : (
                  <>
                    <span className={`flex-1 text-sm ${s.ativo ? 'text-conecta-text' : 'text-slate-400 line-through'}`}>
                      {s.nome} {s.sistema && <span className="text-[10px] uppercase text-conecta-muted">· sistema</span>}
                    </span>
                    {!s.sistema && (
                      <>
                        <button
                          type="button"
                          onClick={() => { setEditandoId(s.id); setEditNome(s.nome); }}
                          className="text-conecta-primary"
                          title="Editar"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          disabled={pending}
                          onClick={() => onAlternarAtivo(s.id, !s.ativo)}
                          className="text-[11px] font-display font-semibold uppercase tracking-wide text-conecta-muted hover:text-conecta-primary"
                        >
                          {s.ativo ? 'Desativar' : 'Reativar'}
                        </button>
                        <button
                          type="button"
                          disabled={pending}
                          onClick={() => onExcluir(s.id)}
                          className="text-rose-600"
                          title="Excluir"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </>
                    )}
                  </>
                )}
              </li>
            ))}
        </ul>
      </div>
    </ConectaCard>
  );
}
```

- [ ] **Step 3: `components/vagas/VagasQuadroTable.tsx`**

```tsx
'use client';

import { useMemo, useState, useTransition } from 'react';
import { Users, Search } from 'lucide-react';
import { ConectaCard, SectionHeader } from '@/components/ui/conecta-card';
import { atualizarStatusVaga } from '@/actions/vagas/vagas';
import type { VagaStatus } from '@/db/schema';

export interface VagaRow {
  id: string;
  filialCodigo: string;
  filialNome: string;
  funcao: string;
  secao: string | null;
  statusId: string;
  statusNome: string;
  statusAtualizadoEm: string;
  statusAtualizadoPorNome: string | null;
  limite: number;
  potencial: number;
  alocados: number;
  afastados: number;
}

export function VagasQuadroTable({
  rows,
  statusOptions,
  podeEditar,
}: {
  rows: VagaRow[];
  statusOptions: VagaStatus[];
  podeEditar: boolean;
}) {
  const [busca, setBusca] = useState('');
  const [filialFiltro, setFilialFiltro] = useState('');
  const [statusFiltro, setStatusFiltro] = useState('');
  const [localRows, setLocalRows] = useState(rows);
  const [pending, start] = useTransition();
  const [erroId, setErroId] = useState<string | null>(null);

  const filiaisList = useMemo(() => {
    const set = new Set(localRows.map((r) => r.filialCodigo));
    return Array.from(set).sort();
  }, [localRows]);

  const filtradas = useMemo(() => {
    const q = busca.trim().toLowerCase();
    return localRows.filter((r) => {
      if (filialFiltro && r.filialCodigo !== filialFiltro) return false;
      if (statusFiltro && r.statusId !== statusFiltro) return false;
      if (q && !`${r.funcao} ${r.secao ?? ''}`.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [localRows, busca, filialFiltro, statusFiltro]);

  function onMudarStatus(vagaId: string, statusId: string) {
    setErroId(null);
    const anterior = localRows;
    const status = statusOptions.find((s) => s.id === statusId);
    setLocalRows((l) =>
      l.map((r) => (r.id === vagaId ? { ...r, statusId, statusNome: status?.nome ?? r.statusNome } : r)),
    );
    start(async () => {
      try {
        await atualizarStatusVaga(vagaId, statusId);
      } catch (e) {
        setLocalRows(anterior);
        setErroId(e instanceof Error ? e.message : 'erro ao atualizar status');
      }
    });
  }

  return (
    <ConectaCard noPadding>
      <div className="p-5 pb-3 space-y-3">
        <SectionHeader
          label="Vagas em aberto"
          icon={Users}
          action={
            <span className="text-[11px] font-display font-semibold tabular-nums text-conecta-muted">
              {filtradas.length} / {localRows.length}
            </span>
          }
        />
        <div className="flex flex-wrap gap-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-conecta-muted" />
            <input
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Buscar função/seção…"
              className="rounded-lg border border-conecta-primary/15 pl-8 pr-3 py-1.5 text-sm"
            />
          </div>
          <select value={filialFiltro} onChange={(e) => setFilialFiltro(e.target.value)} className="rounded-lg border border-conecta-primary/15 px-3 py-1.5 text-sm">
            <option value="">Todas as filiais</option>
            {filiaisList.map((f) => <option key={f} value={f}>{f}</option>)}
          </select>
          <select value={statusFiltro} onChange={(e) => setStatusFiltro(e.target.value)} className="rounded-lg border border-conecta-primary/15 px-3 py-1.5 text-sm">
            <option value="">Todos os status</option>
            {statusOptions.map((s) => <option key={s.id} value={s.id}>{s.nome}</option>)}
          </select>
        </div>
      </div>

      {erroId && (
        <div className="mx-5 mb-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-900 p-2 text-xs">{erroId}</div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-[10px] uppercase tracking-[0.14em] text-conecta-muted border-t border-conecta-primary/8">
              <th className="px-5 py-2">Filial</th>
              <th className="px-5 py-2">Função</th>
              <th className="px-5 py-2">Seção</th>
              <th className="px-5 py-2">Limite/Alocados</th>
              <th className="px-5 py-2">Status</th>
              <th className="px-5 py-2">Atualizado</th>
            </tr>
          </thead>
          <tbody>
            {filtradas.map((r) => (
              <tr key={r.id} className="border-t border-conecta-primary/6 hover:bg-slate-50/60">
                <td className="px-5 py-2.5 font-mono text-xs">{r.filialCodigo}</td>
                <td className="px-5 py-2.5 font-display font-semibold text-conecta-primary">{r.funcao}</td>
                <td className="px-5 py-2.5 text-conecta-muted">{r.secao ?? '—'}</td>
                <td className="px-5 py-2.5 tabular-nums text-conecta-muted">{r.limite} / {r.alocados}</td>
                <td className="px-5 py-2.5">
                  {podeEditar ? (
                    <select
                      value={r.statusId}
                      disabled={pending}
                      onChange={(e) => onMudarStatus(r.id, e.target.value)}
                      className="rounded-lg border border-conecta-primary/15 px-2 py-1 text-xs"
                    >
                      {statusOptions.map((s) => (
                        <option key={s.id} value={s.id}>{s.nome}</option>
                      ))}
                    </select>
                  ) : (
                    <span className="text-xs">{r.statusNome}</span>
                  )}
                </td>
                <td className="px-5 py-2.5 text-xs text-conecta-muted">
                  {new Date(r.statusAtualizadoEm).toLocaleDateString('pt-BR')}
                  {r.statusAtualizadoPorNome ? ` · ${r.statusAtualizadoPorNome}` : ''}
                </td>
              </tr>
            ))}
            {filtradas.length === 0 && (
              <tr>
                <td colSpan={6} className="px-5 py-8 text-center text-conecta-muted text-sm">
                  Nenhuma vaga encontrada.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </ConectaCard>
  );
}
```

- [ ] **Step 4: `components/vagas/VagasPorStatusChart.tsx`**

```tsx
'use client';

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip, LabelList } from 'recharts';
import { ConectaCard, SectionHeader } from '@/components/ui/conecta-card';

export function VagasPorStatusChart({ data }: { data: { status: string; total: number }[] }) {
  return (
    <ConectaCard>
      <SectionHeader label="Vagas por status" />
      <div className="h-72 w-full mt-3">
        <ResponsiveContainer>
          <BarChart data={data} margin={{ top: 20, right: 16, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="status" tick={{ fontSize: 10 }} interval={0} angle={-15} textAnchor="end" height={60} />
            <YAxis allowDecimals={false} />
            <Tooltip />
            <Bar dataKey="total" fill="#E8621A">
              <LabelList dataKey="total" position="top" style={{ fontSize: 11, fill: '#0D2B6B', fontWeight: 700 }} />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </ConectaCard>
  );
}
```

- [ ] **Step 5: `components/vagas/VagasAbertoPorFilialChart.tsx`**

```tsx
'use client';

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip, LabelList } from 'recharts';
import { ConectaCard, SectionHeader } from '@/components/ui/conecta-card';

export function VagasAbertoPorFilialChart({ data }: { data: { filial: string; total: number }[] }) {
  return (
    <ConectaCard>
      <SectionHeader label="Vagas em aberto por filial" />
      <div className="h-72 w-full mt-3">
        <ResponsiveContainer>
          <BarChart data={data} margin={{ top: 20, right: 16, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="filial" tick={{ fontSize: 11 }} />
            <YAxis allowDecimals={false} />
            <Tooltip />
            <Bar dataKey="total" fill="#0D2B6B">
              <LabelList dataKey="total" position="top" style={{ fontSize: 11, fill: '#0D2B6B', fontWeight: 700 }} />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </ConectaCard>
  );
}
```

- [ ] **Step 6: Typecheck**

Run: `node "node_modules/typescript/bin/tsc" --noEmit`
Expected: sem erros novos nos 5 componentes.

- [ ] **Step 7: Commit**

```bash
git add components/vagas
git commit -m "feat(vagas): componentes de UI (import, catálogo de status, tabela, gráficos)

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

## Task 7: Páginas do módulo

**Files:**
- Create: `app/(app)/vagas/layout.tsx`
- Create: `app/(app)/vagas/page.tsx`
- Create: `app/(app)/vagas/importar/page.tsx`
- Create: `app/(app)/vagas/status/page.tsx`

- [ ] **Step 1: `app/(app)/vagas/layout.tsx`**

```tsx
import { requireSession } from '@/lib/auth/session';

export default async function VagasLayout({ children }: { children: React.ReactNode }) {
  await requireSession();
  return <>{children}</>;
}
```

- [ ] **Step 2: `app/(app)/vagas/page.tsx`**

```tsx
import { and, eq, inArray } from 'drizzle-orm';
import { db, schema } from '@/db/client';
import { requireSession, getFiliaisVisiveis } from '@/lib/auth/session';
import { TopBar } from '@/components/layout/TopBar';
import { VagasQuadroTable, type VagaRow } from '@/components/vagas/VagasQuadroTable';
import { VagasPorStatusChart } from '@/components/vagas/VagasPorStatusChart';
import { VagasAbertoPorFilialChart } from '@/components/vagas/VagasAbertoPorFilialChart';

export const dynamic = 'force-dynamic';

export default async function VagasPage() {
  const s = await requireSession();
  const escopo = getFiliaisVisiveis(s);

  const condicoes = [eq(schema.vagas.ativa, true)];
  if (escopo) condicoes.push(inArray(schema.vagas.filialId, escopo));

  const rowsRaw = await db
    .select({
      id: schema.vagas.id,
      filialCodigo: schema.filiais.codigo,
      filialNome: schema.filiais.nome,
      funcao: schema.vagas.funcao,
      secao: schema.vagas.secao,
      statusId: schema.vagas.statusId,
      statusNome: schema.vagasStatus.nome,
      statusAtualizadoEm: schema.vagas.statusAtualizadoEm,
      statusAtualizadoPorNome: schema.vagas.statusAtualizadoPorNome,
      limite: schema.vagasQuadroLinhas.limite,
      potencial: schema.vagasQuadroLinhas.potencial,
      alocados: schema.vagasQuadroLinhas.alocados,
      afastados: schema.vagasQuadroLinhas.afastados,
    })
    .from(schema.vagas)
    .innerJoin(schema.filiais, eq(schema.filiais.id, schema.vagas.filialId))
    .innerJoin(schema.vagasStatus, eq(schema.vagasStatus.id, schema.vagas.statusId))
    .innerJoin(schema.vagasQuadroLinhas, eq(schema.vagasQuadroLinhas.id, schema.vagas.linhaId))
    .where(and(...condicoes))
    .orderBy(schema.filiais.codigo, schema.vagas.funcao);

  const rows: VagaRow[] = rowsRaw.map((r) => ({
    ...r,
    statusAtualizadoEm: r.statusAtualizadoEm.toISOString(),
  }));

  const statusOptions = await db
    .select()
    .from(schema.vagasStatus)
    .where(eq(schema.vagasStatus.ativo, true))
    .orderBy(schema.vagasStatus.ordem);

  const porStatus = new Map<string, number>();
  for (const r of rows) porStatus.set(r.statusNome, (porStatus.get(r.statusNome) ?? 0) + 1);
  const chartStatus = Array.from(porStatus.entries()).map(([status, total]) => ({ status, total }));

  const statusSistema = statusOptions.find((st) => st.sistema);
  const porFilial = new Map<string, number>();
  for (const r of rows) {
    if (statusSistema && r.statusId !== statusSistema.id) continue;
    porFilial.set(r.filialCodigo, (porFilial.get(r.filialCodigo) ?? 0) + 1);
  }
  const chartFilial = Array.from(porFilial.entries())
    .map(([filial, total]) => ({ filial, total }))
    .sort((a, b) => a.filial.localeCompare(b.filial));

  const podeEditar = s.perfil === 'admin' || s.perfil === 'filial';
  const badge =
    s.perfil === 'filial' ? `Filial ${s.filialCodigo}` :
    s.perfil === 'admin'  ? 'ADMIN' :
    (s.escopo === 'nacional' ? 'NACIONAL' : 'REGIONAL');

  return (
    <>
      <TopBar titulo="Quadro de Vagas" subtitulo={`${rows.length} vagas ativas`} badge={badge} />
      <div className="space-y-5 p-4 lg:p-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <VagasPorStatusChart data={chartStatus} />
          <VagasAbertoPorFilialChart data={chartFilial} />
        </div>
        <VagasQuadroTable rows={rows} statusOptions={statusOptions} podeEditar={podeEditar} />
      </div>
    </>
  );
}
```

- [ ] **Step 3: `app/(app)/vagas/importar/page.tsx`**

```tsx
import { requireSession } from '@/lib/auth/session';
import { TopBar } from '@/components/layout/TopBar';
import { ImportVagasPreview } from '@/components/vagas/ImportVagasPreview';

export const dynamic = 'force-dynamic';

export default async function ImportarVagasPage() {
  await requireSession('admin');
  return (
    <>
      <TopBar
        titulo="Quadro de Vagas — Importar"
        subtitulo="Upload da planilha · preview antes de aplicar"
        badge="ADMIN"
      />
      <div className="space-y-5 p-4 lg:p-6">
        <ImportVagasPreview />
      </div>
    </>
  );
}
```

- [ ] **Step 4: `app/(app)/vagas/status/page.tsx`**

```tsx
import { requireSession } from '@/lib/auth/session';
import { db, schema } from '@/db/client';
import { TopBar } from '@/components/layout/TopBar';
import { StatusCatalogoManager } from '@/components/vagas/StatusCatalogoManager';

export const dynamic = 'force-dynamic';

export default async function StatusVagasPage() {
  await requireSession('admin');
  const status = await db.select().from(schema.vagasStatus).orderBy(schema.vagasStatus.ordem);
  return (
    <>
      <TopBar titulo="Quadro de Vagas — Status" subtitulo="Catálogo de status das vagas" badge="ADMIN" />
      <div className="space-y-5 p-4 lg:p-6">
        <StatusCatalogoManager statusInicial={status} />
      </div>
    </>
  );
}
```

- [ ] **Step 5: Typecheck**

Run: `node "node_modules/typescript/bin/tsc" --noEmit`
Expected: sem erros novos nas 4 páginas.

- [ ] **Step 6: Commit**

```bash
git add "app/(app)/vagas"
git commit -m "feat(vagas): páginas do módulo Quadro de Vagas

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

## Task 8: Navegação e card na tela inicial

**Files:**
- Modify: `components/layout/nav-config.ts`
- Modify: `components/layout/Sidebar.tsx`
- Modify: `app/inicio/page.tsx`

- [ ] **Step 1: Adicionar nav do módulo em `components/layout/nav-config.ts`**

No topo do arquivo, adicione `ClipboardList` (já importado) e `Briefcase` aos imports do `lucide-react` (linha 2-8):

```ts
import type { LucideIcon } from 'lucide-react';
import {
  LayoutDashboard, Users, FileText, Settings, ShieldCheck, ClipboardList, History,
  CalendarClock, Plus, BarChart3, UserCog, Target, BookOpen, Printer, ClipboardCheck,
  GalleryHorizontal, Cloud, Clock, AlertTriangle, Trophy, GraduationCap, CalendarOff,
  Network, Upload, IdCard, ListTree, UsersRound,
  Bus, Route, Briefcase, ListChecks,
} from 'lucide-react';
```

No final do arquivo, adicione:

```ts
export const VAGAS_NAV_BASE: NavItem[] = [
  { href: '/vagas', label: 'Quadro de Vagas', icon: Briefcase },
];
export const VAGAS_NAV_ADMIN_EXTRAS: NavItem[] = [
  { href: '/vagas/importar', label: 'Importar planilha', icon: Upload },
  { href: '/vagas/status',   label: 'Status',            icon: ListChecks },
];
```

- [ ] **Step 2: Wiring em `components/layout/Sidebar.tsx`**

Modifique o import (linha 11-18) acrescentando `VAGAS_NAV_BASE, VAGAS_NAV_ADMIN_EXTRAS`:

```ts
import {
  FILIAL_NAV, ADMIN_NAV, VISUALIZADOR_NAV, ENTREVISTAS_VISUALIZADOR_NAV,
  AVALIACAO_NAV_BASE, AVALIACAO_NAV_ADMIN_EXTRAS,
  ESCUTA_NAV_BASE, ESCUTA_NAV_ADMIN_EXTRAS,
  INDICADORES_NAV_BASE,
  QLP_NAV_BASE, QLP_NAV_ADMIN_EXTRAS,
  TRANSPORTE_NAV_BASE, TRANSPORTE_NAV_ADMIN_EXTRAS,
  VAGAS_NAV_BASE, VAGAS_NAV_ADMIN_EXTRAS,
} from './nav-config';
```

Depois de `const inTransporte = ...` (linha 44-47), adicione:

```ts
  const inVagas =
    pathname === '/vagas' ||
    pathname.startsWith('/vagas/');
```

No `nav = inTransporte ? ... : inQlp ? ...` (linha 57-81), adicione um novo ramo antes de `inQlp`:

```ts
  const nav = inTransporte
    ? perfil === 'admin'
      ? [...TRANSPORTE_NAV_BASE, ...TRANSPORTE_NAV_ADMIN_EXTRAS]
      : TRANSPORTE_NAV_BASE
    : inVagas
    ? perfil === 'admin'
      ? [...VAGAS_NAV_BASE, ...VAGAS_NAV_ADMIN_EXTRAS]
      : VAGAS_NAV_BASE
    : inQlp
    ? perfil === 'admin'
      ? [...QLP_NAV_BASE, ...QLP_NAV_ADMIN_EXTRAS]
      : QLP_NAV_BASE
    : inIndicadores
      ? INDICADORES_NAV_BASE
      : inEscuta
        ? perfil === 'admin'
          ? [...ESCUTA_NAV_BASE, ...ESCUTA_NAV_ADMIN_EXTRAS]
          : ESCUTA_NAV_BASE
        : inAvaliacao
          ? perfil === 'admin'
            ? [...AVALIACAO_NAV_BASE, ...AVALIACAO_NAV_ADMIN_EXTRAS]
            : AVALIACAO_NAV_BASE
          : inEntrevistasVisualizador
            ? ENTREVISTAS_VISUALIZADOR_NAV
            : perfil === 'admin'
              ? ADMIN_NAV
              : perfil === 'visualizador'
                ? VISUALIZADOR_NAV
                : FILIAL_NAV;
```

No `moduleLabel = inTransporte ? ... : inQlp ? ...` (linha 82-94), adicione o mesmo ramo:

```ts
  const moduleLabel = inTransporte
    ? 'Transporte'
    : inVagas
    ? 'Quadro de Vagas'
    : inQlp
    ? 'QLP & Liderança'
    : inIndicadores
      ? 'Indicadores'
      : inEscuta
        ? 'Escuta G&G'
        : inAvaliacao
          ? 'Avaliação de Desempenho'
          : inEntrevistasVisualizador
            ? 'Entrevistas'
            : 'Conecta G&G';
```

- [ ] **Step 3: Card na tela inicial `app/inicio/page.tsx`**

Adicione `Briefcase` aos imports do `lucide-react` (linha 2-13):

```ts
import {
  ClipboardList,
  BarChart3,
  ArrowRight,
  ShieldCheck,
  Settings,
  FileText,
  MessagesSquare,
  LineChart,
  Network,
  Bus,
  Briefcase,
} from 'lucide-react';
```

Depois do bloco `{/* QLP & Liderança */}` (que termina no `</Link>` da linha 269) e antes do bloco `{/* Transporte */}` (linha 271), adicione:

```tsx
          {/* Quadro de Vagas */}
          <Link
            href="/vagas"
            className="cg-module-card group relative rounded-2xl bg-white text-conecta-text p-5 overflow-hidden transition-all hover:-translate-y-0.5 hover:shadow-[0_20px_44px_-12px_rgba(13,43,107,0.45)]"
          >
            <span
              aria-hidden
              className="absolute top-0 left-0 right-0 h-1 w-full"
              style={{ background: '#0D2B6B' }}
            />
            <div className="absolute top-4 right-4 h-24 w-24 bg-conecta-primary/10 rounded-full blur-3xl group-hover:bg-conecta-primary/20 transition-colors" />
            <div className="relative flex items-start gap-4">
              <div
                className="grid place-items-center h-12 w-12 rounded-xl text-white shrink-0"
                style={{
                  background: '#0D2B6B',
                  boxShadow: '0 10px 22px -8px rgba(13,43,107,0.5)',
                }}
              >
                <Briefcase className="h-6 w-6" />
              </div>
              <div className="min-w-0 flex-1">
                <h2 className="font-display text-[18px] font-extrabold text-conecta-primary tracking-tight leading-tight">
                  Quadro de Vagas
                </h2>
                <p className="text-[12px] text-conecta-muted mt-1 leading-snug">
                  Vagas em aberto por filial, status de admissão e importação do quadro.
                </p>
                <div className="inline-flex items-center gap-2 text-[13px] font-display font-semibold text-conecta-primary group-hover:gap-3 transition-all mt-3">
                  Acessar
                  <ArrowRight className="h-4 w-4" />
                </div>
              </div>
            </div>
          </Link>

```

- [ ] **Step 4: Typecheck**

Run: `node "node_modules/typescript/bin/tsc" --noEmit`
Expected: sem erros novos nos 3 arquivos.

- [ ] **Step 5: Commit**

```bash
git add components/layout/nav-config.ts components/layout/Sidebar.tsx app/inicio/page.tsx
git commit -m "feat(vagas): navegação e card na tela inicial

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

## Task 9: Suíte de testes completa + smoke test manual

**Files:**
- (nenhum novo — validação final)

- [ ] **Step 1: Rodar toda a suíte de testes**

Run: `node "node_modules/vitest/vitest.mjs" run`
Expected: todos os testes passam, incluindo os 11 novos de `lib/vagas/*.test.ts` (5 do parser + 6 da reconciliação), sem regressão nos existentes.

- [ ] **Step 2: Typecheck completo**

Run: `node "node_modules/typescript/bin/tsc" --noEmit`
Expected: sem erros em todo o projeto.

- [ ] **Step 3: Smoke test manual via preview do navegador**

Use as ferramentas de preview (`preview_start` com o dev server do projeto) para validar, logado como admin:
1. Acessar `/inicio` → card "Quadro de Vagas" aparece e leva a `/vagas`.
2. `/vagas/status` → os 5 status padrão aparecem, "Em aberto" sem botões de editar/excluir; criar um status novo, editar seu nome, desativar e reativar.
3. `/vagas/importar` → subir `C:\Users\juliano.correa\Desktop\QL PERLOG 21.08.xlsx`, conferir a pré-visualização (vagas a criar = soma de `EM ABERTO` da planilha, já que o banco está vazio), aplicar.
4. `/vagas` → tabela mostra as vagas criadas, gráficos populados; trocar o status de uma vaga pelo select e confirmar que "Atualizado" reflete a mudança após reload.
5. Logar como uma filial (ex.: 364) → `/vagas` mostra só as vagas dessa filial; `/vagas/importar` e `/vagas/status` redirecionam (não-admin).
6. Reimportar a mesma planilha sem alterações → preview mostra `vagasCriadas: 0, vagasFechadas: 0`.

Reportar ao usuário qualquer divergência encontrada antes de considerar a task concluída.

- [ ] **Step 4: Commit final (se houver ajustes do smoke test)**

```bash
git add -A
git commit -m "fix(vagas): ajustes pós smoke test

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

(Pular este commit se o smoke test não exigiu nenhuma mudança.)

---

## Self-Review

**Cobertura da spec:**
- Granularidade (explode `EM ABERTO`) → Task 1 (`vagas` 1:N com `vagas_quadro_linhas`) + Task 4 (`aplicarImportVagas` cria N vagas).
- Reconciliação automática, fecha mais antigas primeiro, nunca mexe em status != "Em aberto" → Task 3 (`planejarReconciliacao`) + Task 4 (só busca `vagasStatus.sistema=true` para reconciliar).
- Combinação sumida = zera → Task 4 (`linhasAusentes`/`notInArray`).
- Fechamento é soft (`ativa=false`) → Task 1 (schema) + Task 4.
- Catálogo de status gerenciável, só admin, "Em aberto" protegido → Task 5 (`actions/vagas/status.ts`) + Task 6 (`StatusCatalogoManager`).
- Quem edita status de vaga (admin + filial própria) → Task 5 (`atualizarStatusVaga`).
- Import só admin → Task 5 (`requireSession('admin')` em `importar.ts`) + Task 7 (guard na página).
- Módulo aberto a todos, escopo por `getFiliaisVisiveis` → Task 7 (`layout.tsx` sem gate, `page.tsx` usa `getFiliaisVisiveis`).
- Gráficos (por status, em aberto por filial) → Task 6 + Task 7 (cálculo em `page.tsx`).
- Import com preview antes de aplicar (padrão do QLP) → Task 6 (`ImportVagasPreview`) + Task 7.
- Data/autor da última atualização de status → Task 1 (`statusAtualizadoEm`/`statusAtualizadoPorNome`) + Task 5.

**Scan de placeholders:** nenhum "TBD"/"TODO" encontrado; todo passo de código tem o código completo.

**Consistência de tipos:** `LinhaQuadroVagas` (Task 2) é usado sem alteração em `import-sync.ts` (Task 4); `VagaAbertaExistente`/`PlanoReconciliacao` (Task 3) usados como estão em `import-sync.ts`; `ImportSummaryVagas` (Task 4) é reexportado sem mudança por `actions/vagas/importar.ts` (Task 5) e consumido com os mesmos campos em `ImportVagasPreview.tsx` (Task 6); `VagaRow` (Task 6) preenchido com os mesmos campos em `page.tsx` (Task 7); `VagaStatus` (Task 1, tipo `$inferSelect`) usado em `StatusCatalogoManager` e `VagasQuadroTable` sem remapeamento.
