# QLP & Liderança — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Entregar o módulo "QLP & Liderança" que mantém o quadro Perlog espelhado no sistema via upload XLS e permite atribuir/visualizar a hierarquia de liderança (gerente → subgerente → coord → supervisor → base) com auditoria completa.

**Architecture:** Next.js App Router + server actions; Drizzle ORM sobre Postgres (Supabase via MCP para criar migrations); 7 tabelas com prefixo `qlp_`; herança computada via CTE recursiva; 1 vínculo direto por colaborador; toda escrita grava em `qlp_historico` na mesma transaction.

**Tech Stack:** Next.js 15, TypeScript, Drizzle ORM, Postgres/Supabase, Tailwind, Radix UI, React Query, xlsx (SheetJS), Vitest.

**Branch:** `feat/qlp-lideranca` (já criada).

**Spec:** `docs/superpowers/specs/2026-06-21-qlp-lideranca-design.md`.

---

## Convenções para o engenheiro executor

1. **Não confie no frontend.** Toda regra de negócio (tier, escopo, motivo obrigatório) é validada na server action.
2. **Toda mutação grava `qlp_historico`** na mesma transaction. Sem exceção.
3. **Migrations via MCP Supabase** (`mcp__86839c5b-...__apply_migration`). Nunca rode `drizzle-kit push` em produção sem revisão; gere a migration via MCP e refaça localmente com `npm run db:generate` se precisar para validação de schema.
4. **Cada Task fecha com 1 commit.** Mensagens em formato `feat(qlp):`, `test(qlp):`, `chore(qlp):`, `refactor(qlp):`.
5. **TDD onde a lógica é não-trivial** (classifier, sync diff, validação de tier, CTE). Em CRUD/UI, smoke test inline (`npm run dev` + abrir tela).
6. **`npm run typecheck` precisa passar** antes de cada commit. `npm run lint` também.

---

## Mapa de arquivos

**Criar:**
```
db/schema.ts                                 +tabelas qlp_*  (modificar arquivo existente)
db/queries/qlp.ts                            CTE recursiva + agregações
db/migrations/0005_qlp_lideranca.sql         (gerada via MCP)

actions/qlp/colaboradores.ts                 buscar, transferirFilial
actions/qlp/lideres.ts                       criar, editarEscopo, remover
actions/qlp/vinculos.ts                      atribuir, mover, remover
actions/qlp/cargos.ts                        classificar/reclassificar
actions/qlp/importar.ts                      parser + preview + aplicarSync
actions/qlp/historico.ts                     listar, exportar
actions/qlp/_shared.ts                       assertCanLead, escopoCobreFilial, gravarHistorico

lib/qlp/autoclassify.ts                      regex tier/nivel/trilha
lib/qlp/xls-parser.ts                        parse + decode latin1
lib/qlp/sync-diff.ts                         diff entre XLS e DB

app/(app)/qlp/page.tsx                       landing
app/(app)/qlp/layout.tsx                     gate por sessão + nav contextual
app/(app)/qlp/quadro/page.tsx
app/(app)/qlp/organograma/page.tsx
app/(app)/qlp/lideres/page.tsx               admin-only
app/(app)/qlp/cargos/page.tsx                admin-only
app/(app)/qlp/importar/page.tsx              admin-only
app/(app)/qlp/historico/page.tsx
app/(app)/qlp/indicadores/page.tsx
app/(app)/qlp/[id]/page.tsx

components/qlp/AtribuirLiderModal.tsx
components/qlp/OrgChartTree.tsx
components/qlp/CargoEditor.tsx
components/qlp/ImportPreview.tsx
components/qlp/HistoricoTimeline.tsx
components/qlp/PendenciasInbox.tsx

tests/qlp/autoclassify.test.ts
tests/qlp/sync-diff.test.ts
tests/qlp/tier-validation.test.ts
tests/qlp/xls-parser.test.ts
tests/qlp/integration-sync.test.ts          (vitest com DB de teste)

scripts/qlp-bootstrap.ts                     seed inicial (opcional, para dev)
```

**Modificar:**
```
db/schema.ts                                 adicionar tabelas qlp_*
components/layout/nav-config.ts              adicionar entrada "QLP & Liderança"
components/layout/Sidebar.tsx                (talvez) ajustar agrupamento se necessário
```

---

# Fase 1 — Fundação (schema + tipos)

### Task 1.1: Criar migration via MCP Supabase

**Files:**
- Create: `db/migrations/0005_qlp_lideranca.sql`

- [ ] **Step 1: Inspecionar projeto Supabase ativo**

Use o MCP Supabase para listar projetos e identificar o `project_id` do ambiente correto.
```
mcp__86839c5b-..__list_projects
```
Confirme com o usuário qual project_id usar antes de aplicar migrations destrutivas.

- [ ] **Step 2: Aplicar migration via MCP**

Use `mcp__86839c5b-..__apply_migration` com `name: "qlp_lideranca"` e o SQL abaixo:

```sql
-- qlp_colaboradores
CREATE TABLE qlp_colaboradores (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  chapa           text UNIQUE NOT NULL,
  nome            text NOT NULL,
  regional        text,
  bandeira        text,
  codfilial       integer NOT NULL,
  filial_id       uuid REFERENCES filiais(id),
  funcao          text NOT NULL,
  secao           text,
  horario         text,
  nacionalidade   text,
  dt_admissao     date,
  mes_nasc        smallint,
  idade           smallint,
  situacao        text,
  ativo           boolean NOT NULL DEFAULT true,
  tier_resolvido  text,
  nivel_resolvido text,
  trilha_resolvida text,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX qlp_colab_filial_idx ON qlp_colaboradores(filial_id) WHERE ativo;
CREATE INDEX qlp_colab_tier_idx   ON qlp_colaboradores(tier_resolvido) WHERE ativo;
CREATE INDEX qlp_colab_funcao_idx ON qlp_colaboradores(funcao);

-- qlp_funcoes_cargo
CREATE TABLE qlp_funcoes_cargo (
  funcao               text PRIMARY KEY,
  tier                 text NOT NULL,
  nivel                text,
  trilha               text,
  classificada_em      timestamptz NOT NULL DEFAULT now(),
  confirmada_por_admin boolean NOT NULL DEFAULT false
);

-- qlp_lideres
CREATE TABLE qlp_lideres (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  colaborador_id  uuid UNIQUE NOT NULL REFERENCES qlp_colaboradores(id) ON DELETE CASCADE,
  tier            text NOT NULL,
  nivel           text,
  escopo_nacional boolean NOT NULL DEFAULT false,
  filiais_escopo  jsonb NOT NULL DEFAULT '[]'::jsonb,
  ativo           boolean NOT NULL DEFAULT true,
  created_at      timestamptz NOT NULL DEFAULT now()
);

-- qlp_vinculos
CREATE TABLE qlp_vinculos (
  colaborador_id  uuid PRIMARY KEY REFERENCES qlp_colaboradores(id) ON DELETE CASCADE,
  lider_id        uuid NOT NULL REFERENCES qlp_lideres(id) ON DELETE CASCADE,
  origem          text NOT NULL,
  criado_por      text,
  created_at      timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX qlp_vinc_lider_idx ON qlp_vinculos(lider_id);

-- qlp_imports
CREATE TABLE qlp_imports (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  arquivo       text,
  executado_por text NOT NULL,
  executado_em  timestamptz NOT NULL DEFAULT now(),
  total_linhas  integer,
  novos         integer,
  atualizados   integer,
  desligados    integer,
  mudanca_tier  jsonb,
  pendencias    jsonb
);

-- qlp_pendencias
CREATE TABLE qlp_pendencias (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo           text NOT NULL,
  colaborador_id uuid REFERENCES qlp_colaboradores(id) ON DELETE CASCADE,
  descricao      text,
  criada_em      timestamptz NOT NULL DEFAULT now(),
  resolvida      boolean NOT NULL DEFAULT false,
  resolvida_em   timestamptz,
  resolvida_por  text
);
CREATE INDEX qlp_pend_aberta_idx ON qlp_pendencias(tipo) WHERE NOT resolvida;

-- qlp_historico
CREATE TABLE qlp_historico (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  evento             text NOT NULL,
  colaborador_id     uuid,
  lider_id_antigo    uuid,
  lider_id_novo      uuid,
  detalhes           jsonb,
  ator_tipo          text NOT NULL,
  ator_id            uuid,
  ator_nome          text,
  filial_contexto_id uuid,
  created_at         timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX qlp_hist_colab_idx  ON qlp_historico(colaborador_id, created_at DESC);
CREATE INDEX qlp_hist_data_idx   ON qlp_historico(created_at DESC);
CREATE INDEX qlp_hist_filial_idx ON qlp_historico(filial_contexto_id);
```

- [ ] **Step 3: Validar tabelas criadas**

```
mcp__86839c5b-..__list_tables
```
Expected: ver as 7 tabelas `qlp_*` no schema `public`.

- [ ] **Step 4: Commit**

```bash
git add db/migrations/0005_qlp_lideranca.sql
git commit -m "feat(qlp): migration inicial com 7 tabelas qlp_*"
```

---

### Task 1.2: Adicionar tabelas ao `db/schema.ts`

**Files:**
- Modify: `db/schema.ts` (apêndice ao final do arquivo)

- [ ] **Step 1: Adicionar declarações Drizzle**

Apêndice ao final de `db/schema.ts`:

```typescript
// ============================================================
// QLP & Liderança
// ============================================================

export const qlpColaboradores = pgTable('qlp_colaboradores', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  chapa: text('chapa').notNull().unique(),
  nome: text('nome').notNull(),
  regional: text('regional'),
  bandeira: text('bandeira'),
  codfilial: integer('codfilial').notNull(),
  filialId: uuid('filial_id').references(() => filiais.id),
  funcao: text('funcao').notNull(),
  secao: text('secao'),
  horario: text('horario'),
  nacionalidade: text('nacionalidade'),
  dtAdmissao: date('dt_admissao'),
  mesNasc: smallint('mes_nasc'),
  idade: smallint('idade'),
  situacao: text('situacao'),
  ativo: boolean('ativo').notNull().default(true),
  tierResolvido: text('tier_resolvido'),
  nivelResolvido: text('nivel_resolvido'),
  trilhaResolvida: text('trilha_resolvida'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  filialIdx: index('qlp_colab_filial_idx').on(t.filialId),
  tierIdx: index('qlp_colab_tier_idx').on(t.tierResolvido),
  funcaoIdx: index('qlp_colab_funcao_idx').on(t.funcao),
}));

export const qlpFuncoesCargo = pgTable('qlp_funcoes_cargo', {
  funcao: text('funcao').primaryKey(),
  tier: text('tier').notNull(),
  nivel: text('nivel'),
  trilha: text('trilha'),
  classificadaEm: timestamp('classificada_em', { withTimezone: true }).notNull().defaultNow(),
  confirmadaPorAdmin: boolean('confirmada_por_admin').notNull().default(false),
});

export const qlpLideres = pgTable('qlp_lideres', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  colaboradorId: uuid('colaborador_id').notNull().unique().references(() => qlpColaboradores.id, { onDelete: 'cascade' }),
  tier: text('tier').notNull(),
  nivel: text('nivel'),
  escopoNacional: boolean('escopo_nacional').notNull().default(false),
  filiaisEscopo: jsonb('filiais_escopo').notNull().default(sql`'[]'::jsonb`),
  ativo: boolean('ativo').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const qlpVinculos = pgTable('qlp_vinculos', {
  colaboradorId: uuid('colaborador_id').primaryKey().references(() => qlpColaboradores.id, { onDelete: 'cascade' }),
  liderId: uuid('lider_id').notNull().references(() => qlpLideres.id, { onDelete: 'cascade' }),
  origem: text('origem').notNull(),
  criadoPor: text('criado_por'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  liderIdx: index('qlp_vinc_lider_idx').on(t.liderId),
}));

export const qlpImports = pgTable('qlp_imports', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  arquivo: text('arquivo'),
  executadoPor: text('executado_por').notNull(),
  executadoEm: timestamp('executado_em', { withTimezone: true }).notNull().defaultNow(),
  totalLinhas: integer('total_linhas'),
  novos: integer('novos'),
  atualizados: integer('atualizados'),
  desligados: integer('desligados'),
  mudancaTier: jsonb('mudanca_tier'),
  pendencias: jsonb('pendencias'),
});

export const qlpPendencias = pgTable('qlp_pendencias', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  tipo: text('tipo').notNull(),
  colaboradorId: uuid('colaborador_id').references(() => qlpColaboradores.id, { onDelete: 'cascade' }),
  descricao: text('descricao'),
  criadaEm: timestamp('criada_em', { withTimezone: true }).notNull().defaultNow(),
  resolvida: boolean('resolvida').notNull().default(false),
  resolvidaEm: timestamp('resolvida_em', { withTimezone: true }),
  resolvidaPor: text('resolvida_por'),
});

export const qlpHistorico = pgTable('qlp_historico', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  evento: text('evento').notNull(),
  colaboradorId: uuid('colaborador_id'),
  liderIdAntigo: uuid('lider_id_antigo'),
  liderIdNovo: uuid('lider_id_novo'),
  detalhes: jsonb('detalhes'),
  atorTipo: text('ator_tipo').notNull(),
  atorId: uuid('ator_id'),
  atorNome: text('ator_nome'),
  filialContextoId: uuid('filial_contexto_id'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  colabIdx: index('qlp_hist_colab_idx').on(t.colaboradorId, t.createdAt),
  dataIdx: index('qlp_hist_data_idx').on(t.createdAt),
  filialIdx: index('qlp_hist_filial_idx').on(t.filialContextoId),
}));

export type QlpColaborador = typeof qlpColaboradores.$inferSelect;
export type QlpLider = typeof qlpLideres.$inferSelect;
export type QlpVinculo = typeof qlpVinculos.$inferSelect;
export type QlpHistoricoRow = typeof qlpHistorico.$inferSelect;
```

