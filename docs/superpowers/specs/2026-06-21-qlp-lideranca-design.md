# Módulo QLP & Liderança — Design

**Data:** 2026-06-21
**Branch:** `feat/qlp-lideranca`
**Autor:** brainstorm Juliano + Claude

---

## 1. Objetivo

Permitir que a Perlog cadastre, mantenha e visualize a estrutura hierárquica de liderança do quadro de colaboradores (~1.700 pessoas, 15 filiais, 8 regionais, 85 funções), com:

- Espelho automático do quadro Perlo via upload recorrente do XLS oficial
- Hierarquia em 5 tiers (Gerente → Subgerente → Coordenador → Supervisor → Base) com níveis nacional/regional/I/II
- Atribuição direta de líder por colaborador (1 colaborador → 1 líder direto), com herança computada para níveis acima
- Operação distribuída: admin monta a "espinha" (gerente/subgerente/coord), filiais montam o time supervisor↔base e o vínculo coord↔supervisor da própria filial
- Auditoria completa de toda mudança (histórico)

## 2. Glossário

| Termo | Significado |
|---|---|
| **Quadro Perlo** | Planilha XLS exportada do RH com a base de colaboradores ativos |
| **Tier** | Categoria hierárquica: `gerente`, `subgerente`, `coord`, `supervisor`, `base` |
| **Nível** | Subdivisão do tier: `nacional`, `regional`, `i`, `ii` (ou null) |
| **Trilha** | Família funcional sugerida (logística, transporte, abastecimento, prevenção, g&g, manutenção, ti, financeiro, outros) — sugestão, não bloqueia |
| **Escopo** | Filiais que um líder regional cobre (lista explícita); nacional cobre todas |
| **Espinha** | Vínculos gerente↔subgerente↔coord (administrados só pelo admin) |
| **Time efetivo** | Subordinados diretos + indiretos (calculado via CTE recursiva) |
| **Sync** | Aplicação de um novo upload do XLS contra a base existente |

## 3. Regras de negócio

### 3.1 Hierarquia e quem lidera quem

```
GERENTE   (nacional | regional)
  └─ SUBGERENTE
       └─ COORDENADOR  (nacional | regional)
            └─ SUPERVISOR  (i | ii)
                 └─ BASE
```

- **1 líder direto por colaborador** (constraint via PK em `qlp_vinculos.colaborador_id`)
- **Supervisor** só pode liderar tier=base
- **Coord** pode liderar supervisor + base
- **Subgerente** pode liderar coord/supervisor/base
- **Gerente** pode liderar subgerente/coord/supervisor/base
- **Herança é computada**, nunca materializada: o "time efetivo" de um líder = recursão descendente em `qlp_vinculos`
- **Escopo regional** = lista explícita de `filial_id` definida no cadastro do líder; **escopo nacional** = todas as filiais ativas
- Vínculo só é válido se o colaborador (ou o supervisor sendo amarrado a um coord) estiver em uma filial dentro do escopo do líder

### 3.2 Operação distribuída (permissões de escrita)

| Ação | Admin | Filial |
|---|---|---|
| Atribuir/mover/remover **base ↔ supervisor** | ✓ | ✓ (sua filial) |
| Atribuir/mover/remover **supervisor ↔ coord** | ✓ | ✓ (do supervisor da sua filial para qualquer coord no escopo) |
| Atribuir/mover **coord ↔ subgerente/gerente** | ✓ | ✗ |
| Criar/editar/remover **líder** (gerente/subg/coord) | ✓ | ✗ |
| Classificar/reclassificar **função** | ✓ | ✗ |
| **Importar XLS** | ✓ | ✗ |
| Ver organograma/quadro/indicadores | tudo | sua filial + cadeia acima |
| Ver histórico | tudo | eventos da sua filial |

Todo "mover" exige campo **motivo** (registrado no histórico).

### 3.3 Sincronização do quadro Perlo

