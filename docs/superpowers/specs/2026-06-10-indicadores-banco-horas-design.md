# Indicadores › Banco de Horas — Design

**Data:** 2026-06-10
**Escopo desta entrega:** novo módulo `Indicadores` com 3 abas; apenas a aba **Banco de Horas** implementada agora. As outras 2 abas ficam como placeholders.

---

## 1. Objetivo

Disponibilizar visão consolidada do banco de horas (BH) da rede, alimentada por import manual de planilha Excel pelo admin. O sistema mantém dois snapshots (atual e anterior) para permitir comparativo de variação entre imports consecutivos.

## 2. Fonte de dados

Arquivo de referência: `BH PERLOG.xls` (colunas em caixa-alta):

| Coluna excel       | Uso                                                                 |
| ------------------ | ------------------------------------------------------------------- |
| `REGIONAL`         | auditoria/origem                                                    |
| `BANDEIRA`         | auditoria/origem                                                    |
| `CODFILIAL`        | match com `filiais.codigo` (text)                                   |
| `CHAPA`            | matrícula do colaborador (chave dentro do snapshot)                 |
| `NOME`             | exibição                                                            |
| `FUNCAO`           | filtro e agrupamento (rosca)                                        |
| `SECAO`            | filtro e agrupamento (rosca)                                        |
| `TOTAL_EM_HORA`    | string `"HH:MM"` — convertido para decimal e gravado em `horas_decimal` |
| `TOTAL_NEGATIVO`   | **ignorado** (decisão: trabalhar só com saldo positivo a receber)   |
| `VAL_PGTO_BHS`     | gravado em `valor_pgto`                                             |
| `SITUACAO`         | exibição (ex: ATIVO, AF.PREVIDÊNCIA)                                |
| `Total Geral`      | ignorado (linha de totalização)                                     |

**Conversão `HH:MM` → decimal:** `h + m/60`, arredondado a 2 casas.

**Mapeamento de filial:** `CODFILIAL` (inteiro no excel) é convertido para texto e casa com `filiais.codigo`. Linhas cujo CODFILIAL não exista em `filiais` geram warning no relatório de import, mas o import segue. (Vou checar no momento da implementação se `filiais.codigo` usa zero-padding e, se sim, replicar.)

## 3. Modelo de dados

Três tabelas novas:

### `bh_snapshot_atual`

| Campo                | Tipo                          | Notas                                |
| -------------------- | ----------------------------- | ------------------------------------ |
| `id`                 | `uuid` PK default `gen_random_uuid()` | |
| `filial_id`          | `uuid` FK → `filiais.id` ON DELETE RESTRICT | nullable se filial não mapeada |
| `codfilial_origem`   | `text`                        | sempre preenchido, auditoria         |
| `chapa`              | `text` NOT NULL               |                                      |
| `nome`               | `text` NOT NULL               |                                      |
| `funcao`             | `text`                        |                                      |
| `secao`              | `text`                        |                                      |
| `regional`           | `text`                        |                                      |
| `bandeira`           | `text`                        |                                      |
| `horas_decimal`      | `numeric(10,2)` NOT NULL      | a partir de `TOTAL_EM_HORA`          |
| `valor_pgto`         | `numeric(12,2)` NOT NULL default 0 | a partir de `VAL_PGTO_BHS`     |
| `situacao`           | `text`                        |                                      |

Índices: `(filial_id)`, `(chapa)`, `(secao)`, `(funcao)`.

### `bh_snapshot_anterior`

Mesmas colunas de `bh_snapshot_atual`. Existe como cópia da versão imediatamente anterior, para JOIN por `chapa` na construção da variação.

### `bh_meta`

Singleton (uma linha única, garantida via constraint `id = 'singleton'`):

| Campo                | Tipo                          | Notas                                |
| -------------------- | ----------------------------- | ------------------------------------ |
| `id`                 | `text` PK CHECK (`id='singleton'`) | |
| `ultima_atualizacao` | `timestamptz`                 |                                      |
| `atualizado_por`     | `uuid` FK → `admins.id`       |                                      |
| `total_linhas`       | `integer`                     | nº de linhas no snapshot atual       |
| `total_filiais`      | `integer`                     | nº de filiais distintas              |

## 4. Fluxo de import (admin)

1. UI: card "Importar BH" com file-picker (`.xls`, `.xlsx`).
2. Server action recebe `FormData`, lê com lib `xlsx` (já em deps), valida que o header bate com a lista esperada — se não bater, rejeita com erro descritivo.
3. Em **uma transação Drizzle**:
   - `TRUNCATE bh_snapshot_anterior`
   - `INSERT INTO bh_snapshot_anterior SELECT * FROM bh_snapshot_atual`
   - `TRUNCATE bh_snapshot_atual`
   - `INSERT` em lote das linhas parseadas (resolvendo `filial_id` por `codigo`).
   - `UPSERT` em `bh_meta` com `ultima_atualizacao = now()`, `atualizado_por = sessao.adminId`, contagens.
