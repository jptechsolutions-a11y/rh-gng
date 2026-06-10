# Entrevista v2 — Modelo G&G Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Refatorar o módulo de entrevistas para seguir o "Modelo Entrevista" oficial do G&G — simplificar identificação/perfil, trocar notas numéricas por 9 comportamentos Sim/Parcial/Não, adicionar `parecer` separado, semear 6 perguntas padrão com multi-seleção e criar página estática `/guia-rapido`.

**Architecture:** Migração Supabase (DDL + truncate + seed) → schema Drizzle / validators → wizard (4 steps) reescritos → server actions ajustadas → telas de leitura (detalhe / imprimir / DOCX / painel / histórico / etc) limpas → página `/guia-rapido` + menu → drop página `/admin/config/criterios`.

**Tech Stack:** Next.js 15.5 (App Router), React 19, Drizzle ORM, Supabase Postgres, Zod, react-hook-form, Tailwind (tokens conecta-*), Vitest.

**Spec:** [docs/superpowers/specs/2026-06-09-entrevista-v2-modelo-design.md](../specs/2026-06-09-entrevista-v2-modelo-design.md)

**PowerShell:** Path tem `&`. Para rodar binários npm direto: `node "node_modules\<bin>\<bin>.js"`. Nunca rodar build com dev server ativo (memória).

---

### Task 1: Migration Supabase — schema + truncate + seed

**Files:**
- Aplicar via Supabase MCP (`mcp__86839c5b-a0a8-4979-95bb-418fd749048c__apply_migration`)

- [ ] **Step 1: Aplicar migration `entrevista_v2_modelo`**

SQL completo (rodar via MCP apply_migration):

```sql
-- 1) Drop colunas obsoletas em entrevistas
ALTER TABLE entrevistas
  DROP COLUMN IF EXISTS telefone,
  DROP COLUMN IF EXISTS email,
  DROP COLUMN IF EXISTS cidade,
  DROP COLUMN IF EXISTS escolaridade,
  DROP COLUMN IF EXISTS possui_cnh,
  DROP COLUMN IF EXISTS pretensao_salarial;

-- 2) Adicionar coluna parecer
ALTER TABLE entrevistas
  ADD COLUMN IF NOT EXISTS parecer text;

-- 3) Drop tabela criterios (não usada mais)
DROP TABLE IF EXISTS criterios CASCADE;

-- 4) Truncate dados (CASCADE limpa log_historico)
TRUNCATE TABLE entrevistas CASCADE;
TRUNCATE TABLE roteiro;

-- 5) Seed das 6 perguntas padrão
INSERT INTO roteiro (cargo, ordem, pergunta, tipo, opcoes, ativo) VALUES
('TODOS', 1, 'O que mais chamou sua atenção nesta oportunidade?', 'multi',
 ARRAY['Salário e benefícios','Estabilidade','Crescimento profissional','Horário / escala','Proximidade da residência','Primeira oportunidade','Interesse pela área logística','Necessidade imediata de trabalho'], true),
('TODOS', 2, 'Quais situações fazem você perder o interesse ou decidir sair de uma empresa?', 'multi',
 ARRAY['Falta de reconhecimento','Problemas com liderança','Escala / horário','Distância / transporte','Salário','Ambiente de trabalho','Falta de crescimento','Excesso de pressão','Conflitos em equipe'], true),
('TODOS', 3, 'Conte uma situação difícil que você viveu no trabalho e como resolveu', 'multi',
 ARRAY['Demonstrou autonomia','Precisou de apoio para resolver','Fugiu da responsabilidade','Demonstrou equilíbrio emocional','Trabalhou em equipe','Demonstrou iniciativa','Boa comunicação','Dificuldade para lidar com pressão'], true),
('TODOS', 4, 'Quais são seus planos profissionais para os próximos anos?', 'multi',
 ARRAY['Deseja crescer na empresa','Interesse em desenvolver carreira logística','Busca estabilidade','Interesse em liderança futura','Demonstra foco profissional','Objetivos compatíveis com a vaga','Demonstra intenção de saída rápida','Interesse em outra área totalmente diferente'], true),
('TODOS', 5, 'Você possui disponibilidade para horas extras, troca de turno ou trabalho aos sábados quando necessário?', 'multi',
 ARRAY['Sim','Não','Às vezes'], true),
('TODOS', 6, 'Já trabalhou com metas, produtividade ou rotina operacional intensa?', 'multi',
 ARRAY['Possui experiência operacional','Aceita rotina dinâmica','Possui restrição de horário','Possui dificuldade com deslocamento','Tem flexibilidade de escala','Já atuou em CD / logística','Demonstra resistência à rotina operacional'], true);
```

- [ ] **Step 2: Verificar via execute_sql**

Rodar `SELECT ordem, tipo, pergunta FROM roteiro ORDER BY ordem;` — esperar 6 linhas.
Rodar `\d entrevistas` ou `SELECT column_name FROM information_schema.columns WHERE table_name='entrevistas' ORDER BY ordinal_position;` — confirmar que `parecer` existe e os 6 campos foram dropados.
Rodar `SELECT to_regclass('public.criterios');` — esperar `null`.

