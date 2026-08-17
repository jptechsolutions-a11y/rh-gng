# Transporte: CPF, número da rota e edição de rota — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Adicionar CPF ao cadastro de passageiros (import + tela Informações), mostrar o número da rota (`Nº{ordem}`) na coluna Rota da tela Passageiros, e permitir editar uma rota existente pela UI.

**Architecture:** Uma coluna `cpf` nova em `transporte_cadastro`, populada pelo parser de import existente e exposta pela action `listarInformacoesPassageiros`. Dois helpers puros e testados (`formatCpf`, `formatRotaLabel`) em `lib/transporte/format.ts`, consumidos pelos componentes de tela. A action de editar rota (`atualizarRota`) já existe — só falta um modal na UI que a chame.

**Tech Stack:** Next.js (App Router, Server Actions), Drizzle ORM + Postgres (Supabase), Vitest, xlsx (SheetJS), React + Tailwind.

Spec de referência: `docs/superpowers/specs/2026-08-17-transporte-cpf-rota-design.md`

---

### Task 1: Schema — coluna `cpf` em `transporte_cadastro`

**Files:**
- Modify: `db/schema.ts:591-606`
- Create: `db/migrations/000N_<nome_gerado>.sql` (gerado pelo drizzle-kit, não escrever à mão)

- [ ] **Step 1: Adicionar a coluna no schema**

Em `db/schema.ts`, dentro de `export const transporteCadastro = pgTable('transporte_cadastro', { ... })`, adicione `cpf` logo após `nome`:

```ts
export const transporteCadastro = pgTable('transporte_cadastro', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  filialId: uuid('filial_id').notNull().references(() => filiais.id, { onDelete: 'cascade' }),
  chapa: text('chapa').notNull(),
  nome: text('nome').notNull(),
  cpf: text('cpf'),
  rua: text('rua'),
  bairro: text('bairro'),
  cidade: text('cidade'),
  telefone1: text('telefone1'),
  telefone2: text('telefone2'),
  situacao: text('situacao'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  filialChapaUniq: uniqueIndex('transporte_cadastro_filial_chapa_uniq').on(t.filialId, t.chapa),
}));
```

- [ ] **Step 2: Gerar a migration**

Run (PowerShell — `npm` quebra com `&` no caminho do projeto, por isso chamamos o binário do drizzle-kit diretamente com `node`):

```bash
node "node_modules\drizzle-kit\bin.cjs" generate
```

Expected: imprime algo como `Your SQL migration file ➜ db/migrations/0007_<nome>.sql`. Abra o arquivo gerado e confirme que ele contém só:

```sql
ALTER TABLE "transporte_cadastro" ADD COLUMN "cpf" text;
```

Se o drizzle-kit gerar algo diferente disso (ex.: tentando recriar índices/tabelas), pare e investigue antes de aplicar — não é esperado para uma coluna nova nullable.

- [ ] **Step 3: Aplicar a migration no banco**

Run:

```bash
node "node_modules\drizzle-kit\bin.cjs" migrate
```

Expected: log confirmando a migration aplicada, sem erros. Isso altera o banco real (Supabase) usado pelo dev server — é uma mudança aditiva e reversível (`ALTER TABLE ... DROP COLUMN cpf` desfaz), mas é uma ação sobre infraestrutura compartilhada, não local.

- [ ] **Step 4: Commit**

```bash
git add db/schema.ts db/migrations/
git commit -m "feat(transporte): adiciona coluna cpf em transporte_cadastro"
```

---

### Task 2: Helpers puros — `formatCpf` e `formatRotaLabel`

**Files:**
- Create: `lib/transporte/format.ts`
- Test: `lib/transporte/format.test.ts`

- [ ] **Step 1: Escrever o teste (falhando)**

