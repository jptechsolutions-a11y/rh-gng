# Novo módulo: Quadro de Vagas

Data: 2026-08-25
Status: aprovado

## Contexto

O usuário anexou `QL PERLOG 21.08.xlsx` como referência de estrutura. Colunas:

```
REGIONAL | BANDEIRA | FILIAL | NOME_FUNCAO | DESC_SECAO | EM ABERTO | LIMITE | POTENCIAL | ALOCADOS | AFASTADOS | Total Geral
```

`FILIAL` é o código da filial (mesmo valor de `filiais.codigo`). Cada linha
representa uma combinação (filial, função, seção) e traz **contagens**, não
vagas individuais — ex.: `EM ABERTO = 2` para "AUX. ADMINISTRATIVO" na filial
364.

Pedido: um módulo novo, "Quadro de Vagas", que:
- mostra o quadro atual, limite e vagas em aberto por filial;
- permite que Gente & Gestão marque, **vaga a vaga**, um status individual
  (ex.: 1 das 2 vagas de Aux. Administrativo em "Documentação", a outra
  continua "Em aberto");
- salva quem/quando atualizou o status;
- tem import de planilha (só admin/administradores);
- respeita a mesma regra de acesso/permissão dos demais módulos;
- tem gráfico de vagas por status e vagas em aberto por filial.

Referência de padrão: módulo QLP (`app/(app)/qlp`, `actions/qlp`, `lib/qlp`),
que já tem import com preview + aplicar, filtro por filial via sessão, e
histórico de auditoria.

## Decisões (confirmadas com o usuário)

- **Granularidade**: cada linha importada com `EM ABERTO = N` é "explodida"
  em N registros individuais de vaga, cada um com seu próprio status — é o
  único jeito de dar status independente a vagas da mesma função/filial.
- **Reimportação/reconciliação**: automática, sem tela de decisão vaga a
  vaga (mas com preview do resumo antes de confirmar, no padrão do QLP):
  - `EM ABERTO` da nova planilha maior que o nº de vagas "Em aberto" atuais
    → cria vagas novas com status inicial "Em aberto".
  - Menor → fecha automaticamente as vagas mais **antigas** que ainda
    estão "Em aberto" (nunca mexe em vagas com outro status, ex.:
    "Documentação" — essas só saem manualmente).
  - Combinação (filial, função, seção) que existia antes e não aparece mais
    na nova planilha → tratada como `EM ABERTO = 0` (fecha as remanescentes
    "Em aberto" dessa combinação).
  - Premissa assumida: **cada planilha importada é o retrato nacional
    completo** do quadro naquele momento (não um recorte parcial). Se isso
    mudar no futuro, a lógica de "combinação sumiu = zera" precisa ser
    revista.
  - Fechamento automático é **soft** (`ativa = false`, com
    `motivo_fechamento`), nunca `DELETE` — preserva histórico.
- **Quem edita status de vaga**: admin (qualquer filial) e usuário de filial
  (só a própria filial) — igual ao padrão do QLP. Visualizador é somente
  leitura.
- **Quem importa planilha**: só admin.
- **Catálogo de status**: gerenciável (incluir/editar/excluir), **não** uma
  lista fixa no código. Só admin gerencia. Nasce com: `Em aberto` (protegido,
  é o status inicial obrigatório de toda vaga nova, não pode ser
  renomeado/excluído), `Em processo de documentação`, `Entrevista agendada`,
  `Aguardando aprovação`, `Preenchida`. Um status em uso (com vagas
  vinculadas) só pode ser desativado, não excluído.
- **Visibilidade do módulo**: aberto a todo usuário autenticado (admin,
  filial, visualizador) — igual ao QLP hoje, sem gate por
  `filiais_modulos`/`GATED_MODULES`.
- **Escopo de dados por sessão**: filial vê só sua própria filial; admin vê
  todas; visualizador segue `getFiliaisVisiveis(session)` (lista ou
  nacional), somente leitura.
