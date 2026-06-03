# Avaliação de Desempenho — Design

**Data:** 2026-06-03
**Autor:** Juliano + Claude
**Status:** Aprovado (brainstorming)
**Próximo passo:** Plano de implementação (writing-plans)

---

## 1. Contexto e objetivo

Hoje o sistema RH G&G (Next.js 15 + Supabase + Drizzle) atende **Recrutamento & Seleção** (entrevistas, banco de talentos, agenda, painel). A página `/avaliacao` existe como placeholder descrevendo um futuro módulo de **Avaliação de Desempenho de Lideranças**.

O usuário possui uma SPA HTML legada (`Avaliação de desempenho.txt`) com o fluxo completo desse módulo: 6 competências × ~5–6 fatores = **31 fatores** avaliados em escala 1–5, geração de laudo, histórico filtrável e relatórios. O objetivo é **reescrever** esse módulo integrado ao sistema atual — mesma identidade visual (perlog navy/orange, Tailwind, componentes `components/ui/*`), mesma arquitetura (Server Components + Server Actions + Drizzle), mesma postura de segurança (sessão por filial/admin, RLS, validação Zod, log de acessos).

O código legado é **referência de fluxo apenas** — nenhuma linha será reaproveitada.

## 2. Escopo

### Dentro do escopo

- CRUD de **pessoas** (colaboradores e/ou gestores) com import CSV
- CRUD de **competências** e **fatores** configuráveis em `/admin/config`
- Wizard de **nova avaliação** em 3 passos
- **Histórico** filtrável com cálculo de evolução
- **Detalhe + laudo + impressão** de avaliação individual
- **Relatórios** agregados (filial / competência / ranking)
- Dashboard do módulo em `/avaliacao` substituindo o placeholder atual
- Seed inicial das 6 competências e 31 fatores idênticos à referência

### Fora do escopo (YAGNI — fica para evolução)

- Auto-avaliação do colaborador
- Ciclos formais (trimestre/semestre/anual) com prazos
- Notificações por e-mail ou WhatsApp
- Comparativo lado a lado de avaliações
- Edição de avaliação após salva (imutável; só PDI é editável)
- Exclusão de avaliação via UI (apenas SQL direto, se necessário)
- API REST pública
- App mobile dedicado (Tailwind responsivo basta)
- Pesos diferentes por competência no cálculo (schema permite, lógica usa 1)

## 3. Arquitetura

Segue o padrão do projeto:

- **Frontend:** Next.js 15 App Router, Server Components por padrão, Client Components apenas para interação. Tailwind + `components/ui/*` + paleta perlog. Zero CSS solto novo. Sem FontAwesome/CDN.
- **Server:** Server Actions com `requireSession()`, validação Zod, transações Drizzle, log em `log_acessos`, rate limiting via tabela `rate_limits` existente.
- **DB:** Postgres (Supabase). Drizzle migrations. RLS habilitada (cinto de segurança) — acesso real via `service_role` no servidor, autorização em código.

## 4. Modelo de dados

Seis tabelas novas em `db/schema.ts`:

### 4.1 `pessoas`

Tabela única que cobre colaboradores e gestores. Uma pessoa pode ser ambos.

| coluna | tipo | obs |
|---|---|---|
| `id` | uuid PK | `gen_random_uuid()` |
| `matricula` | text UNIQUE NOT NULL | ex: `GG47311` |
| `nome` | text NOT NULL | |
| `funcao` | text | |
| `filial_id` | uuid FK → `filiais(id)` | |
| `regional` | text | `MT`, `MS`, `AGP`... |
| `is_colaborador` | bool NOT NULL DEFAULT true | |
| `is_gestor` | bool NOT NULL DEFAULT false | |
| `ativo` | bool NOT NULL DEFAULT true | soft delete |
| `created_at` | timestamptz | |

Índices: `(filial_id)`, `(matricula)`.

### 4.2 `competencias`

| coluna | tipo | obs |
|---|---|---|
| `id` | uuid PK | |
| `nome` | text NOT NULL UNIQUE | ex: `COMUNICAÇÃO E INFLUÊNCIA` |
| `descricao` | text | |
| `ordem` | int NOT NULL DEFAULT 0 | |
| `peso` | numeric(4,2) NOT NULL DEFAULT 1 | reservado para evolução futura |
| `ativo` | bool NOT NULL DEFAULT true | |
| `created_at` | timestamptz | |

### 4.3 `fatores_avaliacao`

| coluna | tipo | obs |
|---|---|---|
| `id` | uuid PK | |
| `competencia_id` | uuid FK → `competencias(id)` ON DELETE CASCADE | |
| `ordem` | int NOT NULL | |
| `texto` | text NOT NULL | enunciado avaliado |
| `escala_max` | int NOT NULL DEFAULT 5 | |
| `ativo` | bool NOT NULL DEFAULT true | |
| `created_at` | timestamptz | |