Create `lib/transporte/format.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { formatCpf, formatRotaLabel } from './format';

describe('formatCpf', () => {
  it('formata 11 dígitos com máscara 000.000.000-00', () => {
    expect(formatCpf('12345678900')).toBe('123.456.789-00');
  });

  it('remove pontuação existente antes de formatar', () => {
    expect(formatCpf('123.456.789-00')).toBe('123.456.789-00');
  });

  it('retorna os dígitos crus quando não tem 11 dígitos', () => {
    expect(formatCpf('123')).toBe('123');
  });

  it('retorna null para vazio ou nulo', () => {
    expect(formatCpf('')).toBeNull();
    expect(formatCpf(null)).toBeNull();
  });
});

describe('formatRotaLabel', () => {
  it('monta o label com número, nome e turno', () => {
    expect(
      formatRotaLabel({ ordem: 1, nome: 'Tijucas + Canelinha', turno: '1º Turno' }),
    ).toBe('Nº1 - Tijucas + Canelinha (1º Turno)');
  });

  it('usa o número de ordem informado, não um índice fixo', () => {
    expect(
      formatRotaLabel({ ordem: 13, nome: 'Rota 13 Tijucas', turno: '2º Turno' }),
    ).toBe('Nº13 - Rota 13 Tijucas (2º Turno)');
  });
});
```

- [ ] **Step 2: Rodar o teste e confirmar que falha**

Run:

```bash
node "node_modules\vitest\vitest.mjs" run lib/transporte/format.test.ts
```

Expected: FAIL — `Cannot find module './format'` (o arquivo `format.ts` ainda não existe).

- [ ] **Step 3: Implementar `format.ts`**

Create `lib/transporte/format.ts`:

```ts
export function formatCpf(cpf: string | null): string | null {
  if (!cpf) return null;
  const digits = cpf.replace(/\D/g, '');
  if (digits.length !== 11) return digits || null;
  return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9, 11)}`;
}

export function formatRotaLabel(rota: { ordem: number; nome: string; turno: string }): string {
  return `Nº${rota.ordem} - ${rota.nome} (${rota.turno})`;
}
```

- [ ] **Step 4: Rodar o teste e confirmar que passa**

Run:

```bash
node "node_modules\vitest\vitest.mjs" run lib/transporte/format.test.ts
```

Expected: PASS — 6 testes passando.

- [ ] **Step 5: Commit**

```bash
git add lib/transporte/format.ts lib/transporte/format.test.ts
git commit -m "feat(transporte): adiciona formatCpf e formatRotaLabel"
```

---

### Task 3: Parser de import — extrair CPF da planilha

**Files:**
- Modify: `lib/transporte/cadastro-xls-parser.ts`
- Test: `lib/transporte/cadastro-xls-parser.test.ts`

- [ ] **Step 1: Escrever o teste (falhando)**

Create `lib/transporte/cadastro-xls-parser.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import * as XLSX from 'xlsx';
import { parseCadastroPassageiros } from './cadastro-xls-parser';

function buildXls(rows: Record<string, unknown>[]): Buffer {
  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');
  return XLSX.write(wb, { type: 'buffer', bookType: 'biff8' }) as Buffer;
}