- **Gráficos**: (1) vagas por status (todas as vagas ativas, agrupadas por
  status), (2) vagas "Em aberto" por filial — ambos com Recharts, no padrão
  visual já usado no projeto (`indicadores`).

## Modelo de dados (`db/schema.ts`)

```ts
export const vagasStatus = pgTable('vagas_status', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  nome: text('nome').notNull().unique(),
  ordem: integer('ordem').notNull().default(0),
  sistema: boolean('sistema').notNull().default(false), // true só para "Em aberto"
  ativo: boolean('ativo').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const vagasQuadroImports = pgTable('vagas_quadro_imports', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  arquivoNome: text('arquivo_nome').notNull(),
  importadoPorNome: text('importado_por_nome').notNull(),
  totalLinhas: integer('total_linhas').notNull(),
  vagasCriadas: integer('vagas_criadas').notNull().default(0),
  vagasFechadas: integer('vagas_fechadas').notNull().default(0),
  filiaisDesconhecidas: jsonb('filiais_desconhecidas').$type<string[]>().notNull().default([]),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const vagasQuadroLinhas = pgTable('vagas_quadro_linhas', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  filialId: uuid('filial_id').notNull().references(() => filiais.id, { onDelete: 'restrict' }),
  regional: text('regional'),
  bandeira: text('bandeira'),
  funcao: text('funcao').notNull(),
  secao: text('secao'),
  limite: integer('limite').notNull().default(0),
  potencial: integer('potencial').notNull().default(0),
  alocados: integer('alocados').notNull().default(0),
  afastados: integer('afastados').notNull().default(0),
  emAbertoImportado: integer('em_aberto_importado').notNull().default(0),
  ultimaImportId: uuid('ultima_import_id').references(() => vagasQuadroImports.id),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  unq: unique('vagas_quadro_linhas_unq').on(t.filialId, t.funcao, t.secao),
  filialIdx: index('vagas_quadro_linhas_filial_idx').on(t.filialId),
}));

export const vagas = pgTable('vagas', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  linhaId: uuid('linha_id').notNull().references(() => vagasQuadroLinhas.id, { onDelete: 'cascade' }),
  filialId: uuid('filial_id').notNull().references(() => filiais.id, { onDelete: 'restrict' }), // denormalizado p/ filtro rápido por sessão
  funcao: text('funcao').notNull(),   // denormalizado p/ evitar join no grid
  secao: text('secao'),
  statusId: uuid('status_id').notNull().references(() => vagasStatus.id, { onDelete: 'restrict' }),
  statusAtualizadoEm: timestamp('status_atualizado_em', { withTimezone: true }).notNull().defaultNow(),
  statusAtualizadoPorNome: text('status_atualizado_por_nome'),
  ativa: boolean('ativa').notNull().default(true),
  motivoFechamento: text('motivo_fechamento'), // 'ajuste_importacao' | null
  origemImportId: uuid('origem_import_id').references(() => vagasQuadroImports.id),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  linhaIdx: index('vagas_linha_idx').on(t.linhaId),
  filialIdx: index('vagas_filial_idx').on(t.filialId),
  statusIdx: index('vagas_status_idx').on(t.statusId),
  ativaIdx: index('vagas_ativa_idx').on(t.ativa),
}));
```

Migration via `npm run db:generate` (padrão do projeto — nunca SQL manual).

## Parser (`lib/vagas/xls-parser.ts`)

Análogo a `lib/qlp/xls-parser.ts`. `parseQuadroVagas(buf)` retorna:

```ts
interface LinhaQuadroVagas {
  regional: string;
  bandeira: string;
  filialCodigo: string; // coluna FILIAL, como texto
  funcao: string;       // NOME_FUNCAO
  secao: string | null; // DESC_SECAO
  emAberto: number;
  limite: number;
  potencial: number;
  alocados: number;
  afastados: number;
}
```

Filtra linhas sem `FILIAL` ou `NOME_FUNCAO`. Ignora `Total Geral` (não usada).

## Lógica de import/reconciliação (`lib/vagas/import-sync.ts`)