- [ ] **Step 3: Commit (sem código novo, só registro)**

```powershell
git commit --allow-empty -m "chore(db): migration entrevista v2 aplicada via Supabase MCP"
```

---

### Task 2: Drizzle schema + validators

**Files:**
- Modify: `db/schema.ts`
- Modify: `lib/validators.ts`

- [ ] **Step 1: Atualizar `db/schema.ts`**

Em `db/schema.ts`, dentro do `pgTable('entrevistas', ...)`:
- Remover linhas: `telefone`, `email`, `cidade`, `escolaridade`, `possuiCnh`, `pretensaoSalarial`.
- Adicionar logo após `cargoPretendido`: `parecer: text('parecer'),`.
- Acima do `notasCriterios`, adicionar comentário de 1 linha:
  `// notasCriterios: { [comportamentoSlug]: 'sim'|'parcial'|'nao' } — 9 comportamentos fixos do modelo G&G.`

Remover o `export const criterios = pgTable(...)` inteiro (linhas 53-61 do arquivo atual).

- [ ] **Step 2: Atualizar `lib/validators.ts`**

Substituir o bloco `entrevistaInputSchema` por:

```ts
export const entrevistaInputSchema = z.object({
  cpf: cpfSchema,
  nome: z.string().trim().min(3).max(200),
  dataNasc: optDateStr,
  cargoPretendido: z.preprocess(emptyToNull, z.string().max(120).nullable().optional()),
  experiencias: z.preprocess(emptyToNull, z.string().max(5000).nullable().optional()),
  disponibilidadeTurnos: z.array(z.string()).optional().nullable(),
  respostasRoteiro: z
    .record(z.string(), z.union([z.string(), z.number(), z.boolean(), z.array(z.string())]))
    .optional()
    .default({}),
  notasCriterios: z
    .record(z.string(), z.enum(['sim', 'parcial', 'nao']))
    .optional()
    .default({}),
  parecer: z
    .enum(['Aprovado', 'Banco de talentos', 'Reavaliar em outra oportunidade', 'Não aderente à vaga'])
    .nullable()
    .optional(),
  observacoes: z.preprocess(emptyToNull, z.string().max(5000).nullable().optional()),
  status: z.enum(['Em análise', 'Aprovado', 'Reprovado', 'Banco de Talentos', 'Contratado']).optional(),
  motivoDecisao: optStr,
  dataRetorno: optDateStr,
  recrutador: z.string().trim().min(2, 'Informe o entrevistador').max(120),
  gestorAprovador: optStr,
  aprovadoPeloGg: optBool,
  consentimentoLgpd: z.boolean().refine((v) => v === true, 'Consentimento LGPD obrigatório'),
}).superRefine((data, ctx) => {
  if ((data.status === 'Aprovado' || data.status === 'Reprovado') && (!data.gestorAprovador || data.gestorAprovador.trim().length < 2)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['gestorAprovador'],
      message: 'Informe o gestor que aprovou/reprovou',
    });
  }
});
```

Remover os helpers `optNumber` se não forem mais usados em nenhum outro lugar do arquivo.

- [ ] **Step 3: Type-check**

```powershell
node "node_modules\typescript\bin\tsc" --noEmit
```

Esperado: erros nos arquivos que ainda referenciam campos removidos. Anotar os arquivos — vão ser tratados nas tarefas seguintes.

- [ ] **Step 4: Commit**

```powershell
git add db/schema.ts lib/validators.ts
git commit -m "refactor(entrevista): schema/validators v2 (drop email/tel/cidade/cnh/escolaridade/pretensao, add parecer)"
```

---

### Task 3: Server actions

**Files:**
- Modify: `actions/entrevistas.ts`
- Modify: `db/queries/config.ts`

- [ ] **Step 1: Remover `getCriterios` de `db/queries/config.ts`**

Apagar o export `getCriterios` inteiro (linhas 19-23).

- [ ] **Step 2: Atualizar `actions/entrevistas.ts` — `salvarEntrevista`**

Em `baseSemConsentimento`:
- Remover linhas: `telefone`, `email`, `cidade`, `pretensaoSalarial`, `escolaridade`, `estadoCivil`, `temFilhos`, `possuiCnh`, `veiculoProprio`, `disponibilidadeViagem`, `pcd`, `pcdTipo`, `indicacao`, `indicadoPorNome`, `indicadoPorCargo`, `fumante`, `jaTrabalhouGrupo`, `jaTrabalhouQuando`, `notaGeral`.
- Adicionar: `parecer: parsed.parecer ?? null,`
- Manter: `filialId, cpf, nome, dataNasc, cargoPretendido, experiencias, disponibilidadeTurnos, respostasRoteiro, notasCriterios, observacoes, status, motivoDecisao, dataRetorno, recrutador, gestorAprovador, aprovadoPeloGg, decisaoEm, decisaoPor, atualizadoPor`.

- [ ] **Step 3: Atualizar `listarEntrevistasFilialSlim`**

Na projeção `db.select({ ... })`, remover `email`, `telefone`, `cidade`. Adicionar `parecer: schema.entrevistas.parecer`.

- [ ] **Step 4: Atualizar `listarPorCargoFilial`**