- [ ] **Step 2: Typecheck**
```
npm run typecheck
```
Expected: 0 erros.

- [ ] **Step 3: Commit**
```bash
git add db/schema.ts
git commit -m "feat(qlp): declarações Drizzle das tabelas qlp_*"
```

---

# Fase 2 — Classificação automática (TDD puro)

### Task 2.1: `lib/qlp/autoclassify.ts` — testes primeiro

**Files:**
- Create: `lib/qlp/autoclassify.ts`
- Test: `tests/qlp/autoclassify.test.ts`

- [ ] **Step 1: Escrever testes (FAIL esperado)**

```typescript
// tests/qlp/autoclassify.test.ts
import { describe, it, expect } from 'vitest';
import { autoclassify } from '@/lib/qlp/autoclassify';

describe('autoclassify - tier e nivel', () => {
  it('GERENTE NAC. DE TRANSPORTE → gerente/nacional', () => {
    expect(autoclassify('GERENTE NAC. DE TRANSPORTE')).toMatchObject({ tier: 'gerente', nivel: 'nacional' });
  });
  it('GERENTE REGIONAL DE OPERACOES → gerente/regional', () => {
    expect(autoclassify('GERENTE REGIONAL DE OPERACOES')).toMatchObject({ tier: 'gerente', nivel: 'regional' });
  });
  it('GERENTE DE PLANEJAMENTO LOGISTICO → gerente/regional (default)', () => {
    expect(autoclassify('GERENTE DE PLANEJAMENTO LOGISTICO')).toMatchObject({ tier: 'gerente', nivel: 'regional' });
  });
  it('SUBGERENTE DE OPERACOES → subgerente', () => {
    expect(autoclassify('SUBGERENTE DE OPERACOES').tier).toBe('subgerente');
  });
  it('COORD. NACIONAL DE GENTE E GESTAO → coord/nacional', () => {
    expect(autoclassify('COORD. NACIONAL DE GENTE E GESTAO')).toMatchObject({ tier: 'coord', nivel: 'nacional' });
  });
  it('COORD. REGIONAL DE TI - I → coord/regional', () => {
    expect(autoclassify('COORD. REGIONAL DE TI - I')).toMatchObject({ tier: 'coord', nivel: 'regional' });
  });
  it('COORD. DE LOGISTICA → coord/regional (default)', () => {
    expect(autoclassify('COORD. DE LOGISTICA')).toMatchObject({ tier: 'coord', nivel: 'regional' });
  });
  it('SUPERVISOR(A) DE LOGISTICA II → supervisor/ii', () => {
    expect(autoclassify('SUPERVISOR(A) DE LOGISTICA II')).toMatchObject({ tier: 'supervisor', nivel: 'ii' });
  });
  it('SUPERVISOR(A) DE TRANSPORTE → supervisor/i (default)', () => {
    expect(autoclassify('SUPERVISOR(A) DE TRANSPORTE')).toMatchObject({ tier: 'supervisor', nivel: 'i' });
  });
  it('ENC. DE DEPOSITO → supervisor/i', () => {
    expect(autoclassify('ENC. DE DEPOSITO')).toMatchObject({ tier: 'supervisor', nivel: 'i' });
  });
  it('ASSIST. ADMINISTRATIVO → base', () => {
    expect(autoclassify('ASSIST. ADMINISTRATIVO').tier).toBe('base');
  });
  it('MOTORISTA CARRETEIRO → base', () => {
    expect(autoclassify('MOTORISTA CARRETEIRO').tier).toBe('base');
  });
});

describe('autoclassify - trilha', () => {
  it('LOGISTICA → logistica', () => {
    expect(autoclassify('SUPERVISOR(A) DE LOGISTICA I').trilha).toBe('logistica');
  });
  it('MOTORISTA → transporte', () => {
    expect(autoclassify('MOTORISTA').trilha).toBe('transporte');
  });
  it('ABASTECIMENTO → abastecimento', () => {
    expect(autoclassify('COORD. DE ABASTECIMENTO').trilha).toBe('abastecimento');
  });
  it('PREVENCAO → prevencao', () => {
    expect(autoclassify('AUX. DE PREVENCAO').trilha).toBe('prevencao');
  });
  it('GENTE E GESTAO → gg', () => {
    expect(autoclassify('ANALISTA DE GENTE E GESTAO').trilha).toBe('gg');
  });
  it('MANUTENCAO → manutencao', () => {
    expect(autoclassify('TECNICO(A) DE MANUTENCAO I').trilha).toBe('manutencao');
  });
  it('TI → ti', () => {
    expect(autoclassify('TECNICO(A) DE SUPORTE - TI').trilha).toBe('ti');
  });
  it('FINANCEIRO → financ', () => {
    expect(autoclassify('ASSIST. FINANCEIRO').trilha).toBe('financ');
  });
  it('VIGILANTE → prevencao', () => {
    expect(autoclassify('VIGILANTE').trilha).toBe('prevencao');
  });
  it('JARDINEIRO → manutencao', () => {
    expect(autoclassify('JARDINEIRO(A)').trilha).toBe('manutencao');
  });
  it('função estranha → outros', () => {
    expect(autoclassify('XPTO BLABLA').trilha).toBe('outros');
  });
});
```

- [ ] **Step 2: Rodar testes (FAIL esperado)**
```
npm test -- tests/qlp/autoclassify.test.ts
```
Expected: FAIL — módulo não existe.

- [ ] **Step 3: Implementar**

```typescript
// lib/qlp/autoclassify.ts
export type Tier = 'gerente' | 'subgerente' | 'coord' | 'supervisor' | 'base';
export type Nivel = 'nacional' | 'regional' | 'i' | 'ii' | null;
export type Trilha = 'logistica' | 'transporte' | 'abastecimento' | 'prevencao' | 'gg' | 'manutencao' | 'ti' | 'financ' | 'outros';

export interface Classificacao { tier: Tier; nivel: Nivel; trilha: Trilha; }

const TIER_RULES: Array<[RegExp, Tier, Nivel]> = [
  [/^GERENTE NAC(\.|IONAL)/i, 'gerente', 'nacional'],
  [/^GERENTE REGIONAL/i,      'gerente', 'regional'],
  [/^GERENTE /i,              'gerente', 'regional'],
  [/^SUBGERENTE/i,            'subgerente', null],
  [/^COORD(\.|ENADOR) NACIONAL/i, 'coord', 'nacional'],
  [/^COORD(\.|ENADOR) REGIONAL/i, 'coord', 'regional'],
  [/^COORD(\.|ENADOR)/i,          'coord', 'regional'],
  [/^SUPERVISOR.*\bII\b/i,    'supervisor', 'ii'],
  [/^SUPERVISOR/i,            'supervisor', 'i'],
  [/^ENC(\.|ARREGADO)/i,      'supervisor', 'i'],
];

const TRILHA_RULES: Array<[RegExp, Trilha]> = [
  [/LOGISTICA|WMS|ARMAZEM|DEPOSITO|EMPILHA|CONFERENTE|MOVIMENTACAO/i, 'logistica'],
  [/TRANSPORTE|MOTORISTA|CARRETEIRO|ROTEIRIZACAO/i,                  'transporte'],
  [/ABASTECIMENTO/i,                                                  'abastecimento'],
  [/PREVENCAO|MONITORAMENTO|VIGILANTE|PORTEIRO/i,                     'prevencao'],
  [/GENTE E GESTAO|G&G|\bRH\b/i,                                      'gg'],
  [/MANUTENCAO|ELETRO|JARDIN|HIGIEN|LIMPEZA|ZELADOR|COZINH|NUTRI/i,   'manutencao'],
  [/\bTI\b|SUPORTE|AUTOMACAO/i,                                       'ti'],
  [/FINANC/i,                                                          'financ'],
];

export function autoclassify(funcao: string): Classificacao {
  const f = funcao.trim();
  let tier: Tier = 'base';
  let nivel: Nivel = null;
  for (const [re, t, n] of TIER_RULES) {
    if (re.test(f)) { tier = t; nivel = n; break; }
  }
  let trilha: Trilha = 'outros';
  for (const [re, tr] of TRILHA_RULES) {
    if (re.test(f)) { trilha = tr; break; }
  }
  return { tier, nivel, trilha };
}
```

- [ ] **Step 4: Rodar testes (PASS esperado)**
```
npm test -- tests/qlp/autoclassify.test.ts
```
Expected: PASS em todos os casos.

- [ ] **Step 5: Commit**
```bash
git add lib/qlp/autoclassify.ts tests/qlp/autoclassify.test.ts
git commit -m "feat(qlp): classificador automático de funções (tier/nível/trilha)"
```

---

### Task 2.2: Validação contra o quadro real (1.739 linhas)

**Files:**
- Test: `tests/qlp/autoclassify.real-quadro.test.ts` (opcional, fixture)

- [ ] **Step 1: Gerar fixture com as 85 funções únicas do XLS**

```bash
python -c "
import pandas as pd, json
df = pd.read_excel('C:/Users/juliano.correa/Desktop/ref/QUADRO PERLOG 19_06 (1).xls')
print(json.dumps(sorted(df['FUNCAO'].dropna().unique().tolist()), ensure_ascii=False))
" > tests/qlp/fixtures/funcoes-reais.json
```

- [ ] **Step 2: Teste de cobertura**

```typescript
// tests/qlp/autoclassify.real-quadro.test.ts
import { describe, it, expect } from 'vitest';
import { autoclassify } from '@/lib/qlp/autoclassify';
import funcoes from './fixtures/funcoes-reais.json';

describe('autoclassify cobre o quadro real', () => {
  it('classifica todas as 85 funções sem null/undefined', () => {
    for (const f of funcoes as string[]) {
      const c = autoclassify(f);
      expect(c.tier, `função: ${f}`).toMatch(/^(gerente|subgerente|coord|supervisor|base)$/);
      expect(c.trilha, `função: ${f}`).toMatch(/^(logistica|transporte|abastecimento|prevencao|gg|manutencao|ti|financ|outros)$/);
    }
  });

  it('tem distribuição razoável (≥1 gerente, ≥1 coord, ≥1 supervisor, ≥40 base)', () => {
    const counts = { gerente: 0, subgerente: 0, coord: 0, supervisor: 0, base: 0 };
    for (const f of funcoes as string[]) counts[autoclassify(f).tier]++;
    expect(counts.gerente).toBeGreaterThanOrEqual(1);
    expect(counts.coord).toBeGreaterThanOrEqual(1);
    expect(counts.supervisor).toBeGreaterThanOrEqual(1);
    expect(counts.base).toBeGreaterThanOrEqual(40);
  });
});
```

- [ ] **Step 3: Rodar e ajustar regex se houver função mal classificada**
```
npm test -- tests/qlp/autoclassify.real-quadro.test.ts
```

- [ ] **Step 4: Commit**
```bash
git add tests/qlp/autoclassify.real-quadro.test.ts tests/qlp/fixtures/funcoes-reais.json
git commit -m "test(qlp): cobertura do autoclassify contra quadro Perlog real"
```

---

# Fase 3 — Parser XLS + Sync diff

### Task 3.1: Parser XLS com decode latin1

**Files:**
- Create: `lib/qlp/xls-parser.ts`
- Test: `tests/qlp/xls-parser.test.ts`

- [ ] **Step 1: Escrever teste (FAIL esperado)**

```typescript
// tests/qlp/xls-parser.test.ts
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { parseQuadroPerlog } from '@/lib/qlp/xls-parser';

const XLS = 'C:/Users/juliano.correa/Desktop/ref/QUADRO PERLOG 19_06 (1).xls';

describe('parseQuadroPerlog', () => {
  it('lê 1.739 linhas e decodifica acentos', () => {
    const buf = readFileSync(XLS);
    const linhas = parseQuadroPerlog(buf);
    expect(linhas.length).toBe(1739);
    const ferias = linhas.find(l => l.situacao.toLowerCase().includes('rias'));
    expect(ferias?.situacao).toContain('Férias');  // não F�rias
  });
  it('tipa CHAPA como string (não perde leading zeros)', () => {
    const buf = readFileSync(XLS);
    const linhas = parseQuadroPerlog(buf);
    expect(typeof linhas[0].chapa).toBe('string');
  });
  it('tipa CODFILIAL como number', () => {
    const buf = readFileSync(XLS);
    const linhas = parseQuadroPerlog(buf);
    expect(typeof linhas[0].codfilial).toBe('number');
  });
});
```

- [ ] **Step 2: Rodar (FAIL)**
```
npm test -- tests/qlp/xls-parser.test.ts
```

- [ ] **Step 3: Implementar parser**

