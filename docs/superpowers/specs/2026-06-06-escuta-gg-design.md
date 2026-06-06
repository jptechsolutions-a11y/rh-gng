# Design — Módulo Escuta G&G

**Data:** 2026-06-06
**Status:** Aprovado para implementação
**Base:** `PROMPT_MODULO_CONECTA_GG.md` (referência do cliente) + decisões de brainstorming

---

## 1. Contexto e objetivo

Adicionar ao sistema **Conecta G&G — Perlog** um novo módulo para condução, registro e consulta da **reunião periódica de escuta com a turma**.

O módulo é nomeado **"Escuta G&G"** (o nome "Conecta G&G" já é o nome do sistema; não pode ser reusado para um submódulo). Cobre três frentes:

1. **Roteiro** da reunião (leitura)
2. **Formulário** oficial impresso em branco (impressão)
3. **Percepção** registrada após a reunião (formulário + upload de fotos + lista de presença)

## 2. Restrições absolutas

- **Não modificar** componentes, rotas, estilos ou tabelas existentes
- **Reusar** os tokens, componentes de marca (`ConectaLogo`, `ConectaSymbol`, `ConectaPillarIcons`), utilitários (`conecta-btn-primary`, `conecta-btn-access`, classes de tabs/inputs) e o padrão de cabeçalho/módulo já estabelecidos em `/inicio` e `/login`
- Identidade visual: tokens `conecta-primary` (#0D2B6B), `conecta-accent` (#E8621A), `conecta-accentLight` (#FF8C42), `font-display` Poppins. Zero CSS novo de marca.

## 3. Decisões do brainstorming

| Tópico | Decisão |
|---|---|
| Nome do módulo no menu | **Escuta G&G** |
| Perfis com acesso | Filial e Admin |
| Origem da lista de presença | Digitada na hora (sem cadastro prévio de turma/colaboradores) |
| Storage de fotos | Supabase Storage, bucket privado |
| Visão Admin | 3 abas + histórico filtrado por filial e período |
| Roteiro e pilares | Editáveis por admin em `/admin/config/escuta` |
| Tabelas no Postgres | Criadas via Supabase MCP durante a implementação |

## 4. Rotas

- `/escuta` — página principal com tabs (estado em `?tab=roteiro|formulario|percepcao`)
- `/escuta/historico` — lista de reuniões registradas
- `/escuta/[id]` — visualização de uma reunião salva (somente leitura)
- `/admin/config/escuta` — editor de Roteiro e Pilares (admin)

Tudo dentro de `app/(app)/escuta/` (e o admin dentro de `app/(app)/admin/config/escuta/`), seguindo o padrão atual do projeto. Não há sidebar contextual própria — usa a sidebar principal.

## 5. Navegação

**FILIAL_NAV** (`components/layout/Sidebar.tsx`): adicionar entrada `Escuta G&G` (ícone `MessagesSquare`) entre Histórico e Agenda.

**ADMIN_NAV**: adicionar entrada `Escuta G&G` após Busca global.

**Página `/admin/config`**: adicionar card "Roteiro Escuta G&G" linkando para `/admin/config/escuta`.

## 6. Identidade visual reutilizada

- Cabeçalho de página estilo `/inicio`: faixa azul `bg-conecta-primary`, `ConectaSymbol` à esquerda, título em `font-display font-extrabold` com palavra de destaque em `text-conecta-accent`, logo Perlog à direita
- Subtítulo com par de dashes `[0.32em]` tracking laranja
- Cards no padrão `/inicio`: `rounded-2xl bg-white`, top stripe 1px laranja, ícone tile 48×48 com sombra colorida
- Tabs: pílulas com sublinhado/borda laranja no ativo
- Inputs: padrão do `Field` em `LoginForm` (label uppercase tracking + ícone laranja à esquerda)
- Botões: `conecta-btn-primary` para CTA principal
- Rodapé do módulo: faixa idêntica ao footer do login com `IconAcolher · IconOuvir · IconIdentificar · IconAgir`

## 7. Aba 1 — Roteiro (leitura)

Renderiza conteúdo vindo de `escuta_roteiro` com **fallback hardcoded** caso a tabela esteja vazia.

Layout:
- Hero: título "Gente e Gestão" (Gestão em `text-conecta-accent`), subtítulo uppercase, frase do PPT
- Banner `bg-conecta-accent text-white rounded-xl`: "FORMULÁRIO CONECTA G&G — Conecte que irá fazer a diferença"
- Etapas numeradas em cards verticais: número em círculo laranja, título azul navy bold, descrição em muted
- Rodapé com os 4 pilares (Acolher/Ouvir/Identificar/Agir)

## 8. Aba 2 — Formulário (impressão)

Renderiza o formulário oficial em branco. Botão `🖨️ Imprimir Formulário` chama `window.print()`.

CSS de impressão (scoped no módulo):

```css
@media print {
  body > *:not(#escuta-print-area) { display: none !important; }
  #escuta-print-area { display: block !important; }
  @page { size: A4; margin: 12mm; }
}
```

Wrap em `<div id="escuta-print-area">`.

Layout impresso:
- Cabeçalho: ConectaLogo + Perlog + campos `Nome | Função | Data` em linhas
- Título "FORMULÁRIO CONECTA G&G"
- 5 cards de pilar (ícone, número, nome em navy, perguntas com linhas em branco para resposta manual)
- Bloco final "PERCEPÇÃO FINAL DA G&G" em branco

Pilares default (seed):
1. Adaptação e Bem-Estar Geral
2. Alimentação e Refeições
3. Trabalho e Atividades
4. Comunicação e Relacionamento
5. Sugestões e Melhorias

## 9. Aba 3 — Percepção (registro)

Formulário client-side, salva via server action.

### 9.1 Informações da reunião
Linha 3 colunas: Turma (texto), Data (default hoje), Responsável. Todos obrigatórios.

### 9.2 Percepção por pilar
5 cards `rounded-2xl border-conecta-primary/10` com top stripe laranja. Cada um:
- Ícone + número + nome do pilar
- Um `<textarea rows={3}>` "Percepção do grupo" (opcional)

### 9.3 Percepção final
Card destacado com `border-conecta-accent/30`, label uppercase tracking laranja, `<textarea rows={5}>` obrigatório.

### 9.4 Evidências fotográficas
Componente `EvidenciaUploader`:
- 1 a 3 fotos, JPG/PNG, ≤10MB cada
- Drag-drop nativo + clique para selecionar
- Validação client (tipo, tamanho, count)
- Preview grid 3 col com botão remover
- Upload **no submit** (não incremental) para `escuta-evidencias/{filial_codigo}/{reuniao_id}/{n}.{ext}`

### 9.5 Lista de presença (digitada na hora)
Componente `PresencaDigitada`:
- Tabela editável: `Nome | Função | Presente (toggle SIM/NÃO, default SIM)`
- Botão "+ Adicionar pessoa"
- Mínimo 1 linha com nome
- Contador fixo: `Presentes: X · Ausentes: Y`
- Colunas "Seção" e "Data de Admissão" do PPT **omitidas** (não há cadastro prévio para preencher e digitar na hora é fricção)

### 9.6 Botão final
`💾 Salvar Percepção` → valida → sobe fotos → grava registro → toast verde → redirect `/escuta/[id]`.

## 10. Histórico (`/escuta/historico`)

- Filial: vê apenas seus registros (RLS por `filial_codigo`)
- Admin: vê tudo, filtros por filial e período
- Colunas: `Data | Turma | Responsável | Filial (só admin) | Presentes/Total | Fotos | Ações(Ver)`
- Reusa o padrão de tabela presente em `app/(app)/historico/`

## 11. Admin — `/admin/config/escuta`

Editor simples (não WYSIWYG):
- **Roteiro**: tabela editável de etapas (ordem, título, descrição) + inputs para hero (título, subtítulo, frase, banner)
- **Pilares**: para cada um dos 5, editar nome + lista de perguntas (uma por linha em textarea)
- Botão "Salvar configuração" — versão única, sem histórico

## 12. Modelo de dados

Quatro tabelas novas + 1 bucket. Criadas via Supabase MCP. Nenhuma tabela existente é alterada.

```sql
create table escuta_roteiro (
  id              smallint primary key default 1,
  hero_titulo     text not null default 'Gente e Gestão',
  hero_subtitulo  text not null default 'SUA ORGANIZAÇÃO FAZ TODA A DIFERENÇA',
  hero_frase      text not null,
  banner_texto    text not null,
  etapas          jsonb not null default '[]'::jsonb,  -- [{ordem,titulo,descricao}]
  atualizado_em   timestamptz not null default now(),
  atualizado_por  text
);

create table escuta_pilares (
  id          smallint primary key,          -- 1..5
  ordem       smallint not null,
  nome        text not null,
  icone       text not null,                 -- 'adaptacao'|'alimentacao'|'trabalho'|'comunicacao'|'sugestoes'
  perguntas   jsonb not null default '[]'::jsonb
);

create table escuta_reunioes (
  id              uuid primary key default gen_random_uuid(),
  filial_codigo   text not null,
  filial_nome     text,
  turma           text not null,
  data_reuniao    date not null,
  responsavel     text not null,
  percepcoes      jsonb not null default '{}'::jsonb,   -- { "1": "...", ..., "5": "..." }
  percepcao_final text not null,
  fotos           jsonb not null default '[]'::jsonb,   -- [{path,url,size}]
  presenca        jsonb not null default '[]'::jsonb,   -- [{nome,funcao,presente}]
  total_presentes int generated always as (
    (select count(*) from jsonb_array_elements(presenca) e
     where (e->>'presente')::bool = true)
  ) stored,
  total_pessoas   int generated always as (jsonb_array_length(presenca)) stored,
  criado_em       timestamptz not null default now(),
  criado_por      text
);

create index on escuta_reunioes (filial_codigo, data_reuniao desc);
```

**Seed:**
- 1 linha em `escuta_roteiro` com hero + etapas do PPT
- 5 linhas em `escuta_pilares` com nome + ~3-5 perguntas cada (extraídas do PPT)

**RLS:**
- `escuta_roteiro` e `escuta_pilares`: SELECT autenticado, UPDATE só admin
- `escuta_reunioes`:
  - SELECT: filial vê só `filial_codigo` do próprio token; admin vê tudo
  - INSERT: autenticado; `filial_codigo` é forçado server-side a partir da sessão
  - UPDATE/DELETE: só admin

Helper de policies seguindo o padrão atual do projeto (a verificar em `lib/auth/session.ts` na hora da implementação).

**Storage:**
- Bucket `escuta-evidencias` privado
- Path: `{filial_codigo}/{reuniao_id}/{n}.{ext}`
- Policy: SELECT/INSERT restritos pelo `filial_codigo` da reunião
- URLs assinadas (TTL 1h) geradas server-side ao renderizar `/escuta/[id]` e histórico

## 13. Componentes a criar

Em `components/escuta/`:
- `EscutaHeader.tsx`
- `EscutaTabs.tsx` (controladas por `?tab=`)
- `RoteiroView.tsx`
- `FormularioImpressao.tsx` (inclui `@media print` scoped)
- `PercepcaoForm.tsx`
- `PilarPercepcaoCard.tsx`
- `EvidenciaUploader.tsx`
- `PresencaDigitada.tsx`

Em `app/(app)/escuta/historico/`: `HistoricoEscutaTable.tsx` (não confundir com a tabela já existente em `/historico`).

## 14. Server actions

Em `actions/escuta.ts`:
- `salvarReuniaoAction(formData)` — valida, sobe fotos, grava registro, retorna `{ id }`
- `salvarConfigRoteiroAction(formData)` — admin
- `salvarConfigPilaresAction(formData)` — admin

Padrão `useActionState` igual a `LoginForm` e `EntrevistaWizard`.

## 15. Fora do escopo (YAGNI)

- Export PDF de reunião
- Edição de reunião já salva (para corrigir → admin deleta + filial registra de novo)
- Histórico de versões da configuração
- Notificações/emails
- Dashboard analítico de pilares mais citados
- Cadastro prévio de turma/membros

## 16. Validações finais

Antes de salvar uma percepção:
- Turma, data e responsável preenchidos
- Percepção Final preenchida
- ≥1 foto válida enviada
- ≥1 pessoa com nome na presença

Erros exibidos no padrão de erro do `LoginForm` (`bg-red-50 border-red-200 text-red-700`).

## 17. Acessibilidade e responsividade

- Labels em todos os campos
- Foco visível usando o `ring-conecta-accent/25` já padronizado
- Mínimo 768px (desktop e tablet). Mobile sem garantia.
- A área de impressão é sempre A4 retrato.
