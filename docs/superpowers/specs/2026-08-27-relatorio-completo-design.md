# Relatório Completo de Indicadores — Design

**Data:** 2026-08-27
**Status:** aprovado (aguardando revisão da spec)
**Autor:** Juliano Correa + Claude

## Objetivo

Novo módulo **Relatório Completo** que gera uma apresentação PowerPoint (`.pptx`)
resumindo todos os indicadores de Gente & Gestão de uma filial num único deck —
espelhando o `RelatorioCompleto` da *Produtividade Perlog* (`Desktop/JP/
Produtividade-Perlog-main`), que usa `pptxgenjs` como motor.

Cada deck traz uma tela de **resumo executivo** com todos os indicadores e depois
**1 slide por indicador** (gráfico + leitura curta dos números).

Indicadores no escopo:

1. Banco de Horas
2. Inconsistências
3. Cursos Obrigatórios
4. Feriados Pendentes
5. Quadro de Vagas

Fora do escopo: QLP / Liderança, ranking "Início" como slide próprio, seletor de
datas (os indicadores de RH são snapshot atual vs. anterior).

## Abordagem escolhida

**Route handler no servidor.** `POST /api/relatorio-completo` recebe os IDs das
filiais, roda `pptxgenjs` no Node (gráficos de PPTX são XML — não precisam de
render), gera 1 `.pptx` por filial, empacota num `.zip` com `jszip` e devolve para
download.

Motivos: mantém `pptxgenjs` fora do bundle do cliente; os dados já vêm da camada
`db`/server; evita o bloqueio de downloads múltiplos do navegador (na Produtividade
Perlog isso funciona só porque é Electron).

Rejeitado — geração no cliente (espelho literal da referência): manda ~1 MB de
`pptxgenjs` para o browser e esbarra no bloqueio de downloads múltiplos.

## Arquitetura

```
app/(app)/relatorio-completo/
  page.tsx                      server component; guard admin; lista filiais visíveis
components/relatorio-completo/
  RelatorioCompletoClient.tsx   client; multi-seleção de filiais, botão gerar, progresso, baixa o zip
lib/relatorio-completo/
  coletar.ts                    (server) agrega os dados de UMA filial
  pptx.ts                       o motor: gerarDeckFilial(dados) => Uint8Array + helpers de slide
  texto.ts                      regras que transformam números em frases de leitura
  tipos.ts                      DadosFilialRelatorio e sub-tipos
app/api/relatorio-completo/
  route.ts                      POST { filialIds }; guard admin; loop; zip; resposta
components/layout/nav-config.ts item novo no menu admin
components/layout/Sidebar.tsx   fiação do item (segue o padrão existente)
```

### Dependências

- **Adicionar** `pptxgenjs@^4.0.1` em `dependencies` (hoje só é usado por
  `scripts/build-manual-pptx.js` e nem está instalado em `node_modules`).
- `jszip` já existe como transitivo — promover a dependência direta.
- **Caveat de instalação:** o path do projeto tem `&`
  (`C:\Users\juliano.correa\Desktop\G&G`), o que quebra shims spawnados via
  `cmd.exe`. `npm install <pkg>` costuma funcionar; se falhar, instalar por outro
  caminho. Ver `memory/build-gotchas.md`.

## Coleta de dados (`lib/relatorio-completo/coletar.ts`)

Reusa a camada existente, escopada a **uma** filial via `[filialId]`:

| Indicador | Fetch | Agregação |
|---|---|---|
| Banco de Horas | `fetchSnapshotRows(bhSnapshotAtual, [id])` + `...Anterior` | `agregarResumo`, `top5Por(_, 'secao'\|'funcao')`, `bhMeta` |
| Inconsistências | `fetchInconsistRows([id])` | `agregarResumoInconsist`, `top5PorInconsist(_, 'tipo'\|'secao')`, `inconsistMeta` |
| Cursos | `fetchCursosRows(cursosSnapshotAtual, [id])` + `...Anterior` | `agregarResumoCursos` (atual + anterior), `top5PorCursos(_, 'tipo'\|'secao')`, `cursosMeta` |
| Feriados | `fetchFeriadosRows([id])` | `agregarResumoFeriados`, `top5PorFeriados(_, 'pendencia'\|'secao')`, `feriadosMeta` |
| Vagas | query de `schema.vagas` (ativa=true, filialId=id) — mesma lógica de `app/(app)/vagas/page.tsx` | contagem por status / por seção; total do status "sistema" (aberta) |

Ranking: para o card "posição no ranking" do resumo executivo, `coletar.ts`
recebe também os totais das outras filiais visíveis (uma passada agregada, sem
detalhe) e devolve a posição da filial em cada indicador.

### Comparação com período anterior

| Indicador | Tem histórico? | Card do resumo executivo |
|---|---|---|
| Banco de Horas | sim (snapshot anterior) | valor + variação ▲/▼ + ranking |
| Cursos | sim (snapshot anterior) | valor + variação ▲/▼ + ranking |
| Inconsistências | não | valor atual + ranking |
| Feriados | não | valor atual + ranking |
| Vagas | não | valor atual + ranking |

## Motor de slides (`lib/relatorio-completo/pptx.ts`)

Estrutura e helpers portados do estilo de `utils/pptxExportCompleto.ts`:
`LAYOUT_WIDE` (13.33 × 7.5), `capa()`, `header(titulo, subtitulo, filial)`,
`rodape(pagina, total)`, `card()`, `chartBarras()` / `chartRosca()`, `tabela()`
com faixa de cabeçalho navy.