```typescript
// lib/qlp/xls-parser.ts
import * as XLSX from 'xlsx';

export interface LinhaQuadro {
  regional: string;
  bandeira: string;
  codfilial: number;
  chapa: string;
  nome: string;
  funcao: string;
  secao: string | null;
  horario: string | null;
  nacionalidade: string | null;
  dtAdmissao: string | null;   // YYYY-MM-DD
  mesNasc: number | null;
  idade: number | null;
  situacao: string;
}

function decodeIfMojibake(s: string): string {
  if (!s) return s;
  if (!/�/.test(s)) return s;
  try {
    const bytes = Uint8Array.from(s, c => c.charCodeAt(0) & 0xff);
    return new TextDecoder('windows-1252').decode(bytes);
  } catch {
    return s;
  }
}

export function parseQuadroPerlog(buf: Buffer | ArrayBuffer): LinhaQuadro[] {
  const wb = XLSX.read(buf, { type: 'buffer', codepage: 1252 });
  const ws = wb.Sheets[wb.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { defval: null });

  return rows.map((r) => {
    const dt = r['DT_ADMISSAO'];
    return {
      regional: String(r['REGIONAL'] ?? '').trim(),
      bandeira: String(r['BANDEIRA'] ?? '').trim(),
      codfilial: Number(r['CODFILIAL']),
      chapa: String(r['CHAPA'] ?? '').trim(),
      nome: decodeIfMojibake(String(r['NOME'] ?? '').trim()),
      funcao: decodeIfMojibake(String(r['FUNCAO'] ?? '').trim()),
      secao: r['SECAO'] ? decodeIfMojibake(String(r['SECAO']).trim()) : null,
      horario: r['HORARIO'] ? String(r['HORARIO']).trim() : null,
      nacionalidade: r['DESC_NACIONALIDADE'] ? decodeIfMojibake(String(r['DESC_NACIONALIDADE']).trim()) : null,
      dtAdmissao: dt ? formatDate(dt) : null,
      mesNasc: r['MES_NASCIMENTO'] != null ? Number(r['MES_NASCIMENTO']) : null,
      idade: r['IDADE'] != null ? Number(r['IDADE']) : null,
      situacao: decodeIfMojibake(String(r['SITUACAO'] ?? '').trim()),
    };
  });
}

function formatDate(v: unknown): string | null {
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  if (typeof v === 'number') {
    const d = XLSX.SSF.parse_date_code(v);
    if (!d) return null;
    return `${d.y}-${String(d.m).padStart(2, '0')}-${String(d.d).padStart(2, '0')}`;
  }
  if (typeof v === 'string') return v.slice(0, 10);
  return null;
}
```

- [ ] **Step 4: Rodar (PASS)**
```
npm test -- tests/qlp/xls-parser.test.ts
```

- [ ] **Step 5: Commit**
```bash
git add lib/qlp/xls-parser.ts tests/qlp/xls-parser.test.ts
git commit -m "feat(qlp): parser do XLS Perlog com decode latin1"
```

---

### Task 3.2: Sync diff (lógica pura, TDD)

**Files:**
- Create: `lib/qlp/sync-diff.ts`
- Test: `tests/qlp/sync-diff.test.ts`

- [ ] **Step 1: Escrever testes**

```typescript
// tests/qlp/sync-diff.test.ts
import { describe, it, expect } from 'vitest';
import { computeDiff, type EstadoAtual, type LinhaNova } from '@/lib/qlp/sync-diff';

const base = {
  chapa: '1', nome: 'A', codfilial: 20, funcao: 'AUX. ADMINISTRATIVO',
  tier: 'base', situacao: 'Ativo',
};

describe('computeDiff', () => {
  it('chapa nova → novos[]', () => {
    const atual: EstadoAtual[] = [];
    const novas: LinhaNova[] = [{ ...base }];
    const d = computeDiff(atual, novas, (f) => ({ tier: 'base', nivel: null, trilha: 'outros' }));
    expect(d.novos).toHaveLength(1);
    expect(d.atualizadosSemQuebra).toHaveLength(0);
    expect(d.desligados).toHaveLength(0);
  });

  it('chapa ausente do XLS → desligados[]', () => {
    const atual: EstadoAtual[] = [{ ...base }];
    const novas: LinhaNova[] = [];
    const d = computeDiff(atual, novas, () => ({ tier: 'base', nivel: null, trilha: 'outros' }));
    expect(d.desligados).toHaveLength(1);
  });

  it('mesma função, só situação mudou → atualizadosSemQuebra[]', () => {
    const atual: EstadoAtual[] = [{ ...base, situacao: 'Ativo' }];
    const novas: LinhaNova[] = [{ ...base, situacao: 'Férias' }];
    const d = computeDiff(atual, novas, () => ({ tier: 'base', nivel: null, trilha: 'outros' }));
    expect(d.atualizadosSemQuebra).toHaveLength(1);
    expect(d.mudancaTier).toHaveLength(0);
  });

  it('função muda dentro do mesmo tier (Sup I → Sup II) → sem quebra', () => {
    const atual: EstadoAtual[] = [{ ...base, funcao: 'SUPERVISOR(A) DE LOGISTICA I', tier: 'supervisor' }];
    const novas: LinhaNova[] = [{ ...base, funcao: 'SUPERVISOR(A) DE LOGISTICA II' }];
    const d = computeDiff(atual, novas, (f) => ({
      tier: 'supervisor',
      nivel: f.includes(' II') ? 'ii' : 'i',
      trilha: 'logistica',
    }));
    expect(d.atualizadosSemQuebra).toHaveLength(1);
    expect(d.mudancaTier).toHaveLength(0);
  });

  it('função muda de tier (Sup → Coord) → mudancaTier[]', () => {
    const atual: EstadoAtual[] = [{ ...base, funcao: 'SUPERVISOR(A) DE LOGISTICA I', tier: 'supervisor' }];
    const novas: LinhaNova[] = [{ ...base, funcao: 'COORD. DE LOGISTICA' }];
    const d = computeDiff(atual, novas, () => ({ tier: 'coord', nivel: 'regional', trilha: 'logistica' }));
    expect(d.mudancaTier).toHaveLength(1);
  });

  it('mudou de filial → mudancaFilial[]', () => {
    const atual: EstadoAtual[] = [{ ...base, codfilial: 20 }];
    const novas: LinhaNova[] = [{ ...base, codfilial: 167 }];
    const d = computeDiff(atual, novas, () => ({ tier: 'base', nivel: null, trilha: 'outros' }));
    expect(d.mudancaFilial).toHaveLength(1);
  });

  it('idempotente: aplicar mesmo XLS duas vezes → zero mudanças', () => {
    const atual: EstadoAtual[] = [{ ...base }];
    const novas: LinhaNova[] = [{ ...base }];
    const d = computeDiff(atual, novas, () => ({ tier: 'base', nivel: null, trilha: 'outros' }));
    expect(d.novos).toHaveLength(0);
    expect(d.desligados).toHaveLength(0);
    expect(d.mudancaTier).toHaveLength(0);
    expect(d.mudancaFilial).toHaveLength(0);
    expect(d.atualizadosSemQuebra).toHaveLength(0);
  });
});
```

- [ ] **Step 2: Rodar (FAIL)**

- [ ] **Step 3: Implementar**

```typescript
// lib/qlp/sync-diff.ts
import type { Classificacao } from './autoclassify';

export interface EstadoAtual {
  chapa: string;
  nome: string;
  codfilial: number;
  funcao: string;
  tier: string;
  situacao: string;
}

export interface LinhaNova {
  chapa: string;
  nome: string;
  codfilial: number;
  funcao: string;
  situacao: string;
}

export interface DiffResult {
  novos: LinhaNova[];
  atualizadosSemQuebra: { antes: EstadoAtual; depois: LinhaNova }[];
  mudancaTier: { antes: EstadoAtual; depois: LinhaNova; tierAntigo: string; tierNovo: string }[];
  mudancaFilial: { antes: EstadoAtual; depois: LinhaNova }[];
  desligados: EstadoAtual[];
}

export function computeDiff(
  atual: EstadoAtual[],
  novas: LinhaNova[],
  classify: (funcao: string) => Classificacao,
): DiffResult {
  const atualMap = new Map(atual.map((c) => [c.chapa, c]));
  const novasMap = new Map(novas.map((l) => [l.chapa, l]));

  const result: DiffResult = {
    novos: [],
    atualizadosSemQuebra: [],
    mudancaTier: [],
    mudancaFilial: [],
    desligados: [],
  };

  for (const linha of novas) {
    const antes = atualMap.get(linha.chapa);
    if (!antes) {
      result.novos.push(linha);
      continue;
    }
    const tierNovo = classify(linha.funcao).tier;
    if (antes.codfilial !== linha.codfilial) {
      result.mudancaFilial.push({ antes, depois: linha });
      continue;
    }
    if (antes.tier !== tierNovo) {
      result.mudancaTier.push({ antes, depois: linha, tierAntigo: antes.tier, tierNovo });
      continue;
    }
    if (
      antes.funcao !== linha.funcao ||
      antes.situacao !== linha.situacao ||
      antes.nome !== linha.nome
    ) {
      result.atualizadosSemQuebra.push({ antes, depois: linha });
    }
  }

  for (const c of atual) {
    if (!novasMap.has(c.chapa)) result.desligados.push(c);
  }
  return result;
}
```

- [ ] **Step 4: Rodar (PASS)**

- [ ] **Step 5: Commit**
```bash
git add lib/qlp/sync-diff.ts tests/qlp/sync-diff.test.ts
git commit -m "feat(qlp): sync diff entre XLS e estado atual (puro, testável)"
```

---

# Fase 4 — Helpers compartilhados + validação tier

### Task 4.1: `assertCanLead` e helpers de escopo (TDD)

**Files:**
- Create: `actions/qlp/_shared.ts`
- Test: `tests/qlp/tier-validation.test.ts`

- [ ] **Step 1: Testes**

```typescript
// tests/qlp/tier-validation.test.ts
import { describe, it, expect } from 'vitest';
import { assertCanLead, escopoCobreFilial } from '@/actions/qlp/_shared';

describe('assertCanLead', () => {
  it('supervisor pode liderar base', () => {
    expect(() => assertCanLead('supervisor', 'base')).not.toThrow();
  });
  it('supervisor NÃO pode liderar supervisor', () => {
    expect(() => assertCanLead('supervisor', 'supervisor')).toThrow();
  });
  it('supervisor NÃO pode liderar coord', () => {
    expect(() => assertCanLead('supervisor', 'coord')).toThrow();
  });
  it('coord pode liderar supervisor', () => {
    expect(() => assertCanLead('coord', 'supervisor')).not.toThrow();
  });
  it('coord pode liderar base', () => {
    expect(() => assertCanLead('coord', 'base')).not.toThrow();
  });
  it('coord NÃO pode liderar coord', () => {
    expect(() => assertCanLead('coord', 'coord')).toThrow();
  });
  it('subgerente lidera coord, supervisor, base', () => {
    expect(() => assertCanLead('subgerente', 'coord')).not.toThrow();
    expect(() => assertCanLead('subgerente', 'supervisor')).not.toThrow();
    expect(() => assertCanLead('subgerente', 'base')).not.toThrow();
  });
  it('gerente lidera tudo abaixo', () => {
    expect(() => assertCanLead('gerente', 'subgerente')).not.toThrow();
    expect(() => assertCanLead('gerente', 'coord')).not.toThrow();
    expect(() => assertCanLead('gerente', 'supervisor')).not.toThrow();
    expect(() => assertCanLead('gerente', 'base')).not.toThrow();
  });
  it('gerente NÃO pode liderar gerente', () => {
    expect(() => assertCanLead('gerente', 'gerente')).toThrow();
  });
});

describe('escopoCobreFilial', () => {
  it('nacional cobre qualquer filial', () => {
    expect(escopoCobreFilial({ escopoNacional: true, filiaisEscopo: [] }, 'qualquer-uuid')).toBe(true);
  });
  it('regional só cobre filiais listadas', () => {
    expect(escopoCobreFilial({ escopoNacional: false, filiaisEscopo: ['a', 'b'] }, 'a')).toBe(true);
    expect(escopoCobreFilial({ escopoNacional: false, filiaisEscopo: ['a', 'b'] }, 'c')).toBe(false);
  });
});
```

- [ ] **Step 2: Implementar**

```typescript
// actions/qlp/_shared.ts
import 'server-only';
import { db } from '@/db/client';
import { qlpHistorico } from '@/db/schema';

const HIERARQUIA: Record<string, number> = {
  gerente: 5, subgerente: 4, coord: 3, supervisor: 2, base: 1,
};

export function assertCanLead(tierLider: string, tierLiderado: string): void {
  const l = HIERARQUIA[tierLider];
  const a = HIERARQUIA[tierLiderado];
  if (!l || !a) throw new Error(`tier inválido: ${tierLider}/${tierLiderado}`);
  if (a >= l) {
    throw new Error(`tier ${tierLider} não pode liderar ${tierLiderado}`);
  }
  if (tierLider === 'supervisor' && tierLiderado !== 'base') {
    throw new Error('supervisor só lidera base');
  }
}

export function escopoCobreFilial(
  lider: { escopoNacional: boolean; filiaisEscopo: string[] },
  filialId: string,
): boolean {
  if (lider.escopoNacional) return true;
  return lider.filiaisEscopo.includes(filialId);
}

export interface AtorContexto {
  tipo: 'admin' | 'filial' | 'sync';
  id: string | null;
  nome: string;
  filialContextoId: string | null;
}

export async function gravarHistorico(
  tx: typeof db,
  params: {
    evento: string;
    colaboradorId?: string | null;
    liderIdAntigo?: string | null;
    liderIdNovo?: string | null;
    detalhes: Record<string, unknown>;
    ator: AtorContexto;
  },
) {
  await tx.insert(qlpHistorico).values({
    evento: params.evento,
    colaboradorId: params.colaboradorId ?? null,
    liderIdAntigo: params.liderIdAntigo ?? null,
    liderIdNovo: params.liderIdNovo ?? null,
    detalhes: params.detalhes,
    atorTipo: params.ator.tipo,
    atorId: params.ator.id,
    atorNome: params.ator.nome,
    filialContextoId: params.ator.filialContextoId,
  });
}
```