Na projeção, remover `cidade`, `escolaridade`, `possuiCnh`, `pretensaoSalarial`. Adicionar `parecer: schema.entrevistas.parecer`. Manter `notasCriterios`.

- [ ] **Step 5: Atualizar `buscaGlobal`**

Na projeção, remover `email`. Na cláusula `or(...)`, remover `ilike(schema.entrevistas.email, like)`.

- [ ] **Step 6: Type-check**

```powershell
node "node_modules\typescript\bin\tsc" --noEmit
```

Esperado: menos erros, restantes em `app/(app)/...` páginas. Anotar.

- [ ] **Step 7: Commit**

```powershell
git add actions/entrevistas.ts db/queries/config.ts
git commit -m "refactor(entrevista): actions e queries alinhadas ao schema v2"
```

---

### Task 4: Wizard — Step 1 Identificação enxuto + auto-fill

**Files:**
- Modify: `components/wizard/Step1Identificacao.tsx`
- Modify: `components/wizard/CpfDuplicateAlert.tsx`
- Modify: `actions/entrevistas.ts` (adicionar nova action)

- [ ] **Step 1: Nova action `buscarUltimoDadosPorCpf`**

Em `actions/entrevistas.ts`, adicionar após `listarPorCpfMesmaFilial`:

```ts
export async function buscarUltimosDadosPorCpf(cpf: string): Promise<{ nome: string; dataNasc: string | null } | null> {
  const s = await requireSession('filial');
  const digits = cpf.replace(/\D/g, '');
  if (digits.length !== 11) return null;
  const rows = await db.select({
    nome: schema.entrevistas.nome,
    dataNasc: schema.entrevistas.dataNasc,
  })
    .from(schema.entrevistas)
    .where(and(eq(schema.entrevistas.cpf, digits), eq(schema.entrevistas.filialId, s.filialId)))
    .orderBy(desc(schema.entrevistas.dataHora))
    .limit(1);
  const r = rows[0];
  if (!r) return null;
  return { nome: r.nome, dataNasc: r.dataNasc ?? null };
}
```

- [ ] **Step 2: Reescrever `Step1Identificacao.tsx`**

Substituir conteúdo todo por:

```tsx
'use client';
import { TextField } from './fields';
import { CpfDuplicateAlert } from './CpfDuplicateAlert';

export function Step1Identificacao({ entrevistaIdAtual }: { entrevistaIdAtual?: string }) {
  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-base font-semibold text-perlog-navy">Identificação do candidato</h3>
        <p className="text-sm text-perlog-slate">Dados pessoais e entrevistador.</p>
      </div>
      <CpfDuplicateAlert entrevistaIdAtual={entrevistaIdAtual} />
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <TextField name="nome" label="Nome completo" required />
        <TextField name="cpf" label="CPF" required placeholder="000.000.000-00" />
        <TextField name="dataNasc" label="Data de nascimento" type="date" />
        <TextField name="recrutador" label="Entrevistador(a)" required placeholder="Nome de quem está entrevistando" />
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Atualizar `CpfDuplicateAlert.tsx` — botão "Preencher dados"**

No bloco de botões (`flex flex-wrap gap-2 pt-1`), adicionar um botão ANTES do "Prosseguir mesmo assim":

```tsx
<button
  type="button"
  onClick={async () => {
    const dados = await buscarUltimosDadosPorCpf(cpfDigits);
    if (dados) {
      setValue('nome', dados.nome, { shouldDirty: true, shouldValidate: true });
      if (dados.dataNasc) setValue('dataNasc', dados.dataNasc as never, { shouldDirty: true });
    }
    setDismissed(true);
  }}
  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium border border-amber-400 bg-white text-amber-900 hover:bg-amber-100"
>
  Prosseguir e preencher nome / nascimento