**Paleta — marca G&G** (igual `scripts/build-manual-pptx.js`):
navy `#0B2447`, orange `#F37021`, apoio slate/soft/border; verde/âmbar/vermelho
para variações.

### Deck por filial — 8 slides

| # | Slide | Conteúdo |
|---|---|---|
| 1 | **Capa** | navy; "Relatório Completo de Indicadores — Gente & Gestão"; nome + código da filial; "Gerado em <data>" |
| 2 | **Resumo executivo** | 5 cards (um por indicador): valor atual, variação ▲/▼ quando houver, posição no ranking; um gráfico de barras horizontais com a posição da filial vs. as demais (indicador âncora: Banco de Horas) |
| 3 | **Banco de Horas** | cards (colaboradores c/ saldo, total de horas, valor c/ encargos); gráfico Top 5 seções (barras); parágrafo de leitura; "Atualizado em <bhMeta>" |
| 4 | **Inconsistências** | cards (total, nº colaboradores); gráfico Top 5 tipos; parágrafo; meta |
| 5 | **Cursos Obrigatórios** | cards (pendências atual, variação vs. anterior); gráfico Top 5 cursos/tipos; parágrafo; meta |
| 6 | **Feriados Pendentes** | cards (total pendências, nº seções afetadas); gráfico Top 5 seções; parágrafo; meta |
| 7 | **Quadro de Vagas** | cards (vagas abertas, seções com vaga); gráfico por status + gráfico por seção; parágrafo |
| 8 | **Encerramento** | navy; "Gente & Gestão · Perlog"; data |

Slide de indicador **sem dados importados** (meta nula): mantém o slide com aviso
"Sem dados importados para esta filial" no lugar do gráfico.

### Textos de leitura (`lib/relatorio-completo/texto.ts`)

Frases geradas por regras sobre os números — **sem IA**. Exemplos:

- BH: `"Saldo de {h} h em {n} colaboradores. {Cresceu|Caiu} {p}% vs. período anterior. Maior concentração em {secaoTop}."`
- Inconsist.: `"{n} inconsistências em {c} colaboradores. Tipo predominante: {tipoTop} ({pct}%)."`
- Vagas: `"{n} vagas abertas. {secaoTop} concentra {pct}% do quadro em aberto."`

Regras de sinal/limiar (ex.: variação < 1% = "estável") ficam em constantes no topo
do arquivo. Testável isoladamente.

## API (`app/api/relatorio-completo/route.ts`)

- `POST`, body `{ filialIds: string[] }`.
- `requireSession()` → **403 se `perfil !== 'admin'`**.
- Valida que cada `filialId` está no escopo visível do usuário.
- Para cada filial: `coletar(filialId, contexto)` → `gerarDeckFilial(dados)`.
- 1 filial → responde o `.pptx` (`Content-Type` pptx, `Content-Disposition`
  `Relatorio_Completo_<FILIAL>_<AAAA-MM-DD>.pptx`).
- 2+ filiais → `jszip` com um `.pptx` por filial →
  `Relatorio_Completo_Indicadores_<AAAA-MM-DD>.zip`.
- Erro em uma filial não derruba o lote: registra e segue; se todas falharem, 500.
- Timeout: em muitas filiais a geração pode passar de alguns segundos — a rota
  declara `export const maxDuration = 60` e `dynamic = 'force-dynamic'`.

## UI (`RelatorioCompletoClient.tsx`)

- Lista de filiais visíveis com checkbox; "Selecionar todas" marcado por padrão.
- Botão **Gerar relatório** → `fetch('/api/relatorio-completo', { method: POST })`
  → `res.blob()` → download via link temporário.
- Estados: ocioso / gerando (spinner + "Gerando N decks…") / erro (toast `sonner`).
- Segue o visual dos outros módulos (`TopBar`, cartões shadcn, `font-display`).

## Navegação

`nav-config.ts`: novo array `RELATORIO_COMPLETO_NAV` **ou** item adicionado ao
bloco admin — a decisão de fiação segue como a Sidebar já monta os menus por
perfil. Ícone: `FileBarChart` (lucide). Rota `/relatorio-completo`, só admin.

## Testes

- `lib/relatorio-completo/texto.test.ts` — cada regra de frase, incluindo bordas
  (zero, variação nula, sem seção).
- `lib/relatorio-completo/coletar.test.ts` — agregação e cálculo de posição no
  ranking com fixtures (mesma abordagem de `bh-queries.test.ts`).
- `pptx.ts`: smoke test — `gerarDeckFilial(fixture)` resolve para `Uint8Array`
  não-vazio e não lança com indicador sem dados.
- Sem teste E2E do arquivo PPTX renderizado.

## Riscos / questões em aberto

- **Formato dos gráficos no PPTX gerado no servidor:** `pptxgenjs` embute os
  gráficos como XML nativo do Office — validar num PowerPoint real no primeiro
  corte.
- **`maxDuration` da Vercel:** plano atual pode limitar a 60 s; se o lote de 9
  filiais estourar, cair para geração sequencial com resposta em streaming ou
  limitar filiais por request.
- **`top5Por` para 'tipo' em cursos:** confirmar no código que o campo existe
  (`top5PorCursos(_, 'tipo')` já é usado em `getDadosCursos`).