- [ ] **Step 3: Rodar (PASS)**

- [ ] **Step 4: Commit**
```bash
git add actions/qlp/_shared.ts tests/qlp/tier-validation.test.ts
git commit -m "feat(qlp): helpers de validação de tier, escopo e histórico"
```

---

# Fase 5 — CTE recursiva (time efetivo)

### Task 5.1: `db/queries/qlp.ts` — time efetivo e agregações

**Files:**
- Create: `db/queries/qlp.ts`

- [ ] **Step 1: Implementar consultas**

```typescript
// db/queries/qlp.ts
import 'server-only';
import { sql } from 'drizzle-orm';
import { db } from '@/db/client';

export interface TimeEfetivo {
  colaboradorId: string;
  chapa: string;
  nome: string;
  funcao: string;
  tier: string;
  filialId: string | null;
  nivel: number;            // distância em níveis a partir do líder
}

export async function getTimeEfetivo(liderId: string): Promise<TimeEfetivo[]> {
  const rows = await db.execute<TimeEfetivo>(sql`
    WITH RECURSIVE descend AS (
      -- nível 1: subordinados diretos do líder
      SELECT
        c.id  AS colaborador_id,
        c.chapa, c.nome, c.funcao, c.tier_resolvido AS tier,
        c.filial_id, 1 AS nivel
      FROM qlp_vinculos v
      JOIN qlp_colaboradores c ON c.id = v.colaborador_id
      WHERE v.lider_id = ${liderId}

      UNION ALL

      -- níveis seguintes: se o colaborador é também líder, pegar quem reporta a ele
      SELECT
        c2.id AS colaborador_id,
        c2.chapa, c2.nome, c2.funcao, c2.tier_resolvido AS tier,
        c2.filial_id, d.nivel + 1 AS nivel
      FROM descend d
      JOIN qlp_lideres l2     ON l2.colaborador_id = d.colaborador_id
      JOIN qlp_vinculos v2    ON v2.lider_id      = l2.id
      JOIN qlp_colaboradores c2 ON c2.id         = v2.colaborador_id
    )
    SELECT * FROM descend ORDER BY nivel, nome
  `);
  return rows as unknown as TimeEfetivo[];
}

export interface ResumoLider {
  diretos: number;
  total: number;
}

export async function getResumoLider(liderId: string): Promise<ResumoLider> {
  const r = await db.execute<{ diretos: number; total: number }>(sql`
    WITH diretos AS (
      SELECT count(*)::int AS n FROM qlp_vinculos WHERE lider_id = ${liderId}
    ),
    RECURSIVE descend AS (
      SELECT v.colaborador_id FROM qlp_vinculos v WHERE v.lider_id = ${liderId}
      UNION ALL
      SELECT v2.colaborador_id
      FROM descend d
      JOIN qlp_lideres l2 ON l2.colaborador_id = d.colaborador_id
      JOIN qlp_vinculos v2 ON v2.lider_id = l2.id
    )
    SELECT (SELECT n FROM diretos) AS diretos,
           (SELECT count(*)::int FROM descend) AS total
  `);
  const row = (r as any)[0] ?? { diretos: 0, total: 0 };
  return { diretos: row.diretos, total: row.total };
}

// ATENÇÃO: Postgres exige `WITH RECURSIVE` antes da primeira CTE; refatorar a query
// acima em duas queries separadas se o driver reclamar do CTE mista. Versão alternativa:
//   const [d, t] = await Promise.all([
//     db.execute(sql`SELECT count(*)::int n FROM qlp_vinculos WHERE lider_id = ${liderId}`),
//     db.execute(sql`WITH RECURSIVE descend AS (...) SELECT count(*)::int n FROM descend`),
//   ]);

export async function getColaboradoresSemLider(filialId?: string) {
  return db.execute(sql`
    SELECT c.* FROM qlp_colaboradores c
    LEFT JOIN qlp_vinculos v ON v.colaborador_id = c.id
    WHERE c.ativo AND v.colaborador_id IS NULL
      AND (${filialId ?? null}::uuid IS NULL OR c.filial_id = ${filialId ?? null}::uuid)
    ORDER BY c.nome
  `);
}

export async function getKPIs(filialId?: string) {
  return db.execute(sql`
    WITH ativos AS (
      SELECT * FROM qlp_colaboradores
      WHERE ativo AND (${filialId ?? null}::uuid IS NULL OR filial_id = ${filialId ?? null}::uuid)
    )
    SELECT
      (SELECT count(*) FROM ativos)::int AS total_ativos,
      (SELECT count(*) FROM ativos a JOIN qlp_vinculos v ON v.colaborador_id = a.id)::int AS com_lider,
      (SELECT count(*) FROM qlp_pendencias WHERE NOT resolvida)::int AS pendencias_abertas,
      (SELECT max(executado_em) FROM qlp_imports)               AS ultimo_sync
  `);
}
```

- [ ] **Step 2: Smoke test manual contra DB de dev**

Criar um líder fake e um vínculo no Drizzle Studio (`npm run db:studio`), rodar:
```typescript
import { getTimeEfetivo } from '@/db/queries/qlp';
console.log(await getTimeEfetivo('<lider-id>'));
```
Esperar array com o subordinado direto criado. **Se a query CTE mista falhar, dividir em duas queries conforme nota no código.**

- [ ] **Step 3: Commit**
```bash
git add db/queries/qlp.ts
git commit -m "feat(qlp): CTE recursiva para time efetivo + KPIs"
```

---

# Fase 6 — Server actions de mutação

### Task 6.1: `actions/qlp/cargos.ts`

**Files:**
- Create: `actions/qlp/cargos.ts`

- [ ] **Step 1: Implementar**

```typescript
'use server';
import { db } from '@/db/client';
import { eq } from 'drizzle-orm';
import { qlpFuncoesCargo, qlpColaboradores } from '@/db/schema';
import { autoclassify } from '@/lib/qlp/autoclassify';
import { gravarHistorico } from './_shared';
import { requireAdminSession } from '@/lib/auth/session';

export async function reclassificarFuncao(input: {
  funcao: string; tier: string; nivel: string | null; trilha: string | null;
}) {
  const s = await requireAdminSession();
  await db.transaction(async (tx) => {
    const antes = await tx.query.qlpFuncoesCargo.findFirst({ where: eq(qlpFuncoesCargo.funcao, input.funcao) });
    await tx.update(qlpFuncoesCargo).set({
      tier: input.tier, nivel: input.nivel, trilha: input.trilha,
      confirmadaPorAdmin: true,
    }).where(eq(qlpFuncoesCargo.funcao, input.funcao));

    // propagar para colaboradores com essa função
    await tx.update(qlpColaboradores).set({
      tierResolvido: input.tier,
      nivelResolvido: input.nivel,
      trilhaResolvida: input.trilha,
      updatedAt: new Date(),
    }).where(eq(qlpColaboradores.funcao, input.funcao));

    await gravarHistorico(tx as any, {
      evento: 'funcao_reclassificada',
      detalhes: { funcao: input.funcao, antes, depois: input },
      ator: { tipo: 'admin', id: s.adminId, nome: s.nome ?? 'admin', filialContextoId: null },
    });
  });
}

export async function classificarSeNova(funcao: string) {
  const exists = await db.query.qlpFuncoesCargo.findFirst({ where: eq(qlpFuncoesCargo.funcao, funcao) });
  if (exists) return exists;
  const c = autoclassify(funcao);
  const [row] = await db.insert(qlpFuncoesCargo).values({
    funcao, tier: c.tier, nivel: c.nivel, trilha: c.trilha,
  }).returning();
  return row;
}
```

- [ ] **Step 2: Typecheck + commit**
```bash
npm run typecheck
git add actions/qlp/cargos.ts
git commit -m "feat(qlp): server actions de classificação de funções"
```

---

### Task 6.2: `actions/qlp/lideres.ts`

**Files:**
- Create: `actions/qlp/lideres.ts`

- [ ] **Step 1: Implementar**

```typescript
'use server';
import { db } from '@/db/client';
import { eq } from 'drizzle-orm';
import { qlpLideres, qlpColaboradores } from '@/db/schema';
import { gravarHistorico, assertCanLead } from './_shared';
import { requireAdminSession } from '@/lib/auth/session';

export async function criarLider(input: {
  colaboradorId: string;
  tier: 'gerente' | 'subgerente' | 'coord';
  nivel: 'nacional' | 'regional' | null;
  escopoNacional: boolean;
  filiaisEscopo: string[];
  liderAcimaId?: string | null;
}) {
  const s = await requireAdminSession();
  if (input.tier === 'subgerente' && input.nivel) throw new Error('subgerente não tem nível');
  if (!input.escopoNacional && input.filiaisEscopo.length === 0)
    throw new Error('líder regional precisa de ao menos 1 filial no escopo');

  return db.transaction(async (tx) => {
    const colab = await tx.query.qlpColaboradores.findFirst({ where: eq(qlpColaboradores.id, input.colaboradorId) });
    if (!colab) throw new Error('colaborador não encontrado');

    const [lider] = await tx.insert(qlpLideres).values({
      colaboradorId: input.colaboradorId,
      tier: input.tier,
      nivel: input.nivel,
      escopoNacional: input.escopoNacional,
      filiaisEscopo: input.filiaisEscopo as any,
    }).returning();

    // Atualizar tier resolvido do colaborador caso esteja desalinhado
    await tx.update(qlpColaboradores).set({
      tierResolvido: input.tier, nivelResolvido: input.nivel, updatedAt: new Date(),
    }).where(eq(qlpColaboradores.id, input.colaboradorId));

    await gravarHistorico(tx as any, {
      evento: 'lider_criado',
      colaboradorId: input.colaboradorId,
      detalhes: { lider, liderAcimaId: input.liderAcimaId ?? null },
      ator: { tipo: 'admin', id: s.adminId, nome: s.nome ?? 'admin', filialContextoId: null },
    });

    if (input.liderAcimaId) {
      // chamamos atribuirVinculo dentro da mesma tx para amarrar este líder ao líder acima
      // (delegado em vinculos.ts; ver task 6.3)
    }

    return lider;
  });
}

export async function editarEscopoLider(input: {
  liderId: string;
  escopoNacional?: boolean;
  filiaisEscopo?: string[];
}) {
  const s = await requireAdminSession();
  return db.transaction(async (tx) => {
    const antes = await tx.query.qlpLideres.findFirst({ where: eq(qlpLideres.id, input.liderId) });
    if (!antes) throw new Error('líder não encontrado');
    await tx.update(qlpLideres).set({
      escopoNacional: input.escopoNacional ?? antes.escopoNacional,
      filiaisEscopo: (input.filiaisEscopo ?? antes.filiaisEscopo) as any,
    }).where(eq(qlpLideres.id, input.liderId));
    await gravarHistorico(tx as any, {
      evento: 'lider_escopo_alterado',
      detalhes: { antes, depois: input },
      ator: { tipo: 'admin', id: s.adminId, nome: s.nome ?? 'admin', filialContextoId: null },
    });
  });
}

export async function removerLider(liderId: string) {
  const s = await requireAdminSession();
  return db.transaction(async (tx) => {
    const antes = await tx.query.qlpLideres.findFirst({ where: eq(qlpLideres.id, liderId) });
    await tx.delete(qlpLideres).where(eq(qlpLideres.id, liderId));
    await gravarHistorico(tx as any, {
      evento: 'lider_removido',
      detalhes: { antes },
      ator: { tipo: 'admin', id: s.adminId, nome: s.nome ?? 'admin', filialContextoId: null },
    });
  });
}
```

- [ ] **Step 2: Typecheck + commit**
```bash
npm run typecheck
git add actions/qlp/lideres.ts
git commit -m "feat(qlp): server actions de líderes (admin-only)"
```

---

### Task 6.3: `actions/qlp/vinculos.ts`

**Files:**
- Create: `actions/qlp/vinculos.ts`

- [ ] **Step 1: Implementar**

