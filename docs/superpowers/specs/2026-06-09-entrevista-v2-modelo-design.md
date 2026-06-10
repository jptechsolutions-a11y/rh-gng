# Entrevista v2 — Alinhamento ao Modelo G&G

Data: 2026-06-09
Branch: v3

## Objetivo

Refatorar o módulo de entrevistas para seguir o "Modelo Entrevista" oficial do
G&G (DOCX na área de trabalho), substituindo o sistema atual de notas numéricas
por comportamentos Sim/Parcial/Não, simplificando os passos de identificação e
perfil, e adicionando uma página "Guia Rápido" de interpretação das respostas
para apoiar entrevistadores.

## Escopo

### Inclui
- Mudança de schema (drop colunas obsoletas, add `parecer`, drop tabela
  `criterios`).
- Seed das 6 perguntas padrão do modelo em `roteiro` com `cargo='TODOS'` e novo
  `tipo='multi'`.
- Reescrita dos 4 steps do wizard.
- Página nova `/guia-rapido` no menu lateral.
- Atualização da exibição em detalhe / imprimir / DOCX / painel / histórico /
  banco-talentos / comparar / candidato / busca global.
- Limpeza do banco de dados de produção (entrevistas + log_historico + roteiro;
  drop criterios).

### Fora de escopo
- Mudanças no módulo de Escuta G&G.
- Mudanças no módulo de Avaliação de Desempenho.
- Migração de dados antigos (o usuário confirmou TRUNCATE).

## Mudanças no banco

Via Supabase MCP (`apply_migration`).

### Tabela `entrevistas`

Remover colunas:
- `telefone`
- `email`
- `cidade`
- `escolaridade`
- `possui_cnh`
- `pretensao_salarial`

Adicionar coluna:
- `parecer text` — valores admitidos no app: `Aprovado`, `Banco de talentos`,
  `Reavaliar em outra oportunidade`, `Não aderente à vaga`. Null = ainda não
  registrado.

Coluna `notas_criterios` (JSONB) — semântica alterada (sem mudar o tipo):
- Antes: `{ [criterioId: uuid]: number 1..5 }`
- Agora: `{ [comportamentoSlug: string]: 'sim' | 'parcial' | 'nao' }`

Onde `comportamentoSlug` é um dos 9 fixos:
`comunicacao`, `interesse_vaga`, `postura`, `pontualidade`, `clareza`,
`estabilidade_emocional`, `energia`, `comprometimento`, `equipe`.

### Tabela `criterios`

`DROP TABLE criterios CASCADE`.

A página `/admin/config/criterios` será removida.

### Tabela `roteiro`

`TRUNCATE roteiro` e reseed com 6 linhas (`cargo='TODOS'`, `ativo=true`, ordem
1..6):

| ordem | tipo | pergunta | opcoes |
|-------|------|----------|--------|
| 1 | multi | O que mais chamou sua atenção nesta oportunidade? | Salário e benefícios, Estabilidade, Crescimento profissional, Horário / escala, Proximidade da residência, Primeira oportunidade, Interesse pela área logística, Necessidade imediata de trabalho |
| 2 | multi | Quais situações fazem você perder o interesse ou decidir sair de uma empresa? | Falta de reconhecimento, Problemas com liderança, Escala / horário, Distância / transporte, Salário, Ambiente de trabalho, Falta de crescimento, Excesso de pressão, Conflitos em equipe |
| 3 | multi | Conte uma situação difícil que você viveu no trabalho e como resolveu | Demonstrou autonomia, Precisou de apoio para resolver, Fugiu da responsabilidade, Demonstrou equilíbrio emocional, Trabalhou em equipe, Demonstrou iniciativa, Boa comunicação, Dificuldade para lidar com pressão |
| 4 | multi | Quais são seus planos profissionais para os próximos anos? | Deseja crescer na empresa, Interesse em desenvolver carreira logística, Busca estabilidade, Interesse em liderança futura, Demonstra foco profissional, Objetivos compatíveis com a vaga, Demonstra intenção de saída rápida, Interesse em outra área totalmente diferente |
| 5 | multi | Você possui disponibilidade para horas extras, troca de turno ou trabalho aos sábados quando necessário? | Sim, Não, Às vezes |
| 6 | multi | Já trabalhou com metas, produtividade ou rotina operacional intensa? | Possui experiência operacional, Aceita rotina dinâmica, Possui restrição de horário, Possui dificuldade com deslocamento, Tem flexibilidade de escala, Já atuou em CD / logística, Demonstra resistência à rotina operacional |

Todas as 6 sempre incluem implicitamente a opção "Outros: ___" no render —
texto livre adicional ao multi-select.

### Tabela `log_historico`

Sem alteração de schema. `TRUNCATE` em cascata pelo CASCADE de `entrevistas`.

## Mudanças no schema Drizzle (`db/schema.ts`)