</button>
```

Imports a adicionar no topo:
```ts
import { buscarUltimosDadosPorCpf } from '@/actions/entrevistas';
```

E `setValue` precisa vir do `useFormContext`:
```ts
const { watch, setValue } = useFormContext<EntrevistaInput>();
```
(substituir o `const { watch } = ...` existente).

- [ ] **Step 4: Commit**

```powershell
git add components/wizard/Step1Identificacao.tsx components/wizard/CpfDuplicateAlert.tsx actions/entrevistas.ts
git commit -m "feat(entrevista): step1 enxuto + auto-fill nome/nascimento via CPF"
```

---

### Task 5: Wizard — Step 2 Perfil enxuto

**Files:**
- Modify: `components/wizard/Step2Perfil.tsx`

- [ ] **Step 1: Reescrever `Step2Perfil.tsx`**

Substituir o componente `Step2Perfil` (mantém o `TurnoMultiSelect`) por:

```tsx
export function Step2Perfil({ cargos }: { cargos: string[] }) {
  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-base font-semibold text-perlog-navy">Perfil profissional</h3>
        <p className="text-sm text-perlog-slate">Cargo pretendido, disponibilidade de turno e experiências.</p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <SelectField name="cargoPretendido" label="Cargo pretendido" options={cargos} required />
        <TurnoMultiSelect />
      </div>
      <TextareaField name="experiencias" label="Experiências profissionais" rows={5} />
    </div>
  );
}
```

A assinatura mudou — não recebe mais `opcoes`. Atualizar tipos e usos.

- [ ] **Step 2: Commit**

```powershell
git add components/wizard/Step2Perfil.tsx
git commit -m "feat(entrevista): step2 minimalista (cargo + turno + experiencias)"
```

---

### Task 6: Wizard — Step 3 Roteiro com tipo `multi`

**Files:**
- Modify: `components/wizard/Step3Roteiro.tsx`

- [ ] **Step 1: Adicionar suporte ao tipo `multi`**

No `Step3Roteiro`, dentro do `.map((q, i) => ...)`, adicionar bloco para o tipo `multi` (antes ou depois do bloco `texto`):

```tsx
{q.tipo === 'multi' && q.opcoes && q.opcoes.length > 0 && (
  <MultiCheckQuestion id={q.id} opcoes={q.opcoes} />
)}
```

Adicionar novo componente no mesmo arquivo, antes do `export function Step3Roteiro`:

```tsx
function MultiCheckQuestion({ id, opcoes }: { id: string; opcoes: string[] }) {
  const { watch, setValue } = useFormContext<EntrevistaInput>();
  const respostas = (watch('respostasRoteiro') ?? {}) as Record<string, unknown>;
  const valor = respostas[id];
  const selecionadas: string[] = Array.isArray(valor) ? valor.filter((v): v is string => typeof v === 'string') : [];
  const outrosAtual = selecionadas.find((s) => s.startsWith('Outros: ')) ?? '';
  const outrosTexto = outrosAtual.replace(/^Outros: /, '');
  const semOutros = selecionadas.filter((s) => !s.startsWith('Outros: '));

  function toggle(opt: string) {
    const set = new Set(semOutros);
    if (set.has(opt)) set.delete(opt); else set.add(opt);
    const novo = [...Array.from(set), ...(outrosAtual ? [outrosAtual] : [])];
    setValue(`respostasRoteiro.${id}` as const, novo, { shouldDirty: true });
  }

  function alterarOutros(texto: string) {
    const limpo = texto.trim();
    const novo = [...semOutros, ...(limpo ? [`Outros: ${limpo}`] : [])];
    setValue(`respostasRoteiro.${id}` as const, novo, { shouldDirty: true });
  }

  return (
    <div className="mt-2 space-y-2">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {opcoes.map((opt) => {
          const active = semOutros.includes(opt);
          return (
            <label
              key={opt}
              className={`flex items-center gap-2 rounded-md border px-3 py-2 text-sm cursor-pointer transition-colors ${
                active ? 'bg-perlog-orange/10 border-perlog-orange text-perlog-navy' : 'bg-white border-slate-200 hover:bg-slate-50'
              }`}
            >
              <input
                type="checkbox"
                checked={active}
                onChange={() => toggle(opt)}
                className="h-4 w-4 rounded border-slate-300 text-perlog-orange focus:ring-perlog-orange/40"
              />
              <span>{opt}</span>
            </label>
          );
        })}
      </div>
      <div className="flex items-center gap-2">
        <span className="text-xs font-medium text-perlog-slate shrink-0">Outros:</span>
        <input
          type="text"
          value={outrosTexto}
          onChange={(e) => alterarOutros(e.target.value)}
          placeholder="Anote outro ponto observado..."
          className="flex h-9 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-perlog-orange/60"
        />
      </div>
    </div>
  );
}
```

Adicionar `useFormContext` no import do react-hook-form (já existe). Verificar que o import de `EntrevistaInput` continua.

- [ ] **Step 2: Commit**

```powershell
git add components/wizard/Step3Roteiro.tsx
git commit -m "feat(entrevista): step3 suporta tipo 'multi' com checkboxes + Outros"
```

---

### Task 7: Wizard — Step 4 Comportamento & Parecer

**Files:**
- Modify: `components/wizard/Step4Avaliacao.tsx` (rename interno para Step4Comportamento, mas manter nome do arquivo por simplicidade)
- Modify: `components/wizard/EntrevistaWizard.tsx`

- [ ] **Step 1: Reescrever `Step4Avaliacao.tsx` completamente**

```tsx
'use client';
import { useFormContext } from 'react-hook-form';
import { ShieldCheck } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { SelectField, TextField, TextareaField } from './fields';
import type { EntrevistaInput } from '@/lib/validators';

const COMPORTAMENTOS: Array<{ slug: string; label: string }> = [
  { slug: 'comunicacao', label: 'Boa comunicação' },
  { slug: 'interesse_vaga', label: 'Interesse pela vaga' },
  { slug: 'postura', label: 'Postura profissional' },
  { slug: 'pontualidade', label: 'Pontualidade' },
  { slug: 'clareza', label: 'Clareza nas respostas' },
  { slug: 'estabilidade_emocional', label: 'Estabilidade emocional' },
  { slug: 'energia', label: 'Energia / disposição' },
  { slug: 'comprometimento', label: 'Comprometimento' },
  { slug: 'equipe', label: 'Facilidade para trabalho em equipe' },
];

const PARECERES: Array<'Aprovado' | 'Banco de talentos' | 'Reavaliar em outra oportunidade' | 'Não aderente à vaga'> = [
  'Aprovado', 'Banco de talentos', 'Reavaliar em outra oportunidade', 'Não aderente à vaga',
];