describe('parseCadastroPassageiros - CPF', () => {
  it('extrai CPF só com dígitos quando a planilha traz com máscara', () => {
    const buf = buildXls([{ CHAPA: '123', NOME: 'FULANO', CPF: '123.456.789-00' }]);
    const linhas = parseCadastroPassageiros(buf);
    expect(linhas[0]?.cpf).toBe('12345678900');
  });

  it('extrai CPF quando a planilha já traz só dígitos', () => {
    const buf = buildXls([{ CHAPA: '123', NOME: 'FULANO', CPF: '12345678900' }]);
    const linhas = parseCadastroPassageiros(buf);
    expect(linhas[0]?.cpf).toBe('12345678900');
  });

  it('cpf fica null quando a coluna não existe na planilha', () => {
    const buf = buildXls([{ CHAPA: '123', NOME: 'FULANO' }]);
    const linhas = parseCadastroPassageiros(buf);
    expect(linhas[0]?.cpf).toBeNull();
  });

  it('cpf fica null quando a célula está vazia', () => {
    const buf = buildXls([{ CHAPA: '123', NOME: 'FULANO', CPF: '' }]);
    const linhas = parseCadastroPassageiros(buf);
    expect(linhas[0]?.cpf).toBeNull();
  });
});
```

- [ ] **Step 2: Rodar o teste e confirmar que falha**

Run:

```bash
node "node_modules\vitest\vitest.mjs" run lib/transporte/cadastro-xls-parser.test.ts
```

Expected: FAIL — `linhas[0]?.cpf` é `undefined`, não `'12345678900'`/`null` (o campo `cpf` ainda não existe no retorno do parser).

- [ ] **Step 3: Implementar a extração de CPF no parser**

Em `lib/transporte/cadastro-xls-parser.ts`, faça as seguintes mudanças:

Adicione `cpf` na interface, logo após `nome`:

```ts
export interface LinhaCadastro {
  chapa: string;
  nome: string;
  cpf: string | null;
  rua: string | null;
  bairro: string | null;
  cidade: string | null;
  telefone1: string | null;
  telefone2: string | null;
  situacao: string | null;
}
```

Adicione a constante de chaves de coluna, logo após `SITUACAO_KEYS`:

```ts
const SITUACAO_KEYS = ['SITUACAO', 'SITUAÇÃO', 'STATUS'];
const CPF_KEYS = ['CPF'];
```

Adicione a função de extração de dígitos, logo após `asOptionalString`:

```ts
function asOptionalDigits(rowUpper: Map<string, unknown>, keys: string[]): string | null {
  const v = pick(rowUpper, keys);
  if (v == null) return null;
  const digits = String(v).replace(/\D/g, '');
  return digits || null;
}
```

Em `parseCadastroPassageiros`, adicione `cpf` no objeto retornado pelo `.map()`, logo após `nome`:

```ts
      return {
        chapa: asString(pick(upper, CHAPA_KEYS)),
        nome: asString(pick(upper, NOME_KEYS)),
        cpf: asOptionalDigits(upper, CPF_KEYS),
        rua: asOptionalString(upper, RUA_KEYS),
        bairro: asOptionalString(upper, BAIRRO_KEYS),
        cidade: asOptionalString(upper, CIDADE_KEYS),
        telefone1: asOptionalString(upper, TEL1_KEYS),
        telefone2: asOptionalString(upper, TEL2_KEYS),
        situacao: asOptionalString(upper, SITUACAO_KEYS),
      };
```

- [ ] **Step 4: Rodar o teste e confirmar que passa**

Run:

```bash
node "node_modules\vitest\vitest.mjs" run lib/transporte/cadastro-xls-parser.test.ts
```

Expected: PASS — 4 testes passando.

- [ ] **Step 5: Commit**

```bash
git add lib/transporte/cadastro-xls-parser.ts lib/transporte/cadastro-xls-parser.test.ts
git commit -m "feat(transporte): extrai CPF da planilha de cadastro de passageiros"
```

---

### Task 4: Persistência — gravar e ler CPF em `transporte_cadastro`

**Files:**
- Modify: `actions/transporte-cadastro.ts`

- [ ] **Step 1: Incluir `cpf` no upsert de `importarCadastro`**

Em `actions/transporte-cadastro.ts`, substitua o loop de insert:

```ts
  for (const l of linhas) {
    await db.execute(sql`
      INSERT INTO transporte_cadastro (filial_id, chapa, nome, rua, bairro, cidade, telefone1, telefone2, situacao, updated_at)
      VALUES (${filialId}, ${l.chapa}, ${l.nome}, ${l.rua}, ${l.bairro}, ${l.cidade}, ${l.telefone1}, ${l.telefone2}, ${l.situacao}, now())
      ON CONFLICT (filial_id, chapa)
      DO UPDATE SET nome = ${l.nome}, rua = ${l.rua}, bairro = ${l.bairro}, cidade = ${l.cidade},
        telefone1 = ${l.telefone1}, telefone2 = ${l.telefone2}, situacao = ${l.situacao}, updated_at = now()
    `);
  }