- Remover campos `telefone`, `email`, `cidade`, `escolaridade`, `possuiCnh`,
  `pretensaoSalarial` da definição `entrevistas`.
- Adicionar `parecer: text('parecer')` em `entrevistas`.
- Remover export `criterios`.

## Validators (`lib/validators.ts`)

- Remover de `entrevistaInputSchema`: `telefone`, `email`, `cidade`,
  `escolaridade`, `possuiCnh`, `pretensaoSalarial`.
- Adicionar `parecer: z.enum(['Aprovado', 'Banco de talentos', 'Reavaliar em outra oportunidade', 'Não aderente à vaga']).nullable().optional()`.
- Alterar `respostasRoteiro` para aceitar arrays:
  `z.record(z.string(), z.union([z.string(), z.number(), z.boolean(), z.array(z.string())]))`.
- Alterar `notasCriterios` para:
  `z.record(z.string(), z.enum(['sim','parcial','nao']))`.
- Permanecem inalterados: `cpf`, `nome`, `dataNasc`, `cargoPretendido`,
  `experiencias`, `disponibilidadeTurnos`, `observacoes`, `status`,
  `motivoDecisao`, `dataRetorno`, `recrutador`, `gestorAprovador`,
  `aprovadoPeloGg`, `consentimentoLgpd`.
- Os campos `rg`, `linkedin`, `temFilhos`, `veiculoProprio`,
  `disponibilidadeInicio`, `disponibilidadeViagem`, `pcd`, `pcdTipo`,
  `indicacao`, `indicadoPorNome`, `indicadoPorCargo`, `fumante`,
  `jaTrabalhouGrupo`, `jaTrabalhouQuando`, `proximaEtapa`, `notaGeral` ficam no
  schema do banco mas saem do `entrevistaInputSchema` por não serem mais
  coletados nesta versão (mantém compatibilidade caso voltem depois).

## Wizard (`components/wizard/`)

### Step 1 — Identificação

Campos visíveis: Nome completo, CPF, Data de nascimento, Entrevistador(a).

Comportamento de auto-fill (novo):
- `CpfDuplicateAlert` continua mostrando alertas de duplicata.
- Adicionar segundo botão "Prosseguir e preencher dados" ao lado do
  "Prosseguir mesmo assim".
- Ao clicar, pega a entrevista mais recente daquele CPF na filial e seta
  `setValue('nome', ...)` e `setValue('dataNasc', ...)`. Em seguida `setDismissed(true)`.

### Step 2 — Perfil

Campos: Cargo pretendido (select), Preferência de turno (multi com ícones),
Experiências profissionais (textarea).

Remover todo o resto do step. O `TurnoMultiSelect` existente é reaproveitado.

### Step 3 — Roteiro

- Render do tipo `multi`: lista de checkboxes a partir de `q.opcoes`. O estado
  em `respostasRoteiro[q.id]` é `string[]`. Inclui sempre um campo "Outros"
  com `<input type="text">` que, se preenchido, é concatenado como elemento
  final do array com prefixo `Outros: `.
- Outros tipos (`texto`, `sim-nao`, `select`, `escala`) continuam funcionando
  para perguntas personalizadas que o admin adicionar.

### Step 4 — Comportamento & Parecer

Substitui o atual Step4Avaliacao. Estrutura:

1. **Comportamentos** (9 itens fixos): tabela com 3 colunas radio (Sim /
   Parcial / Não). Persistido em `notasCriterios` com a chave-slug do
   comportamento.
2. **Parecer final** (4 opções radio).
3. **Status final** (select) + Data de retorno (date).
4. Checkbox "Avaliado pelo G&G".
5. Se `status ∈ {Aprovado, Reprovado}`: input "Gestor que aprovou/reprovou"
   obrigatório.
6. Motivo da decisão (textarea).
7. Observações gerais (textarea).
8. Consentimento LGPD (checkbox obrigatório).

### `EntrevistaWizard.tsx`

- Renomear o último step de "Avaliação" para "Comportamento" (label do
  stepper) e ícone `ClipboardCheck`.
- Mantém 4 steps. Lógica de validação por step segue igual.

## Server actions (`actions/entrevistas.ts`)

- `salvarEntrevista`: remover do `baseSemConsentimento` os 6 campos dropados.
  Adicionar `parecer: parsed.parecer ?? null`.
- `listarEntrevistasFilialSlim`: remover `email`, `telefone`, `cidade` da
  projeção. Adicionar `parecer`.
- `listarPorCargoFilial`: remover `cidade`, `escolaridade`, `possuiCnh`,
  `pretensaoSalarial`. Adicionar `parecer`.
- `buscaGlobal`: remover `email` da projeção e da cláusula `or`.

## Páginas / componentes que exibem os campos removidos