Índice: `(competencia_id, ordem)`.

### 4.4 `avaliacoes_desempenho`

Cabeçalho da avaliação.

| coluna | tipo | obs |
|---|---|---|
| `id` | uuid PK | |
| `filial_id` | uuid FK → `filiais(id)` NOT NULL | filial do avaliado (RLS) |
| `avaliado_id` | uuid FK → `pessoas(id)` NOT NULL | |
| `gestor_id` | uuid FK → `pessoas(id)` NOT NULL | |
| `data_avaliacao` | date NOT NULL DEFAULT current_date | |
| `pontuacao_final` | numeric(4,2) | snapshot 0.00–5.00 |
| `classificacao` | text | snapshot `EXCELENTE`/`BOM`/`REGULAR`/`PRECISA MELHORAR` |
| `pontos_fortes` | text | |
| `oportunidades` | text | |
| `comentarios` | text | |
| `plano_desenvolvimento` | text | editável depois |
| `criada_por` | text | identificação da sessão |
| `created_at` | timestamptz | |
| `updated_at` | timestamptz | |

Índices: `(filial_id, data_avaliacao)`, `(avaliado_id, data_avaliacao)`.
Unique parcial: `(avaliado_id, gestor_id, data_avaliacao)` — evita duplicidade no mesmo dia.

### 4.5 `avaliacoes_detalhes`

Nota por fator (snapshot).

| coluna | tipo | obs |
|---|---|---|
| `id` | uuid PK | |
| `avaliacao_id` | uuid FK → `avaliacoes_desempenho(id)` ON DELETE CASCADE | |
| `fator_id` | uuid FK → `fatores_avaliacao(id)` ON DELETE RESTRICT | |
| `competencia_id` | uuid FK → `competencias(id)` | denormalizado |
| `nota` | int NOT NULL CHECK (nota BETWEEN 1 AND 5) | |

Unique: `(avaliacao_id, fator_id)`. Índice: `(avaliacao_id)`.

### 4.6 Auditoria

Reaproveita `log_acessos` (já existe). Ações registradas:
- `avaliacao.criar`
- `avaliacao.atualizar_pdi`
- `avaliacao.config.competencias.update`
- `avaliacao.config.fatores.update`
- `avaliacao.config.pessoas.import`

### 4.7 Decisões-chave do modelo

- `pontuacao_final` e `classificacao` são **snapshot persistido** — mudar pesos no futuro não altera avaliações passadas.
- `competencia_id` denormalizado em `avaliacoes_detalhes` mantém relatório por competência funcionando mesmo se um fator for desativado.
- Evolução entre avaliações é **calculada por query** (`LAG()`), sem coluna extra.
- Avaliação é **imutável** após salva — só o `plano_desenvolvimento` é editável.

## 5. Fluxos

### 5.1 Nova avaliação — `/avaliacao/nova`

1. Server carrega competências + fatores ativos e pessoas da filial do usuário (admin: todas).
2. Wizard 3 passos (padrão `EntrevistaWizard`):
   - **Identificação:** matrícula do avaliado (autocomplete em `pessoas` filtrando `is_colaborador=true` + filial) e matrícula do gestor (`is_gestor=true`, sem restrição de filial).
   - **Avaliação:** 6 competências × fatores, cada fator com radio 1–5. Barra de progresso `X de N fatores`. Botão "Calcular" só ativa quando 100%.
   - **Feedback:** textareas + card de resultado + **Salvar**.
3. Server Action `salvarAvaliacao`:
   - Valida com Zod
   - Verifica que filial do avaliado = filial do usuário (perfil filial)
   - Verifica que `notas` cobre 100% dos fatores ativos
   - Calcula pontuação e classificação **no servidor**
   - Insere `avaliacoes_desempenho` + N `avaliacoes_detalhes` em transação
   - Registra em `log_acessos`
4. Redireciona para `/avaliacao/[id]`.

### 5.2 Histórico — `/avaliacao/historico`

- Tabela paginada server-side. Filtros: classificação, filial (admin), data início/fim, nome avaliado, nome gestor, evolução.
- Stats no topo via SQL agregado: total, média, excelentes, precisam melhorar.
- Coluna "Evolução" via `LAG(pontuacao_final) OVER (PARTITION BY avaliado_id ORDER BY data_avaliacao)`:
  - `primeira` se sem anterior
  - `positiva` se delta ≥ +0.3
  - `negativa` se delta ≤ -0.3
  - `estavel` caso contrário