```

por:

```ts
  for (const l of linhas) {
    await db.execute(sql`
      INSERT INTO transporte_cadastro (filial_id, chapa, nome, cpf, rua, bairro, cidade, telefone1, telefone2, situacao, updated_at)
      VALUES (${filialId}, ${l.chapa}, ${l.nome}, ${l.cpf}, ${l.rua}, ${l.bairro}, ${l.cidade}, ${l.telefone1}, ${l.telefone2}, ${l.situacao}, now())
      ON CONFLICT (filial_id, chapa)
      DO UPDATE SET nome = ${l.nome}, cpf = ${l.cpf}, rua = ${l.rua}, bairro = ${l.bairro}, cidade = ${l.cidade},
        telefone1 = ${l.telefone1}, telefone2 = ${l.telefone2}, situacao = ${l.situacao}, updated_at = now()
    `);
  }
```

- [ ] **Step 2: Trazer e formatar `cpf` em `listarInformacoesPassageiros`**

No topo do arquivo, adicione o import do helper:

```ts
import { parseCadastroPassageiros } from '@/lib/transporte/cadastro-xls-parser';
import { formatCpf } from '@/lib/transporte/format';
```

No `select` de `listarInformacoesPassageiros`, adicione `cpf` logo após `chapa`:

```ts
  const rows = await db
    .select({
      id: schema.transportePassageiros.id,
      nome: schema.transportePassageiros.nome,
      chapa: schema.transportePassageiros.chapa,
      cpf: schema.transporteCadastro.cpf,
      rotaId: schema.transportePassageiros.rotaId,
      rotaNome: schema.transporteRotas.nome,
      rotaTurno: schema.transporteRotas.turno,
      rotaLugares: schema.transporteRotas.lugares,
      rua: schema.transporteCadastro.rua,
      bairro: schema.transporteCadastro.bairro,
      cidade: schema.transporteCadastro.cidade,
      telefone1: schema.transporteCadastro.telefone1,
      telefone2: schema.transporteCadastro.telefone2,
      situacao: schema.transporteCadastro.situacao,
    })
```

No `.map()` de retorno, adicione `cpf` formatado logo após `chapa`:

```ts
  return rows.map((r) => ({
    id: r.id,
    nome: r.nome,
    chapa: r.chapa,
    cpf: formatCpf(r.cpf),
    rotaNome: r.rotaNome,
    rotaTurno: r.rotaTurno,
    veiculo: r.rotaLugares != null ? `Van ${r.rotaLugares} lugares` : null,
    endereco: [r.rua, r.bairro, r.cidade].filter(Boolean).join(' - ') || null,
    telefone1: r.telefone1,
    telefone2: r.telefone2,
    situacao: r.situacao,
  }));