`previewImportVagas(linhas)` — dry-run, sem tocar no banco:
- resolve `filialCodigo` → `filiais.id` (marca desconhecidas);
- para cada linha válida, calcula quantas vagas "Em aberto" existem hoje para
  aquela combinação e o delta (criar N / fechar N);
- retorna `{ totalLinhas, linhasValidas, filiaisDesconhecidas, vagasACriar, vagasAFechar, linhasZeradas }`.

`runImportSync(linhas, { arquivoNome, importadoPorNome })` — aplica em
transação:
1. Para cada linha válida: `upsert` em `vagas_quadro_linhas` (por
   `filialId+funcao+secao`), atualizando agregados e `ultimaImportId`.
2. Reconcilia `vagas` daquela linha (cria/fecha "Em aberto" conforme delta).
3. Para toda `vagas_quadro_linhas` existente **não presente** na nova
   planilha: reconcilia como `emAberto = 0` (fecha remanescentes abertas).
4. Grava `vagas_quadro_imports` com os totais.
5. Retorna o resumo aplicado (mesmo formato do preview, mas real).

Vaga nova sempre nasce com `statusId` = status `sistema=true` ("Em aberto").

## Permissões

- `app/(app)/vagas/layout.tsx`: só `await requireSession()` (qualquer
  perfil autenticado) — sem gate por módulo, igual `qlp/layout.tsx`.
- Import (`previewImportVagas`/`aplicarImportVagas` em
  `actions/vagas/importar.ts`): `requireSession('admin')`.
- Catálogo de status (`actions/vagas/status-catalogo.ts`): `requireSession('admin')`.
- Atualizar status de vaga (`actions/vagas/vagas.ts` → `atualizarStatusVaga`):
  `requireSession()`; se `perfil === 'filial'`, valida
  `vaga.filialId === session.filialId` antes de gravar; `visualizador` é
  bloqueado (leitura apenas).
- Listagem/consulta: filtra por `getFiliaisVisiveis(session)` (mesmo helper
  usado pelos outros módulos) — `null` = todas (admin/visualizador
  nacional), lista específica para filial/visualizador por lista.

## Páginas e componentes

- `app/(app)/vagas/page.tsx` — dashboard: dois gráficos no topo
  (`VagasPorStatusChart`, `VagasAbertasPorFilialChart`, Recharts) + tabela
  agrupada Filial → Função/Seção → vagas individuais
  (`VagasQuadroTable.tsx`), com select inline de status por vaga
  (`StatusSelect.tsx`, grava via `atualizarStatusVaga`). Badge/subtítulo com
  filial da sessão, igual ao padrão de `QuadroPage` do QLP.
- `app/(app)/vagas/importar/page.tsx` — upload (`ImportarVagasForm.tsx`) →
  preview (reaproveita padrão de `ImportPreview.tsx`) → confirmar
  (`aplicarImportVagas`). Só renderiza/permite para `perfil === 'admin'`
  (redirect se não-admin, igual `transporte/layout.tsx`).
- `app/(app)/vagas/status/page.tsx` — CRUD do catálogo
  (`StatusCatalogoManager.tsx`): listar, criar, editar nome/ordem,
  desativar. "Em aberto" aparece travado (sem botão excluir/editar nome).
  Admin only.
- Menu principal: novo item "Quadro de Vagas" apontando para `/vagas`
  (mesmo componente de navegação usado pelos demais módulos).

## Testes

Seguindo o padrão de `lib/qlp/*.test.ts` (Vitest):
- `lib/vagas/xls-parser.test.ts` — parsing de linhas válidas/ignoradas,
  mojibake/encoding se aplicável.
- `lib/vagas/import-sync.test.ts` — casos centrais da reconciliação: criar
  delta positivo, fechar delta negativo (respeitando ordem "mais antiga
  primeiro" e nunca tocar status não-"Em aberto"), zerar linha ausente na
  nova planilha, filial desconhecida não aplicada.
- Teste de permissão: filial não pode atualizar status de vaga de outra
  filial; não-admin não acessa import/catálogo de status.