const NIVEIS: Array<{ value: 'sim' | 'parcial' | 'nao'; label: string }> = [
  { value: 'sim', label: 'Sim' },
  { value: 'parcial', label: 'Parcial' },
  { value: 'nao', label: 'Não' },
];

export function Step4Avaliacao({ opcoes }: { opcoes: Record<string, string[]> }) {
  const { register, watch, setValue, formState: { errors } } = useFormContext<EntrevistaInput>();
  const notas = (watch('notasCriterios') ?? {}) as Record<string, 'sim' | 'parcial' | 'nao'>;
  const parecer = watch('parecer');
  const consent = watch('consentimentoLgpd');
  const statusAtual = watch('status');

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-base font-semibold text-perlog-navy">Comportamento e parecer</h3>
        <p className="text-sm text-perlog-slate">Avaliação dos 9 comportamentos observados durante a entrevista, parecer final e decisão.</p>
      </div>

      <div className="space-y-2">
        <Label>Durante a entrevista, o candidato demonstrou:</Label>
        <div className="rounded-lg border border-slate-100 overflow-hidden">
          <div className="grid grid-cols-[1fr_auto] sm:grid-cols-[2fr_auto] items-center bg-slate-50 px-4 py-2 text-xs font-semibold text-perlog-slate uppercase tracking-wide">
            <span>Comportamento</span>
            <div className="flex gap-1.5">
              {NIVEIS.map((n) => (
                <span key={n.value} className="w-16 sm:w-20 text-center">{n.label}</span>
              ))}
            </div>
          </div>
          {COMPORTAMENTOS.map((c) => (
            <div key={c.slug} className="grid grid-cols-[1fr_auto] sm:grid-cols-[2fr_auto] items-center px-4 py-2 border-t border-slate-100">
              <span className="text-sm text-perlog-navy">{c.label}</span>
              <div className="flex gap-1.5">
                {NIVEIS.map((n) => {
                  const active = notas[c.slug] === n.value;
                  return (
                    <button
                      key={n.value}
                      type="button"
                      onClick={() => setValue(`notasCriterios.${c.slug}` as const, n.value, { shouldDirty: true })}
                      className={`w-16 sm:w-20 h-8 rounded-md text-xs font-semibold border transition-colors ${
                        active ? 'bg-perlog-orange text-white border-perlog-orange' : 'bg-white text-perlog-slate border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      {n.label}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <Label>Parecer final do entrevistador</Label>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {PARECERES.map((p) => {
            const active = parecer === p;
            return (
              <button
                key={p}
                type="button"
                onClick={() => setValue('parecer', p, { shouldDirty: true })}
                className={`px-3 py-2 rounded-md text-sm font-medium border transition-colors text-left ${
                  active ? 'bg-perlog-orange text-white border-perlog-orange' : 'bg-white text-perlog-navy border-slate-200 hover:bg-slate-50'
                }`}
              >
                {p}
              </button>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <SelectField name="status" label="Status final" options={opcoes.status ?? []} required />
        <TextField name="dataRetorno" label="Data de retorno" type="date" placeholder="Quando dar retorno ao candidato" />
      </div>

      <label className="flex gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3 cursor-pointer">
        <input type="checkbox" {...register('aprovadoPeloGg')} className="mt-0.5 h-4 w-4 rounded border-slate-300 text-perlog-orange focus:ring-perlog-orange/40" />
        <span className="text-sm text-perlog-navy">
          <span className="font-semibold block">Avaliado pelo Gente &amp; Gestão</span>
          <span className="text-xs text-perlog-slate">Marque se o G&amp;G já fez a avaliação inicial — aguardando decisão do gestor.</span>
        </span>
      </label>

      {(statusAtual === 'Aprovado' || statusAtual === 'Reprovado') && (
        <div className="rounded-lg border border-perlog-orange/30 bg-perlog-orange/5 p-4 space-y-3">
          <p className="text-sm font-semibold text-perlog-navy">Decisão final — {statusAtual.toLowerCase()}</p>
          <TextField name="gestorAprovador" label={statusAtual === 'Aprovado' ? 'Gestor que aprovou' : 'Gestor que reprovou'} required placeholder="Nome do gestor responsável pela decisão" />
        </div>
      )}

      <TextareaField name="motivoDecisao" label="Motivo da decisão" rows={3} />
      <TextareaField name="observacoes" label="Observações gerais" rows={3} />

      <label className="flex gap-3 rounded-lg border border-perlog-orange/20 bg-perlog-orange/5 p-4 cursor-pointer">
        <input type="checkbox" {...register('consentimentoLgpd')} className="mt-0.5 h-4 w-4 rounded border-slate-300 text-perlog-orange focus:ring-perlog-orange/40" />
        <span className="text-sm text-perlog-navy">
          <span className="font-semibold flex items-center gap-1.5 mb-0.5">
            <ShieldCheck className="h-4 w-4 text-perlog-orange" />
            Consentimento LGPD
          </span>
          O candidato autoriza o tratamento dos dados pessoais informados para fins de processo seletivo, conforme a Lei 13.709/2018. Dados são acessíveis apenas pela filial e pelo RH central.
        </span>
      </label>
      {!consent && errors.consentimentoLgpd && (
        <p className="text-xs text-red-600">{errors.consentimentoLgpd.message as string}</p>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Atualizar `EntrevistaWizard.tsx`**

- Remover prop `criterios` e o tipo `Criterio`.
- Remover prop `opcoes` repassada para `Step2Perfil` (Step2 agora não usa).
- Atualizar a chamada do `Step4Avaliacao` para passar só `opcoes={opcoes}`.
- Trocar o label do step 4 no array `STEPS` de `'Avaliação'` para `'Comportamento'` e o ícone `Star` por `ClipboardCheck` (já importado em lugares — adicionar no import de `lucide-react`).

Diff conceitual:
```ts
import { ChevronLeft, ChevronRight, Save, CheckCircle2, UserCircle, Briefcase, MessageSquare, ClipboardCheck } from 'lucide-react';
// ...
const STEPS = [
  { id: 1, label: 'Identificação', icon: UserCircle },
  { id: 2, label: 'Perfil',        icon: Briefcase },
  { id: 3, label: 'Roteiro',       icon: MessageSquare },
  { id: 4, label: 'Comportamento', icon: ClipboardCheck },
] as const;
```

E na assinatura do componente:
```ts
export function EntrevistaWizard({
  inicial, cargos, roteiro, opcoes,
}: {
  inicial: Inicial;
  cargos: string[];
  roteiro: RoteiroItem[];
  opcoes: Record<string, string[]>;
}) {
```

Renderização:
```tsx
{step === 2 && <Step2Perfil cargos={cargos} />}
{step === 4 && <Step4Avaliacao opcoes={opcoes} />}
```

Remover linha que removia `notasCriterios` default — manter no `defaultValues` mas tipo do record agora é `'sim'|'parcial'|'nao'`. Substituir:
```ts
notasCriterios: (inicial?.notasCriterios as Record<string, 'sim'|'parcial'|'nao'>) ?? {},
```

Adicionar default para `parecer`:
```ts
parecer: (inicial?.parecer as EntrevistaInput['parecer']) ?? null,
```

- [ ] **Step 3: Atualizar `app/(app)/entrevista/[id]/page.tsx`**

Remover `getCriterios` do import (já dropado em Task 3). Atualizar Promise.all:
```ts
const [cargos, opcoes] = await Promise.all([
  getCargosAtivos(),
  getOpcoes(),
]);
```
Remover `criterios={criterios}` da chamada do `EntrevistaWizard`.

- [ ] **Step 4: Type-check**

```powershell
node "node_modules\typescript\bin\tsc" --noEmit
```

Anotar erros restantes em telas de exibição.

- [ ] **Step 5: Commit**

```powershell
git add components/wizard/Step4Avaliacao.tsx components/wizard/EntrevistaWizard.tsx "app/(app)/entrevista/[id]/page.tsx"
git commit -m "feat(entrevista): step4 comportamento (9 itens Sim/Parcial/Nao) + parecer"
```

---

### Task 8: Telas de leitura — detalhe, imprimir, DOCX

**Files:**
- Modify: `app/(app)/entrevista/[id]/imprimir/page.tsx`
- Modify: `app/api/entrevista/[id]/docx/route.ts`

- [ ] **Step 1: Auditar `imprimir/page.tsx`**

Abrir o arquivo. Localizar e remover qualquer referência a `email`, `telefone`, `cidade`, `escolaridade`, `possuiCnh`/`possui_cnh`, `pretensaoSalarial`/`pretensao_salarial`. Substituir o bloco de "Notas por critério" pela seção de Comportamentos (iterar sobre `notasCriterios` com os 9 slugs). Adicionar bloco "Parecer final" exibindo `parecer`. Renderizar respostas do roteiro entendendo que `respostasRoteiro[id]` pode ser `string | number | boolean | string[]` — para array, mostrar lista com bullets.

Mapa de labels dos comportamentos (copiar do Step4):
```ts
const COMPORTAMENTOS_LABELS: Record<string, string> = {
  comunicacao: 'Boa comunicação',
  interesse_vaga: 'Interesse pela vaga',
  postura: 'Postura profissional',
  pontualidade: 'Pontualidade',
  clareza: 'Clareza nas respostas',
  estabilidade_emocional: 'Estabilidade emocional',
  energia: 'Energia / disposição',
  comprometimento: 'Comprometimento',
  equipe: 'Facilidade para trabalho em equipe',
};
```

- [ ] **Step 2: Auditar `api/entrevista/[id]/docx/route.ts`**

Mesma limpeza: remover linhas que escrevem email/telefone/cidade/escolaridade/CNH/pretensão. Trocar seção de notas por seção de comportamentos. Adicionar Parecer.

- [ ] **Step 3: Type-check**

```powershell
node "node_modules\typescript\bin\tsc" --noEmit
```

- [ ] **Step 4: Commit**

```powershell
git add "app/(app)/entrevista/[id]/imprimir/page.tsx" app/api/entrevista/[id]/docx/route.ts
git commit -m "refactor(entrevista): telas de leitura/impressao/docx alinhadas ao v2"
```

---

### Task 9: Listagens — painel, histórico, banco-talentos, comparar, candidato, busca global, relatórios, CSV

**Files:**
- Modify: `app/(app)/painel/PainelClient.tsx`, `app/(app)/painel/page.tsx`
- Modify: `app/(app)/historico/page.tsx`, `app/(app)/historico/EditarDecisaoButton.tsx`
- Modify: `app/(app)/banco-talentos/BancoTalentosClient.tsx`, `app/(app)/banco-talentos/page.tsx`
- Modify: `app/(app)/comparar/page.tsx`
- Modify: `app/(app)/candidato/[cpf]/page.tsx`
- Modify: `app/(app)/admin/relatorios/page.tsx`
- Modify: `app/(app)/admin/busca/BuscaGlobalClient.tsx`
- Modify: `app/api/export/csv/route.ts`
- Modify: `app/api/historico/export/route.ts`

- [ ] **Step 1: Auditar cada arquivo**

Em cada um, fazer Grep pelos campos removidos: `email|telefone|cidade|escolaridade|possuiCnh|possui_cnh|pretensaoSalarial|pretensao_salarial`. Para cada match:
- Remover coluna da tabela / item de detalhe.
- Se for cabeçalho de CSV, remover.
- Se `notasCriterios` aparecer (ex.: `comparar` mostra notas), trocar a renderização para Sim/Parcial/Não com os labels dos 9 comportamentos.

- [ ] **Step 2: Adicionar `parecer` onde fizer sentido**

Em `painel`, `historico`, `banco-talentos`: adicionar coluna ou badge "Parecer" perto do status quando preenchido.

- [ ] **Step 3: Type-check + smoke**

```powershell
node "node_modules\typescript\bin\tsc" --noEmit
```

Iniciar dev server (sem build paralelo):
```powershell
$env:PORT=3100; node "node_modules\next\dist\bin\next" dev
```
Abrir `/painel`, `/historico`, `/banco-talentos`, `/comparar`, `/admin/busca` — verificar que carregam sem erro.

- [ ] **Step 4: Commit**

```powershell
git add "app/(app)/painel" "app/(app)/historico" "app/(app)/banco-talentos" "app/(app)/comparar" "app/(app)/candidato" "app/(app)/admin/relatorios" "app/(app)/admin/busca" app/api/export/csv/route.ts app/api/historico/export/route.ts
git commit -m "refactor(entrevista): listagens e exports limpos (v2)"
```

---

### Task 10: Admin config — drop /criterios + suporte `multi` no /roteiro

**Files:**
- Delete: `app/(app)/admin/config/criterios/` (diretório inteiro)
- Modify: `app/(app)/admin/config/page.tsx`
- Modify: `app/(app)/admin/config/roteiro/RoteiroClient.tsx`
- Modify: `actions/admin.ts` (remover actions de critérios se existirem)

- [ ] **Step 1: Remover página de critérios**

```powershell
Remove-Item -Recurse -Force "app\(app)\admin\config\criterios"
```

Em `actions/admin.ts`, procurar e remover funções `listarCriteriosAdmin`, `salvarCriterio`, `desativarCriterio` (ou semelhantes).

- [ ] **Step 2: Atualizar `admin/config/page.tsx`**

Remover o card/link "Critérios" desta página.

- [ ] **Step 3: Atualizar `RoteiroClient.tsx`**

No seletor de `tipo` da pergunta, adicionar a opção `'multi'`:
```tsx
<option value="multi">Múltipla escolha (vários)</option>
```
Manter o campo de opções (já existe para `select`) — para `multi`, o entrevistador também precisa das opções.

- [ ] **Step 4: Smoke + commit**

```powershell
node "node_modules\typescript\bin\tsc" --noEmit
git add -A
git commit -m "refactor(admin): remove pagina criterios + adiciona tipo 'multi' no roteiro"
```

---

### Task 11: Página `/guia-rapido` + menu

**Files:**
- Create: `app/(app)/guia-rapido/page.tsx`
- Modify: `components/layout/nav-config.ts`

- [ ] **Step 1: Criar página estática**

```tsx
// app/(app)/guia-rapido/page.tsx
import { TopBar } from '@/components/layout/TopBar';
import { ConectaCard } from '@/components/ui/conecta-card';
import { CheckCircle2, AlertTriangle, TrendingDown, Info } from 'lucide-react';
import { requireSession } from '@/lib/auth/session';

export const dynamic = 'force-dynamic';

const SECOES = [
  {
    titulo: 'Sinais positivos',
    icon: CheckCircle2,
    cor: 'text-emerald-600',
    bg: 'bg-emerald-50 border-emerald-200',
    itens: [
      'Demonstra interesse em crescimento interno.',
      'Busca estabilidade e desenvolvimento.',
      'Relata resolução de problemas com autonomia.',
      'Demonstra flexibilidade operacional.',
      'Possui histórico de permanência em empregos anteriores.',
      'Fala sobre trabalho em equipe e responsabilidade.',
    ],
  },
  {
    titulo: 'Pontos de atenção',
    icon: AlertTriangle,
    cor: 'text-amber-600',
    bg: 'bg-amber-50 border-amber-200',
    itens: [
      'Demonstra interesse apenas temporário.',
      'Objetivos totalmente desconectados da vaga.',
      'Forte resistência a horários, pressão ou rotina operacional.',
      'Relatos frequentes de conflitos com liderança.',
      'Mudanças constantes de emprego sem justificativa consistente.',
      'Dificuldade para explicar experiências anteriores.',
    ],
  },
  {
    titulo: 'Indicativos de turnover precoce',
    icon: TrendingDown,
    cor: 'text-red-600',
    bg: 'bg-red-50 border-red-200',
    itens: [
      'Busca apenas "algo temporário".',
      'Expectativa incompatível com a realidade da operação.',
      'Não demonstra disponibilidade operacional.',
      'Demonstra desinteresse durante a entrevista.',
      'Já inicia o processo falando sobre saída futura.',
    ],
  },
];

export default async function GuiaRapidoPage() {
  await requireSession();
  return (
    <>
      <TopBar titulo="Guia Rápido" subtitulo="Interpretação das respostas da entrevista" />
      <div className="p-6 space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {SECOES.map((s) => {
            const Icon = s.icon;
            return (
              <ConectaCard key={s.titulo}>
                <div className="p-5">
                  <div className="flex items-center gap-2 mb-3">
                    <Icon className={`h-5 w-5 ${s.cor}`} />
                    <h2 className="font-display font-semibold text-conecta-primary">{s.titulo}</h2>
                  </div>
                  <ul className="space-y-2">
                    {s.itens.map((it) => (
                      <li key={it} className={`flex items-start gap-2 rounded-md border px-3 py-2 text-sm text-slate-700 ${s.bg}`}>
                        <span className={`mt-0.5 ${s.cor} shrink-0`}>•</span>
                        <span>{it}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </ConectaCard>
            );
          })}
        </div>

        <ConectaCard>
          <div className="p-5">
            <div className="flex items-center gap-2 mb-3">
              <Info className="h-5 w-5 text-conecta-primary" />
              <h2 className="font-display font-semibold text-conecta-primary">Observação importante</h2>
            </div>
            <p className="text-sm leading-relaxed text-slate-700">
              O objetivo da entrevista não é apenas validar experiência técnica, mas entender comportamento, disponibilidade, aderência cultural e expectativa real sobre a rotina operacional dos CDs. Uma contratação assertiva reduz turnover, melhora o clima operacional e fortalece os resultados da unidade.
            </p>
          </div>
        </ConectaCard>
      </div>
    </>
  );
}
```

- [ ] **Step 2: Adicionar ao menu**

Em `components/layout/nav-config.ts`, adicionar no `FILIAL_NAV` após "Banco de talentos":
```ts
{ href: '/guia-rapido', label: 'Guia Rápido', icon: BookOpen },
```
`BookOpen` já está importado.

- [ ] **Step 3: Smoke + commit**

```powershell
node "node_modules\typescript\bin\tsc" --noEmit
git add "app/(app)/guia-rapido" components/layout/nav-config.ts
git commit -m "feat(entrevista): pagina Guia Rapido com criterios do modelo G&G"
```

---

### Task 12: Verificação final + push

- [ ] **Step 1: Type-check + lint**

```powershell
node "node_modules\typescript\bin\tsc" --noEmit
node "node_modules\eslint\bin\eslint.js" .
```

Tudo deve passar sem erros.

- [ ] **Step 2: Vitest (regressão das suites existentes)**

```powershell
node "node_modules\vitest\vitest.mjs" run
```

- [ ] **Step 3: Smoke manual no preview**

```powershell
$env:PORT=3100; node "node_modules\next\dist\bin\next" dev
```

Fluxo a testar:
1. Login filial → /entrevista/nova
2. Step 1: digitar CPF qualquer, preencher nome e nascimento, entrevistador. Avançar.
3. Step 2: escolher cargo, marcar turnos, escrever experiência. Avançar.
4. Step 3: marcar checkboxes nas 6 perguntas, escrever em "Outros" de pelo menos uma. Avançar.
5. Step 4: marcar comportamentos, escolher parecer, status, consentimento, salvar.
6. Voltar em /entrevista/nova com mesmo CPF → ver alerta de duplicata → clicar em "Prosseguir e preencher" → confirmar que nome e data de nascimento foram preenchidos.
7. Abrir /guia-rapido → ver os 4 cards.
8. Conferir /painel — não deve ter colunas e-mail/telefone/cidade.
9. Conferir impressão (/entrevista/{id}/imprimir).

- [ ] **Step 4: Push para jptech**

```powershell
git push jptech v3
```

Vercel deve disparar build automático.

---

## Notas de execução

- Cada task é independente o suficiente pra um subagente rodar isolado.
- Tarefa 1 (migration) só roda uma vez — não é idempotente para o seed.
- Se durante Task 8 ou 9 aparecerem campos não previstos, parar e alinhar com o usuário antes de remover.
- Identidade visual: usar sempre `conecta-primary`, `conecta-accent`, `conecta-dark`, `font-display`. Para tons soltos em tabelas é OK usar `perlog-orange`/`perlog-slate`/`perlog-navy` (padrão atual do wizard).