```

- [ ] **Step 3: Typecheck**

Run:

```bash
node "node_modules\typescript\bin\tsc" --noEmit -p tsconfig.json
```

Expected: sem erros.

- [ ] **Step 4: Commit**

```bash
git add actions/transporte-cadastro.ts
git commit -m "feat(transporte): grava e retorna CPF em transporte_cadastro"
```

---

### Task 5: Tela Informações — coluna CPF e busca

**Files:**
- Modify: `components/transporte/InformacoesPassageiros.tsx`

- [ ] **Step 1: Adicionar `cpf` ao tipo `Info`**

Substitua:

```ts
type Info = {
  id: string;
  nome: string;
  chapa: string | null;
  rotaNome: string | null;
  rotaTurno: string | null;
  veiculo: string | null;
  endereco: string | null;
  telefone1: string | null;
  telefone2: string | null;
  situacao: string | null;
};
```

por:

```ts
type Info = {
  id: string;
  nome: string;
  chapa: string | null;
  cpf: string | null;
  rotaNome: string | null;
  rotaTurno: string | null;
  veiculo: string | null;
  endereco: string | null;
  telefone1: string | null;
  telefone2: string | null;
  situacao: string | null;
};
```

- [ ] **Step 2: Incluir CPF na busca**

Substitua o bloco de filtro de busca:

```ts
    if (busca.trim()) {
      const q = busca.toLowerCase();
      result = result.filter(d =>
        d.nome.toLowerCase().includes(q) ||
        (d.chapa ?? '').toLowerCase().includes(q) ||
        (d.endereco ?? '').toLowerCase().includes(q)
      );
    }
```

por:

```ts
    if (busca.trim()) {
      const q = busca.toLowerCase();
      const qDigits = busca.replace(/\D/g, '');
      result = result.filter(d =>
        d.nome.toLowerCase().includes(q) ||
        (d.chapa ?? '').toLowerCase().includes(q) ||
        (d.endereco ?? '').toLowerCase().includes(q) ||
        (qDigits !== '' && (d.cpf ?? '').replace(/\D/g, '').includes(qDigits))
      );
    }
```

- [ ] **Step 3: Adicionar a coluna CPF na tabela**

No `<thead>`, substitua:

```tsx
                <th className="px-3 py-3 font-medium">Nome</th>
                <th className="px-3 py-3 font-medium">Rota</th>
```

por:

```tsx
                <th className="px-3 py-3 font-medium">Nome</th>
                <th className="px-3 py-3 font-medium">CPF</th>
                <th className="px-3 py-3 font-medium">Rota</th>
```

Ajuste o `colSpan` do estado vazio de `7` para `8`:

```tsx
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-conecta-muted text-sm">
                    Nenhum passageiro encontrado
                  </td>
                </tr>