| Situação detectada no sync | Ação |
|---|---|
| **(a)** Mudança de função sem mudar tier (ex.: Sup. I → Sup. II) | UPDATE colaborador, mantém vínculo |
| **(a)** Mudança de função com mudança de tier | UPDATE colaborador, **remove vínculo**, gera pendência `tier_mudou` |
| **(b)** Mudança de filial (CODFILIAL diferente) | UPDATE colaborador, **remove vínculo**, gera pendência `filial_mudou` (nova filial reatribui) |
| **(c)** Chapa ausente do XLS (desligado) | `ativo=false` (soft-delete), remove vínculo. Se era líder → gera pendência `desligado_com_time` |
| **(d)** Mudança de situação (Férias/Afastado/etc) | UPDATE situação, **mantém** vínculo |
| **(e)** Chapa nova | INSERT + pendência `novo_sem_lider` |

Re-upload do mesmo arquivo é idempotente.

### 3.4 Classificação automática de funções

Aplicada na primeira aparição de uma função; admin pode editar depois em `/qlp/cargos`.

**Tier + nível** (primeira regex que casa vence):

| Regex (case-insensitive) | tier | nível |
|---|---|---|
| `^GERENTE NAC(\.|IONAL)` | gerente | nacional |
| `^GERENTE REGIONAL` | gerente | regional |
| `^GERENTE ` | gerente | regional |
| `^SUBGERENTE` | subgerente | — |
| `^COORD(\.|ENADOR) NACIONAL` | coord | nacional |
| `^COORD(\.|ENADOR) REGIONAL` | coord | regional |
| `^COORD(\.|ENADOR)` | coord | regional |
| `^SUPERVISOR.*\bII\b` | supervisor | ii |
| `^SUPERVISOR` | supervisor | i |
| `^ENC(\.|ARREGADO)` | supervisor | i |
| qualquer outra | base | — |

**Trilha** (contém):

| Termo | trilha |
|---|---|
| LOGISTICA / WMS / ARMAZEM / DEPOSITO / EMPILHA / CONFERENTE / MOVIMENTACAO | logistica |
| TRANSPORTE / MOTORISTA / CARRETEIRO / ROTEIRIZACAO | transporte |
| ABASTECIMENTO | abastecimento |
| PREVENCAO / MONITORAMENTO / VIGILANTE / PORTEIRO | prevencao |
| GENTE E GESTAO / RH | gg |
| MANUTENCAO / ELETRO / JARDIN / HIGIEN / LIMPEZA / ZELADOR / COZINH / NUTRI | manutencao |
| TI / SUPORTE / AUTOMACAO | ti |
| FINANC | financ |
| (resto) | outros |

Trilha é **sugestão**: vínculos entre trilhas diferentes geram aviso visual, não bloqueiam.

## 4. Modelo de dados

Todas as tabelas com prefixo `qlp_`. Drizzle ORM, Postgres (Supabase).

