# Transporte: CPF no cadastro, número da rota e edição de rota

Data: 2026-08-17
Status: aprovado

## Contexto

O módulo Transporte tem duas telas de dados distintas:

- **Informações** (`/transporte/informacoes`) — cadastro por chapa com endereço,
  telefones e situação (`transporte_cadastro`), alimentado por um import de
  planilha (`importarCadastro` em `actions/transporte-cadastro.ts`).
- **Passageiros** (`/transporte/passageiros`) — aloca passageiros
  (`transporte_passageiros`) a rotas (`transporte_rotas`).

O usuário pediu três ajustes:

1. Incluir CPF no import e na visualização do cadastro (tela Informações).
2. Mostrar o número da rota na coluna Rota da tela Passageiros, formato
   `Nº1 - Tijucas + Canelinha (1º Turno)`.
3. Poder editar uma rota existente (nome/turno/lugares/ordem) pela UI.

A planilha de exemplo anexada (`INFORMAÇÕES FRETADO 24 (1).xls`) tem colunas
`REGIONAL, BANDEIRA, CODFILIAL, CHAPA, NOME, DT_ADMISSAO, RUA, BAIRRO, CIDADE,
TELEFONE1, TELEFONE2, SITUACAO, OPT_ALMOCO Total` — ainda sem CPF; o usuário
confirmou que vai adicionar a coluna `CPF` em versões futuras do arquivo.

A action `atualizarRota` (nome/turno/lugares/ordem) já existe em
`actions/transporte.ts` — só falta expor na UI.

## Decisões (confirmadas com o usuário)

- CPF entra **só** na tela/import de Informações (não em Passageiros).
- Coluna esperada na planilha: `CPF`.
- Número da rota = campo `ordem` já existente em `transporte_rotas` (não é um
  campo novo).
- `Nº{ordem} - {nome} ({turno})` aparece **só** na coluna Rota da tela
  Passageiros (não em Informações, dropdowns ou na tabela de rotas do admin).
- CPF fica armazenado só com dígitos (normalizado) e é formatado
  `000.000.000-00` na exibição — evita inconsistência entre planilhas com/sem
  máscara.
- Coluna CPF na tabela de Informações fica logo após Nome.
- Busca da tela Informações passa a considerar CPF também.
- Edição de rota abre em modal (popup), pré-preenchido, no mesmo estilo visual
  do form "Nova rota" já existente.

## Mudanças

### 1. Schema (`db/schema.ts`)

Adiciona `cpf: text('cpf')` (nullable) em `transporteCadastro`. Migration
gerada via `npm run db:generate` (padrão do projeto, não SQL manual).

### 2. Parser de import (`lib/transporte/cadastro-xls-parser.ts`)

- `CPF_KEYS = ['CPF']`.
- Nova função `asOptionalDigits(rowUpper, keys)`: extrai os dígitos do valor
  (`String(v).replace(/\D/g, '')`); retorna `null` se resultar em string
  vazia.
- `LinhaCadastro` ganha `cpf: string | null`.
- `parseCadastroPassageiros` popula `cpf` usando `asOptionalDigits`.

### 3. Import e leitura (`actions/transporte-cadastro.ts`)

- `importarCadastro`: o `INSERT ... ON CONFLICT (filial_id, chapa) DO UPDATE`
  passa a incluir a coluna `cpf` no insert e no `DO UPDATE SET`.
- `listarInformacoesPassageiros`: adiciona `cpf: schema.transporteCadastro.cpf`
  ao select, e no `.map()` de retorno formata para exibição via um helper
  `formatCpf(cpf: string | null): string | null` (novo, em
  `lib/transporte/format.ts`) — aplica a máscara `000.000.000-00` quando o
  valor tem 11 dígitos; caso contrário retorna o valor cru (fallback
  defensivo para CPFs incompletos/inválidos na planilha) ou `null`.

### 4. Tela Informações (`components/transporte/InformacoesPassageiros.tsx`)

- Tipo `Info` ganha `cpf: string | null` (já formatado, vindo do backend).
- Nova `<th>CPF</th>` logo após `<th>Nome</th>`, com célula correspondente
  (`d.cpf ?? '—'`).
- `colSpan` dos estados vazios passa de 7 para 8.
- Filtro de busca (`filtrados` useMemo) passa a checar também
  `(d.cpf ?? '').replace(/\D/g, '').includes(q.replace(/\D/g, ''))` — assim
  buscar `123.456` ou `123456` encontra o mesmo jeito.
- Texto de ajuda do painel de import (`ImportCadastroPanel`) menciona a
  coluna **CPF** na lista de colunas esperadas.

### 5. Tela Passageiros — número da rota (`components/transporte/PassageirosClient.tsx`)

- Novo helper `formatRotaLabel(rota: { ordem: number; nome: string; turno:
  string }): string` em `lib/transporte/format.ts` (mesmo arquivo do
  `formatCpf`, ambos puros e testáveis) → retorna
  `` `Nº${rota.ordem} - ${rota.nome} (${rota.turno})` ``.
- Tipo local `Rota` em `PassageirosClient.tsx` ganha `ordem: number` (o
  backend já retorna a coluna inteira; só faltava no tipo do client).
- A badge da coluna Rota (`{rota.nome} <span>({rota.turno})</span>`) passa a
  usar `formatRotaLabel(rota)` no lugar do nome/turno separados.
- Escopo explicitamente **não** inclui: coluna Rota da tela Informações,
  dropdowns de alocação/filtro, tabela de rotas do admin — todos continuam
  como estão hoje.

### 6. Editar rota (`app/(app)/admin/config/transporte/RotasClient.tsx`)

- Novo botão "Editar" (ícone lápis, `Pencil` do lucide-react) na coluna Ações
  de cada linha da tabela de rotas, ao lado de Ativar/Desativar.
- Novo estado `editingRota: Rota | null` controla um modal (mesmo padrão
  visual/posicional do form "Nova rota" já existente, mas em overlay modal em
  vez de painel inline — já que pode ser aberto a partir de qualquer linha da
  tabela).
- O modal reaproveita os mesmos 4 campos do form de criação (Nome, Turno,
  Lugares, Ordem), pré-preenchidos com os valores da rota clicada.
- Ao salvar, chama a action `atualizarRota(id, { nome, turno, lugares,
  ordem })` (já existe, sem mudanças de backend) e recarrega a lista.
- Nenhuma mudança nas actions de backend é necessária para este item.

## Testes

- `lib/transporte/format.test.ts` (novo): casos para `formatCpf` (11 dígitos
  → mascarado; menos de 11 dígitos → retorna cru; `null`/vazio → `null`) e
  para `formatRotaLabel` (monta a string no formato esperado).
- `lib/transporte/cadastro-xls-parser.test.ts`: adiciona casos cobrindo CPF
  com máscara, só dígitos, ausente/vazio.

Não há testes automatizados hoje para os componentes React deste módulo
(`InformacoesPassageiros`, `PassageirosClient`, `RotasClient`) — a
verificação dessas mudanças será manual via preview do dev server, como já é
o padrão do projeto para esta área.

## Fora de escopo

- Validação de CPF (dígito verificador) — só extração/normalização e exibição.
- Alterar o import de Passageiros (nome/chapa/cidade) para incluir CPF.
- Adicionar CPF em outras telas do sistema (QLP, RH, etc.) fora do módulo
  Transporte.
- Reordenar/renumerar rotas automaticamente — `ordem` continua sendo editado
  manualmente como já é hoje.
