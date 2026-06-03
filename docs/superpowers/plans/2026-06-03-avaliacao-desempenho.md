# Avaliação de Desempenho — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Construir o módulo de Avaliação de Desempenho (6 competências × 31 fatores) integrado ao RH G&G, com wizard, histórico, laudo imprimível, relatórios e configuração via admin.

**Architecture:** Next.js 15 App Router (Server Components + Server Actions), Drizzle ORM sobre Postgres/Supabase, Tailwind + componentes existentes em `components/ui/*`. Tudo segue padrões já estabelecidos (sessão via `requireSession`, validação Zod, log em `log_acessos`, rate limit em `rate_limits`).

**Tech Stack:** Next.js 15, React 19, TypeScript, Drizzle ORM 0.39, Postgres, Tailwind 3, Zod, React Hook Form, Recharts (a adicionar), Sonner (toasts), tsx (scripts).

**Spec:** `docs/superpowers/specs/2026-06-03-avaliacao-desempenho-design.md`

---

## Convenções para todas as tarefas

- **Sempre** rodar `npm run typecheck` e `npm run lint` antes de commitar.
- Commits no formato: `feat(avaliacao): ...`, `chore(db): ...`, `test(avaliacao): ...`.
- Mensagens de commit incluem `Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>` quando aplicável.
- Migration via `npm run db:generate` + `npm run db:migrate` (preferido) ou `npm run db:push` em dev.
- Server actions sempre começam com `'use server'` e chamam `requireSession()` antes de qualquer query.
- Nada de CSS solto novo. Tudo via Tailwind + `components/ui/*`.

---

## Mapa de arquivos

**Criar:**
```
db/schema.ts                                      (modificar — adicionar 5 tabelas)
lib/avaliacao/calculos.ts
lib/avaliacao/validators.ts
lib/avaliacao/seed-data.ts
lib/avaliacao/__tests__/calculos.test.ts
scripts/seed-avaliacao.ts
actions/avaliacao.ts
actions/avaliacao-admin.ts
app/(app)/avaliacao/page.tsx                      (sobrescrever placeholder)
app/(app)/avaliacao/nova/page.tsx
app/(app)/avaliacao/nova/NovaAvaliacaoWizard.tsx
app/(app)/avaliacao/historico/page.tsx
app/(app)/avaliacao/historico/HistoricoTable.tsx
app/(app)/avaliacao/[id]/page.tsx
app/(app)/avaliacao/[id]/DetalheAvaliacao.tsx
app/(app)/avaliacao/[id]/imprimir/page.tsx
app/(app)/avaliacao/relatorios/page.tsx
app/(app)/avaliacao/relatorios/RelatoriosCharts.tsx
app/(app)/admin/config/competencias/page.tsx
app/(app)/admin/config/competencias/CompetenciasEditor.tsx
app/(app)/admin/config/pessoas/page.tsx
app/(app)/admin/config/pessoas/PessoasTable.tsx
app/(app)/admin/config/pessoas/ImportarCsv.tsx
components/avaliacao/CompetenciaCard.tsx
components/avaliacao/FatorRatingRow.tsx
components/avaliacao/ProgressoAvaliacao.tsx
components/avaliacao/ResultadoCard.tsx
components/avaliacao/ClassificacaoBadge.tsx
components/avaliacao/EvolucaoIndicator.tsx
components/avaliacao/RadarCompetencias.tsx
```

**Modificar:**
```
components/layout/Sidebar.tsx                     (adicionar entrada em FILIAL_NAV e ADMIN_NAV)
package.json                                      (adicionar recharts, vitest se ainda não tiver)
```

---

# Fase 1 — Schema + migration + seed

### Task 1.1: Adicionar 5 tabelas ao schema Drizzle

**Files:**
- Modify: `db/schema.ts` (final do arquivo)

- [ ] **Step 1: Acrescentar as tabelas ao final de `db/schema.ts`**

```ts
// ==================== AVALIAÇÃO DE DESEMPENHO ====================

export const pessoas = pgTable('pessoas', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  matricula: text('matricula').notNull().unique(),
  nome: text('nome').notNull(),
  funcao: text('funcao'),
  filialId: uuid('filial_id').references(() => filiais.id, { onDelete: 'set null' }),
  regional: text('regional'),
  isColaborador: boolean('is_colaborador').notNull().default(true),
  isGestor: boolean('is_gestor').notNull().default(false),
  ativo: boolean('ativo').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  filialIdx: index('pessoas_filial_idx').on(t.filialId),
  matriculaIdx: index('pessoas_matricula_idx').on(t.matricula),
}));

export const competencias = pgTable('competencias', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  nome: text('nome').notNull().unique(),
  descricao: text('descricao'),
  ordem: integer('ordem').notNull().default(0),
  peso: numeric('peso', { precision: 4, scale: 2 }).notNull().default('1'),
  ativo: boolean('ativo').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const fatoresAvaliacao = pgTable('fatores_avaliacao', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  competenciaId: uuid('competencia_id').notNull().references(() => competencias.id, { onDelete: 'cascade' }),
  ordem: integer('ordem').notNull(),
  texto: text('texto').notNull(),
  escalaMax: integer('escala_max').notNull().default(5),
  ativo: boolean('ativo').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  competenciaOrdemIdx: index('fatores_competencia_ordem_idx').on(t.competenciaId, t.ordem),
}));

export const avaliacoesDesempenho = pgTable('avaliacoes_desempenho', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  filialId: uuid('filial_id').notNull().references(() => filiais.id, { onDelete: 'restrict' }),
  avaliadoId: uuid('avaliado_id').notNull().references(() => pessoas.id, { onDelete: 'restrict' }),
  gestorId: uuid('gestor_id').notNull().references(() => pessoas.id, { onDelete: 'restrict' }),
  dataAvaliacao: date('data_avaliacao').notNull().default(sql`current_date`),
  pontuacaoFinal: numeric('pontuacao_final', { precision: 4, scale: 2 }),
  classificacao: text('classificacao'),
  pontosFortes: text('pontos_fortes'),
  oportunidades: text('oportunidades'),
  comentarios: text('comentarios'),
  planoDesenvolvimento: text('plano_desenvolvimento'),
  criadaPor: text('criada_por'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  filialDataIdx: index('avaliacoes_desempenho_filial_data_idx').on(t.filialId, t.dataAvaliacao),
  avaliadoDataIdx: index('avaliacoes_desempenho_avaliado_data_idx').on(t.avaliadoId, t.dataAvaliacao),
  uniqDia: index('avaliacoes_desempenho_uniq_dia').on(t.avaliadoId, t.gestorId, t.dataAvaliacao),
}));

export const avaliacoesDetalhes = pgTable('avaliacoes_detalhes', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  avaliacaoId: uuid('avaliacao_id').notNull().references(() => avaliacoesDesempenho.id, { onDelete: 'cascade' }),
  fatorId: uuid('fator_id').notNull().references(() => fatoresAvaliacao.id, { onDelete: 'restrict' }),
  competenciaId: uuid('competencia_id').notNull().references(() => competencias.id, { onDelete: 'restrict' }),
  nota: integer('nota').notNull(),
}, (t) => ({
  avaliacaoIdx: index('avaliacoes_detalhes_avaliacao_idx').on(t.avaliacaoId),
  uniqFator: index('avaliacoes_detalhes_uniq_fator').on(t.avaliacaoId, t.fatorId),
  notaCheck: check('avaliacoes_detalhes_nota_check', sql`nota BETWEEN 1 AND 5`),
}));
```

- [ ] **Step 2: Rodar typecheck**

Run: `npm run typecheck`
Expected: PASS (sem erros).

- [ ] **Step 3: Commit**

```bash
git add db/schema.ts
git commit -m "feat(db): adiciona schema de avaliação de desempenho (5 tabelas)"
```

### Task 1.2: Gerar e aplicar migration

**Files:**
- Create: `db/migrations/*_avaliacao_desempenho.sql` (gerado)

- [ ] **Step 1: Gerar migration**

Run: `npm run db:generate`
Expected: novo arquivo SQL em `db/migrations/`.

- [ ] **Step 2: Inspecionar SQL gerado**

Abrir o arquivo gerado e confirmar: 5 CREATE TABLE, FKs, índices, CHECK `nota BETWEEN 1 AND 5`. Se algum índice unique não foi criado (Drizzle não tem `unique()` direto em `index()` em algumas versões), editar o SQL para `CREATE UNIQUE INDEX avaliacoes_detalhes_uniq_fator ON avaliacoes_detalhes(avaliacao_id, fator_id);` e `CREATE UNIQUE INDEX avaliacoes_desempenho_uniq_dia ON avaliacoes_desempenho(avaliado_id, gestor_id, data_avaliacao);`.

- [ ] **Step 3: Aplicar migration**

Run: `npm run db:migrate`
Expected: "migration applied" sem erro.

- [ ] **Step 4: Verificar tabelas no banco**

Conectar via `npm run db:studio` ou psql e confirmar que as 5 tabelas existem.

- [ ] **Step 5: Commit**

```bash
git add db/migrations/
git commit -m "chore(db): migration para avaliação de desempenho"
```

### Task 1.3: Seed das 6 competências e 31 fatores

**Files:**
- Create: `lib/avaliacao/seed-data.ts`
- Create: `scripts/seed-avaliacao.ts`

- [ ] **Step 1: Criar `lib/avaliacao/seed-data.ts` com os dados da referência**

```ts
export const COMPETENCIAS_SEED = [
  {
    nome: 'COMUNICAÇÃO E INFLUÊNCIA',
    ordem: 1,
    fatores: [
      'Tem clareza, é empático(a) e inclusivo(a) na sua comunicação.',
      'Possui habilidades em comunicar temas críticos, transmitindo confiança ao time.',
      'É influenciador(a) e inspira seu time e a rede de relacionamento pelo exemplo.',
      'Respeita as opiniões divergentes, escuta de maneira aberta.',
      'Cria um ambiente de segurança e confiança mútua.',
    ],
  },
  {
    nome: 'DISCIPLINA DE EXECUÇÃO',
    ordem: 2,
    fatores: [
      'Garante planejamento e execução com eficiência dentro dos prazos.',
      'Constrói regras e processos e busca eliminar burocracias desnecessárias.',
      'Assume responsabilidade, cumpre normas e procedimentos.',
      'Estimula o time para que esteja comprometido com prazos e entregas.',
      'Garante níveis excelentes de qualidade nas entregas.',
    ],
  },
  {
    nome: 'FOCO EM RESULTADOS',
    ordem: 3,
    fatores: [
      'Possui consistência nas entregas.',
      'Tem flexibilidade para liderar diferentes frentes.',
      'Elabora e cumpre planos de ações para o atingimento das metas.',
      'Conhece o negócio e acompanha resultados através de dados.',
      'Estimula o time para possuírem visão crítica e trazerem soluções.',
    ],
  },
  {
    nome: 'FOCO NO CLIENTE/TUTOR',
    ordem: 4,
    fatores: [
      'Entende, prioriza e antecipa as necessidades dos clientes.',
      'Constrói alianças com clientes, pares, áreas parceiras.',
      'Implementa novas soluções para atingir expectativas do cliente.',
      'Direciona o time para conhecer as necessidades dos clientes.',
      'Desenvolve ações efetivas e de sucesso para os clientes.',
    ],
  },
  {
    nome: 'LIDERANÇA E GESTÃO DE PESSOAS',
    ordem: 5,
    fatores: [
      'Age com clareza na distribuição dos papéis e responsabilidades.',
      'Sabe identificar desafios compatíveis com a capacidade de cada um.',
      'Estimula e conduz o time para que alcance/supere as metas.',
      'Direciona o time com clareza para as atividades.',
      'Orienta, dá feedbacks efetivos e acompanha evoluções.',
      'Possui preocupação genuína com as pessoas e desenvolve liderados.',
    ],
  },
  {
    nome: 'POSTURA DE DONO',
    ordem: 6,
    fatores: [
      'Possui senso de urgência e sabe direcionar o time.',
      'Assume responsabilidade e não terceiriza para outras áreas.',
      'É exemplo e estimula o time a ser inconformado com entregas.',
      'É atento às tendências de mercado e busca aplicá-las.',
      'É atento e gerencia os desperdícios e custos.',
    ],
  },
] as const;
```

- [ ] **Step 2: Criar `scripts/seed-avaliacao.ts`**