4. Retorna ao cliente: `{ inserted, warnings: [{ chapa, motivo }] }`. Warnings tipicamente: filial não mapeada, `TOTAL_EM_HORA` inválido.

**Atômico:** se qualquer etapa falhar, rollback completo — snapshot anterior preservado.

## 5. UI

Rota nova: `app/(app)/indicadores/page.tsx`, com layout de abas seguindo o padrão de `escuta` e `entrevista` (mesma identidade visual).

Abas: **Banco de Horas** | _Indicador 2 (placeholder)_ | _Indicador 3 (placeholder)_.

### Aba Banco de Horas — estrutura vertical

1. **Header**
   - Título "Banco de Horas".
   - Texto secundário: "Última atualização: 10/06/2026 14:32 por Fulano". Se nunca importado: "Sem dados importados".
   - Botão **Importar BH** (visível só para `perfil='admin'`).

2. **4 cards de resumo** (grid responsivo)
   - Colaboradores (count de linhas no `bh_snapshot_atual`)
   - Total de horas (soma `horas_decimal`, formatado `123.45 h`)
   - Valor a pagar (soma `valor_pgto`, formato BRL)
   - Média h/colaborador — média entre quem tem `horas_decimal > 0` (decisão do user)

3. **2 gráficos de rosca lado a lado**
   - Top 5 funções por soma de horas
   - Top 5 seções por soma de horas
   - **Sem fatia "Outros"** — só os 5 do top (decisão do user). Mesma paleta verde/azul da identidade atual.

4. **Tabela "Resumo por filial"** (todos os perfis veem todas as filiais)
   - Colunas: Filial | Saldo anterior (h) | Saldo atual (h) | Variação
   - Variação: `Δh` + `Δ%`, com cor invertida da convenção (decisão do user): **diminuiu = verde**, **aumentou = vermelho**, com seta. Empate = neutro.

5. **Filtros + tabela "Detalhado por colaborador"**
   - Filtros acima da tabela: select Seção, select Função, input busca (nome ou matrícula). Aplicados client-side sobre o dataset já carregado.
   - Colunas: Colaborador | Matrícula | Função | Seção | Valor a receber | Saldo anterior | Saldo atual | Variação.
   - Linha sem correspondência no anterior: badge **Novo** ao lado do nome, "saldo anterior" exibido como `—`, variação = `+saldo atual` em vermelho.
   - Colaboradores que saíram entre versões (presente no anterior, ausente no atual): **omitidos** (decisão do user).
   - Permissão: admin vê todas filiais; `perfil='filial'` vê só `sessao.filialId`.

## 6. Permissões e navegação

- Sessão lida via padrão atual (`sessoes` + helpers existentes do projeto).
- Sidebar ganha item **Indicadores** (vou alinhar a posição com o restante da navegação no momento da implementação — provavelmente após "Escuta G&G").
- Visibilidade:
  - `perfil='admin'`: módulo completo, botão Importar, detalhado de todas filiais.
  - `perfil='filial'`: módulo visível, **sem** botão Importar, resumo por filial mostra todas, detalhado filtrado para a própria filial.

## 7. Server actions (esqueleto)

Localização: `actions/indicadores/bh.ts`.

```ts
importarBH(formData) → admin only; valida, parseia, executa transação, retorna { inserted, warnings }
getResumoBH()        → 4 cards + dados das roscas + meta (ultima atualização)
getResumoPorFilial() → JOIN atual × anterior agregado por filial (visível a todos)
getDetalhado()       → JOIN atual × anterior por chapa; admin = sem filtro de filial, filial = WHERE filial_id = sessao.filialId
```

Helpers internos compartilhados (em `lib/indicadores/bh.ts`): parser `HH:MM`, validador de header, cálculo de variação.

## 8. Stack / dependências

- **Parse Excel:** `xlsx` (já presente).
- **Gráficos rosca:** vou conferir no momento da implementação se o projeto já usa lib de chart; se sim, reuso; se não, SVG puro pra evitar dependência nova.
- **Tabelas:** seguir o componente de tabela existente (mesmo padrão visual do detalhado da escuta).
- **Migrations:** `db/migrations/` via Drizzle, seguindo o padrão do projeto.

## 9. Fora de escopo

- As outras 2 abas do módulo Indicadores (entrega futura).
- Histórico maior que 2 snapshots.
- Export do detalhado (pode entrar em iteração posterior).
- Edição manual de linhas — fonte da verdade é sempre a planilha importada.

## 10. Riscos / pontos de atenção

- **Zero-padding do `CODFILIAL`:** preciso confirmar o formato em `filiais.codigo`. Se houver divergência (ex: filial 20 cadastrada como `"0020"`), o parser normaliza pra mesmo formato antes do match.
- **Tamanho do import:** o arquivo de referência tem ~1.5k linhas. Insert em lote (chunk de ~500) é suficiente; sem necessidade de processamento async.
- **Transação longa:** TRUNCATE + INSERT bulk em transação única é OK para esse volume; se crescer 10x, considerar fila.