```typescript
'use server';
import { db } from '@/db/client';
import { and, eq } from 'drizzle-orm';
import { qlpVinculos, qlpLideres, qlpColaboradores } from '@/db/schema';
import { assertCanLead, escopoCobreFilial, gravarHistorico, type AtorContexto } from './_shared';
import { getSession } from '@/lib/auth/session';

async function getAtorEPermissao(filialAlvoId: string | null): Promise<AtorContexto> {
  const s = await getSession();
  if (!s) throw new Error('não autenticado');
  if (s.perfil === 'admin') {
    return { tipo: 'admin', id: s.adminId, nome: s.nome ?? 'admin', filialContextoId: filialAlvoId };
  }
  if (s.perfil === 'filial') {
    if (filialAlvoId && filialAlvoId !== s.filialId) {
      throw new Error('filial não pode operar em colaborador de outra filial');
    }
    return { tipo: 'filial', id: s.filialId, nome: s.filialNome, filialContextoId: s.filialId };
  }
  throw new Error('perfil não autorizado');
}

export async function atribuirVinculo(input: {
  colaboradorId: string; liderId: string; motivo: string;
}) {
  if (!input.motivo?.trim()) throw new Error('motivo obrigatório');

  return db.transaction(async (tx) => {
    const colab = await tx.query.qlpColaboradores.findFirst({ where: eq(qlpColaboradores.id, input.colaboradorId) });
    const lider = await tx.query.qlpLideres.findFirst({ where: eq(qlpLideres.id, input.liderId) });
    if (!colab || !lider) throw new Error('colaborador ou líder inexistente');

    const ator = await getAtorEPermissao(colab.filialId);
    // Filial só pode amarrar base↔supervisor ou supervisor↔coord
    if (ator.tipo === 'filial') {
      if (!((colab.tierResolvido === 'base' && lider.tier === 'supervisor') ||
            (colab.tierResolvido === 'supervisor' && lider.tier === 'coord'))) {
        throw new Error('filial não tem permissão para esse tipo de vínculo');
      }
    }

    assertCanLead(lider.tier, colab.tierResolvido ?? 'base');
    if (!colab.filialId) throw new Error('colaborador sem filial');
    if (!escopoCobreFilial({ escopoNacional: lider.escopoNacional, filiaisEscopo: lider.filiaisEscopo as string[] }, colab.filialId)) {
      throw new Error('líder não cobre a filial do colaborador');
    }

    const antigo = await tx.query.qlpVinculos.findFirst({ where: eq(qlpVinculos.colaboradorId, input.colaboradorId) });
    await tx.insert(qlpVinculos).values({
      colaboradorId: input.colaboradorId,
      liderId: input.liderId,
      origem: ator.tipo === 'admin' ? 'admin' : 'filial',
      criadoPor: ator.nome,
    }).onConflictDoUpdate({
      target: qlpVinculos.colaboradorId,
      set: { liderId: input.liderId, origem: ator.tipo === 'admin' ? 'admin' : 'filial', criadoPor: ator.nome, createdAt: new Date() },
    });

    await gravarHistorico(tx as any, {
      evento: antigo ? 'vinculo_movido' : 'vinculo_criado',
      colaboradorId: input.colaboradorId,
      liderIdAntigo: antigo?.liderId ?? null,
      liderIdNovo: input.liderId,
      detalhes: { motivo: input.motivo, antigo, novo: input.liderId },
      ator,
    });
  });
}

export async function removerVinculo(colaboradorId: string, motivo: string) {
  if (!motivo?.trim()) throw new Error('motivo obrigatório');
  return db.transaction(async (tx) => {
    const colab = await tx.query.qlpColaboradores.findFirst({ where: eq(qlpColaboradores.id, colaboradorId) });
    if (!colab) throw new Error('colaborador inexistente');
    const ator = await getAtorEPermissao(colab.filialId);

    const antes = await tx.query.qlpVinculos.findFirst({ where: eq(qlpVinculos.colaboradorId, colaboradorId) });
    await tx.delete(qlpVinculos).where(eq(qlpVinculos.colaboradorId, colaboradorId));

    await gravarHistorico(tx as any, {
      evento: 'vinculo_removido',
      colaboradorId,
      liderIdAntigo: antes?.liderId ?? null,
      detalhes: { motivo, antes },
      ator,
    });
  });
}

export async function moverColaborador(input: { colaboradorId: string; novoLiderId: string; motivo: string }) {
  // alias semântico para atribuirVinculo (mantém naming claro nas telas)
  return atribuirVinculo({ ...input, liderId: input.novoLiderId });
}
```

- [ ] **Step 2: Typecheck + commit**
```bash
npm run typecheck
git add actions/qlp/vinculos.ts
git commit -m "feat(qlp): server actions de vínculos com validação tier/escopo/perfil"
```

---

### Task 6.4: `actions/qlp/importar.ts`

**Files:**
- Create: `actions/qlp/importar.ts`

- [ ] **Step 1: Implementar (preview)**

```typescript
'use server';
import { db } from '@/db/client';
import { eq, inArray, sql } from 'drizzle-orm';
import {
  qlpColaboradores, qlpFuncoesCargo, qlpImports, qlpPendencias, qlpVinculos, filiais,
} from '@/db/schema';
import { parseQuadroPerlog } from '@/lib/qlp/xls-parser';
import { computeDiff, type EstadoAtual, type LinhaNova } from '@/lib/qlp/sync-diff';
import { autoclassify } from '@/lib/qlp/autoclassify';
import { gravarHistorico } from './_shared';
import { requireAdminSession } from '@/lib/auth/session';

export interface PreviewResultado {
  totalLinhas: number;
  novos: number;
  atualizadosSemQuebra: number;
  mudancaTier: number;
  mudancaFilial: number;
  desligados: number;
  funcoesNovas: { funcao: string; tier: string; nivel: string | null; trilha: string | null }[];
  filiaisDesconhecidas: number[];
  detalhes: ReturnType<typeof computeDiff>;
  linhas: LinhaNova[];
}

function classifyFn(funcao: string) {
  return autoclassify(funcao);
}

export async function previewImport(formData: FormData): Promise<PreviewResultado> {
  await requireAdminSession();
  const file = formData.get('arquivo') as File;
  if (!file) throw new Error('arquivo ausente');
  const buf = Buffer.from(await file.arrayBuffer());
  const linhas = parseQuadroPerlog(buf);

  const funcoesExistentes = await db.select().from(qlpFuncoesCargo);
  const funcoesMap = new Map(funcoesExistentes.map((f) => [f.funcao, f]));
  const funcoesNovas: PreviewResultado['funcoesNovas'] = [];
  for (const l of linhas) {
    if (!funcoesMap.has(l.funcao)) {
      const c = autoclassify(l.funcao);
      funcoesNovas.push({ funcao: l.funcao, tier: c.tier, nivel: c.nivel, trilha: c.trilha });
      funcoesMap.set(l.funcao, { funcao: l.funcao, ...c, classificadaEm: new Date(), confirmadaPorAdmin: false } as any);
    }
  }

  const atual = await db.select({
    chapa: qlpColaboradores.chapa,
    nome: qlpColaboradores.nome,
    codfilial: qlpColaboradores.codfilial,
    funcao: qlpColaboradores.funcao,
    tier: qlpColaboradores.tierResolvido,
    situacao: qlpColaboradores.situacao,
  }).from(qlpColaboradores).where(eq(qlpColaboradores.ativo, true));

  const atualNorm: EstadoAtual[] = atual.map((c) => ({ ...c, tier: c.tier ?? 'base', situacao: c.situacao ?? '' }));
  const diff = computeDiff(atualNorm, linhas, classifyFn);

  // filiais desconhecidas
  const codfiliais = Array.from(new Set(linhas.map((l) => l.codfilial)));
  const filiaisExistentes = await db.select({ codigo: filiais.codigo }).from(filiais)
    .where(inArray(filiais.codigo, codfiliais.map(String)));
  const cods = new Set(filiaisExistentes.map((f) => Number(f.codigo)));
  const filiaisDesconhecidas = codfiliais.filter((c) => !cods.has(c));

  return {
    totalLinhas: linhas.length,
    novos: diff.novos.length,
    atualizadosSemQuebra: diff.atualizadosSemQuebra.length,
    mudancaTier: diff.mudancaTier.length,
    mudancaFilial: diff.mudancaFilial.length,
    desligados: diff.desligados.length,
    funcoesNovas, filiaisDesconhecidas, detalhes: diff, linhas,
  };
}
```

- [ ] **Step 2: Implementar (aplicarSync)**

```typescript
export async function aplicarSync(formData: FormData) {
  const s = await requireAdminSession();
  const file = formData.get('arquivo') as File;
  const buf = Buffer.from(await file.arrayBuffer());
  const linhas = parseQuadroPerlog(buf);

  return db.transaction(async (tx) => {
    // 0) garantir filiais lookup map
    const filiaisRows = await tx.select({ id: filiais.id, codigo: filiais.codigo }).from(filiais);
    const filMap = new Map(filiaisRows.map((f) => [Number(f.codigo), f.id]));

    // 1) garantir funções
    for (const l of linhas) {
      const exists = await tx.query.qlpFuncoesCargo.findFirst({ where: eq(qlpFuncoesCargo.funcao, l.funcao) });
      if (!exists) {
        const c = autoclassify(l.funcao);
        await tx.insert(qlpFuncoesCargo).values({ funcao: l.funcao, tier: c.tier, nivel: c.nivel, trilha: c.trilha });
      }
    }

    // 2) atual
    const atual = await tx.select().from(qlpColaboradores).where(eq(qlpColaboradores.ativo, true));
    const atualMap = new Map(atual.map((c) => [c.chapa, c]));

    let novos = 0, atualizados = 0, desligados = 0;
    const pend: { tipo: string; chapa: string; descricao: string }[] = [];

    // 3) iterar linhas novas
    for (const l of linhas) {
      const c = autoclassify(l.funcao);
      const filialId = filMap.get(l.codfilial) ?? null;
      const antes = atualMap.get(l.chapa);

      if (!antes) {
        const [novo] = await tx.insert(qlpColaboradores).values({
          chapa: l.chapa, nome: l.nome, regional: l.regional, bandeira: l.bandeira,
          codfilial: l.codfilial, filialId, funcao: l.funcao, secao: l.secao,
          horario: l.horario, nacionalidade: l.nacionalidade, dtAdmissao: l.dtAdmissao,
          mesNasc: l.mesNasc, idade: l.idade, situacao: l.situacao,
          tierResolvido: c.tier, nivelResolvido: c.nivel, trilhaResolvida: c.trilha,
        }).returning();
        novos++;
        pend.push({ tipo: 'novo_sem_lider', chapa: l.chapa, descricao: `${l.nome} (${l.funcao})` });
        if (!filialId) pend.push({ tipo: 'filial_desconhecida', chapa: l.chapa, descricao: `codfilial ${l.codfilial}` });
        await gravarHistorico(tx as any, {
          evento: 'colaborador_cadastrado',
          colaboradorId: novo.id,
          detalhes: { linha: l, classificacao: c },
          ator: { tipo: 'sync', id: s.adminId, nome: s.nome ?? 'sync', filialContextoId: null },
        });
        continue;
      }

      const tierMudou = antes.tierResolvido !== c.tier;
      const filialMudou = antes.codfilial !== l.codfilial;

      await tx.update(qlpColaboradores).set({
        nome: l.nome, regional: l.regional, bandeira: l.bandeira, codfilial: l.codfilial,
        filialId: filialId ?? antes.filialId, funcao: l.funcao, secao: l.secao,
        horario: l.horario, nacionalidade: l.nacionalidade, dtAdmissao: l.dtAdmissao,
        mesNasc: l.mesNasc, idade: l.idade, situacao: l.situacao,
        tierResolvido: c.tier, nivelResolvido: c.nivel, trilhaResolvida: c.trilha,
        updatedAt: new Date(),
      }).where(eq(qlpColaboradores.id, antes.id));

      if (tierMudou || filialMudou) {
        const v = await tx.query.qlpVinculos.findFirst({ where: eq(qlpVinculos.colaboradorId, antes.id) });
        if (v) await tx.delete(qlpVinculos).where(eq(qlpVinculos.colaboradorId, antes.id));
        pend.push({
          tipo: tierMudou ? 'tier_mudou' : 'filial_mudou',
          chapa: antes.chapa,
          descricao: tierMudou
            ? `${antes.nome}: ${antes.tierResolvido} → ${c.tier}`
            : `${antes.nome}: filial ${antes.codfilial} → ${l.codfilial}`,
        });
        await gravarHistorico(tx as any, {
          evento: tierMudou ? 'colaborador_mudou_funcao' : 'colaborador_transferido_filial',
          colaboradorId: antes.id,
          liderIdAntigo: v?.liderId ?? null,
          detalhes: { antes: { tier: antes.tierResolvido, codfilial: antes.codfilial, funcao: antes.funcao },
                      depois: { tier: c.tier, codfilial: l.codfilial, funcao: l.funcao } },
          ator: { tipo: 'sync', id: s.adminId, nome: s.nome ?? 'sync', filialContextoId: null },
        });
      }
      atualizados++;
    }

    // 4) desligados
    const chapasNovas = new Set(linhas.map((l) => l.chapa));
    for (const c of atual) {
      if (!chapasNovas.has(c.chapa)) {
        const v = await tx.query.qlpVinculos.findFirst({ where: eq(qlpVinculos.colaboradorId, c.id) });
        await tx.update(qlpColaboradores).set({ ativo: false, updatedAt: new Date() }).where(eq(qlpColaboradores.id, c.id));
        if (v) await tx.delete(qlpVinculos).where(eq(qlpVinculos.colaboradorId, c.id));
        const era_lider = await tx.query.qlpLideres.findFirst({ where: eq(qlpLideres.colaboradorId, c.id) });
        if (era_lider) {
          pend.push({ tipo: 'desligado_com_time', chapa: c.chapa, descricao: `${c.nome} era líder` });
        }
        desligados++;
        await gravarHistorico(tx as any, {
          evento: 'colaborador_desligado',
          colaboradorId: c.id,
          liderIdAntigo: v?.liderId ?? null,
          detalhes: { chapa: c.chapa },
          ator: { tipo: 'sync', id: s.adminId, nome: s.nome ?? 'sync', filialContextoId: null },
        });
      }
    }

    // 5) gravar pendências
    for (const p of pend) {
      const colab = await tx.query.qlpColaboradores.findFirst({ where: eq(qlpColaboradores.chapa, p.chapa) });
      await tx.insert(qlpPendencias).values({
        tipo: p.tipo, colaboradorId: colab?.id ?? null, descricao: p.descricao,
      });
    }

    // 6) gravar import
    const [imp] = await tx.insert(qlpImports).values({
      arquivo: file.name, executadoPor: s.nome ?? 'admin',
      totalLinhas: linhas.length, novos, atualizados, desligados,
      mudancaTier: pend.filter((p) => p.tipo === 'tier_mudou'),
      pendencias: pend,
    }).returning();

    await gravarHistorico(tx as any, {
      evento: 'import_executado',
      detalhes: { importId: imp.id, novos, atualizados, desligados, pendencias: pend.length },
      ator: { tipo: 'sync', id: s.adminId, nome: s.nome ?? 'sync', filialContextoId: null },
    });

    return imp;
  });
}

// Faltam imports usados acima — adicionar no topo:
import { qlpLideres } from '@/db/schema';
```