```ts
import 'dotenv/config';
import { db, schema } from '@/db/client';
import { COMPETENCIAS_SEED } from '@/lib/avaliacao/seed-data';
import { eq } from 'drizzle-orm';

async function main() {
  console.log('🌱 Seed de competências e fatores...');
  for (const comp of COMPETENCIAS_SEED) {
    const existing = await db.select().from(schema.competencias).where(eq(schema.competencias.nome, comp.nome)).limit(1);
    let competenciaId: string;
    if (existing.length === 0) {
      const [inserted] = await db.insert(schema.competencias).values({ nome: comp.nome, ordem: comp.ordem }).returning({ id: schema.competencias.id });
      competenciaId = inserted.id;
      console.log(`  ✓ competência "${comp.nome}" criada`);
    } else {
      competenciaId = existing[0].id;
      console.log(`  • competência "${comp.nome}" já existe`);
    }
    for (let i = 0; i < comp.fatores.length; i++) {
      const texto = comp.fatores[i];
      const ja = await db.select().from(schema.fatoresAvaliacao)
        .where(eq(schema.fatoresAvaliacao.competenciaId, competenciaId))
        .limit(100);
      if (ja.find(f => f.texto === texto)) continue;
      await db.insert(schema.fatoresAvaliacao).values({ competenciaId, ordem: i + 1, texto });
    }
  }
  console.log('✅ Seed concluído.');
  process.exit(0);
}
main().catch((e) => { console.error(e); process.exit(1); });
```

- [ ] **Step 3: Adicionar script ao `package.json`**

Em `scripts`, adicionar: `"seed:avaliacao": "tsx scripts/seed-avaliacao.ts"`.

- [ ] **Step 4: Rodar seed**

Run: `npm run seed:avaliacao`
Expected: 6 competências e 31 fatores criados.

- [ ] **Step 5: Conferir contagem no banco**

```sql
SELECT COUNT(*) FROM competencias;       -- 6
SELECT COUNT(*) FROM fatores_avaliacao;  -- 31
```

- [ ] **Step 6: Commit**

```bash
git add lib/avaliacao/seed-data.ts scripts/seed-avaliacao.ts package.json
git commit -m "feat(avaliacao): seed inicial de 6 competências e 31 fatores"
```

---

# Fase 2 — Lib pura (cálculos + validators)

### Task 2.1: Instalar vitest

**Files:**
- Modify: `package.json`
- Create: `vitest.config.ts`

- [ ] **Step 1: Instalar vitest**

Run: `npm i -D vitest @vitest/ui`

- [ ] **Step 2: Criar `vitest.config.ts`**

```ts
import { defineConfig } from 'vitest/config';
import path from 'node:path';

export default defineConfig({
  test: { environment: 'node', include: ['lib/**/*.test.ts'] },
  resolve: { alias: { '@': path.resolve(__dirname, '.') } },
});
```

- [ ] **Step 3: Adicionar script `test` ao `package.json`**

`"test": "vitest run"` e `"test:watch": "vitest"`.

- [ ] **Step 4: Commit**

```bash
git add package.json package-lock.json vitest.config.ts
git commit -m "chore: configura vitest para testes unitários"
```

### Task 2.2: Implementar `lib/avaliacao/calculos.ts` via TDD

**Files:**
- Create: `lib/avaliacao/__tests__/calculos.test.ts`
- Create: `lib/avaliacao/calculos.ts`

- [ ] **Step 1: Escrever testes que falham**

```ts
// lib/avaliacao/__tests__/calculos.test.ts
import { describe, it, expect } from 'vitest';
import { calcularPontuacao, classificar, calcularEvolucao } from '../calculos';

describe('calcularPontuacao', () => {
  it('retorna média aritmética das notas', () => {
    expect(calcularPontuacao([5, 5, 5, 5])).toBe(5);
    expect(calcularPontuacao([1, 2, 3, 4, 5])).toBe(3);
    expect(calcularPontuacao([4, 5, 3, 4])).toBe(4);
  });
  it('arredonda para 2 casas decimais', () => {
    expect(calcularPontuacao([1, 2])).toBe(1.5);
    expect(calcularPontuacao([1, 1, 2])).toBe(1.33);
  });
  it('lança erro para array vazio', () => {
    expect(() => calcularPontuacao([])).toThrow();
  });
});

describe('classificar', () => {
  it('EXCELENTE para 4.5–5.0', () => {
    expect(classificar(5.0)).toBe('EXCELENTE');
    expect(classificar(4.5)).toBe('EXCELENTE');
  });
  it('BOM para 3.5–4.49', () => {
    expect(classificar(4.49)).toBe('BOM');
    expect(classificar(3.5)).toBe('BOM');
  });
  it('REGULAR para 2.5–3.49', () => {
    expect(classificar(3.49)).toBe('REGULAR');
    expect(classificar(2.5)).toBe('REGULAR');
  });
  it('PRECISA MELHORAR para < 2.5', () => {
    expect(classificar(2.49)).toBe('PRECISA MELHORAR');
    expect(classificar(1.0)).toBe('PRECISA MELHORAR');
  });
});

describe('calcularEvolucao', () => {
  it('primeira quando sem anterior', () => {
    expect(calcularEvolucao(3.5, null)).toBe('primeira');
  });
  it('positiva quando delta ≥ +0.3', () => {
    expect(calcularEvolucao(4.0, 3.7)).toBe('positiva');
    expect(calcularEvolucao(5.0, 3.0)).toBe('positiva');
  });
  it('negativa quando delta ≤ -0.3', () => {
    expect(calcularEvolucao(3.0, 3.3)).toBe('negativa');
  });
  it('estavel no resto', () => {
    expect(calcularEvolucao(3.5, 3.4)).toBe('estavel');
    expect(calcularEvolucao(3.5, 3.5)).toBe('estavel');
    expect(calcularEvolucao(3.5, 3.7)).toBe('estavel');
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npm test`
Expected: FAIL (módulo `../calculos` não existe).

- [ ] **Step 3: Implementar `lib/avaliacao/calculos.ts`**

```ts
export type Classificacao = 'EXCELENTE' | 'BOM' | 'REGULAR' | 'PRECISA MELHORAR';
export type Evolucao = 'primeira' | 'positiva' | 'negativa' | 'estavel';

export function calcularPontuacao(notas: number[]): number {
  if (notas.length === 0) throw new Error('notas vazias');
  const soma = notas.reduce((a, b) => a + b, 0);
  return Math.round((soma / notas.length) * 100) / 100;
}

export function classificar(pontuacao: number): Classificacao {
  if (pontuacao >= 4.5) return 'EXCELENTE';
  if (pontuacao >= 3.5) return 'BOM';
  if (pontuacao >= 2.5) return 'REGULAR';
  return 'PRECISA MELHORAR';
}

export function calcularEvolucao(atual: number, anterior: number | null): Evolucao {
  if (anterior === null) return 'primeira';
  const delta = atual - anterior;
  if (delta >= 0.3) return 'positiva';
  if (delta <= -0.3) return 'negativa';
  return 'estavel';
}

export const CLASSIFICACAO_CORES: Record<Classificacao, { bg: string; text: string; border: string }> = {
  'EXCELENTE':         { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-600' },
  'BOM':               { bg: 'bg-sky-50',     text: 'text-sky-700',     border: 'border-sky-600' },
  'REGULAR':           { bg: 'bg-amber-50',   text: 'text-amber-700',   border: 'border-amber-600' },
  'PRECISA MELHORAR':  { bg: 'bg-rose-50',    text: 'text-rose-700',    border: 'border-rose-600' },
};
```

- [ ] **Step 4: Rodar testes e ver passar**

Run: `npm test`
Expected: 11 passing.

- [ ] **Step 5: Commit**

```bash
git add lib/avaliacao/calculos.ts lib/avaliacao/__tests__/calculos.test.ts
git commit -m "feat(avaliacao): lib pura de cálculo de pontuação, classificação e evolução"
```

### Task 2.3: Validators Zod

**Files:**
- Create: `lib/avaliacao/validators.ts`

- [ ] **Step 1: Criar `lib/avaliacao/validators.ts`**

```ts
import { z } from 'zod';

export const NovaAvaliacaoSchema = z.object({
  avaliadoId: z.string().uuid(),
  gestorId: z.string().uuid(),
  dataAvaliacao: z.coerce.date().max(new Date(), { message: 'Não pode ser futura' }),
  notas: z.array(z.object({
    fatorId: z.string().uuid(),
    nota: z.number().int().min(1).max(5),
  })).min(1),
  pontosFortes: z.string().max(2000).optional().nullable(),
  oportunidades: z.string().max(2000).optional().nullable(),
  comentarios: z.string().max(2000).optional().nullable(),
}).refine((d) => d.avaliadoId !== d.gestorId, {
  message: 'Avaliado e gestor não podem ser a mesma pessoa',
  path: ['gestorId'],
});
export type NovaAvaliacaoInput = z.infer<typeof NovaAvaliacaoSchema>;

export const AtualizarPdiSchema = z.object({
  avaliacaoId: z.string().uuid(),
  planoDesenvolvimento: z.string().max(5000),
});

export const PessoaSchema = z.object({
  matricula: z.string().min(1).max(40),
  nome: z.string().min(1).max(200),
  funcao: z.string().max(200).optional().nullable(),
  filialId: z.string().uuid().optional().nullable(),
  regional: z.string().max(40).optional().nullable(),
  isColaborador: z.boolean(),
  isGestor: z.boolean(),
  ativo: z.boolean().default(true),
});
export type PessoaInput = z.infer<typeof PessoaSchema>;

export const CompetenciaSchema = z.object({
  nome: z.string().min(1).max(200),
  descricao: z.string().max(2000).optional().nullable(),
  ordem: z.number().int().min(0),
  peso: z.coerce.number().min(0).max(10).default(1),
  ativo: z.boolean().default(true),
});

export const FatorSchema = z.object({
  competenciaId: z.string().uuid(),
  ordem: z.number().int().min(0),
  texto: z.string().min(1).max(500),
  escalaMax: z.number().int().min(2).max(10).default(5),
  ativo: z.boolean().default(true),
});
```

- [ ] **Step 2: Rodar typecheck**

Run: `npm run typecheck`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add lib/avaliacao/validators.ts
git commit -m "feat(avaliacao): validators Zod para inputs do módulo"
```

---

# Fase 3 — Admin: CRUD de pessoas

### Task 3.1: Server actions de pessoas

**Files:**
- Create: `actions/avaliacao-admin.ts`

- [ ] **Step 1: Criar `actions/avaliacao-admin.ts` (parte pessoas)**

```ts
'use server';

import { db, schema } from '@/db/client';
import { eq, and, ilike, asc } from 'drizzle-orm';
import { requireSession } from '@/lib/auth/session';
import { PessoaSchema, type PessoaInput } from '@/lib/avaliacao/validators';
import { revalidatePath } from 'next/cache';
import { headers } from 'next/headers';

async function logAcao(usuario: string, acao: string, detalhe?: string) {
  const h = await headers();
  await db.insert(schema.logAcessos).values({
    usuario, acao, detalhe: detalhe ?? null,
    ip: h.get('x-forwarded-for')?.split(',')[0]?.trim() ?? null,
    userAgent: h.get('user-agent') ?? null,
  });
}

export async function listarPessoas(filtros?: { busca?: string; filialId?: string; tipo?: 'colaborador' | 'gestor' | 'ambos' | ''; ativo?: boolean }) {
  await requireSession('admin');
  const wheres = [] as any[];
  if (filtros?.busca) wheres.push(ilike(schema.pessoas.nome, `%${filtros.busca}%`));
  if (filtros?.filialId) wheres.push(eq(schema.pessoas.filialId, filtros.filialId));
  if (filtros?.tipo === 'colaborador') wheres.push(eq(schema.pessoas.isColaborador, true));
  if (filtros?.tipo === 'gestor') wheres.push(eq(schema.pessoas.isGestor, true));
  if (filtros?.ativo !== undefined) wheres.push(eq(schema.pessoas.ativo, filtros.ativo));
  return db.select().from(schema.pessoas)
    .where(wheres.length ? and(...wheres) : undefined)
    .orderBy(asc(schema.pessoas.nome));
}

export async function criarPessoa(input: PessoaInput) {
  const s = await requireSession('admin');
  const data = PessoaSchema.parse(input);
  const [row] = await db.insert(schema.pessoas).values(data).returning({ id: schema.pessoas.id });
  await logAcao(s.usuario, 'avaliacao.config.pessoas.criar', `${data.matricula}|${data.nome}`);
  revalidatePath('/admin/config/pessoas');
  return row.id;
}

export async function atualizarPessoa(id: string, input: PessoaInput) {
  const s = await requireSession('admin');
  const data = PessoaSchema.parse(input);
  await db.update(schema.pessoas).set(data).where(eq(schema.pessoas.id, id));
  await logAcao(s.usuario, 'avaliacao.config.pessoas.atualizar', `${id}|${data.matricula}`);
  revalidatePath('/admin/config/pessoas');
}