```sql
qlp_colaboradores (
  id              uuid PK default gen_random_uuid(),
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
  situacao        text,                    -- Ativo|Férias|Afastado|...
  ativo           boolean NOT NULL default true,
  tier_resolvido  text,                    -- redundante mas indexado p/ filtros
  nivel_resolvido text,
  trilha_resolvida text,
  created_at      timestamptz NOT NULL default now(),
  updated_at      timestamptz NOT NULL default now()
);
CREATE INDEX qlp_colab_filial_idx   ON qlp_colaboradores(filial_id) WHERE ativo;
CREATE INDEX qlp_colab_tier_idx     ON qlp_colaboradores(tier_resolvido) WHERE ativo;
CREATE INDEX qlp_colab_funcao_idx   ON qlp_colaboradores(funcao);

qlp_funcoes_cargo (
  funcao                  text PRIMARY KEY,
  tier                    text NOT NULL,
  nivel                   text,
  trilha                  text,
  classificada_em         timestamptz NOT NULL default now(),
  confirmada_por_admin    boolean NOT NULL default false
);

qlp_lideres (
  id                uuid PK default gen_random_uuid(),
  colaborador_id    uuid UNIQUE NOT NULL REFERENCES qlp_colaboradores(id) ON DELETE CASCADE,
  tier              text NOT NULL,         -- gerente|subgerente|coord
  nivel             text,                  -- nacional|regional
  escopo_nacional   boolean NOT NULL default false,
  filiais_escopo    jsonb NOT NULL default '[]',  -- array de filial_id (vazio se nacional)
  ativo             boolean NOT NULL default true,
  created_at        timestamptz NOT NULL default now()
);

qlp_vinculos (
  colaborador_id  uuid PRIMARY KEY REFERENCES qlp_colaboradores(id) ON DELETE CASCADE,
  lider_id        uuid NOT NULL REFERENCES qlp_lideres(id) ON DELETE CASCADE,
  origem          text NOT NULL,          -- admin|filial|sync
  criado_por      text,
  created_at      timestamptz NOT NULL default now()
);
CREATE INDEX qlp_vinc_lider_idx ON qlp_vinculos(lider_id);

qlp_imports (
  id              uuid PK default gen_random_uuid(),
  arquivo         text,
  executado_por   text NOT NULL,
  executado_em    timestamptz NOT NULL default now(),
  total_linhas    integer,
  novos           integer,
  atualizados     integer,
  desligados      integer,
  mudanca_tier    jsonb,
  pendencias      jsonb
);

qlp_pendencias (
  id              uuid PK default gen_random_uuid(),
  tipo            text NOT NULL,
  -- novo_sem_lider | tier_mudou | filial_mudou |
  -- desligado_com_time | filial_desconhecida | lider_fora_escopo
  colaborador_id  uuid REFERENCES qlp_colaboradores(id) ON DELETE CASCADE,
  descricao       text,
  criada_em       timestamptz NOT NULL default now(),
  resolvida       boolean NOT NULL default false,
  resolvida_em    timestamptz,
  resolvida_por   text
);
CREATE INDEX qlp_pend_aberta_idx ON qlp_pendencias(tipo) WHERE NOT resolvida;

qlp_historico (
  id                  uuid PK default gen_random_uuid(),
  evento              text NOT NULL,
  -- vinculo_criado | vinculo_removido | vinculo_movido |
  -- lider_criado | lider_removido | lider_escopo_alterado |
  -- colaborador_transferido_filial | colaborador_mudou_funcao |
  -- import_executado | pendencia_resolvida | funcao_reclassificada
  colaborador_id      uuid,
  lider_id_antigo     uuid,
  lider_id_novo       uuid,
  detalhes            jsonb,             -- snapshot completo do que mudou
  ator_tipo           text NOT NULL,     -- admin|filial|sync
  ator_id             uuid,
  ator_nome           text,
  filial_contexto_id  uuid,
  created_at          timestamptz NOT NULL default now()
);
CREATE INDEX qlp_hist_colab_idx   ON qlp_historico(colaborador_id, created_at DESC);
CREATE INDEX qlp_hist_data_idx    ON qlp_historico(created_at DESC);
CREATE INDEX qlp_hist_filial_idx  ON qlp_historico(filial_contexto_id);
```

## 5. Estrutura no projeto

```
app/(app)/qlp/
  page.tsx                 landing + cards-resumo + atalhos
  quadro/page.tsx          lista de colaboradores (filtros, busca, ações)
  organograma/page.tsx     drill-down só de líderes com resumo de time
  lideres/page.tsx         ADMIN: gerenciar espinha
  cargos/page.tsx          ADMIN: revisar classificação de funções
  importar/page.tsx        ADMIN: upload XLS + preview + aplicar
  historico/page.tsx       log filtrado
  indicadores/page.tsx     KPIs e gráficos
  [id]/page.tsx            detalhe do colaborador (cadeia + time + histórico)

actions/qlp/
  colaboradores.ts         buscar, transferirFilial
  lideres.ts               criar, editarEscopo, remover
  vinculos.ts              atribuir, mover, remover (com motivo)
  cargos.ts                reclassificar
  importar.ts              parsear, preview, aplicarSync
  historico.ts             listar, exportar

db/queries/qlp.ts          consultas (CTE recursiva p/ time efetivo, agregações)
db/schema.ts               + tabelas qlp_*
db/migrations/             nova migration gerada pelo MCP Supabase
```

Toda escrita passa por server-action; toda server-action grava em `qlp_historico` antes de retornar (mesmo transaction).

## 6. Telas

### 6.1 `/qlp` — Landing
4 cards (Colaboradores ativos · % com líder · Pendências abertas · Último sync) + atalhos contextuais.

### 6.2 `/qlp/quadro` — Lista de colaboradores
- Filtros: nome/chapa, filial (admin), função, tier, situação, "sem líder", trilha
- Tabela: chapa · nome · função · seção · situação · líder atual · ações
- Modal "Atribuir/Mover líder": combo filtrado (só líderes elegíveis), motivo obrigatório
- Seleção em lote para atribuição em massa