### 5.3 Detalhe e laudo — `/avaliacao/[id]` e `/avaliacao/[id]/imprimir`

Espelha o padrão de `entrevista/[id]`:
- Cabeçalho (avaliado, gestor, data, filial, classificação badge)
- Gráfico radar por competência (Recharts)
- Tabela fator-a-fator
- Textareas de feedback
- Campo editável "Plano de Desenvolvimento" (salva via server action)
- Botão "Imprimir laudo" → rota `/imprimir` com print CSS isolando o conteúdo

### 5.4 Relatórios — `/avaliacao/relatorios`

3 abas:
- **Por filial:** média e contagem por filial
- **Por competência:** média por competência ao longo do tempo
- **Ranking:** top/bottom avaliados

Tudo via queries SQL agregadas — nada em memória.

### 5.5 Dashboard — `/avaliacao`

Substitui o placeholder. Cards: total de avaliações, média geral, total de avaliados, total de gestores; últimas 5 avaliações; atalhos para Nova/Histórico/Relatórios.

### 5.6 Admin — configuração

- `/admin/config/pessoas` — CRUD + filtros (filial, tipo, ativo) + import CSV (matrícula, nome, função, filial, regional, tipo) com validação linha-a-linha e preview antes de gravar.
- `/admin/config/competencias` — CRUD aninhado: lista de competências, cada uma com seus fatores editáveis.

## 6. Regras de negócio e validações

| Regra | Onde |
|---|---|
| Avaliado deve ter `is_colaborador=true` | Zod no server action |
| Gestor deve ter `is_gestor=true` | Zod no server action |
| Avaliado ≠ gestor | Zod refine |
| Filial do avaliado = filial do usuário (perfil filial) | Server action |
| Todos os fatores ativos preenchidos | Server action |
| Sem 2 avaliações no mesmo dia (mesmo avaliado+gestor) | Unique parcial no banco |
| Pontuação calculada no servidor (média aritmética) | `lib/avaliacao/calculos.ts` |
| Data de avaliação não pode ser futura | Zod |

### Classificação

| Faixa | Classe |
|---|---|
| 4.5–5.0 | EXCELENTE |
| 3.5–4.49 | BOM |
| 2.5–3.49 | REGULAR |
| 1.0–2.49 | PRECISA MELHORAR |

## 7. UI e componentes

**Reaproveitar:** `TopBar`, `Sidebar`, `Card`, `Button`, `Input`, `Textarea`, `Select`, `Label`, `Alert`, `Skeleton`, `EntrevistaWizard` (padrão de wizard), `HistoricoTable` (padrão de filtro/paginação), `entrevista/[id]/imprimir` (padrão de print).

**Paleta de classificação** (Tailwind tokens existentes):
- EXCELENTE → `emerald-600` / `emerald-50`
- BOM → `sky-600` / `sky-50`
- REGULAR → `amber-600` / `amber-50`
- PRECISA MELHORAR → `rose-600` / `rose-50`

**Estrutura de arquivos:**

```
app/(app)/avaliacao/
├── page.tsx                       Dashboard (substitui placeholder)
├── nova/
│   ├── page.tsx
│   └── NovaAvaliacaoWizard.tsx
├── historico/
│   ├── page.tsx
│   └── HistoricoTable.tsx
├── [id]/
│   ├── page.tsx
│   ├── DetalheAvaliacao.tsx
│   └── imprimir/
│       └── page.tsx
└── relatorios/
    ├── page.tsx
    └── RelatoriosCharts.tsx

app/(app)/admin/config/
├── competencias/
│   ├── page.tsx
│   └── FatoresEditor.tsx
└── pessoas/
    ├── page.tsx
    ├── PessoasTable.tsx
    └── ImportarCsv.tsx

components/avaliacao/
├── CompetenciaCard.tsx
├── FatorRatingRow.tsx
├── ProgressoAvaliacao.tsx
├── ResultadoCard.tsx
├── ClassificacaoBadge.tsx
├── EvolucaoIndicator.tsx
└── RadarCompetencias.tsx

actions/
├── avaliacao.ts                   salvarAvaliacao, atualizarPlanoDesenvolvimento, listarHistorico, agregarRelatorio
└── avaliacao-admin.ts             CRUD competências/fatores/pessoas + importCsv

lib/avaliacao/
├── calculos.ts                    pontuação, classificação, evolução (puro, testável)
├── validators.ts                  Zod schemas
└── seed-competencias.ts           dados da referência (6 + 31)
```

**Sidebar:** adicionar entrada em `FILIAL_NAV` e `ADMIN_NAV`:

```ts
{ href: '/avaliacao', label: 'Avaliação de desempenho', icon: Target }
```