export async function inativarPessoa(id: string) {
  const s = await requireSession('admin');
  await db.update(schema.pessoas).set({ ativo: false }).where(eq(schema.pessoas.id, id));
  await logAcao(s.usuario, 'avaliacao.config.pessoas.inativar', id);
  revalidatePath('/admin/config/pessoas');
}

export type CsvLinha = { linha: number; ok: boolean; erro?: string; data?: PessoaInput };

export async function previewCsvPessoas(csvTexto: string, filiaisPorCodigo: Record<string, string>): Promise<CsvLinha[]> {
  await requireSession('admin');
  const linhas = csvTexto.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (linhas.length === 0) return [];
  const header = linhas[0].split(',').map((c) => c.trim().toLowerCase());
  const idx = (col: string) => header.indexOf(col);
  const requiredCols = ['matricula', 'nome'];
  const missing = requiredCols.filter((c) => idx(c) === -1);
  if (missing.length) throw new Error(`Cabeçalho faltando: ${missing.join(', ')}`);

  const out: CsvLinha[] = [];
  for (let i = 1; i < linhas.length; i++) {
    const cells = linhas[i].split(',').map((c) => c.trim());
    const filialCodigo = idx('filial') !== -1 ? cells[idx('filial')] : '';
    const tipo = (idx('tipo') !== -1 ? cells[idx('tipo')] : '').toLowerCase();
    const raw = {
      matricula: cells[idx('matricula')] ?? '',
      nome: cells[idx('nome')] ?? '',
      funcao: idx('funcao') !== -1 ? cells[idx('funcao')] : null,
      regional: idx('regional') !== -1 ? cells[idx('regional')] : null,
      filialId: filialCodigo ? filiaisPorCodigo[filialCodigo] ?? null : null,
      isColaborador: tipo === '' || tipo === 'colaborador' || tipo === 'ambos',
      isGestor: tipo === 'gestor' || tipo === 'ambos',
      ativo: true,
    };
    const parsed = PessoaSchema.safeParse(raw);
    if (!parsed.success) {
      out.push({ linha: i + 1, ok: false, erro: parsed.error.issues[0].message });
    } else if (filialCodigo && !filiaisPorCodigo[filialCodigo]) {
      out.push({ linha: i + 1, ok: false, erro: `Filial "${filialCodigo}" não encontrada` });
    } else {
      out.push({ linha: i + 1, ok: true, data: parsed.data });
    }
  }
  return out;
}

export async function importarPessoasCsv(linhas: CsvLinha[]) {
  const s = await requireSession('admin');
  const validas = linhas.filter((l) => l.ok && l.data).map((l) => l.data!) as PessoaInput[];
  let inseridas = 0, atualizadas = 0;
  for (const p of validas) {
    const existe = await db.select({ id: schema.pessoas.id }).from(schema.pessoas)
      .where(eq(schema.pessoas.matricula, p.matricula)).limit(1);
    if (existe.length) {
      await db.update(schema.pessoas).set(p).where(eq(schema.pessoas.id, existe[0].id));
      atualizadas++;
    } else {
      await db.insert(schema.pessoas).values(p);
      inseridas++;
    }
  }
  await logAcao(s.usuario, 'avaliacao.config.pessoas.import', `inseridas=${inseridas} atualizadas=${atualizadas}`);
  revalidatePath('/admin/config/pessoas');
  return { inseridas, atualizadas };
}

export async function listarFiliaisParaSelect() {
  await requireSession('admin');
  return db.select({ id: schema.filiais.id, codigo: schema.filiais.codigo, nome: schema.filiais.nome })
    .from(schema.filiais)
    .where(eq(schema.filiais.ativa, true))
    .orderBy(asc(schema.filiais.codigo));
}
```

- [ ] **Step 2: Typecheck**

Run: `npm run typecheck`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add actions/avaliacao-admin.ts
git commit -m "feat(avaliacao): server actions de admin para pessoas (CRUD + import CSV)"
```

### Task 3.2: Página `/admin/config/pessoas`

**Files:**
- Create: `app/(app)/admin/config/pessoas/page.tsx`
- Create: `app/(app)/admin/config/pessoas/PessoasTable.tsx`
- Create: `app/(app)/admin/config/pessoas/ImportarCsv.tsx`

- [ ] **Step 1: Criar `page.tsx` (Server Component)**

```tsx
import { requireSession } from '@/lib/auth/session';
import { listarPessoas, listarFiliaisParaSelect } from '@/actions/avaliacao-admin';
import { PessoasTable } from './PessoasTable';
import { ImportarCsv } from './ImportarCsv';
import { TopBar } from '@/components/layout/TopBar';

export const dynamic = 'force-dynamic';

export default async function PessoasPage({ searchParams }: { searchParams: Promise<{ busca?: string; filialId?: string; tipo?: any; ativo?: string }> }) {
  await requireSession('admin');
  const sp = await searchParams;
  const ativo = sp.ativo === undefined ? true : sp.ativo === 'true';
  const [pessoas, filiais] = await Promise.all([
    listarPessoas({ busca: sp.busca, filialId: sp.filialId, tipo: sp.tipo, ativo }),
    listarFiliaisParaSelect(),
  ]);
  return (
    <div className="space-y-6 p-6">
      <TopBar title="Pessoas (Avaliação de Desempenho)" />
      <ImportarCsv filiais={filiais} />
      <PessoasTable pessoas={pessoas} filiais={filiais} filtros={{ busca: sp.busca, filialId: sp.filialId, tipo: sp.tipo, ativo }} />
    </div>
  );
}
```

- [ ] **Step 2: Criar `PessoasTable.tsx` (Client Component)**

Componente client com tabela, filtros (busca, filial, tipo), botão "Nova pessoa" abrindo dialog com `react-hook-form` + Zod. Edição inline ou em dialog. Botão "Inativar" chama `inativarPessoa`. Usar `Card`, `Button`, `Input`, `Select`, `Dialog` (Radix), `Badge` para tipo (Colaborador/Gestor/Ambos), `Toast` do sonner para feedback. Não reproduzir aqui — seguir padrão de `app/(app)/admin/config/cargos/page.tsx`.

Esqueleto mínimo:

```tsx
'use client';
import { useState, useTransition } from 'react';
import { Card, CardContent, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { criarPessoa, atualizarPessoa, inativarPessoa } from '@/actions/avaliacao-admin';

export function PessoasTable({ pessoas, filiais, filtros }: any) {
  const [pending, start] = useTransition();
  // ... implementar filtros que atualizam URL, dialog de criar/editar, ações
  return (
    <Card>
      <CardContent>
        {/* filtros + tabela + ações */}
      </CardContent>
    </Card>
  );
}
```

- [ ] **Step 3: Criar `ImportarCsv.tsx` (Client Component)**

```tsx
'use client';
import { useState, useTransition } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardTitle } from '@/components/ui/card';
import { previewCsvPessoas, importarPessoasCsv, type CsvLinha } from '@/actions/avaliacao-admin';
import { toast } from 'sonner';

export function ImportarCsv({ filiais }: { filiais: { id: string; codigo: string; nome: string }[] }) {
  const [csv, setCsv] = useState('');
  const [preview, setPreview] = useState<CsvLinha[]>([]);
  const [pending, start] = useTransition();
  const filiaisPorCodigo = Object.fromEntries(filiais.map(f => [f.codigo, f.id]));

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]; if (!f) return;
    f.text().then(setCsv);
  }
  function doPreview() {
    start(async () => {
      try {
        const result = await previewCsvPessoas(csv, filiaisPorCodigo);
        setPreview(result);
        const errs = result.filter(r => !r.ok).length;
        toast.success(`${result.length - errs} válidas, ${errs} com erro`);
      } catch (e: any) { toast.error(e.message); }
    });
  }
  function doImport() {
    start(async () => {
      try {
        const r = await importarPessoasCsv(preview);
        toast.success(`Importado: ${r.inseridas} novas, ${r.atualizadas} atualizadas`);
        setCsv(''); setPreview([]);
      } catch (e: any) { toast.error(e.message); }
    });
  }
  return (
    <Card>
      <CardContent className="space-y-3 pt-6">
        <CardTitle className="text-base">Importar CSV</CardTitle>
        <p className="text-xs text-muted-foreground">Colunas: <code>matricula,nome,funcao,filial,regional,tipo</code>. Tipo: colaborador | gestor | ambos.</p>
        <input type="file" accept=".csv" onChange={handleFile} />
        <div className="flex gap-2">
          <Button onClick={doPreview} disabled={!csv || pending}>Pré-visualizar</Button>
          <Button onClick={doImport} disabled={preview.length === 0 || pending} variant="default">Importar válidas</Button>
        </div>
        {preview.length > 0 && (
          <div className="max-h-64 overflow-auto rounded border text-xs">
            <table className="w-full">
              <thead className="bg-muted"><tr><th>Linha</th><th>Status</th><th>Detalhe</th></tr></thead>
              <tbody>
                {preview.map((l) => (
                  <tr key={l.linha} className={l.ok ? '' : 'bg-rose-50'}>
                    <td className="px-2">{l.linha}</td>
                    <td className="px-2">{l.ok ? 'OK' : 'ERRO'}</td>
                    <td className="px-2">{l.ok ? `${l.data!.matricula} — ${l.data!.nome}` : l.erro}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
```

- [ ] **Step 4: Typecheck e teste manual**

Run: `npm run typecheck && npm run dev`
Acessar `/admin/config/pessoas` como admin. Criar uma pessoa manualmente. Importar um CSV mínimo de 2 linhas. Verificar que aparece na tabela.

- [ ] **Step 5: Commit**

```bash
git add app/\(app\)/admin/config/pessoas/
git commit -m "feat(avaliacao): tela de admin de pessoas (CRUD + import CSV)"
```

---

# Fase 4 — Admin: CRUD de competências e fatores

### Task 4.1: Server actions de competências/fatores

**Files:**
- Modify: `actions/avaliacao-admin.ts` (adicionar funções)

- [ ] **Step 1: Acrescentar ao final de `actions/avaliacao-admin.ts`**

```ts
import { CompetenciaSchema, FatorSchema } from '@/lib/avaliacao/validators';

export async function listarCompetenciasComFatores() {
  await requireSession();
  const comps = await db.select().from(schema.competencias).orderBy(asc(schema.competencias.ordem));
  const fatores = await db.select().from(schema.fatoresAvaliacao).orderBy(asc(schema.fatoresAvaliacao.ordem));
  return comps.map((c) => ({ ...c, fatores: fatores.filter((f) => f.competenciaId === c.id) }));
}

export async function criarCompetencia(input: unknown) {
  const s = await requireSession('admin');
  const data = CompetenciaSchema.parse(input);
  const [r] = await db.insert(schema.competencias).values(data).returning({ id: schema.competencias.id });
  await logAcao(s.usuario, 'avaliacao.config.competencias.criar', data.nome);
  revalidatePath('/admin/config/competencias');
  return r.id;
}

export async function atualizarCompetencia(id: string, input: unknown) {
  const s = await requireSession('admin');
  const data = CompetenciaSchema.parse(input);
  await db.update(schema.competencias).set(data).where(eq(schema.competencias.id, id));
  await logAcao(s.usuario, 'avaliacao.config.competencias.atualizar', `${id}|${data.nome}`);
  revalidatePath('/admin/config/competencias');
}

export async function inativarCompetencia(id: string) {
  const s = await requireSession('admin');
  await db.update(schema.competencias).set({ ativo: false }).where(eq(schema.competencias.id, id));
  await logAcao(s.usuario, 'avaliacao.config.competencias.inativar', id);
  revalidatePath('/admin/config/competencias');
}

export async function criarFator(input: unknown) {
  const s = await requireSession('admin');
  const data = FatorSchema.parse(input);
  const [r] = await db.insert(schema.fatoresAvaliacao).values(data).returning({ id: schema.fatoresAvaliacao.id });
  await logAcao(s.usuario, 'avaliacao.config.fatores.criar', data.texto.slice(0, 80));
  revalidatePath('/admin/config/competencias');
  return r.id;
}

export async function atualizarFator(id: string, input: unknown) {
  const s = await requireSession('admin');
  const data = FatorSchema.parse(input);
  await db.update(schema.fatoresAvaliacao).set(data).where(eq(schema.fatoresAvaliacao.id, id));
  await logAcao(s.usuario, 'avaliacao.config.fatores.atualizar', id);
  revalidatePath('/admin/config/competencias');
}

export async function inativarFator(id: string) {
  const s = await requireSession('admin');
  await db.update(schema.fatoresAvaliacao).set({ ativo: false }).where(eq(schema.fatoresAvaliacao.id, id));
  await logAcao(s.usuario, 'avaliacao.config.fatores.inativar', id);
  revalidatePath('/admin/config/competencias');
}
```

- [ ] **Step 2: Typecheck**