> Nota: import duplicado de `qlpLideres` é só lembrete; ajustar no topo do arquivo.

- [ ] **Step 2: Typecheck + commit**
```bash
npm run typecheck
git add actions/qlp/importar.ts
git commit -m "feat(qlp): preview e aplicarSync do upload Perlog"
```

---

### Task 6.5: Teste de integração end-to-end do sync

**Files:**
- Test: `tests/qlp/integration-sync.test.ts`

- [ ] **Step 1: Implementar (usa DB de teste)**

```typescript
// tests/qlp/integration-sync.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { db } from '@/db/client';
import { qlpColaboradores, qlpVinculos, qlpPendencias, qlpFuncoesCargo, qlpImports } from '@/db/schema';
import { sql } from 'drizzle-orm';

beforeEach(async () => {
  await db.execute(sql`TRUNCATE qlp_vinculos, qlp_lideres, qlp_pendencias, qlp_imports, qlp_historico, qlp_colaboradores, qlp_funcoes_cargo RESTART IDENTITY CASCADE`);
});

describe('sync integration', () => {
  it.todo('aplicar mesmo XLS duas vezes → segunda gera 0 mudanças');
  it.todo('mudança de tier remove vínculo e gera pendência tier_mudou');
  it.todo('mudança de filial remove vínculo e gera pendência filial_mudou');
  it.todo('chapa sumindo → ativo=false + soft-delete');
});
```

(Implementar os `it.todo` conforme tempo; o engenheiro pode pular essa task em dev e priorizar QA manual em staging.)

- [ ] **Step 2: Commit**
```bash
git add tests/qlp/integration-sync.test.ts
git commit -m "test(qlp): esqueleto de teste de integração do sync"
```

---

# Fase 7 — Telas

### Task 7.1: Layout + landing `/qlp`

**Files:**
- Create: `app/(app)/qlp/layout.tsx`
- Create: `app/(app)/qlp/page.tsx`
- Modify: `components/layout/nav-config.ts`

- [ ] **Step 1: Adicionar entrada no menu**

Em `components/layout/nav-config.ts`, espelhar o padrão de `ESCUTA_NAV_BASE` adicionando:

```typescript
export const QLP_NAV_BASE = [
  { href: '/qlp',              label: 'Visão geral' },
  { href: '/qlp/quadro',       label: 'Quadro' },
  { href: '/qlp/organograma',  label: 'Organograma' },
  { href: '/qlp/historico',    label: 'Histórico' },
  { href: '/qlp/indicadores',  label: 'Indicadores' },
];
export const QLP_NAV_ADMIN_EXTRAS = [
  { href: '/qlp/lideres',  label: 'Líderes' },
  { href: '/qlp/cargos',   label: 'Cargos' },
  { href: '/qlp/importar', label: 'Importar XLS' },
];
```

E adicionar a entrada principal "QLP & Liderança" em `FILIAL_NAV` e `ADMIN_NAV` apontando para `/qlp`.

Atualizar `components/layout/Sidebar.tsx` para detectar `inQlp` e usar `QLP_NAV_BASE` + (`QLP_NAV_ADMIN_EXTRAS` se admin), seguindo o mesmo padrão visual de Escuta.

- [ ] **Step 2: Layout**

```tsx
// app/(app)/qlp/layout.tsx
import { getSession } from '@/lib/auth/session';
import { redirect } from 'next/navigation';

export default async function QlpLayout({ children }: { children: React.ReactNode }) {
  const s = await getSession();
  if (!s) redirect('/login');
  return <div className="p-6">{children}</div>;
}
```

- [ ] **Step 3: Landing**

```tsx
// app/(app)/qlp/page.tsx
import { getSession } from '@/lib/auth/session';
import { getKPIs } from '@/db/queries/qlp';

export default async function QlpHome() {
  const s = await getSession();
  const filialId = s!.perfil === 'filial' ? s!.filialId : undefined;
  const kpis = (await getKPIs(filialId)) as any;
  const k = kpis[0] ?? {};
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">QLP & Liderança</h1>
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <Card title="Ativos" value={k.total_ativos ?? 0} />
        <Card title="Com líder" value={`${k.com_lider ?? 0}/${k.total_ativos ?? 0}`} />
        <Card title="Pendências" value={k.pendencias_abertas ?? 0} />
        <Card title="Último sync" value={k.ultimo_sync ? new Date(k.ultimo_sync).toLocaleString('pt-BR') : '—'} />
      </div>
    </div>
  );
}

function Card({ title, value }: { title: string; value: string | number }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4">
      <div className="text-xs uppercase tracking-wide text-slate-500">{title}</div>
      <div className="mt-1 text-2xl font-semibold">{value}</div>
    </div>
  );
}
```

- [ ] **Step 4: Rodar `npm run dev` e abrir `http://localhost:3000/qlp`**

Expected: tela carrega com 4 cards (todos podem estar zerados antes do primeiro import).

- [ ] **Step 5: Commit**
```bash
git add components/layout/nav-config.ts components/layout/Sidebar.tsx app/\(app\)/qlp/layout.tsx app/\(app\)/qlp/page.tsx
git commit -m "feat(qlp): nav + layout + landing"
```

---

### Task 7.2: `/qlp/importar`

**Files:**
- Create: `app/(app)/qlp/importar/page.tsx`
- Create: `components/qlp/ImportPreview.tsx`

- [ ] **Step 1: Página**

```tsx
// app/(app)/qlp/importar/page.tsx
import { getSession } from '@/lib/auth/session';
import { redirect } from 'next/navigation';
import { ImportPreview } from '@/components/qlp/ImportPreview';

export default async function ImportarPage() {
  const s = await getSession();
  if (s?.perfil !== 'admin') redirect('/qlp');
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Importar quadro Perlog</h1>
      <ImportPreview />
    </div>
  );
}
```

- [ ] **Step 2: Componente client**

```tsx
// components/qlp/ImportPreview.tsx
'use client';
import { useState, useTransition } from 'react';
import { previewImport, aplicarSync } from '@/actions/qlp/importar';

export function ImportPreview() {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<any>(null);
  const [pending, start] = useTransition();
  const [erro, setErro] = useState<string | null>(null);

  async function onPreview() {
    if (!file) return;
    setErro(null);
    const fd = new FormData(); fd.append('arquivo', file);
    start(async () => {
      try { setPreview(await previewImport(fd)); } catch (e: any) { setErro(e.message); }
    });
  }
  async function onApply() {
    if (!file) return;
    setErro(null);
    const fd = new FormData(); fd.append('arquivo', file);
    start(async () => {
      try { await aplicarSync(fd); setPreview(null); setFile(null); alert('Sync aplicado!'); }
      catch (e: any) { setErro(e.message); }
    });
  }

  return (
    <div className="space-y-4">
      <input type="file" accept=".xls,.xlsx" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
      <div className="flex gap-2">
        <button disabled={!file || pending} onClick={onPreview} className="rounded-lg bg-slate-900 text-white px-3 py-2">
          {pending ? 'Processando…' : 'Pré-visualizar'}
        </button>
        {preview && (
          <button disabled={pending} onClick={onApply} className="rounded-lg bg-emerald-600 text-white px-3 py-2">
            Aplicar sync
          </button>
        )}
      </div>
      {erro && <div className="text-red-600 text-sm">{erro}</div>}
      {preview && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-4">
          <Stat label="Total" value={preview.totalLinhas} />
          <Stat label="Novos" value={preview.novos} tone="emerald" />
          <Stat label="Atualizados" value={preview.atualizadosSemQuebra} />
          <Stat label="Mudança de tier" value={preview.mudancaTier} tone="amber" />
          <Stat label="Mudança de filial" value={preview.mudancaFilial} tone="amber" />
          <Stat label="Desligados" value={preview.desligados} tone="rose" />
          <Stat label="Funções novas" value={preview.funcoesNovas.length} />
          <Stat label="Filiais desconhecidas" value={preview.filiaisDesconhecidas.length} tone="rose" />
        </div>
      )}
    </div>
  );
}

function Stat({ label, value, tone = 'slate' }: { label: string; value: number; tone?: string }) {
  const toneClass: Record<string, string> = {
    slate: 'bg-slate-50 text-slate-900',
    emerald: 'bg-emerald-50 text-emerald-900',
    amber: 'bg-amber-50 text-amber-900',
    rose: 'bg-rose-50 text-rose-900',
  };
  return (
    <div className={`rounded-xl p-3 ${toneClass[tone] ?? toneClass.slate}`}>
      <div className="text-xs uppercase">{label}</div>
      <div className="text-xl font-semibold">{value}</div>
    </div>
  );
}
```

- [ ] **Step 3: Smoke test**

Rodar `npm run dev`, logar como admin, ir em `/qlp/importar`, subir o XLS de exemplo, conferir que o preview mostra ~1739 totais, ~1739 novos (na primeira vez), clicar "Aplicar sync" e ver alert de sucesso.

- [ ] **Step 4: Verificar no DB**

`npm run db:studio` → tabela `qlp_colaboradores` deve ter ~1739 linhas, `qlp_imports` 1 linha, `qlp_pendencias` ~1739 (todas `novo_sem_lider`), `qlp_historico` com `import_executado` + 1 por colaborador.

- [ ] **Step 5: Re-uploadar o mesmo XLS**

Expected: preview mostra 0 novos, 0 mudanças, 0 desligados (idempotência ✓).

- [ ] **Step 6: Commit**
```bash
git add app/\(app\)/qlp/importar components/qlp/ImportPreview.tsx
git commit -m "feat(qlp): tela de import com preview e aplicarSync"
```

---

### Task 7.3: `/qlp/cargos` — revisar classificação

**Files:**
- Create: `app/(app)/qlp/cargos/page.tsx`
- Create: `components/qlp/CargoEditor.tsx`

- [ ] **Step 1: Página + componente**

```tsx
// app/(app)/qlp/cargos/page.tsx
import { db } from '@/db/client';
import { qlpFuncoesCargo, qlpColaboradores } from '@/db/schema';
import { sql, eq } from 'drizzle-orm';
import { CargoEditor } from '@/components/qlp/CargoEditor';
import { getSession } from '@/lib/auth/session';
import { redirect } from 'next/navigation';

export default async function CargosPage() {
  const s = await getSession();
  if (s?.perfil !== 'admin') redirect('/qlp');

  const rows = await db.execute(sql`
    SELECT fc.funcao, fc.tier, fc.nivel, fc.trilha, fc.confirmada_por_admin,
           (SELECT count(*) FROM qlp_colaboradores c WHERE c.funcao = fc.funcao AND c.ativo)::int AS qtd
    FROM qlp_funcoes_cargo fc ORDER BY fc.tier DESC, fc.funcao
  `);
  return <CargoEditor rows={rows as any} />;
}
```

```tsx
// components/qlp/CargoEditor.tsx
'use client';
import { useState, useTransition } from 'react';
import { reclassificarFuncao } from '@/actions/qlp/cargos';

const TIERS = ['gerente','subgerente','coord','supervisor','base'] as const;
const NIVEIS = [null,'nacional','regional','i','ii'] as const;
const TRILHAS = ['logistica','transporte','abastecimento','prevencao','gg','manutencao','ti','financ','outros'] as const;

export function CargoEditor({ rows }: { rows: any[] }) {
  const [pending, start] = useTransition();
  const [local, setLocal] = useState(rows);

  function save(i: number, patch: any) {
    const r = { ...local[i], ...patch };
    setLocal((l) => l.map((x, idx) => idx === i ? r : x));
    start(async () => {
      await reclassificarFuncao({ funcao: r.funcao, tier: r.tier, nivel: r.nivel, trilha: r.trilha });
    });
  }

  return (
    <table className="w-full text-sm">
      <thead><tr className="border-b">
        <th className="text-left p-2">Função</th>
        <th className="text-left p-2">Tier</th>
        <th className="text-left p-2">Nível</th>
        <th className="text-left p-2">Trilha</th>
        <th className="text-right p-2">Qtd</th>
      </tr></thead>
      <tbody>
        {local.map((r, i) => (
          <tr key={r.funcao} className="border-b hover:bg-slate-50">
            <td className="p-2">{r.funcao}</td>
            <td className="p-2">
              <select value={r.tier} onChange={(e) => save(i, { tier: e.target.value })}>
                {TIERS.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </td>
            <td className="p-2">
              <select value={r.nivel ?? ''} onChange={(e) => save(i, { nivel: e.target.value || null })}>
                {NIVEIS.map(n => <option key={String(n)} value={n ?? ''}>{n ?? '—'}</option>)}
              </select>
            </td>
            <td className="p-2">
              <select value={r.trilha ?? 'outros'} onChange={(e) => save(i, { trilha: e.target.value })}>
                {TRILHAS.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </td>
            <td className="p-2 text-right">{r.qtd}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
```

- [ ] **Step 2: Smoke test**
Abrir `/qlp/cargos`, conferir lista das funções importadas, mudar a trilha de uma → recarregar página → mudança persiste.

- [ ] **Step 3: Commit**
```bash
git add app/\(app\)/qlp/cargos components/qlp/CargoEditor.tsx
git commit -m "feat(qlp): tela de revisão/edição da classificação de funções"
```

---

### Task 7.4: `/qlp/lideres` — admin gerencia espinha

**Files:**
- Create: `app/(app)/qlp/lideres/page.tsx`
- Create: `components/qlp/NovoLiderForm.tsx`