```

No `<tbody>`, dentro do `.map(d => (...))`, substitua:

```tsx
                    <td className="px-3 py-2 font-medium text-conecta-primary whitespace-nowrap">{d.nome}</td>
                    <td className="px-3 py-2">
                      {d.rotaNome ? (
```

por:

```tsx
                    <td className="px-3 py-2 font-medium text-conecta-primary whitespace-nowrap">{d.nome}</td>
                    <td className="px-3 py-2 text-conecta-muted font-mono text-xs whitespace-nowrap">{d.cpf ?? '—'}</td>
                    <td className="px-3 py-2">
                      {d.rotaNome ? (
```

- [ ] **Step 4: Atualizar o texto de ajuda do import**

Substitua:

```tsx
      <p className="text-xs text-conecta-muted">
        Envie uma planilha (XLS/XLSX) com colunas <strong>Chapa</strong>, <strong>Nome</strong>,{' '}
        <strong>Rua</strong>, <strong>Bairro</strong>, <strong>Cidade</strong>, <strong>Telefone1</strong>,{' '}
        <strong>Telefone2</strong> e <strong>Situação</strong>. Os dados são atualizados por chapa —
        registros já cadastrados são sobrescritos, novos são adicionados.
      </p>
```

por:

```tsx
      <p className="text-xs text-conecta-muted">
        Envie uma planilha (XLS/XLSX) com colunas <strong>Chapa</strong>, <strong>Nome</strong>,{' '}
        <strong>CPF</strong>, <strong>Rua</strong>, <strong>Bairro</strong>, <strong>Cidade</strong>,{' '}
        <strong>Telefone1</strong>, <strong>Telefone2</strong> e <strong>Situação</strong>. Os dados são
        atualizados por chapa — registros já cadastrados são sobrescritos, novos são adicionados.
      </p>
```

- [ ] **Step 5: Typecheck**

Run:

```bash
node "node_modules\typescript\bin\tsc" --noEmit -p tsconfig.json
```

Expected: sem erros.

- [ ] **Step 6: Commit**

```bash
git add components/transporte/InformacoesPassageiros.tsx
git commit -m "feat(transporte): exibe e busca por CPF na tela Informações"
```

---

### Task 6: Tela Passageiros — número da rota na coluna Rota

**Files:**
- Modify: `components/transporte/PassageirosClient.tsx`

- [ ] **Step 1: Adicionar `ordem` ao tipo `Rota` e importar `formatRotaLabel`**

Substitua:

```ts
import {
  listarRotas, listarTodosPassageiros,
  alocarPassageiro, alocarMultiplos, desalocarPassageiro, removerPassageiro,
} from '@/actions/transporte';
```

por:

```ts
import {
  listarRotas, listarTodosPassageiros,
  alocarPassageiro, alocarMultiplos, desalocarPassageiro, removerPassageiro,
} from '@/actions/transporte';
import { formatRotaLabel } from '@/lib/transporte/format';
```

Substitua:

```ts
type Rota = { id: string; nome: string; turno: string; lugares: number; passageiros: number; ativo: boolean };
```

por:

```ts
type Rota = { id: string; nome: string; turno: string; lugares: number; ordem: number; passageiros: number; ativo: boolean };
```

- [ ] **Step 2: Usar `formatRotaLabel` no badge da coluna Rota**

Substitua:

```tsx
                      <td className="px-3 py-2">
                        {rota ? (
                          <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
                            <Bus className="h-3 w-3" />{rota.nome}
                            <span className="text-[10px] text-emerald-600">({rota.turno})</span>
                          </span>
                        ) : (
```

por:

```tsx
                      <td className="px-3 py-2">
                        {rota ? (
                          <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
                            <Bus className="h-3 w-3" />{formatRotaLabel(rota)}
                          </span>
                        ) : (
```

- [ ] **Step 3: Typecheck**

Run:

```bash
node "node_modules\typescript\bin\tsc" --noEmit -p tsconfig.json
```

Expected: sem erros. (`listarRotas` no backend já retorna todas as colunas de `transporte_rotas`, incluindo `ordem` — só faltava no tipo local do client, então nenhuma mudança de action é necessária aqui.)

- [ ] **Step 4: Commit**

```bash
git add components/transporte/PassageirosClient.tsx
git commit -m "feat(transporte): mostra número da rota (Nº) na coluna Rota de Passageiros"
```

---

### Task 7: Editar rota — modal na tela de admin

**Files:**
- Modify: `app/(app)/admin/config/transporte/RotasClient.tsx`

- [ ] **Step 1: Importar `atualizarRota` e o ícone `Pencil`**

Substitua:

```ts
import {
  listarRotas, criarRota, toggleRotaAtiva,
  listarPassageiros, removerPassageiro,
  listarNaoAlocados, alocarMultiplos, desalocarPassageiro,
} from '@/actions/transporte';
import { Plus, X, CheckCircle2, Power, Trash2, ChevronDown, ChevronUp, MapPin, ArrowRight, Users, AlertTriangle } from 'lucide-react';
```

por:

```ts
import {
  listarRotas, criarRota, atualizarRota, toggleRotaAtiva,
  listarPassageiros, removerPassageiro,
  listarNaoAlocados, alocarMultiplos, desalocarPassageiro,
} from '@/actions/transporte';
import { Plus, X, CheckCircle2, Power, Trash2, ChevronDown, ChevronUp, MapPin, ArrowRight, Users, AlertTriangle, Pencil } from 'lucide-react';
```

- [ ] **Step 2: Adicionar estado de edição no componente `RotasClient`**

Logo após a linha `const [expandedRota, setExpandedRota] = useState<string | null>(null);`, adicione:

```ts
  const [editingRota, setEditingRota] = useState<Rota | null>(null);
```

- [ ] **Step 3: Adicionar o botão "Editar" na coluna de Ações**

Substitua:

```tsx
                      <td className="px-4 py-2.5 text-right">
                        <div className="inline-flex gap-1.5">
                          <button type="button" onClick={() => toggleExpand(r.id)}
                            className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs border border-slate-200 hover:bg-slate-50 text-conecta-primary">
                            {expandedRota === r.id ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                            <Users className="h-3.5 w-3.5" />
                          </button>
                          <button type="button" onClick={() => handleToggleAtiva(r.id)} disabled={pending}
                            className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs border ${
                              r.ativo ? 'border-amber-200 hover:bg-amber-50 text-amber-700' : 'border-emerald-200 hover:bg-emerald-50 text-emerald-700'
                            }`}>
                            <Power className="h-3.5 w-3.5" /> {r.ativo ? 'Desativar' : 'Ativar'}
                          </button>
                        </div>
                      </td>
```

por:

```tsx
                      <td className="px-4 py-2.5 text-right">
                        <div className="inline-flex gap-1.5">
                          <button type="button" onClick={() => toggleExpand(r.id)}
                            className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs border border-slate-200 hover:bg-slate-50 text-conecta-primary">
                            {expandedRota === r.id ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                            <Users className="h-3.5 w-3.5" />
                          </button>
                          <button type="button" onClick={() => setEditingRota(r)}
                            className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs border border-conecta-primary/20 hover:bg-slate-50 text-conecta-primary">
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                          <button type="button" onClick={() => handleToggleAtiva(r.id)} disabled={pending}
                            className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs border ${
                              r.ativo ? 'border-amber-200 hover:bg-amber-50 text-amber-700' : 'border-emerald-200 hover:bg-emerald-50 text-emerald-700'
                            }`}>
                            <Power className="h-3.5 w-3.5" /> {r.ativo ? 'Desativar' : 'Ativar'}
                          </button>
                        </div>
                      </td>
```

- [ ] **Step 4: Renderizar o modal no final do componente**

O `return` de `RotasClient` termina com:

```tsx
        </div>
      )}
    </div>
  );
}
```

(fecha a tabela de rotas — o `)}` fecha o `rotas.length === 0 ? (...) : (...)` e o `</div>` seguinte fecha a `<div className="p-6 space-y-4">` raiz). Substitua esse trecho final por:

```tsx
        </div>
      )}

      {editingRota && (
        <EditRotaModal
          rota={editingRota}
          onClose={() => setEditingRota(null)}
          onSaved={() => { setEditingRota(null); carregarRotas(); }}
        />
      )}
    </div>
  );
}
```

- [ ] **Step 5: Adicionar o componente `EditRotaModal` no final do arquivo**

Após o fechamento da função `RotasClient` (depois do `}` final que você acabou de editar no Step 4), adicione:

```tsx