**Acessibilidade:** radios 1-5 em `role="radiogroup"` com `aria-label`, navegação por seta. Barra com `role="progressbar"`. Print CSS isola conteúdo, esconde sidebar/topbar/botões.

## 8. Segurança

### Camadas de defesa

1. **Sessão:** `requireSession()` em toda page e action
2. **Autorização em código:** server actions checam `session.perfil` e `session.filialId`
3. **Drizzle:** cláusulas `where filial_id = session.filialId` quando perfil = filial
4. **RLS:** habilitada como cinto de segurança (acesso real via `service_role`)
5. **Constraints:** UNIQUE, CHECK, FK ON DELETE adequados

### Validação (Zod)

```ts
NovaAvaliacaoSchema = z.object({
  avaliado_id: z.string().uuid(),
  gestor_id:   z.string().uuid(),
  data_avaliacao: z.coerce.date().max(new Date(), 'Não pode ser futura'),
  notas: z.array(z.object({
    fator_id: z.string().uuid(),
    nota:     z.number().int().min(1).max(5),
  })).min(1),
  pontos_fortes: z.string().max(2000).optional(),
  oportunidades: z.string().max(2000).optional(),
  comentarios:   z.string().max(2000).optional(),
}).refine(d => d.avaliado_id !== d.gestor_id, {
  message: 'Avaliado e gestor não podem ser a mesma pessoa',
})
```

### Rate limiting

Reaproveita `rate_limits`: chave `avaliacao.criar:<filialId>`, janela 10 min, limite 30.

### LGPD

- Acesso restrito por filial
- Sem export anônimo
- Log de toda alteração em `log_acessos`
- `ativo=false` é soft delete; avaliações ficam preservadas
- `/imprimir` exige sessão

## 9. Plano de implementação (ordem)

| # | Fase | Entregável |
|---|---|---|
| 1 | Schema + migration + seed | 6 tabelas, migration Drizzle, seed das 6 competências / 31 fatores |
| 2 | Lib pura | `calculos.ts` + `validators.ts` com testes unitários |
| 3 | Admin pessoas | `/admin/config/pessoas` (CRUD + CSV) |
| 4 | Admin competências | `/admin/config/competencias` (CRUD aninhado) |
| 5 | Nova avaliação | `/avaliacao/nova` (wizard) + `salvarAvaliacao` |
| 6 | Detalhe + laudo | `/avaliacao/[id]` + `/imprimir` + PDI |
| 7 | Histórico | `/avaliacao/historico` com filtros e evolução |
| 8 | Dashboard | `/avaliacao` substitui placeholder |
| 9 | Relatórios | `/avaliacao/relatorios` com 3 abas |
| 10 | Sidebar | entrada em FILIAL_NAV + ADMIN_NAV |
| 11 | Polish | print CSS, vazios, loadings, erros |

## 10. Definition of Done

- [ ] Migration aplica sem erro e seed popula 6 competências + 31 fatores
- [ ] Filial só vê/edita avaliações da própria filial; admin vê tudo
- [ ] Wizard bloqueia salvar até 100%; calcula no servidor
- [ ] Pontuação e classificação congeladas após salvar (snapshot)
- [ ] Histórico paginado server-side; evolução via `LAG()`
- [ ] Laudo imprime corretamente em Chrome
- [ ] Import CSV valida cabeçalho e mostra erros linha-a-linha
- [ ] Toda escrita registrada em `log_acessos`
- [ ] Rate limit ativo em `avaliacao.criar`
- [ ] Zero CSS solto novo; usa Tailwind + componentes existentes
- [ ] `tsc --noEmit` e ESLint limpos
- [ ] Testes unitários cobrindo `calculos.ts`

## 11. Riscos

| Risco | Mitigação |
|---|---|
| Import CSV mal formatado | Validação linha-a-linha com preview e rollback |
| Desativar fator quebra histórico | FK ON DELETE RESTRICT + `competencia_id` denormalizado |
| Mudança de escala (1–5 → 1–10) | `escala_max` por fator no schema; cálculo atual assume 5 (documentar) |
| Gestor em filial diferente | Sem restrição de filial na busca de gestor |

## 12. Seed inicial — competências e fatores

Reproduz exatamente o conteúdo do código de referência:

1. **COMUNICAÇÃO E INFLUÊNCIA** (5 fatores)
2. **DISCIPLINA DE EXECUÇÃO** (5 fatores)
3. **FOCO EM RESULTADOS** (5 fatores)
4. **FOCO NO CLIENTE/TUTOR** (5 fatores)
5. **LIDERANÇA E GESTÃO DE PESSOAS** (6 fatores)
6. **POSTURA DE DONO** (5 fatores)

**Total: 31 fatores.** Textos exatos em `lib/avaliacao/seed-competencias.ts`.