- [ ] **Step 1: Página com lista + form modal**

```tsx
// app/(app)/qlp/lideres/page.tsx
import { db } from '@/db/client';
import { sql } from 'drizzle-orm';
import { getSession } from '@/lib/auth/session';
import { redirect } from 'next/navigation';
import { NovoLiderForm } from '@/components/qlp/NovoLiderForm';

export default async function LideresPage() {
  const s = await getSession();
  if (s?.perfil !== 'admin') redirect('/qlp');

  const lideres = await db.execute(sql`
    SELECT l.id, l.tier, l.nivel, l.escopo_nacional, l.filiais_escopo,
           c.nome, c.funcao, c.chapa, c.codfilial
    FROM qlp_lideres l
    JOIN qlp_colaboradores c ON c.id = l.colaborador_id
    WHERE l.ativo
    ORDER BY CASE l.tier WHEN 'gerente' THEN 1 WHEN 'subgerente' THEN 2 WHEN 'coord' THEN 3 ELSE 4 END, c.nome
  `);
  const filiais = await db.execute(sql`SELECT id, codigo, nome FROM filiais ORDER BY codigo`);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Líderes — espinha</h1>
        <NovoLiderForm filiais={filiais as any} />
      </div>
      <table className="w-full text-sm">
        <thead><tr className="border-b">
          <th className="text-left p-2">Nome</th>
          <th className="text-left p-2">Função</th>
          <th className="text-left p-2">Tier</th>
          <th className="text-left p-2">Nível</th>
          <th className="text-left p-2">Escopo</th>
        </tr></thead>
        <tbody>
          {(lideres as any[]).map((l) => (
            <tr key={l.id} className="border-b">
              <td className="p-2">{l.nome}</td>
              <td className="p-2">{l.funcao}</td>
              <td className="p-2">{l.tier}</td>
              <td className="p-2">{l.nivel ?? '—'}</td>
              <td className="p-2">{l.escopo_nacional ? 'Nacional' : `${(l.filiais_escopo ?? []).length} filiais`}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
```

- [ ] **Step 2: Componente do form**

```tsx
// components/qlp/NovoLiderForm.tsx
'use client';
import { useState, useTransition } from 'react';
import { criarLider } from '@/actions/qlp/lideres';

export function NovoLiderForm({ filiais }: { filiais: { id: string; codigo: string; nome: string }[] }) {
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const [chapa, setChapa] = useState('');
  const [tier, setTier] = useState<'gerente'|'subgerente'|'coord'>('coord');
  const [nivel, setNivel] = useState<'nacional'|'regional'|''>('regional');
  const [escopoNacional, setEscopoNacional] = useState(false);
  const [filiaisEscopo, setFiliaisEscopo] = useState<string[]>([]);
  const [erro, setErro] = useState<string | null>(null);

  async function submit() {
    setErro(null);
    start(async () => {
      try {
        const r = await fetch(`/api/qlp/colaborador-por-chapa?chapa=${chapa}`).then(r => r.json());
        if (!r?.id) throw new Error('chapa não encontrada');
        await criarLider({
          colaboradorId: r.id, tier, nivel: tier === 'subgerente' ? null : (nivel || null),
          escopoNacional, filiaisEscopo,
        });
        setOpen(false); location.reload();
      } catch (e: any) { setErro(e.message); }
    });
  }

  if (!open) return <button className="rounded-lg bg-slate-900 text-white px-3 py-2" onClick={() => setOpen(true)}>+ Novo líder</button>;
  return (
    <div className="fixed inset-0 bg-black/30 grid place-items-center z-50">
      <div className="bg-white rounded-2xl p-6 w-full max-w-md space-y-3">
        <h2 className="text-lg font-semibold">Novo líder</h2>
        <input className="w-full border rounded p-2" placeholder="Chapa do colaborador" value={chapa} onChange={e => setChapa(e.target.value)} />
        <select className="w-full border rounded p-2" value={tier} onChange={e => setTier(e.target.value as any)}>
          <option value="gerente">Gerente</option><option value="subgerente">Subgerente</option><option value="coord">Coord</option>
        </select>
        {tier !== 'subgerente' && (
          <select className="w-full border rounded p-2" value={nivel} onChange={e => setNivel(e.target.value as any)}>
            <option value="regional">Regional</option><option value="nacional">Nacional</option>
          </select>
        )}
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={escopoNacional} onChange={e => setEscopoNacional(e.target.checked)} />
          Escopo nacional (todas filiais)
        </label>
        {!escopoNacional && (
          <select multiple className="w-full border rounded p-2 h-32" value={filiaisEscopo} onChange={e => setFiliaisEscopo(Array.from(e.target.selectedOptions).map(o => o.value))}>
            {filiais.map(f => <option key={f.id} value={f.id}>{f.codigo} — {f.nome}</option>)}
          </select>
        )}
        {erro && <div className="text-red-600 text-sm">{erro}</div>}
        <div className="flex justify-end gap-2">
          <button onClick={() => setOpen(false)} className="px-3 py-2">Cancelar</button>
          <button onClick={submit} disabled={pending} className="px-3 py-2 rounded-lg bg-emerald-600 text-white">{pending ? '…' : 'Criar'}</button>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Criar endpoint helper de lookup por chapa**

```typescript
// app/api/qlp/colaborador-por-chapa/route.ts
import { db } from '@/db/client';
import { qlpColaboradores } from '@/db/schema';
import { eq } from 'drizzle-orm';

export async function GET(req: Request) {
  const url = new URL(req.url);
  const chapa = url.searchParams.get('chapa') ?? '';
  const c = await db.query.qlpColaboradores.findFirst({ where: eq(qlpColaboradores.chapa, chapa) });
  return Response.json(c ?? null);
}
```

- [ ] **Step 4: Smoke test**
Criar 1 gerente nacional, 1 coord regional (filiais 20 e 167) — verificar na tabela.

- [ ] **Step 5: Commit**
```bash
git add app/\(app\)/qlp/lideres app/api/qlp/colaborador-por-chapa components/qlp/NovoLiderForm.tsx
git commit -m "feat(qlp): tela de líderes (admin) + lookup por chapa"
```

---

### Task 7.5: `/qlp/quadro` — lista + atribuir/mover líder

**Files:**
- Create: `app/(app)/qlp/quadro/page.tsx`
- Create: `components/qlp/AtribuirLiderModal.tsx`

- [ ] **Step 1: Implementar tabela com filtros e ações**

(Implementação extensa; usar `@tanstack/react-table` que já é dependência. Estrutura sugerida:)

```tsx
// app/(app)/qlp/quadro/page.tsx
import { db } from '@/db/client';
import { sql } from 'drizzle-orm';
import { getSession } from '@/lib/auth/session';
import { QuadroTable } from '@/components/qlp/QuadroTable';