function EditRotaModal({
  rota,
  onClose,
  onSaved,
}: {
  rota: Rota;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [nome, setNome] = useState(rota.nome);
  const [turno, setTurno] = useState(rota.turno);
  const [lugares, setLugares] = useState(rota.lugares);
  const [ordem, setOrdem] = useState(rota.ordem);
  const [pending, start] = useTransition();

  const handleSalvar = () => {
    if (!nome.trim()) { toast.error('Nome obrigatório'); return; }
    start(async () => {
      try {
        await atualizarRota(rota.id, { nome, turno, lugares, ordem });
        toast.success('Rota atualizada');
        onSaved();
      } catch (e) { toast.error(e instanceof Error ? e.message : 'Erro'); }
    });
  };

  return (
    <div className="fixed inset-0 z-40 grid place-items-center bg-conecta-primary/40 px-4">
      <div className="bg-white rounded-xl border border-conecta-accent/30 p-4 space-y-3 w-full max-w-lg"
        style={{ boxShadow: '0 12px 40px -10px rgba(13,43,107,0.3)' }}>
        <div className="flex items-center justify-between">
          <h3 className="font-display text-sm font-bold text-conecta-primary">Editar rota</h3>
          <button type="button" onClick={onClose}><X className="h-4 w-4 text-conecta-muted" /></button>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div>
            <label className="block text-xs font-medium text-conecta-primary mb-1">Nome</label>
            <input value={nome} onChange={e => setNome(e.target.value)}
              className="h-9 w-full rounded-md border border-slate-200 bg-white text-sm px-3" />
          </div>
          <div>
            <label className="block text-xs font-medium text-conecta-primary mb-1">Turno</label>
            <select value={turno} onChange={e => setTurno(e.target.value)}
              className="h-9 w-full rounded-md border border-slate-200 bg-white text-sm px-3">
              <option>1º Turno</option>
              <option>2º Turno</option>
              <option>3º Turno</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-conecta-primary mb-1">Lugares</label>
            <input type="number" min={1} value={lugares} onChange={e => setLugares(Number(e.target.value))}
              className="h-9 w-full rounded-md border border-slate-200 bg-white text-sm px-3" />
          </div>
          <div>
            <label className="block text-xs font-medium text-conecta-primary mb-1">Ordem</label>
            <input type="number" min={1} value={ordem} onChange={e => setOrdem(Number(e.target.value))}
              className="h-9 w-full rounded-md border border-slate-200 bg-white text-sm px-3" />
          </div>
        </div>
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} disabled={pending}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium border border-slate-200 text-conecta-muted hover:bg-slate-50 disabled:opacity-50">
            Cancelar
          </button>
          <button type="button" onClick={handleSalvar} disabled={pending}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium bg-conecta-accent text-white hover:bg-conecta-accent/90 disabled:opacity-50">
            <CheckCircle2 className="h-4 w-4" /> {pending ? 'Salvando...' : 'Salvar'}
          </button>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 6: Typecheck**

Run:

```bash
node "node_modules\typescript\bin\tsc" --noEmit -p tsconfig.json
```

Expected: sem erros.

- [ ] **Step 7: Commit**

```bash
git add "app/(app)/admin/config/transporte/RotasClient.tsx"
git commit -m "feat(transporte): adiciona edição de rota (modal) na tela de admin"
```

---

### Task 8: Verificação final

**Files:** nenhum (só validação)

- [ ] **Step 1: Rodar toda a suíte de testes**

Run:

```bash
node "node_modules\vitest\vitest.mjs" run
```

Expected: todos os testes passam, incluindo os novos de `lib/transporte/format.test.ts` e `lib/transporte/cadastro-xls-parser.test.ts`.

- [ ] **Step 2: Typecheck completo**

Run:

```bash
node "node_modules\typescript\bin\tsc" --noEmit -p tsconfig.json
```

Expected: sem erros.

- [ ] **Step 3: Verificação manual no preview**

Usar o dev server já rodando (`preview_start`/tabs do Browser pane) para conferir, autenticado como admin:

1. `/admin/config/transporte` — clicar em "Editar" numa rota, mudar nome/turno/lugares/ordem, salvar, confirmar que a tabela atualiza.
2. `/transporte/passageiros` — confirmar que a coluna Rota mostra `Nº{ordem} - Nome (Turno)`.
3. `/transporte/informacoes` — importar uma planilha de teste com coluna `CPF` (pode ser um XLS pequeno criado na hora, com `CHAPA`, `NOME`, `CPF` de 2-3 linhas) e confirmar que a coluna CPF aparece formatada e que buscar por um trecho do CPF filtra a lista.

- [ ] **Step 4: Commit final (se houver ajustes da verificação manual)**

Se a verificação manual não pedir nenhum ajuste, não há o que commitar neste passo — os commits de cada task já cobrem tudo.