Run: `npm run typecheck`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add actions/avaliacao-admin.ts
git commit -m "feat(avaliacao): server actions de admin para competências e fatores"
```

### Task 4.2: Página `/admin/config/competencias`

**Files:**
- Create: `app/(app)/admin/config/competencias/page.tsx`
- Create: `app/(app)/admin/config/competencias/CompetenciasEditor.tsx`

- [ ] **Step 1: Criar `page.tsx`**

```tsx
import { requireSession } from '@/lib/auth/session';
import { listarCompetenciasComFatores } from '@/actions/avaliacao-admin';
import { CompetenciasEditor } from './CompetenciasEditor';
import { TopBar } from '@/components/layout/TopBar';

export const dynamic = 'force-dynamic';

export default async function CompetenciasPage() {
  await requireSession('admin');
  const competencias = await listarCompetenciasComFatores();
  return (
    <div className="space-y-6 p-6">
      <TopBar title="Competências e Fatores" />
      <CompetenciasEditor competencias={competencias} />
    </div>
  );
}
```

- [ ] **Step 2: Criar `CompetenciasEditor.tsx`**

Client component com lista accordion de competências; cada uma expande para mostrar seus fatores. Botões "Adicionar competência", "Adicionar fator", "Editar", "Inativar" (não deletar). Edição em dialog. Seguir padrão de `app/(app)/admin/config/roteiro/page.tsx`.

Esqueleto:

```tsx
'use client';
import { useState, useTransition } from 'react';
import { Card, CardContent, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { criarCompetencia, atualizarCompetencia, inativarCompetencia, criarFator, atualizarFator, inativarFator } from '@/actions/avaliacao-admin';

type Competencia = { id: string; nome: string; descricao: string | null; ordem: number; peso: string; ativo: boolean; fatores: { id: string; texto: string; ordem: number; ativo: boolean }[] };

export function CompetenciasEditor({ competencias }: { competencias: Competencia[] }) {
  const [pending, start] = useTransition();
  // dialog state + handlers para criar/editar/inativar competências e fatores
  return (
    <div className="space-y-4">
      {/* botão "Adicionar competência" */}
      {competencias.map((c) => (
        <Card key={c.id} className={c.ativo ? '' : 'opacity-50'}>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">{c.ordem}. {c.nome}</CardTitle>
              {/* botões editar / inativar / + fator */}
            </div>
            <ul className="mt-3 space-y-1 text-sm">
              {c.fatores.map((f) => (
                <li key={f.id} className={`flex items-center justify-between rounded border px-3 py-2 ${f.ativo ? '' : 'opacity-50'}`}>
                  <span>{f.ordem}. {f.texto}</span>
                  {/* botões editar / inativar */}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
```

- [ ] **Step 3: Teste manual**

Acessar `/admin/config/competencias`, confirmar que aparecem as 6 competências do seed com seus fatores. Criar uma competência teste, criar um fator, editar, inativar.

- [ ] **Step 4: Commit**

```bash
git add app/\(app\)/admin/config/competencias/
git commit -m "feat(avaliacao): tela de admin para competências e fatores"
```

---

# Fase 5 — Nova avaliação (wizard)

### Task 5.1: Server action `salvarAvaliacao` (com TDD do cálculo já coberto)

**Files:**
- Create: `actions/avaliacao.ts`

- [ ] **Step 1: Criar `actions/avaliacao.ts`**

```ts
'use server';

import { db, schema } from '@/db/client';
import { and, eq, inArray, sql, desc, asc } from 'drizzle-orm';
import { requireSession } from '@/lib/auth/session';
import { NovaAvaliacaoSchema, AtualizarPdiSchema, type NovaAvaliacaoInput } from '@/lib/avaliacao/validators';
import { calcularPontuacao, classificar } from '@/lib/avaliacao/calculos';
import { hitRateLimit } from '@/lib/auth/rate-limit';
import { revalidatePath } from 'next/cache';
import { headers } from 'next/headers';

async function logAcao(usuario: string, acao: string, detalhe?: string) {
  const h = await headers();
  await db.insert(schema.logAcessos).values({
    usuario, acao, detalhe: detalhe ?? null,
    ip: h.get('x-forwarded-for')?.split(',')[0]?.trim() ?? null,
    userAgent: h.get('user-agent') ?? null,
  });
}

export async function buscarPessoaPorMatricula(matricula: string, tipo: 'colaborador' | 'gestor') {
  const s = await requireSession();
  const wheres = [eq(schema.pessoas.matricula, matricula.trim()), eq(schema.pessoas.ativo, true)];
  if (tipo === 'colaborador') wheres.push(eq(schema.pessoas.isColaborador, true));
  if (tipo === 'gestor') wheres.push(eq(schema.pessoas.isGestor, true));
  const [p] = await db.select().from(schema.pessoas).where(and(...wheres)).limit(1);
  if (!p) return null;
  // Perfil filial só pode buscar avaliados da própria filial; gestor pode ser de qualquer.
  if (tipo === 'colaborador' && s.perfil === 'filial' && p.filialId !== s.filialId) return null;
  return p;
}

export async function carregarFormularioNovaAvaliacao() {
  await requireSession();
  const competencias = await db.select().from(schema.competencias)
    .where(eq(schema.competencias.ativo, true)).orderBy(asc(schema.competencias.ordem));
  const fatores = await db.select().from(schema.fatoresAvaliacao)
    .where(eq(schema.fatoresAvaliacao.ativo, true)).orderBy(asc(schema.fatoresAvaliacao.ordem));
  return competencias.map((c) => ({ ...c, fatores: fatores.filter((f) => f.competenciaId === c.id) }));
}

export async function salvarAvaliacao(input: NovaAvaliacaoInput) {
  const s = await requireSession();
  const data = NovaAvaliacaoSchema.parse(input);

  // rate limit
  const rlKey = `avaliacao.criar:${s.perfil === 'filial' ? s.filialId : 'admin'}`;
  const ok = await hitRateLimit(rlKey, 30, 10 * 60_000);
  if (!ok) throw new Error('Muitas avaliações criadas em pouco tempo. Tente novamente em alguns minutos.');

  // valida pessoas
  const [avaliado] = await db.select().from(schema.pessoas).where(eq(schema.pessoas.id, data.avaliadoId)).limit(1);
  const [gestor] = await db.select().from(schema.pessoas).where(eq(schema.pessoas.id, data.gestorId)).limit(1);
  if (!avaliado || !avaliado.isColaborador || !avaliado.ativo) throw new Error('Avaliado inválido');
  if (!gestor || !gestor.isGestor || !gestor.ativo) throw new Error('Gestor inválido');
  if (!avaliado.filialId) throw new Error('Avaliado sem filial — corrija no cadastro');
  if (s.perfil === 'filial' && avaliado.filialId !== s.filialId) throw new Error('Avaliado não pertence à sua filial');

  // valida cobertura de fatores ativos
  const fatoresAtivos = await db.select({ id: schema.fatoresAvaliacao.id, competenciaId: schema.fatoresAvaliacao.competenciaId })
    .from(schema.fatoresAvaliacao).where(eq(schema.fatoresAvaliacao.ativo, true));
  const setAtivos = new Set(fatoresAtivos.map(f => f.id));
  const setInput = new Set(data.notas.map(n => n.fatorId));
  if (setAtivos.size !== setInput.size || ![...setAtivos].every(id => setInput.has(id))) {
    throw new Error(`Você precisa avaliar todos os ${setAtivos.size} fatores ativos.`);
  }

  const pontuacao = calcularPontuacao(data.notas.map(n => n.nota));
  const classificacao = classificar(pontuacao);
  const criadaPor = s.perfil === 'admin' ? `admin:${s.usuario}` : `filial:${s.filialCodigo}`;

  // transação
  const id = await db.transaction(async (tx) => {
    const [row] = await tx.insert(schema.avaliacoesDesempenho).values({
      filialId: avaliado.filialId!,
      avaliadoId: data.avaliadoId,
      gestorId: data.gestorId,
      dataAvaliacao: data.dataAvaliacao.toISOString().slice(0, 10),
      pontuacaoFinal: pontuacao.toFixed(2),
      classificacao,
      pontosFortes: data.pontosFortes ?? null,
      oportunidades: data.oportunidades ?? null,
      comentarios: data.comentarios ?? null,
      criadaPor,
    }).returning({ id: schema.avaliacoesDesempenho.id });
    const fatorToComp = new Map(fatoresAtivos.map(f => [f.id, f.competenciaId]));
    await tx.insert(schema.avaliacoesDetalhes).values(
      data.notas.map((n) => ({
        avaliacaoId: row.id, fatorId: n.fatorId, competenciaId: fatorToComp.get(n.fatorId)!, nota: n.nota,
      }))
    );
    return row.id;
  });

  await logAcao(criadaPor, 'avaliacao.criar', `${id}|${avaliado.matricula}|${pontuacao}`);
  revalidatePath('/avaliacao');
  revalidatePath('/avaliacao/historico');
  return id;
}

export async function atualizarPlanoDesenvolvimento(input: unknown) {
  const s = await requireSession();
  const { avaliacaoId, planoDesenvolvimento } = AtualizarPdiSchema.parse(input);
  const [av] = await db.select().from(schema.avaliacoesDesempenho).where(eq(schema.avaliacoesDesempenho.id, avaliacaoId)).limit(1);
  if (!av) throw new Error('Avaliação não encontrada');
  if (s.perfil === 'filial' && av.filialId !== s.filialId) throw new Error('Sem permissão');
  await db.update(schema.avaliacoesDesempenho)
    .set({ planoDesenvolvimento, updatedAt: new Date() })
    .where(eq(schema.avaliacoesDesempenho.id, avaliacaoId));
  const usuario = s.perfil === 'admin' ? `admin:${s.usuario}` : `filial:${s.filialCodigo}`;
  await logAcao(usuario, 'avaliacao.atualizar_pdi', avaliacaoId);
  revalidatePath(`/avaliacao/${avaliacaoId}`);
}
```

- [ ] **Step 2: Conferir que `hitRateLimit` existe em `lib/auth/rate-limit.ts`**

Run: `npm run typecheck`
Se a função não existir com essa assinatura, ler o arquivo e ajustar — caso a assinatura local seja `rateLimit(key, max, windowMs)`, renomear na chamada acima.

- [ ] **Step 3: Commit**

```bash
git add actions/avaliacao.ts
git commit -m "feat(avaliacao): server actions de criação e atualização de avaliação"
```

### Task 5.2: Componentes reutilizáveis

**Files:**
- Create: `components/avaliacao/CompetenciaCard.tsx`
- Create: `components/avaliacao/FatorRatingRow.tsx`
- Create: `components/avaliacao/ProgressoAvaliacao.tsx`
- Create: `components/avaliacao/ResultadoCard.tsx`
- Create: `components/avaliacao/ClassificacaoBadge.tsx`
- Create: `components/avaliacao/EvolucaoIndicator.tsx`

- [ ] **Step 1: Criar `ClassificacaoBadge.tsx`**

```tsx
import { CLASSIFICACAO_CORES, type Classificacao } from '@/lib/avaliacao/calculos';
import { cn } from '@/lib/cn';

export function ClassificacaoBadge({ value, className }: { value: Classificacao | null | undefined; className?: string }) {
  if (!value) return <span className="text-xs text-muted-foreground">—</span>;
  const c = CLASSIFICACAO_CORES[value];
  return (
    <span className={cn('inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium', c.bg, c.text, c.border, className)}>
      {value}
    </span>
  );
}
```

- [ ] **Step 2: Criar `FatorRatingRow.tsx`** (radio 1-5 acessível)

```tsx
'use client';
import { cn } from '@/lib/cn';

export function FatorRatingRow({
  fatorId, texto, ordem, value, onChange,
}: { fatorId: string; texto: string; ordem: number; value: number | null; onChange: (n: number) => void; }) {
  return (
    <div className="border-b py-3 last:border-b-0">
      <p className="text-sm text-foreground"><span className="text-muted-foreground">{ordem}.</span> {texto}</p>
      <div role="radiogroup" aria-label={texto} className="mt-2 flex gap-2">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            role="radio"
            aria-checked={value === n}
            onClick={() => onChange(n)}
            className={cn(
              'h-9 w-9 rounded-md border text-sm font-semibold transition-colors',
              value === n ? 'bg-perlog-navy text-white border-perlog-navy' : 'bg-background hover:bg-muted',
            )}
          >
            {n}
          </button>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Criar `CompetenciaCard.tsx`**

```tsx
import { Card, CardContent, CardTitle } from '@/components/ui/card';

export function CompetenciaCard({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <Card>
      <CardContent className="pt-6">
        <CardTitle className="mb-3 text-base text-perlog-navy">{titulo}</CardTitle>
        <div>{children}</div>
      </CardContent>
    </Card>
  );
}
```

- [ ] **Step 4: Criar `ProgressoAvaliacao.tsx`**

```tsx
export function ProgressoAvaliacao({ feito, total }: { feito: number; total: number }) {
  const pct = total > 0 ? Math.round((feito / total) * 100) : 0;
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs text-muted-foreground">
        <span>{feito} de {total} fatores avaliados</span>
        <span>{pct}%</span>
      </div>
      <div role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} className="h-2 w-full rounded-full bg-muted">
        <div className="h-full rounded-full bg-perlog-orange transition-all" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
```

- [ ] **Step 5: Criar `ResultadoCard.tsx`**

```tsx
import { Card, CardContent } from '@/components/ui/card';
import { ClassificacaoBadge } from './ClassificacaoBadge';
import type { Classificacao } from '@/lib/avaliacao/calculos';

export function ResultadoCard({ pontuacao, classificacao }: { pontuacao: number; classificacao: Classificacao }) {
  return (
    <Card>
      <CardContent className="pt-6 text-center">
        <div className="text-4xl font-bold text-perlog-navy">{pontuacao.toFixed(2)}<span className="text-xl text-muted-foreground">/5.00</span></div>
        <div className="mt-3"><ClassificacaoBadge value={classificacao} className="text-base px-4 py-1" /></div>
      </CardContent>
    </Card>
  );
}
```

- [ ] **Step 6: Criar `EvolucaoIndicator.tsx`**

```tsx
import { ArrowUp, ArrowDown, Minus, Sparkles } from 'lucide-react';
import type { Evolucao } from '@/lib/avaliacao/calculos';

export function EvolucaoIndicator({ tipo, delta }: { tipo: Evolucao; delta?: number }) {
  const map = {
    primeira: { Icon: Sparkles, color: 'text-sky-600', label: 'Primeira avaliação' },
    positiva: { Icon: ArrowUp, color: 'text-emerald-600', label: `+${delta?.toFixed(2)}` },
    negativa: { Icon: ArrowDown, color: 'text-rose-600', label: delta?.toFixed(2) },
    estavel:  { Icon: Minus, color: 'text-amber-600', label: 'Estável' },
  } as const;
  const { Icon, color, label } = map[tipo];
  return <span className={`inline-flex items-center gap-1 text-xs ${color}`}><Icon className="h-3 w-3" />{label}</span>;
}
```

- [ ] **Step 7: Typecheck e commit**

```bash
npm run typecheck
git add components/avaliacao/
git commit -m "feat(avaliacao): componentes UI reutilizáveis"
```

### Task 5.3: Página `/avaliacao/nova` (wizard)

**Files:**
- Create: `app/(app)/avaliacao/nova/page.tsx`
- Create: `app/(app)/avaliacao/nova/NovaAvaliacaoWizard.tsx`

- [ ] **Step 1: Criar `page.tsx`**

```tsx
import { requireSession } from '@/lib/auth/session';
import { carregarFormularioNovaAvaliacao } from '@/actions/avaliacao';
import { NovaAvaliacaoWizard } from './NovaAvaliacaoWizard';
import { TopBar } from '@/components/layout/TopBar';

export const dynamic = 'force-dynamic';

export default async function NovaAvaliacaoPage() {
  await requireSession();
  const competencias = await carregarFormularioNovaAvaliacao();
  return (
    <div className="space-y-6 p-6">
      <TopBar title="Nova avaliação de desempenho" />
      <NovaAvaliacaoWizard competencias={competencias} />
    </div>
  );
}
```

- [ ] **Step 2: Criar `NovaAvaliacaoWizard.tsx`**

```tsx
'use client';
import { useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { CompetenciaCard } from '@/components/avaliacao/CompetenciaCard';
import { FatorRatingRow } from '@/components/avaliacao/FatorRatingRow';
import { ProgressoAvaliacao } from '@/components/avaliacao/ProgressoAvaliacao';
import { ResultadoCard } from '@/components/avaliacao/ResultadoCard';
import { calcularPontuacao, classificar } from '@/lib/avaliacao/calculos';
import { buscarPessoaPorMatricula, salvarAvaliacao } from '@/actions/avaliacao';

type Competencia = { id: string; nome: string; fatores: { id: string; texto: string; ordem: number }[] };
type Pessoa = { id: string; matricula: string; nome: string; funcao: string | null; filialId: string | null; regional: string | null } | null;

export function NovaAvaliacaoWizard({ competencias }: { competencias: Competencia[] }) {
  const router = useRouter();
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [pending, start] = useTransition();
  const [matAv, setMatAv] = useState(''); const [matGe, setMatGe] = useState('');
  const [avaliado, setAvaliado] = useState<Pessoa>(null);
  const [gestor, setGestor] = useState<Pessoa>(null);
  const totalFatores = useMemo(() => competencias.reduce((a, c) => a + c.fatores.length, 0), [competencias]);
  const [notas, setNotas] = useState<Record<string, number>>({});
  const [pontosFortes, setPontosFortes] = useState('');
  const [oportunidades, setOportunidades] = useState('');
  const [comentarios, setComentarios] = useState('');

  const feito = Object.keys(notas).length;
  const completo = feito === totalFatores && totalFatores > 0;
  const notasArr = useMemo(() => Object.entries(notas).map(([fatorId, nota]) => ({ fatorId, nota })), [notas]);
  const pontuacao = completo ? calcularPontuacao(notasArr.map(n => n.nota)) : 0;
  const classif = completo ? classificar(pontuacao) : 'PRECISA MELHORAR' as const;

  function buscar(tipo: 'colaborador' | 'gestor') {
    const mat = (tipo === 'colaborador' ? matAv : matGe).trim();
    if (!mat) return;
    start(async () => {
      const p = await buscarPessoaPorMatricula(mat, tipo);
      if (!p) { toast.error(`Matrícula não encontrada para ${tipo}`); return; }
      if (tipo === 'colaborador') setAvaliado(p); else setGestor(p);
    });
  }

  function salvar() {
    if (!avaliado || !gestor || !completo) return;
    start(async () => {
      try {
        const id = await salvarAvaliacao({
          avaliadoId: avaliado.id,
          gestorId: gestor.id,
          dataAvaliacao: new Date(),
          notas: notasArr,
          pontosFortes, oportunidades, comentarios,
        });
        toast.success('Avaliação salva');
        router.push(`/avaliacao/${id}`);
      } catch (e: any) { toast.error(e.message ?? 'Erro ao salvar'); }
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex gap-2">
        {[1, 2, 3].map((n) => (
          <div key={n} className={`flex-1 rounded-md border px-3 py-2 text-center text-sm ${step === n ? 'bg-perlog-navy text-white' : 'bg-background'}`}>
            {n}. {n === 1 ? 'Identificação' : n === 2 ? 'Avaliação' : 'Feedback'}
          </div>
        ))}
      </div>

      {step === 1 && (
        <Card><CardContent className="space-y-4 pt-6">
          <CardTitle className="text-base">Identificação</CardTitle>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <Label>Matrícula do avaliado *</Label>
              <div className="flex gap-2">
                <Input value={matAv} onChange={e => setMatAv(e.target.value)} onBlur={() => buscar('colaborador')} />
                <Button type="button" variant="secondary" onClick={() => buscar('colaborador')} disabled={pending}>Buscar</Button>
              </div>
              {avaliado && <p className="mt-1 text-xs text-muted-foreground">{avaliado.nome} — {avaliado.funcao}</p>}
            </div>
            <div>
              <Label>Matrícula do gestor *</Label>
              <div className="flex gap-2">
                <Input value={matGe} onChange={e => setMatGe(e.target.value)} onBlur={() => buscar('gestor')} />
                <Button type="button" variant="secondary" onClick={() => buscar('gestor')} disabled={pending}>Buscar</Button>
              </div>
              {gestor && <p className="mt-1 text-xs text-muted-foreground">{gestor.nome} — {gestor.funcao}</p>}
            </div>
          </div>
          <div className="flex justify-end">
            <Button onClick={() => setStep(2)} disabled={!avaliado || !gestor || avaliado.id === gestor.id}>Continuar</Button>
          </div>
        </CardContent></Card>
      )}

      {step === 2 && (
        <>
          <ProgressoAvaliacao feito={feito} total={totalFatores} />
          {competencias.map((c) => (
            <CompetenciaCard key={c.id} titulo={c.nome}>
              {c.fatores.map((f) => (
                <FatorRatingRow key={f.id} fatorId={f.id} texto={f.texto} ordem={f.ordem}
                  value={notas[f.id] ?? null}
                  onChange={(n) => setNotas((prev) => ({ ...prev, [f.id]: n }))}
                />
              ))}
            </CompetenciaCard>
          ))}
          <div className="flex justify-between">
            <Button variant="secondary" onClick={() => setStep(1)}>Voltar</Button>
            <Button onClick={() => setStep(3)} disabled={!completo}>Continuar</Button>
          </div>
        </>
      )}

      {step === 3 && (
        <>
          <Card><CardContent className="space-y-3 pt-6">
            <CardTitle className="text-base">Feedback</CardTitle>
            <div><Label>Pontos fortes</Label><Textarea rows={4} value={pontosFortes} onChange={e => setPontosFortes(e.target.value)} /></div>
            <div><Label>Oportunidades de desenvolvimento</Label><Textarea rows={4} value={oportunidades} onChange={e => setOportunidades(e.target.value)} /></div>
            <div><Label>Comentários gerais</Label><Textarea rows={4} value={comentarios} onChange={e => setComentarios(e.target.value)} /></div>
          </CardContent></Card>
          <ResultadoCard pontuacao={pontuacao} classificacao={classif} />
          <div className="flex justify-between">
            <Button variant="secondary" onClick={() => setStep(2)}>Voltar</Button>
            <Button onClick={salvar} disabled={pending || !completo}>Salvar avaliação</Button>
          </div>
        </>
      )}
    </div>
  );
}
```

- [ ] **Step 3: Teste manual end-to-end**

`npm run dev` → logar como filial → `/avaliacao/nova` → completar wizard com pessoa de teste. Confirmar redirect para `/avaliacao/[id]` (que ainda vai dar 404 — próxima task).

- [ ] **Step 4: Commit**

```bash
git add app/\(app\)/avaliacao/nova/
git commit -m "feat(avaliacao): wizard de nova avaliação (3 passos)"
```

---

# Fase 6 — Detalhe + laudo + impressão

### Task 6.1: Query helpers para detalhe e histórico

**Files:**
- Modify: `actions/avaliacao.ts` (acrescentar funções)

- [ ] **Step 1: Acrescentar ao final de `actions/avaliacao.ts`**

```ts
export async function obterAvaliacao(id: string) {
  const s = await requireSession();
  const av = await db.select({
    av: schema.avaliacoesDesempenho,
    avaliado: schema.pessoas,
  }).from(schema.avaliacoesDesempenho)
    .leftJoin(schema.pessoas, eq(schema.pessoas.id, schema.avaliacoesDesempenho.avaliadoId))
    .where(eq(schema.avaliacoesDesempenho.id, id)).limit(1);
  if (!av[0]) return null;
  if (s.perfil === 'filial' && av[0].av.filialId !== s.filialId) throw new Error('Sem permissão');
  const [gestor] = await db.select().from(schema.pessoas).where(eq(schema.pessoas.id, av[0].av.gestorId)).limit(1);
  const [filial] = await db.select().from(schema.filiais).where(eq(schema.filiais.id, av[0].av.filialId)).limit(1);
  const detalhes = await db.select({
    d: schema.avaliacoesDetalhes,
    fator: schema.fatoresAvaliacao,
    competencia: schema.competencias,
  }).from(schema.avaliacoesDetalhes)
    .leftJoin(schema.fatoresAvaliacao, eq(schema.fatoresAvaliacao.id, schema.avaliacoesDetalhes.fatorId))
    .leftJoin(schema.competencias, eq(schema.competencias.id, schema.avaliacoesDetalhes.competenciaId))
    .where(eq(schema.avaliacoesDetalhes.avaliacaoId, id))
    .orderBy(asc(schema.competencias.ordem), asc(schema.fatoresAvaliacao.ordem));

  // anterior para evolução
  const anteriores = await db.select({ p: schema.avaliacoesDesempenho.pontuacaoFinal })
    .from(schema.avaliacoesDesempenho)
    .where(and(
      eq(schema.avaliacoesDesempenho.avaliadoId, av[0].av.avaliadoId),
      sql`${schema.avaliacoesDesempenho.dataAvaliacao} < ${av[0].av.dataAvaliacao}`,
    ))
    .orderBy(desc(schema.avaliacoesDesempenho.dataAvaliacao))
    .limit(1);
  const anterior = anteriores[0]?.p ? Number(anteriores[0].p) : null;

  return { avaliacao: av[0].av, avaliado: av[0].avaliado, gestor, filial, detalhes, anterior };
}
```

- [ ] **Step 2: Commit**

```bash
git add actions/avaliacao.ts
git commit -m "feat(avaliacao): query obterAvaliacao com detalhes e anterior"
```

### Task 6.2: Página de detalhe + edição do PDI

**Files:**
- Create: `app/(app)/avaliacao/[id]/page.tsx`
- Create: `app/(app)/avaliacao/[id]/DetalheAvaliacao.tsx`
- Create: `components/avaliacao/RadarCompetencias.tsx`

- [ ] **Step 1: Instalar Recharts**

Run: `npm i recharts`

- [ ] **Step 2: Criar `RadarCompetencias.tsx`**

```tsx
'use client';
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer } from 'recharts';

export function RadarCompetencias({ data }: { data: { competencia: string; media: number }[] }) {
  return (
    <div className="h-72 w-full">
      <ResponsiveContainer>
        <RadarChart data={data}>
          <PolarGrid />
          <PolarAngleAxis dataKey="competencia" tick={{ fontSize: 11 }} />
          <PolarRadiusAxis domain={[0, 5]} tickCount={6} />
          <Radar dataKey="media" stroke="#0B2447" fill="#0B2447" fillOpacity={0.35} />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
}
```

- [ ] **Step 3: Criar `page.tsx`**

```tsx
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { requireSession } from '@/lib/auth/session';
import { obterAvaliacao } from '@/actions/avaliacao';
import { DetalheAvaliacao } from './DetalheAvaliacao';
import { TopBar } from '@/components/layout/TopBar';
import { Button } from '@/components/ui/button';
import { Printer } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  await requireSession();
  const { id } = await params;
  const dados = await obterAvaliacao(id);
  if (!dados) notFound();
  return (
    <div className="space-y-6 p-6">
      <TopBar title="Detalhe da avaliação"
        actions={<Link href={`/avaliacao/${id}/imprimir`}><Button variant="secondary"><Printer className="h-4 w-4 mr-1" />Imprimir laudo</Button></Link>} />
      <DetalheAvaliacao dados={dados} />
    </div>
  );
}
```

- [ ] **Step 4: Criar `DetalheAvaliacao.tsx`**

```tsx
'use client';
import { useState, useTransition } from 'react';
import { Card, CardContent, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { ClassificacaoBadge } from '@/components/avaliacao/ClassificacaoBadge';
import { RadarCompetencias } from '@/components/avaliacao/RadarCompetencias';
import { EvolucaoIndicator } from '@/components/avaliacao/EvolucaoIndicator';
import { calcularEvolucao, type Classificacao } from '@/lib/avaliacao/calculos';
import { atualizarPlanoDesenvolvimento } from '@/actions/avaliacao';

export function DetalheAvaliacao({ dados }: { dados: any }) {
  const { avaliacao, avaliado, gestor, filial, detalhes, anterior } = dados;
  const [pdi, setPdi] = useState<string>(avaliacao.planoDesenvolvimento ?? '');
  const [pending, start] = useTransition();

  // agrupa por competência para radar
  const porComp = new Map<string, { competencia: string; soma: number; n: number }>();
  for (const d of detalhes) {
    const nome = d.competencia?.nome ?? '—';
    const ent = porComp.get(nome) ?? { competencia: nome, soma: 0, n: 0 };
    ent.soma += d.d.nota; ent.n += 1;
    porComp.set(nome, ent);
  }
  const radarData = [...porComp.values()].map(v => ({ competencia: v.competencia, media: Number((v.soma / v.n).toFixed(2)) }));

  const pontuacao = Number(avaliacao.pontuacaoFinal);
  const evolucao = calcularEvolucao(pontuacao, anterior);
  const delta = anterior !== null ? pontuacao - anterior : undefined;

  function salvarPdi() {
    start(async () => {
      try { await atualizarPlanoDesenvolvimento({ avaliacaoId: avaliacao.id, planoDesenvolvimento: pdi });
        toast.success('PDI salvo'); } catch (e: any) { toast.error(e.message); }
    });
  }

  return (
    <div className="space-y-6">
      <Card><CardContent className="grid gap-4 pt-6 md:grid-cols-4">
        <div><p className="text-xs text-muted-foreground">Avaliado</p><p className="font-medium">{avaliado?.nome}</p><p className="text-xs">{avaliado?.matricula}</p></div>
        <div><p className="text-xs text-muted-foreground">Gestor</p><p className="font-medium">{gestor?.nome}</p><p className="text-xs">{gestor?.matricula}</p></div>
        <div><p className="text-xs text-muted-foreground">Filial</p><p className="font-medium">{filial?.nome}</p></div>
        <div><p className="text-xs text-muted-foreground">Data</p><p className="font-medium">{avaliacao.dataAvaliacao}</p></div>
        <div><p className="text-xs text-muted-foreground">Pontuação</p><p className="text-2xl font-bold text-perlog-navy">{pontuacao.toFixed(2)}/5.00</p></div>
        <div><p className="text-xs text-muted-foreground">Classificação</p><ClassificacaoBadge value={avaliacao.classificacao as Classificacao} /></div>
        <div><p className="text-xs text-muted-foreground">Evolução</p><EvolucaoIndicator tipo={evolucao} delta={delta} /></div>
      </CardContent></Card>

      <Card><CardContent className="pt-6"><CardTitle className="mb-3 text-base">Radar por competência</CardTitle><RadarCompetencias data={radarData} /></CardContent></Card>

      <Card><CardContent className="pt-6">
        <CardTitle className="mb-3 text-base">Fatores avaliados</CardTitle>
        <table className="w-full text-sm">
          <thead><tr className="text-left text-xs text-muted-foreground"><th>Competência</th><th>Fator</th><th>Nota</th></tr></thead>
          <tbody>
            {detalhes.map((d: any) => (
              <tr key={d.d.id} className="border-t">
                <td className="py-1 pr-2">{d.competencia?.nome}</td>
                <td className="py-1 pr-2">{d.fator?.texto}</td>
                <td className="py-1 font-semibold">{d.d.nota}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </CardContent></Card>

      <Card><CardContent className="space-y-3 pt-6">
        <CardTitle className="text-base">Feedback</CardTitle>
        <div><p className="text-xs text-muted-foreground">Pontos fortes</p><p>{avaliacao.pontosFortes || '—'}</p></div>
        <div><p className="text-xs text-muted-foreground">Oportunidades</p><p>{avaliacao.oportunidades || '—'}</p></div>
        <div><p className="text-xs text-muted-foreground">Comentários</p><p>{avaliacao.comentarios || '—'}</p></div>
      </CardContent></Card>

      <Card><CardContent className="space-y-2 pt-6">
        <CardTitle className="text-base">Plano de desenvolvimento</CardTitle>
        <Textarea rows={6} value={pdi} onChange={e => setPdi(e.target.value)} />
        <Button onClick={salvarPdi} disabled={pending}>Salvar PDI</Button>
      </CardContent></Card>
    </div>
  );
}
```

- [ ] **Step 5: Teste manual**

Acessar `/avaliacao/[id]` da avaliação criada na fase anterior. Confirmar dados, radar e edição de PDI.

- [ ] **Step 6: Commit**

```bash
git add app/\(app\)/avaliacao/\[id\]/page.tsx app/\(app\)/avaliacao/\[id\]/DetalheAvaliacao.tsx components/avaliacao/RadarCompetencias.tsx package.json package-lock.json
git commit -m "feat(avaliacao): página de detalhe com radar, PDI e evolução"
```

### Task 6.3: Página de impressão do laudo

**Files:**
- Create: `app/(app)/avaliacao/[id]/imprimir/page.tsx`
- Create: `app/(app)/avaliacao/[id]/imprimir/print.css` (opcional — pode ser inline)

- [ ] **Step 1: Criar `imprimir/page.tsx`**

```tsx
import { notFound } from 'next/navigation';
import { requireSession } from '@/lib/auth/session';
import { obterAvaliacao } from '@/actions/avaliacao';
import { ClassificacaoBadge } from '@/components/avaliacao/ClassificacaoBadge';
import type { Classificacao } from '@/lib/avaliacao/calculos';

export const dynamic = 'force-dynamic';

export default async function Imprimir({ params }: { params: Promise<{ id: string }> }) {
  await requireSession();
  const { id } = await params;
  const dados = await obterAvaliacao(id);
  if (!dados) notFound();
  const { avaliacao, avaliado, gestor, filial, detalhes } = dados;
  // agrupa por competência
  const grupos = new Map<string, any[]>();
  for (const d of detalhes) {
    const k = d.competencia?.nome ?? '—';
    if (!grupos.has(k)) grupos.set(k, []);
    grupos.get(k)!.push(d);
  }
  return (
    <main className="laudo mx-auto max-w-3xl space-y-4 p-8 text-sm">
      <style>{`
        @media print {
          @page { margin: 1.5cm; }
          body, html { background: white !important; }
          nav, aside, .no-print { display: none !important; }
        }
      `}</style>
      <header className="border-b pb-3">
        <h1 className="text-xl font-bold text-perlog-navy">Laudo de Avaliação de Desempenho</h1>
        <p className="text-xs text-muted-foreground">RH G&amp;G — gerado em {new Date().toLocaleString('pt-BR')}</p>
      </header>
      <section className="grid grid-cols-2 gap-2">
        <div><b>Avaliado:</b> {avaliado?.nome} ({avaliado?.matricula})</div>
        <div><b>Gestor:</b> {gestor?.nome} ({gestor?.matricula})</div>
        <div><b>Filial:</b> {filial?.nome}</div>
        <div><b>Data:</b> {avaliacao.dataAvaliacao}</div>
        <div><b>Pontuação:</b> {Number(avaliacao.pontuacaoFinal).toFixed(2)}/5.00</div>
        <div><b>Classificação:</b> <ClassificacaoBadge value={avaliacao.classificacao as Classificacao} /></div>
      </section>
      {[...grupos.entries()].map(([comp, lista]) => (
        <section key={comp} className="break-inside-avoid">
          <h2 className="mt-3 text-base font-semibold text-perlog-navy">{comp}</h2>
          <table className="w-full text-xs">
            <tbody>
              {lista.map((d) => (
                <tr key={d.d.id} className="border-t"><td className="py-1">{d.fator?.texto}</td><td className="w-12 text-right font-semibold">{d.d.nota}</td></tr>
              ))}
            </tbody>
          </table>
        </section>
      ))}
      <section><h2 className="mt-3 text-base font-semibold">Feedback</h2>
        <p><b>Pontos fortes:</b> {avaliacao.pontosFortes || '—'}</p>
        <p><b>Oportunidades:</b> {avaliacao.oportunidades || '—'}</p>
        <p><b>Comentários:</b> {avaliacao.comentarios || '—'}</p>
        <p><b>Plano de desenvolvimento:</b> {avaliacao.planoDesenvolvimento || '—'}</p>
      </section>
      <div className="no-print mt-6 text-center">
        <button onClick={() => window.print()} className="rounded bg-perlog-navy px-4 py-2 text-white">Imprimir</button>
      </div>
    </main>
  );
}
```

Nota: como há `onClick={() => window.print()}`, o componente precisa ser client OU o botão movido para um pequeno client component. Solução simples: marcar a página inteira como server e mover o botão para um `<PrintButton />` client.

- [ ] **Step 2: Criar `app/(app)/avaliacao/[id]/imprimir/PrintButton.tsx`**

```tsx
'use client';
import { Button } from '@/components/ui/button';
export function PrintButton() { return <Button onClick={() => window.print()}>Imprimir</Button>; }
```

E substituir o `<button onClick>` por `<PrintButton />`.

- [ ] **Step 3: Teste manual**

Acessar `/avaliacao/[id]/imprimir`, abrir preview de impressão (Ctrl+P). Confirmar que sidebar/topbar somem.

- [ ] **Step 4: Commit**

```bash
git add app/\(app\)/avaliacao/\[id\]/imprimir/
git commit -m "feat(avaliacao): laudo imprimível"
```

---

# Fase 7 — Histórico

### Task 7.1: Query do histórico com filtros e evolução

**Files:**
- Modify: `actions/avaliacao.ts` (acrescentar)

- [ ] **Step 1: Acrescentar função `listarHistorico`**

```ts
export type HistoricoFiltros = {
  classificacao?: string;
  filialId?: string;
  dataInicio?: string;
  dataFim?: string;
  nomeAvaliado?: string;
  nomeGestor?: string;
  evolucao?: 'positiva' | 'negativa' | 'estavel' | 'primeira' | '';
  page?: number;
  perPage?: number;
};

export async function listarHistorico(f: HistoricoFiltros = {}) {
  const s = await requireSession();
  const perPage = Math.min(f.perPage ?? 25, 100);
  const page = Math.max(f.page ?? 1, 1);

  // Subquery: anterior por LAG
  const rows = await db.execute(sql`
    WITH base AS (
      SELECT a.*, av.nome AS avaliado_nome, av.matricula AS avaliado_matricula,
             g.nome AS gestor_nome, g.matricula AS gestor_matricula,
             f.codigo AS filial_codigo, f.nome AS filial_nome,
             LAG(a.pontuacao_final) OVER (PARTITION BY a.avaliado_id ORDER BY a.data_avaliacao) AS anterior
      FROM avaliacoes_desempenho a
      LEFT JOIN pessoas av ON av.id = a.avaliado_id
      LEFT JOIN pessoas g  ON g.id = a.gestor_id
      LEFT JOIN filiais f  ON f.id = a.filial_id
    )
    SELECT * FROM base
    WHERE 1=1
      ${s.perfil === 'filial' ? sql`AND filial_id = ${s.filialId}` : sql``}
      ${f.filialId && s.perfil === 'admin' ? sql`AND filial_id = ${f.filialId}` : sql``}
      ${f.classificacao ? sql`AND classificacao = ${f.classificacao}` : sql``}
      ${f.dataInicio ? sql`AND data_avaliacao >= ${f.dataInicio}::date` : sql``}
      ${f.dataFim ? sql`AND data_avaliacao <= ${f.dataFim}::date` : sql``}
      ${f.nomeAvaliado ? sql`AND avaliado_nome ILIKE ${'%' + f.nomeAvaliado + '%'}` : sql``}
      ${f.nomeGestor ? sql`AND gestor_nome ILIKE ${'%' + f.nomeGestor + '%'}` : sql``}
    ORDER BY data_avaliacao DESC, created_at DESC
    LIMIT ${perPage} OFFSET ${(page - 1) * perPage}
  `);
  // filtro de evolução em memória (após LAG); aceitável pois é só a página atual
  let lista = rows.rows as any[];
  if (f.evolucao) {
    lista = lista.filter((r) => {
      const ant = r.anterior !== null ? Number(r.anterior) : null;
      const atual = Number(r.pontuacao_final);
      if (ant === null) return f.evolucao === 'primeira';
      const d = atual - ant;
      if (f.evolucao === 'positiva') return d >= 0.3;
      if (f.evolucao === 'negativa') return d <= -0.3;
      return Math.abs(d) < 0.3;
    });
  }
  return lista;
}

export async function statsHistorico() {
  const s = await requireSession();
  const filialFilter = s.perfil === 'filial' ? sql`WHERE filial_id = ${s.filialId}` : sql``;
  const res = await db.execute(sql`
    SELECT
      COUNT(*) AS total,
      ROUND(AVG(pontuacao_final)::numeric, 2) AS media,
      SUM(CASE WHEN classificacao = 'EXCELENTE' THEN 1 ELSE 0 END) AS excelentes,
      SUM(CASE WHEN classificacao = 'PRECISA MELHORAR' THEN 1 ELSE 0 END) AS precisam_melhorar
    FROM avaliacoes_desempenho ${filialFilter}
  `);
  return res.rows[0] as { total: number; media: string | null; excelentes: number; precisam_melhorar: number };
}
```

- [ ] **Step 2: Commit**

```bash
git add actions/avaliacao.ts
git commit -m "feat(avaliacao): query de histórico com filtros e stats"
```

### Task 7.2: Página `/avaliacao/historico`

**Files:**
- Create: `app/(app)/avaliacao/historico/page.tsx`
- Create: `app/(app)/avaliacao/historico/HistoricoTable.tsx`

- [ ] **Step 1: Criar `page.tsx`**

```tsx
import Link from 'next/link';
import { requireSession } from '@/lib/auth/session';
import { listarHistorico, statsHistorico } from '@/actions/avaliacao';
import { HistoricoTable } from './HistoricoTable';
import { TopBar } from '@/components/layout/TopBar';
import { Card, CardContent } from '@/components/ui/card';

export const dynamic = 'force-dynamic';

export default async function Historico({ searchParams }: { searchParams: Promise<any> }) {
  await requireSession();
  const sp = await searchParams;
  const [lista, stats] = await Promise.all([
    listarHistorico({
      classificacao: sp.classificacao, filialId: sp.filialId, dataInicio: sp.dataInicio, dataFim: sp.dataFim,
      nomeAvaliado: sp.nomeAvaliado, nomeGestor: sp.nomeGestor, evolucao: sp.evolucao, page: Number(sp.page ?? 1),
    }),
    statsHistorico(),
  ]);
  return (
    <div className="space-y-6 p-6">
      <TopBar title="Histórico de avaliações" />
      <div className="grid gap-3 md:grid-cols-4">
        <Card><CardContent className="pt-6"><p className="text-xs text-muted-foreground">Total</p><p className="text-2xl font-bold">{stats.total}</p></CardContent></Card>
        <Card><CardContent className="pt-6"><p className="text-xs text-muted-foreground">Média</p><p className="text-2xl font-bold">{stats.media ?? '—'}</p></CardContent></Card>
        <Card><CardContent className="pt-6"><p className="text-xs text-muted-foreground">Excelentes</p><p className="text-2xl font-bold text-emerald-600">{stats.excelentes}</p></CardContent></Card>
        <Card><CardContent className="pt-6"><p className="text-xs text-muted-foreground">Precisam melhorar</p><p className="text-2xl font-bold text-rose-600">{stats.precisam_melhorar}</p></CardContent></Card>
      </div>
      <HistoricoTable lista={lista} filtros={sp} />
    </div>
  );
}
```

- [ ] **Step 2: Criar `HistoricoTable.tsx`** (client com filtros que atualizam URL via `router.push`)

```tsx
'use client';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ClassificacaoBadge } from '@/components/avaliacao/ClassificacaoBadge';
import { EvolucaoIndicator } from '@/components/avaliacao/EvolucaoIndicator';
import { calcularEvolucao } from '@/lib/avaliacao/calculos';

export function HistoricoTable({ lista, filtros }: { lista: any[]; filtros: any }) {
  const router = useRouter();
  const sp = useSearchParams();
  function setParam(k: string, v?: string) {
    const u = new URLSearchParams(sp.toString());
    if (!v) u.delete(k); else u.set(k, v);
    u.delete('page');
    router.push(`/avaliacao/historico?${u.toString()}`);
  }
  return (
    <Card><CardContent className="space-y-3 pt-6">
      <div className="grid gap-2 md:grid-cols-4">
        <Input placeholder="Nome do avaliado" defaultValue={filtros.nomeAvaliado ?? ''} onBlur={e => setParam('nomeAvaliado', e.target.value)} />
        <Input placeholder="Nome do gestor"  defaultValue={filtros.nomeGestor ?? ''}  onBlur={e => setParam('nomeGestor', e.target.value)} />
        <Input type="date" defaultValue={filtros.dataInicio ?? ''} onChange={e => setParam('dataInicio', e.target.value)} />
        <Input type="date" defaultValue={filtros.dataFim ?? ''}    onChange={e => setParam('dataFim', e.target.value)} />
        <select className="rounded border px-2 py-1 text-sm" defaultValue={filtros.classificacao ?? ''} onChange={e => setParam('classificacao', e.target.value)}>
          <option value="">Todas</option>
          <option>EXCELENTE</option><option>BOM</option><option>REGULAR</option><option>PRECISA MELHORAR</option>
        </select>
        <select className="rounded border px-2 py-1 text-sm" defaultValue={filtros.evolucao ?? ''} onChange={e => setParam('evolucao', e.target.value)}>
          <option value="">Evolução: todas</option>
          <option value="positiva">Positiva</option><option value="negativa">Negativa</option>
          <option value="estavel">Estável</option><option value="primeira">Primeira</option>
        </select>
        <Button variant="secondary" onClick={() => router.push('/avaliacao/historico')}>Limpar</Button>
      </div>
      <table className="w-full text-sm">
        <thead className="text-left text-xs text-muted-foreground">
          <tr><th>Data</th><th>Avaliado</th><th>Gestor</th><th>Filial</th><th>Pontuação</th><th>Classificação</th><th>Evolução</th><th></th></tr>
        </thead>
        <tbody>
          {lista.map((r) => {
            const ant = r.anterior !== null ? Number(r.anterior) : null;
            const atual = Number(r.pontuacao_final);
            const ev = calcularEvolucao(atual, ant);
            return (
              <tr key={r.id} className="border-t">
                <td>{r.data_avaliacao}</td>
                <td>{r.avaliado_nome}</td>
                <td>{r.gestor_nome}</td>
                <td>{r.filial_nome}</td>
                <td className="font-semibold">{atual.toFixed(2)}</td>
                <td><ClassificacaoBadge value={r.classificacao} /></td>
                <td><EvolucaoIndicator tipo={ev} delta={ant !== null ? atual - ant : undefined} /></td>
                <td><Link className="text-perlog-orange underline" href={`/avaliacao/${r.id}`}>Ver</Link></td>
              </tr>
            );
          })}
        </tbody>
      </table>
      {lista.length === 0 && <p className="py-6 text-center text-sm text-muted-foreground">Nenhuma avaliação encontrada.</p>}
    </CardContent></Card>
  );
}
```

- [ ] **Step 3: Teste manual + commit**

```bash
git add app/\(app\)/avaliacao/historico/
git commit -m "feat(avaliacao): histórico filtrável com stats e evolução"
```

---

# Fase 8 — Dashboard do módulo

### Task 8.1: Substituir `/avaliacao/page.tsx`

**Files:**
- Modify: `app/(app)/avaliacao/page.tsx` (sobrescrever placeholder)

- [ ] **Step 1: Reescrever**

```tsx
import Link from 'next/link';
import { ClipboardList, History, BarChart3, Plus } from 'lucide-react';
import { requireSession } from '@/lib/auth/session';
import { listarHistorico, statsHistorico } from '@/actions/avaliacao';
import { TopBar } from '@/components/layout/TopBar';
import { Card, CardContent, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ClassificacaoBadge } from '@/components/avaliacao/ClassificacaoBadge';

export const dynamic = 'force-dynamic';

export default async function AvaliacaoHome() {
  await requireSession();
  const [stats, ultimas] = await Promise.all([statsHistorico(), listarHistorico({ perPage: 5 })]);
  return (
    <div className="space-y-6 p-6">
      <TopBar title="Avaliação de desempenho"
        actions={<Link href="/avaliacao/nova"><Button><Plus className="h-4 w-4 mr-1" />Nova avaliação</Button></Link>} />
      <div className="grid gap-3 md:grid-cols-4">
        <Card><CardContent className="pt-6"><p className="text-xs text-muted-foreground">Total de avaliações</p><p className="text-2xl font-bold">{stats.total}</p></CardContent></Card>
        <Card><CardContent className="pt-6"><p className="text-xs text-muted-foreground">Média geral</p><p className="text-2xl font-bold">{stats.media ?? '—'}</p></CardContent></Card>
        <Card><CardContent className="pt-6"><p className="text-xs text-muted-foreground">Excelentes</p><p className="text-2xl font-bold text-emerald-600">{stats.excelentes}</p></CardContent></Card>
        <Card><CardContent className="pt-6"><p className="text-xs text-muted-foreground">Precisam melhorar</p><p className="text-2xl font-bold text-rose-600">{stats.precisam_melhorar}</p></CardContent></Card>
      </div>
      <div className="grid gap-3 md:grid-cols-3">
        <Link href="/avaliacao/nova"><Card className="h-full hover:bg-muted"><CardContent className="flex items-center gap-3 pt-6"><ClipboardList className="h-5 w-5 text-perlog-orange" /><div><p className="font-medium">Nova avaliação</p><p className="text-xs text-muted-foreground">Wizard com as 6 competências</p></div></CardContent></Card></Link>
        <Link href="/avaliacao/historico"><Card className="h-full hover:bg-muted"><CardContent className="flex items-center gap-3 pt-6"><History className="h-5 w-5 text-perlog-orange" /><div><p className="font-medium">Histórico</p><p className="text-xs text-muted-foreground">Filtros + evolução</p></div></CardContent></Card></Link>
        <Link href="/avaliacao/relatorios"><Card className="h-full hover:bg-muted"><CardContent className="flex items-center gap-3 pt-6"><BarChart3 className="h-5 w-5 text-perlog-orange" /><div><p className="font-medium">Relatórios</p><p className="text-xs text-muted-foreground">Agregados por filial e competência</p></div></CardContent></Card></Link>
      </div>
      <Card><CardContent className="pt-6">
        <CardTitle className="mb-3 text-base">Últimas avaliações</CardTitle>
        <table className="w-full text-sm">
          <thead className="text-left text-xs text-muted-foreground"><tr><th>Data</th><th>Avaliado</th><th>Pontuação</th><th>Classif.</th></tr></thead>
          <tbody>
            {ultimas.map((r: any) => (
              <tr key={r.id} className="border-t">
                <td>{r.data_avaliacao}</td><td>{r.avaliado_nome}</td>
                <td className="font-semibold">{Number(r.pontuacao_final).toFixed(2)}</td>
                <td><ClassificacaoBadge value={r.classificacao} /></td>
              </tr>
            ))}
          </tbody>
        </table>
        {ultimas.length === 0 && <p className="py-4 text-center text-sm text-muted-foreground">Nenhuma avaliação ainda. <Link className="text-perlog-orange underline" href="/avaliacao/nova">Crie a primeira</Link>.</p>}
      </CardContent></Card>
    </div>
  );
}
```

- [ ] **Step 2: Teste manual + commit**

```bash
git add app/\(app\)/avaliacao/page.tsx
git commit -m "feat(avaliacao): dashboard do módulo (substitui placeholder)"
```

---

# Fase 9 — Relatórios

### Task 9.1: Server actions de agregação

**Files:**
- Modify: `actions/avaliacao.ts` (acrescentar)

- [ ] **Step 1: Acrescentar funções**

```ts
export async function relatorioPorFilial() {
  const s = await requireSession();
  const where = s.perfil === 'filial' ? sql`WHERE a.filial_id = ${s.filialId}` : sql``;
  const r = await db.execute(sql`
    SELECT f.codigo, f.nome, COUNT(*) AS total, ROUND(AVG(a.pontuacao_final)::numeric, 2) AS media
    FROM avaliacoes_desempenho a JOIN filiais f ON f.id = a.filial_id
    ${where}
    GROUP BY f.codigo, f.nome ORDER BY media DESC NULLS LAST
  `);
  return r.rows;
}

export async function relatorioPorCompetencia() {
  const s = await requireSession();
  const where = s.perfil === 'filial' ? sql`WHERE a.filial_id = ${s.filialId}` : sql``;
  const r = await db.execute(sql`
    SELECT c.nome AS competencia, ROUND(AVG(d.nota)::numeric, 2) AS media, COUNT(*) AS amostras
    FROM avaliacoes_detalhes d
    JOIN competencias c ON c.id = d.competencia_id
    JOIN avaliacoes_desempenho a ON a.id = d.avaliacao_id
    ${where}
    GROUP BY c.nome, c.ordem ORDER BY c.ordem
  `);
  return r.rows;
}

export async function relatorioRanking(direcao: 'top' | 'bottom' = 'top', limit = 10) {
  const s = await requireSession();
  const where = s.perfil === 'filial' ? sql`WHERE a.filial_id = ${s.filialId}` : sql``;
  const ord = direcao === 'top' ? sql`DESC` : sql`ASC`;
  const r = await db.execute(sql`
    SELECT p.nome AS avaliado, p.matricula, ROUND(AVG(a.pontuacao_final)::numeric, 2) AS media, COUNT(*) AS avaliacoes
    FROM avaliacoes_desempenho a JOIN pessoas p ON p.id = a.avaliado_id
    ${where}
    GROUP BY p.id, p.nome, p.matricula
    ORDER BY media ${ord} LIMIT ${limit}
  `);
  return r.rows;
}
```

- [ ] **Step 2: Commit**

```bash
git add actions/avaliacao.ts
git commit -m "feat(avaliacao): server actions de agregação para relatórios"
```

### Task 9.2: Página `/avaliacao/relatorios`

**Files:**
- Create: `app/(app)/avaliacao/relatorios/page.tsx`
- Create: `app/(app)/avaliacao/relatorios/RelatoriosCharts.tsx`

- [ ] **Step 1: Criar `page.tsx`**

```tsx
import { requireSession } from '@/lib/auth/session';
import { relatorioPorFilial, relatorioPorCompetencia, relatorioRanking } from '@/actions/avaliacao';
import { RelatoriosCharts } from './RelatoriosCharts';
import { TopBar } from '@/components/layout/TopBar';

export const dynamic = 'force-dynamic';

export default async function Relatorios() {
  await requireSession();
  const [porFilial, porComp, top, bottom] = await Promise.all([
    relatorioPorFilial(), relatorioPorCompetencia(),
    relatorioRanking('top', 10), relatorioRanking('bottom', 10),
  ]);
  return (
    <div className="space-y-6 p-6">
      <TopBar title="Relatórios" />
      <RelatoriosCharts porFilial={porFilial} porComp={porComp} top={top} bottom={bottom} />
    </div>
  );
}
```

- [ ] **Step 2: Criar `RelatoriosCharts.tsx`** (tabs + Recharts BarChart e tabela ranking)

```tsx
'use client';
import * as Tabs from '@radix-ui/react-tabs';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip } from 'recharts';
import { Card, CardContent } from '@/components/ui/card';

export function RelatoriosCharts({ porFilial, porComp, top, bottom }: any) {
  return (
    <Tabs.Root defaultValue="filial">
      <Tabs.List className="flex gap-2 border-b">
        {[['filial', 'Por filial'], ['comp', 'Por competência'], ['ranking', 'Ranking']].map(([v, l]) => (
          <Tabs.Trigger key={v} value={v} className="px-3 py-2 text-sm data-[state=active]:border-b-2 data-[state=active]:border-perlog-orange">
            {l}
          </Tabs.Trigger>
        ))}
      </Tabs.List>
      <Tabs.Content value="filial" className="pt-4">
        <Card><CardContent className="h-80 pt-6">
          <ResponsiveContainer><BarChart data={porFilial}>
            <CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="codigo" /><YAxis domain={[0, 5]} /><Tooltip />
            <Bar dataKey="media" fill="#0B2447" />
          </BarChart></ResponsiveContainer>
        </CardContent></Card>
      </Tabs.Content>
      <Tabs.Content value="comp" className="pt-4">
        <Card><CardContent className="h-80 pt-6">
          <ResponsiveContainer><BarChart data={porComp}>
            <CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="competencia" tick={{ fontSize: 10 }} /><YAxis domain={[0, 5]} /><Tooltip />
            <Bar dataKey="media" fill="#F26B1F" />
          </BarChart></ResponsiveContainer>
        </CardContent></Card>
      </Tabs.Content>
      <Tabs.Content value="ranking" className="pt-4 grid gap-4 md:grid-cols-2">
        <Card><CardContent className="pt-6"><h3 className="mb-3 font-semibold">Top 10</h3>
          <ol className="space-y-1 text-sm">{top.map((r: any, i: number) => (<li key={i}>{i + 1}. {r.avaliado} — <b>{r.media}</b></li>))}</ol>
        </CardContent></Card>
        <Card><CardContent className="pt-6"><h3 className="mb-3 font-semibold">Bottom 10</h3>
          <ol className="space-y-1 text-sm">{bottom.map((r: any, i: number) => (<li key={i}>{i + 1}. {r.avaliado} — <b>{r.media}</b></li>))}</ol>
        </CardContent></Card>
      </Tabs.Content>
    </Tabs.Root>
  );
}
```

- [ ] **Step 3: Teste manual + commit**

```bash
git add app/\(app\)/avaliacao/relatorios/
git commit -m "feat(avaliacao): relatórios com 3 abas (filial/competência/ranking)"
```

---

# Fase 10 — Sidebar + navegação

### Task 10.1: Adicionar entradas na sidebar

**Files:**
- Modify: `components/layout/Sidebar.tsx`

- [ ] **Step 1: Importar `Target` (já existe na importação `lucide-react`? verificar; se não, adicionar)**

Em `Sidebar.tsx`, garantir que `Target` esteja na lista de imports do `lucide-react`. Acrescentar entradas:

```ts
const FILIAL_NAV: NavItem[] = [
  { href: '/inicio',          label: 'Início',          icon: Home },
  { href: '/painel',          label: 'Painel',          icon: LayoutDashboard },
  { href: '/entrevista/nova', label: 'Nova entrevista', icon: ClipboardList },
  { href: '/historico',       label: 'Histórico',       icon: History },
  { href: '/agenda',          label: 'Agenda',          icon: CalendarClock },
  { href: '/banco-talentos',  label: 'Banco de talentos', icon: Users },
  { href: '/avaliacao',       label: 'Avaliação de desempenho', icon: Target },
];

const ADMIN_NAV: NavItem[] = [
  { href: '/inicio',          label: 'Início',          icon: Home },
  { href: '/admin',           label: 'Dashboard',       icon: LayoutDashboard },
  { href: '/admin/busca',     label: 'Busca global',    icon: Users },
  { href: '/admin/relatorios', label: 'Relatórios',     icon: FileText },
  { href: '/avaliacao',       label: 'Avaliação de desempenho', icon: Target },
  { href: '/admin/config',    label: 'Configuração',    icon: Settings },
  { href: '/admin/seguranca', label: 'Segurança',       icon: ShieldCheck },
];
```

- [ ] **Step 2: Conferir página `/admin/config` lista links para `competencias` e `pessoas`**

Abrir `app/(app)/admin/config/page.tsx` e, se houver lista de cards, acrescentar entradas para `Pessoas` e `Competências e fatores`. Caso seja lista hardcoded, seguir o padrão dos outros.

- [ ] **Step 3: Teste manual + commit**

```bash
git add components/layout/Sidebar.tsx app/\(app\)/admin/config/page.tsx
git commit -m "feat(nav): adiciona Avaliação de desempenho na sidebar e config admin"
```

---

# Fase 11 — Polish e RLS

### Task 11.1: Habilitar RLS nas tabelas novas

**Files:**
- Create: `db/migrations/9999_rls_avaliacao.sql` (ou nova migration via SQL puro)

- [ ] **Step 1: Criar SQL**

```sql
ALTER TABLE pessoas              ENABLE ROW LEVEL SECURITY;
ALTER TABLE competencias         ENABLE ROW LEVEL SECURITY;
ALTER TABLE fatores_avaliacao    ENABLE ROW LEVEL SECURITY;
ALTER TABLE avaliacoes_desempenho ENABLE ROW LEVEL SECURITY;
ALTER TABLE avaliacoes_detalhes  ENABLE ROW LEVEL SECURITY;

-- service_role libera tudo (server actions usam essa role)
DO $$ BEGIN
  CREATE POLICY service_all_pessoas ON pessoas FOR ALL TO service_role USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY service_all_comp ON competencias FOR ALL TO service_role USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY service_all_fat ON fatores_avaliacao FOR ALL TO service_role USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY service_all_av ON avaliacoes_desempenho FOR ALL TO service_role USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY service_all_det ON avaliacoes_detalhes FOR ALL TO service_role USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
```

- [ ] **Step 2: Aplicar**

Via `psql` ou Supabase SQL editor. Confirmar que app continua funcionando após aplicar (server actions usam service_role).

- [ ] **Step 3: Commit**

```bash
git add db/migrations/9999_rls_avaliacao.sql
git commit -m "chore(db): habilita RLS nas tabelas de avaliação"
```

### Task 11.2: Estados vazios, loadings e polish final

**Files:**
- Vários componentes acima

- [ ] **Step 1: Adicionar skeletons em todas as páginas que carregam dados**

Em cada `page.tsx` server component que faz await em ações, envolver com `<Suspense fallback={<Skeleton/>}>` quando possível. Mensagens de vazio amigáveis (já incluídas).

- [ ] **Step 2: Conferir `npm run lint` e `npm run typecheck`**

Corrigir warnings/erros que aparecerem.

- [ ] **Step 3: Rodar testes**

Run: `npm test`
Expected: tudo verde.

- [ ] **Step 4: Build de produção**

Run: `npm run build`
Expected: build OK.

- [ ] **Step 5: Commit final + tag**

```bash
git add -A
git commit -m "chore(avaliacao): polish (lint, types, build)"
git tag avaliacao-v1
```

---

## Verificação final (DoD)

Antes de fechar, marcar manualmente:

- [ ] Migration aplica em DB limpo e seed cria 6 competências + 31 fatores
- [ ] Filial só vê/edita avaliações da própria filial (testar com 2 usuários)
- [ ] Admin vê tudo
- [ ] Wizard bloqueia salvar até 100%
- [ ] Pontuação e classificação congeladas após salvar
- [ ] Histórico paginado, filtros funcionam, evolução com `LAG()` correta
- [ ] Laudo imprime em Chrome (Ctrl+P) sem sidebar/topbar
- [ ] Import CSV valida cabeçalho e mostra erros linha-a-linha
- [ ] `log_acessos` registra `avaliacao.criar`, `avaliacao.atualizar_pdi`, `avaliacao.config.*`
- [ ] Rate limit `avaliacao.criar:<filialId>` ativa em > 30/10 min
- [ ] `npm run lint`, `npm run typecheck`, `npm test` e `npm run build` passam
- [ ] Zero CSS solto novo; tudo Tailwind + `components/ui/*`