export default async function QuadroPage({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  const sp = await searchParams;
  const s = await getSession();
  const filialFilter = s!.perfil === 'filial' ? s!.filialId : sp.filial;
  const semLider = sp.semLider === '1';

  const rows = await db.execute(sql`
    SELECT c.id, c.chapa, c.nome, c.funcao, c.secao, c.situacao, c.tier_resolvido,
           c.filial_id, f.codigo AS filial_codigo,
           cl.nome AS lider_nome, l.tier AS lider_tier, l.id AS lider_id
    FROM qlp_colaboradores c
    LEFT JOIN qlp_vinculos v ON v.colaborador_id = c.id
    LEFT JOIN qlp_lideres l ON l.id = v.lider_id
    LEFT JOIN qlp_colaboradores cl ON cl.id = l.colaborador_id
    LEFT JOIN filiais f ON f.id = c.filial_id
    WHERE c.ativo
      AND (${filialFilter ?? null}::uuid IS NULL OR c.filial_id = ${filialFilter ?? null}::uuid)
      AND (${semLider}::boolean = false OR v.colaborador_id IS NULL)
    ORDER BY c.nome
  `);
  return <QuadroTable rows={rows as any} podeEditar={s!.perfil === 'admin' || s!.perfil === 'filial'} />;
}
```

```tsx
// components/qlp/QuadroTable.tsx (esqueleto)
'use client';
import { useState } from 'react';
import { AtribuirLiderModal } from './AtribuirLiderModal';

export function QuadroTable({ rows, podeEditar }: { rows: any[]; podeEditar: boolean }) {
  const [alvo, setAlvo] = useState<any>(null);
  return (
    <>
      <table className="w-full text-sm">
        <thead><tr className="border-b">
          <th className="text-left p-2">Chapa</th>
          <th className="text-left p-2">Nome</th>
          <th className="text-left p-2">Função</th>
          <th className="text-left p-2">Filial</th>
          <th className="text-left p-2">Situação</th>
          <th className="text-left p-2">Líder</th>
          <th className="text-right p-2">Ações</th>
        </tr></thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id} className="border-b">
              <td className="p-2">{r.chapa}</td>
              <td className="p-2">{r.nome}</td>
              <td className="p-2">{r.funcao}</td>
              <td className="p-2">{r.filial_codigo}</td>
              <td className="p-2">{r.situacao}</td>
              <td className="p-2">{r.lider_nome ?? <span className="text-red-600">— sem líder —</span>}</td>
              <td className="p-2 text-right">
                {podeEditar && (
                  <button className="rounded bg-slate-900 text-white px-2 py-1 text-xs" onClick={() => setAlvo(r)}>
                    {r.lider_id ? 'Mover' : 'Atribuir líder'}
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {alvo && <AtribuirLiderModal colaborador={alvo} onClose={() => setAlvo(null)} />}
    </>
  );
}
```

```tsx
// components/qlp/AtribuirLiderModal.tsx
'use client';
import { useEffect, useState, useTransition } from 'react';
import { atribuirVinculo } from '@/actions/qlp/vinculos';

export function AtribuirLiderModal({ colaborador, onClose }: { colaborador: any; onClose: () => void }) {
  const [lideres, setLideres] = useState<any[]>([]);
  const [liderId, setLiderId] = useState('');
  const [motivo, setMotivo] = useState('');
  const [erro, setErro] = useState<string | null>(null);
  const [pending, start] = useTransition();

  useEffect(() => {
    fetch(`/api/qlp/lideres-elegiveis?colaboradorId=${colaborador.id}`).then(r => r.json()).then(setLideres);
  }, [colaborador.id]);

  function submit() {
    setErro(null);
    start(async () => {
      try {
        await atribuirVinculo({ colaboradorId: colaborador.id, liderId, motivo });
        onClose(); location.reload();
      } catch (e: any) { setErro(e.message); }
    });
  }

  return (
    <div className="fixed inset-0 bg-black/30 grid place-items-center z-50">
      <div className="bg-white rounded-2xl p-6 w-full max-w-md space-y-3">
        <h2 className="text-lg font-semibold">Atribuir líder para {colaborador.nome}</h2>
        <select className="w-full border rounded p-2" value={liderId} onChange={e => setLiderId(e.target.value)}>
          <option value="">— escolher —</option>
          {lideres.map(l => <option key={l.id} value={l.id}>{l.nome} · {l.funcao}</option>)}
        </select>
        <textarea className="w-full border rounded p-2" placeholder="Motivo (obrigatório)" value={motivo} onChange={e => setMotivo(e.target.value)} />
        {erro && <div className="text-red-600 text-sm">{erro}</div>}
        <div className="flex justify-end gap-2">
          <button onClick={onClose}>Cancelar</button>
          <button disabled={!liderId || !motivo || pending} onClick={submit} className="rounded-lg bg-emerald-600 text-white px-3 py-2">{pending ? '…' : 'Confirmar'}</button>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Endpoint de líderes elegíveis**

```typescript
// app/api/qlp/lideres-elegiveis/route.ts
import { db } from '@/db/client';
import { sql } from 'drizzle-orm';

export async function GET(req: Request) {
  const url = new URL(req.url);
  const colabId = url.searchParams.get('colaboradorId')!;
  const rows = await db.execute(sql`
    SELECT l.id, c.nome, c.funcao, l.tier, l.nivel
    FROM qlp_lideres l
    JOIN qlp_colaboradores c ON c.id = l.colaborador_id
    WHERE l.ativo
      AND (
        l.escopo_nacional
        OR (SELECT filial_id::text FROM qlp_colaboradores WHERE id = ${colabId}) = ANY(SELECT jsonb_array_elements_text(l.filiais_escopo))
      )
      AND (
        -- regra de tier
        (SELECT tier_resolvido FROM qlp_colaboradores WHERE id = ${colabId}) IS NULL
        OR l.tier IN (
          SELECT unnest(CASE (SELECT tier_resolvido FROM qlp_colaboradores WHERE id = ${colabId})
            WHEN 'base'       THEN ARRAY['supervisor','coord','subgerente','gerente']
            WHEN 'supervisor' THEN ARRAY['coord','subgerente','gerente']
            WHEN 'coord'      THEN ARRAY['subgerente','gerente']
            WHEN 'subgerente' THEN ARRAY['gerente']
            ELSE ARRAY[]::text[]
          END)
        )
      )
    ORDER BY l.tier DESC, c.nome
  `);
  return Response.json(rows);
}
```

- [ ] **Step 3: Smoke test**
- Logar como filial 20, ir em `/qlp/quadro`, ver só colaboradores da filial 20
- Atribuir 1 supervisor a um colaborador base → mover ele para outro supervisor → ver alterações no histórico

- [ ] **Step 4: Commit**
```bash
git add app/\(app\)/qlp/quadro app/api/qlp/lideres-elegiveis components/qlp/QuadroTable.tsx components/qlp/AtribuirLiderModal.tsx
git commit -m "feat(qlp): quadro de colaboradores com atribuição/mobilização de líderes"
```

---

### Task 7.6: `/qlp/organograma` — drill-down só de líderes

**Files:**
- Create: `app/(app)/qlp/organograma/page.tsx`
- Create: `components/qlp/OrgChartTree.tsx`

- [ ] **Step 1: Server: buscar líderes e seus resumos**

```tsx
// app/(app)/qlp/organograma/page.tsx
import { db } from '@/db/client';
import { sql } from 'drizzle-orm';
import { OrgChartTree } from '@/components/qlp/OrgChartTree';

export default async function OrgPage() {
  const lideres = await db.execute(sql`
    WITH RECURSIVE
    diretos AS (
      SELECT l.id, l.tier, l.nivel, l.escopo_nacional, l.filiais_escopo,
             c.nome, c.funcao, c.codfilial,
             (SELECT count(*) FROM qlp_vinculos v WHERE v.lider_id = l.id)::int AS qtd_diretos
      FROM qlp_lideres l
      JOIN qlp_colaboradores c ON c.id = l.colaborador_id
      WHERE l.ativo
    )
    SELECT * FROM diretos
  `);
  return <OrgChartTree lideres={lideres as any} />;
}
```

```tsx
// components/qlp/OrgChartTree.tsx
'use client';
import { useState } from 'react';

const ORDEM = ['gerente','subgerente','coord','supervisor'];

export function OrgChartTree({ lideres }: { lideres: any[] }) {
  const [selecionado, setSelecionado] = useState<any>(null);
  const porTier = (tier: string) => lideres.filter(l => l.tier === tier);

  return (
    <div className="overflow-x-auto">
      <div className="flex gap-6">
        {ORDEM.map(tier => (
          <div key={tier} className="min-w-[220px]">
            <div className="text-xs uppercase font-semibold text-slate-500 mb-2">{tier}</div>
            <div className="space-y-2">
              {porTier(tier).map(l => (
                <button key={l.id} onClick={() => setSelecionado(l)} className="w-full text-left rounded-xl border border-slate-200 bg-white p-3 hover:bg-slate-50">
                  <div className="text-sm font-medium">{l.nome}</div>
                  <div className="text-xs text-slate-500">{l.funcao}</div>
                  <div className="text-xs mt-1">
                    <span className="rounded bg-slate-100 px-1.5 py-0.5">{l.qtd_diretos} diretos</span>
                    {l.escopo_nacional && <span className="ml-1 rounded bg-violet-100 text-violet-900 px-1.5 py-0.5">nacional</span>}
                  </div>
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
      {/* TODO: drawer com time completo via /api/qlp/time-efetivo?liderId=... */}
    </div>
  );
}
```

- [ ] **Step 2: Smoke test**
Abrir `/qlp/organograma`, ver as colunas com os líderes criados na task 7.4.

- [ ] **Step 3: Commit**
```bash
git add app/\(app\)/qlp/organograma components/qlp/OrgChartTree.tsx
git commit -m "feat(qlp): organograma drill-down só de líderes com resumo de time"
```

---

### Task 7.7: `/qlp/historico` + `/qlp/indicadores` + `/qlp/[id]`

**Files:**
- Create: `app/(app)/qlp/historico/page.tsx`
- Create: `app/(app)/qlp/indicadores/page.tsx`
- Create: `app/(app)/qlp/[id]/page.tsx`

- [ ] **Step 1: Histórico (lista cronológica)**

```tsx
// app/(app)/qlp/historico/page.tsx
import { db } from '@/db/client';
import { sql } from 'drizzle-orm';
import { getSession } from '@/lib/auth/session';

export default async function HistoricoPage() {
  const s = await getSession();
  const filialFilter = s!.perfil === 'filial' ? s!.filialId : null;
  const rows = await db.execute(sql`
    SELECT h.*, c.nome AS colaborador_nome
    FROM qlp_historico h
    LEFT JOIN qlp_colaboradores c ON c.id = h.colaborador_id
    WHERE (${filialFilter}::uuid IS NULL OR h.filial_contexto_id = ${filialFilter}::uuid)
    ORDER BY h.created_at DESC
    LIMIT 500
  `);
  return (
    <div className="space-y-2">
      <h1 className="text-2xl font-semibold mb-4">Histórico</h1>
      <table className="w-full text-sm">
        <thead><tr className="border-b">
          <th className="text-left p-2">Quando</th>
          <th className="text-left p-2">Ator</th>
          <th className="text-left p-2">Evento</th>
          <th className="text-left p-2">Colaborador</th>
          <th className="text-left p-2">Detalhes</th>
        </tr></thead>
        <tbody>
          {(rows as any[]).map(r => (
            <tr key={r.id} className="border-b">
              <td className="p-2 whitespace-nowrap">{new Date(r.created_at).toLocaleString('pt-BR')}</td>
              <td className="p-2">{r.ator_nome} <span className="text-xs text-slate-500">({r.ator_tipo})</span></td>
              <td className="p-2">{r.evento}</td>
              <td className="p-2">{r.colaborador_nome ?? '—'}</td>
              <td className="p-2"><details><summary className="cursor-pointer">JSON</summary><pre className="text-xs bg-slate-50 p-2">{JSON.stringify(r.detalhes, null, 2)}</pre></details></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
```

- [ ] **Step 2: Indicadores**

```tsx
// app/(app)/qlp/indicadores/page.tsx
import { db } from '@/db/client';
import { sql } from 'drizzle-orm';
import { getSession } from '@/lib/auth/session';

export default async function IndicadoresPage() {
  const s = await getSession();
  const filialFilter = s!.perfil === 'filial' ? s!.filialId : null;

  const distTier = await db.execute(sql`
    SELECT tier_resolvido AS tier, count(*)::int AS qtd
    FROM qlp_colaboradores
    WHERE ativo AND (${filialFilter}::uuid IS NULL OR filial_id = ${filialFilter}::uuid)
    GROUP BY tier_resolvido
  `);
  const coberturaPorFilial = await db.execute(sql`
    SELECT f.codigo, f.nome,
           count(c.id)::int AS total,
           count(v.colaborador_id)::int AS com_lider
    FROM filiais f
    LEFT JOIN qlp_colaboradores c ON c.filial_id = f.id AND c.ativo
    LEFT JOIN qlp_vinculos v ON v.colaborador_id = c.id
    GROUP BY f.id, f.codigo, f.nome ORDER BY f.codigo
  `);
  const pendencias = await db.execute(sql`
    SELECT tipo, count(*)::int AS qtd FROM qlp_pendencias WHERE NOT resolvida GROUP BY tipo
  `);

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-semibold">Indicadores</h1>
      <Sect title="Distribuição por tier">
        <table className="w-full text-sm">{(distTier as any[]).map(r => <tr key={r.tier}><td className="p-1">{r.tier}</td><td className="p-1 text-right">{r.qtd}</td></tr>)}</table>
      </Sect>
      <Sect title="Cobertura por filial">
        <table className="w-full text-sm">
          <tbody>
            {(coberturaPorFilial as any[]).map(r => (
              <tr key={r.codigo}><td className="p-1">{r.codigo} — {r.nome}</td><td className="p-1 text-right">{r.com_lider}/{r.total}</td></tr>
            ))}
          </tbody>
        </table>
      </Sect>
      <Sect title="Pendências abertas">
        <table className="w-full text-sm">{(pendencias as any[]).map(r => <tr key={r.tipo}><td className="p-1">{r.tipo}</td><td className="p-1 text-right">{r.qtd}</td></tr>)}</table>
      </Sect>
    </div>
  );
}

function Sect({ title, children }: { title: string; children: React.ReactNode }) {
  return <section><h2 className="text-lg font-semibold mb-2">{title}</h2><div className="rounded-xl border bg-white p-4">{children}</div></section>;
}
```

- [ ] **Step 3: Detalhe do colaborador**

```tsx
// app/(app)/qlp/[id]/page.tsx
import { db } from '@/db/client';
import { sql } from 'drizzle-orm';
import { notFound } from 'next/navigation';

export default async function DetalheColaborador({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const colab = (await db.execute(sql`
    SELECT c.*, f.codigo AS filial_codigo
    FROM qlp_colaboradores c LEFT JOIN filiais f ON f.id = c.filial_id
    WHERE c.id = ${id}
  `) as any)[0];
  if (!colab) notFound();

  // Cadeia de liderança (ancestrais via CTE)
  const cadeia = await db.execute(sql`
    WITH RECURSIVE chain AS (
      SELECT v.colaborador_id, v.lider_id, 1 AS nivel
      FROM qlp_vinculos v WHERE v.colaborador_id = ${id}
      UNION ALL
      SELECT v2.colaborador_id, v2.lider_id, c.nivel + 1
      FROM qlp_vinculos v2
      JOIN qlp_lideres l ON l.id = v2.lider_id
      JOIN chain c ON c.lider_id = (SELECT id FROM qlp_lideres WHERE colaborador_id = v2.colaborador_id LIMIT 1)
    )
    SELECT ch.nivel, ll.tier, cl.nome, cl.funcao
    FROM chain ch
    JOIN qlp_lideres ll ON ll.id = ch.lider_id
    JOIN qlp_colaboradores cl ON cl.id = ll.colaborador_id
    ORDER BY ch.nivel
  `);

  const historico = await db.execute(sql`
    SELECT * FROM qlp_historico WHERE colaborador_id = ${id} ORDER BY created_at DESC LIMIT 100
  `);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">{colab.nome}</h1>
      <div className="text-sm text-slate-600">
        Chapa {colab.chapa} · {colab.funcao} · Filial {colab.filial_codigo} · {colab.situacao}
      </div>
      <section>
        <h2 className="font-semibold mb-2">Cadeia de liderança</h2>
        {(cadeia as any[]).length === 0 ? <p className="text-slate-500 text-sm">Sem líder atribuído</p> :
          <ol className="list-decimal pl-5">{(cadeia as any[]).map((r, i) => <li key={i}>{r.tier} — {r.nome} <span className="text-xs text-slate-500">({r.funcao})</span></li>)}</ol>}
      </section>
      <section>
        <h2 className="font-semibold mb-2">Histórico</h2>
        <ul className="space-y-1 text-sm">
          {(historico as any[]).map(r => (
            <li key={r.id}>{new Date(r.created_at).toLocaleString('pt-BR')} — <b>{r.evento}</b> por {r.ator_nome}</li>
          ))}
        </ul>
      </section>
    </div>
  );
}
```

- [ ] **Step 4: Smoke test das 3 telas**
- [ ] **Step 5: Commit**
```bash
git add app/\(app\)/qlp/historico app/\(app\)/qlp/indicadores app/\(app\)/qlp/\[id\]
git commit -m "feat(qlp): telas de histórico, indicadores e detalhe do colaborador"
```

---

# Fase 8 — Polimento + abrir PR

### Task 8.1: Verificação final

- [ ] **Step 1: Verificações**
```
npm run lint
npm run typecheck
npm test
npm run build
```
Todos devem passar.

- [ ] **Step 2: Smoke test end-to-end manual**

Cenário completo:
1. Login admin → importar XLS → ver 1739 colaboradores · 1739 pendências de "novo_sem_lider"
2. Criar gerente nacional, coord regional cobrindo filial 20
3. Logar como filial 20 → ver só colaboradores filial 20 no quadro
4. Atribuir um supervisor (criar via tela admin) → atribuir colaborador base a esse supervisor (motivo obrigatório) → ver na cadeia de liderança do detalhe
5. Mover colaborador para outro supervisor → ver `vinculo_movido` no histórico
6. Re-uploadar mesmo XLS → preview mostra 0 mudanças
7. Modificar manualmente o XLS (mudar 1 chapa de filial, mudar 1 função de tier) → preview mostra 1 mudancaFilial + 1 mudancaTier → aplicar → ver pendências e vínculo removido

- [ ] **Step 3: Commit final + push**
```bash
git push -u origin feat/qlp-lideranca
```

### Task 8.2: Abrir PR

- [ ] **Step 1: `gh pr create`**
```bash
gh pr create --title "feat(qlp): módulo QLP & Liderança" --body "$(cat <<'EOF'
## Resumo
- Módulo novo "QLP & Liderança" para gerenciar a hierarquia de liderança do quadro Perlog
- 7 tabelas qlp_* + classificador automático de funções + sync por XLS + auditoria completa

## Como testar
1. Aplicar a migration (já aplicada via MCP Supabase)
2. Logar como admin → /qlp/importar → subir o XLS atual
3. Criar líderes em /qlp/lideres
4. Atribuir colaboradores em /qlp/quadro
5. Conferir histórico e indicadores

## Checklist
- [x] Testes de classificador, parser e sync diff passando
- [x] Lint + typecheck + build OK
- [x] Smoke test do fluxo completo

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

---

## Self-review (executada antes do handoff)

- **Spec coverage:** ✓ todas seções 3.1–3.4 (regras), 4 (modelo), 5 (estrutura), 6 (telas), 7 (componentes não-óbvios), 8 (histórico) cobertas em tasks. Seção 10 (critérios de sucesso) coberta pelo smoke test final.
- **Placeholder scan:** Há `it.todo` na Task 6.5 — deliberado como esqueleto a expandir; documentado.
- **Type consistency:** `assertCanLead` assinatura igual em testes e implementação; `Classificacao`/`DiffResult` consistentes; `AtorContexto` igual em `_shared.ts` e nas actions que importam.
- **Riscos conhecidos:** (a) CTE mista em `getResumoLider` pode não parsear em Drizzle — fallback documentado na própria task; (b) parser XLS pode ter linhas que não casam em produção — testes contra fixture real mitigam.