Auditar e remover/refatorar:
- `app/(app)/entrevista/[id]/page.tsx`
- `app/(app)/entrevista/[id]/imprimir/page.tsx`
- `app/(app)/entrevista/[id]/imprimir/PrintToolbar.tsx`
- `app/api/entrevista/[id]/docx/route.ts`
- `app/(app)/painel/page.tsx` + `PainelClient.tsx`
- `app/(app)/historico/page.tsx` + `EditarDecisaoButton.tsx`
- `app/(app)/banco-talentos/page.tsx` + `BancoTalentosClient.tsx`
- `app/(app)/comparar/page.tsx`
- `app/(app)/candidato/[cpf]/page.tsx`
- `app/(app)/admin/relatorios/page.tsx`
- `app/(app)/admin/busca/BuscaGlobalClient.tsx`
- `app/(app)/admin/config/page.tsx`
- `app/(app)/admin/config/roteiro/page.tsx` (adicionar suporte ao tipo `multi`
  na criação/edição)
- `app/api/export/csv/route.ts`
- `app/api/historico/export/route.ts`

Em cada um: remover colunas/labels dos campos dropados. Onde fizer sentido,
adicionar `parecer` ao lado de `status`.

Página `app/(app)/admin/config/criterios` (existente) → remover diretório
inteiro. Tirar link de `admin/config/page.tsx`.

## Página nova: `/guia-rapido`

Rota: `app/(app)/guia-rapido/page.tsx`. Server component que carrega sessão e
renderiza conteúdo estático.

Layout: TopBar branca padrão Conecta (titulo "Guia Rápido", subtítulo
"Interpretação das respostas da entrevista") + 4 ConectaCards em grid
responsivo (`grid-cols-1 lg:grid-cols-2`).

Cards (conteúdo bullet-a-bullet do DOCX):

1. **Sinais positivos** — ícone `CheckCircle2` verde.
   - Demonstra interesse em crescimento interno.
   - Busca estabilidade e desenvolvimento.
   - Relata resolução de problemas com autonomia.
   - Demonstra flexibilidade operacional.
   - Possui histórico de permanência em empregos anteriores.
   - Fala sobre trabalho em equipe e responsabilidade.

2. **Pontos de atenção** — ícone `AlertTriangle` âmbar.
   - Demonstra interesse apenas temporário.
   - Objetivos totalmente desconectados da vaga.
   - Forte resistência a horários, pressão ou rotina operacional.
   - Relatos frequentes de conflitos com liderança.
   - Mudanças constantes de emprego sem justificativa consistente.
   - Dificuldade para explicar experiências anteriores.

3. **Indicativos de turnover precoce** — ícone `TrendingDown` vermelho.
   - Busca apenas "algo temporário".
   - Expectativa incompatível com a realidade da operação.
   - Não demonstra disponibilidade operacional.
   - Demonstra desinteresse durante a entrevista.
   - Já inicia o processo falando sobre saída futura.

4. **Observação importante** — ícone `Info` conecta-primary.
   - "O objetivo da entrevista não é apenas validar experiência técnica, mas
     entender comportamento, disponibilidade, aderência cultural e expectativa
     real sobre a rotina operacional dos CDs. Uma contratação assertiva reduz
     turnover, melhora o clima operacional e fortalece os resultados da
     unidade."

Visual: usa `font-display`, `conecta-primary`, `conecta-accent`. Bullets com
ícone à esquerda (lucide `Check`, `AlertCircle`, `TrendingDown`, `Info`).

Item de menu em `components/layout/nav-config.ts`: rotulo "Guia Rápido",
ícone `BookOpen`, href `/guia-rapido`, visível para filial e admin.

## Testes

- `lib/escuta/__tests__/nuvem.test.ts` continua passando (não tocado).
- Sem testes novos obrigatórios — mudanças concentradas em UI e schema.
- Verificação manual: criar entrevista nova end-to-end no preview (sm e lg
  viewport), repetir CPF e validar auto-fill, ver guia rápido.

## Ordem de execução

1. Migration Supabase (DB): drop columns, add parecer, drop criterios,
   truncate entrevistas/roteiro, seed das 6 perguntas.
2. Drizzle schema + validators.
3. Wizard (4 steps) + Wizard top-level.
4. Server actions.
5. Páginas de exibição (detalhe, imprimir, docx, painel, histórico, etc).
6. Guia Rápido (página + menu).
7. Drop /admin/config/criterios.
8. Smoke test no preview.
9. Commit + push para `jptech v3`.

## Riscos

- TRUNCATE é destrutivo. Confirmado pelo usuário.
- Reaproveitar `notas_criterios` com nova semântica pode confundir leitores do
  schema. Mitigação: comentário explícito no `db/schema.ts` ao lado do campo.
- `parecer` separado de `status` cria possibilidade de inconsistência (ex.:
  status=Aprovado, parecer=Não aderente). Por enquanto não validar
  cross-field — o entrevistador é responsável pela coerência.
- Tipo `multi` no admin: precisa de UI nova de edição de opções no admin
  roteiro (já existe input de opções para `select`, então reaproveitar).