### 6.3 `/qlp/organograma` — Drill-down
- Estado inicial: cards dos gerentes nacionais com badge "N colaboradores no time"
- Clique expande à direita os subordinados diretos (sempre só líderes a partir do tier coord; supervisores aparecem como folha clicável)
- Cada caixa: nome · função · filial · tier · "N diretos | M time total"
- Botão "Ver lista" abre modal com time completo daquele líder
- Busca rápida "ir até líder X"

### 6.4 `/qlp/lideres` — ADMIN: espinha
- Lista de gerentes/subgerentes/coords
- "+ Novo líder" (wizard): busca colaborador → define tier/nível/escopo → define líder acima
- Cada linha: ações `[Editar escopo]` `[Remover]`

### 6.5 `/qlp/cargos` — ADMIN: classificação
- ~85 linhas, colunas: função · tier · nível · trilha · confirmada · qtd colaboradores
- Edição inline; mudança em tier dispara revalidação dos vínculos existentes

### 6.6 `/qlp/importar` — ADMIN
- Form de upload
- Após parse: tela de preview com cards-diff + tabelas expandíveis por categoria
- "Aplicar sync" dentro de transaction

### 6.7 `/qlp/historico` — Log
- Filtros (período · tipo · ator · colaborador · filial)
- Linhas humanizadas + `[ver JSON]`
- Export CSV (admin)

### 6.8 `/qlp/indicadores` — KPIs
- Distribuição por tier · tamanho médio de time por nível · % cobertura por filial · pendências por tipo · evolução do quadro

### 6.9 `/qlp/[id]` — Detalhe do colaborador
- Header + cadeia de liderança clicável + (se for líder) card "Meu time" + timeline de histórico próprio

## 7. Componentes não-óbvios

- **CTE recursiva de time efetivo** em `db/queries/qlp.ts`:
  ```sql
  WITH RECURSIVE descendentes AS (
    SELECT v.colaborador_id, l.id AS lider_id
    FROM qlp_vinculos v JOIN qlp_lideres l ON l.id = v.lider_id
    WHERE l.id = $1
    UNION ALL
    SELECT v.colaborador_id, d.lider_id
    FROM qlp_vinculos v
    JOIN qlp_lideres l2 ON l2.colaborador_id = (... -- ver implementação)
    JOIN descendentes d ON d.colaborador_id = l2.colaborador_id
  )
  SELECT * FROM descendentes;
  ```
  Cacheável por líder enquanto não há mutação (revalidate via tag).

- **Parser XLS** com decodificação latin1/win1252 (vi `F�rias` no parse direto). Usar `xlsx` com `cellText:false, raw:false` e converter buffer.

- **Validação de tier no servidor**: helper `assertCanLead(liderTier, colaboradorTier)` chamado em toda server-action de vínculo, **nunca confiar no front**.

## 8. Histórico e auditoria

Todo write em `qlp_vinculos`, `qlp_lideres`, `qlp_funcoes_cargo`, `qlp_colaboradores` (via sync) gera linha em `qlp_historico` na mesma transaction. Sem exceção. Filial só vê eventos com `filial_contexto_id` = sua filial; admin vê tudo.

## 9. Fora de escopo (não fazer agora)

- Login dedicado para líderes (já decidimos: líderes não logam)
- Organograma gráfico completo da empresa toda em uma view
- Notificações push/e-mail de pendências
- Aprovação dois-níveis para movimentações
- Integração direta com sistema do RH (continua sendo upload de XLS)
- Versionamento de "snapshots" históricos do organograma (o histórico cobre por evento, não snapshots completos)

## 10. Critérios de sucesso

1. Admin consegue subir o XLS atual e o sistema importa 1.739 linhas sem erro
2. Classificação automática cobre ≥95% das 85 funções corretamente
3. Filial consegue atribuir líder para um colaborador da sua filial em ≤3 cliques
4. Tela de organograma renderiza estrutura completa sem travar (cache + drill-down)
5. Toda mudança aparece no histórico com ator, antes/depois, motivo
6. Re-upload do mesmo XLS é idempotente (zero alterações detectadas)
7. Sync com mudança de filial/tier remove vínculos antigos e cria pendências
