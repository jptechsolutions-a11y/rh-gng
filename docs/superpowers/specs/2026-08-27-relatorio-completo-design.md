# Relatório Consolidado de Indicadores — Design

**Data:** 2026-08-27
**Status:** revisado (era "1 deck por filial"; agora **1 deck consolidado comparando os CDs**)
**Autor:** Juliano Correa + Claude

## Objetivo

Novo módulo admin **Relatório Completo** (`/relatorio-completo`) que gera **UMA
apresentação PowerPoint consolidada** comparando todos os CDs (filiais) nos
indicadores de Gente & Gestão, com **ranking por indicador** — espelha o modo
*benchmarking* do `RelatorioCompleto` da *Produtividade Perlog*
(`Desktop/JP/Produtividade-Perlog-main/.../utils/pptxExportCompleto.ts`), que usa
`pptxgenjs`.

**Não** é um arquivo por filial. É um único `.pptx` que ranqueia os CDs.

Indicadores no escopo:

1. Banco de Horas (ranking por saldo de horas)
2. Inconsistências
3. Cursos Obrigatórios
4. Feriados Pendentes
5. Quadro de Vagas (vagas em aberto)

Regra de ranking: **menor valor = melhor = posição 1** em todos os indicadores.

Fora do escopo: QLP / Liderança; seletor de datas (indicadores de RH são snapshot
atual vs. anterior).

## Abordagem

**Route handler no servidor.** `POST /api/relatorio-completo` recebe (opcional)
os IDs dos CDs a comparar — padrão: todos do escopo do usuário. Roda `pptxgenjs`
no Node, monta **um** deck e devolve `.pptx` para download. Sem `.zip`, sem
geração por filial.

`pptxgenjs` fica fora do bundle do cliente; os dados já vêm da camada `db`/server;
gráficos de PPTX são XML nativo (não precisam de render).

## Estrutura do deck (9 slides)

| # | Slide | Conteúdo |
|---|---|---|
| 1 | **Capa** | navy; "Relatório Consolidado de Indicadores — Gente & Gestão"; "{N} CDs comparados"; "Gerado em {data}" |
| 2 | **Visão geral comparativa** | Tabela: **CDs nas linhas × 5 indicadores nas colunas** (valor atual). Células com **heatmap** — verde = melhor (menor), vermelho = pior (maior). Coluna final: posição média (ranking geral do CD). |
| 3 | **Ranking — Banco de Horas** | Gráfico de barras horizontais, todos os CDs, ordenado do melhor (topo) ao pior. Callouts: 🥇 melhor CD + valor · 🔻 pior CD + valor. Linha de variação: "maior evolução {CD} ({Δ%}) · maior piora {CD} ({Δ%})" (BH tem histórico). Leitura curta. |
| 4 | **Ranking — Inconsistências** | idem, sem linha de variação (sem histórico). |
| 5 | **Ranking — Cursos Obrigatórios** | idem #3, com linha de variação (tem histórico). |
| 6 | **Ranking — Feriados Pendentes** | idem #4. |
| 7 | **Ranking — Vagas em Aberto** | idem #4. |
| 8 | **Pódio** | 5 cards (um por indicador): 🏆 o CD nº 1 + valor. Estilo `drawPodiumCard` da referência. |
| 9 | **Encerramento** | navy; "Gente & Gestão · Perlog"; data. |

Indicador **sem dados importados** (meta nula / zero linhas): o CD entra no
ranking com valor `0` e um marcador "sem dados"; se **nenhum** CD tem dados do
indicador, o slide mostra aviso "Sem dados importados" no lugar do gráfico.

**Variação vs. anterior:** só Banco de Horas e Cursos têm snapshot anterior.
Inconsistências, Feriados e Vagas não — nesses, sem coluna/linha de Δ.

**Paleta:** marca G&G — navy `#0B2447`, orange `#F37021` (igual
`scripts/build-manual-pptx.js`). Heatmap: escala verde→amarelo→vermelho.

## Arquitetura

```
app/(app)/relatorio-completo/page.tsx        server; guard admin; lista CDs visíveis
components/relatorio-completo/RelatorioCompletoClient.tsx
                                             client; multi-seleção de CDs (padrão todos), botão, download
lib/relatorio-completo/tipos.ts              DadosConsolidado, RankingIndicador, CDIndicador
lib/relatorio-completo/ranking.ts            posicaoNoRanking() — JÁ IMPLEMENTADO, sem mudança
lib/relatorio-completo/coletar.ts            (server) coletarContexto() + coletarConsolidado()
lib/relatorio-completo/texto.ts              leituraRanking() por indicador — regras, sem IA
lib/relatorio-completo/pptx.ts               gerarDeckConsolidado() + helpers de slide
app/api/relatorio-completo/route.ts          POST { filialIds? }; guard admin; 1 .pptx
components/layout/nav-config.ts              item "Relatório Completo" em ADMIN_NAV — JÁ FEITO
```

### Dependências

- `pptxgenjs@^4.0.1` — **já instalado**.
- `jszip` — **não é mais necessário** para este módulo (deck único). Deixar a dep
  como está (é transitiva de qualquer forma); remover só o uso em `route.ts`.

### Coleta (`coletar.ts`)

- `coletarContexto(escopo: string[] | null)` — **já implementado**, sem mudança:
  faz os fetches de todas as filiais do escopo (bh atual+anterior, inconsist,
  cursos atual+anterior, feriados, vagas) + metas.
- **NOVO** `coletarConsolidado(ctx, cds: {id,codigo,nome}[]): DadosConsolidado`:
  para cada indicador, para cada CD → agrega valor atual (reusa
  `agregarResumo*`), calcula Δ% vs. anterior (BH, Cursos), ranqueia via
  `posicaoNoRanking`, ordena, e chama `texto.leituraRanking`.

O que sai: `montarResumoExecutivo`, `coletarFilial` (eram do modelo por-filial).

### `tipos.ts` (reescrito)

```ts
export type CDIndicador = {
  filialId: string; codigo: string; nome: string;
  valor: number; valorFmt: string;
  variacao: { deltaPct: number | null; tendencia: 'melhorou'|'piorou'|'neutro' } | null;
  posicao: number;                 // 1 = melhor (menor valor)
};
export type RankingIndicador = {
  chave: 'bh'|'inconsist'|'cursos'|'feriados'|'vagas';
  titulo: string; temHistorico: boolean; semDados: boolean;
  cds: CDIndicador[];              // ordenado por posicao asc
  leitura: string;
};
export type DadosConsolidado = {
  geradoEm: string; totalCDs: number;
  rankings: RankingIndicador[];    // ordem: bh, inconsist, cursos, feriados, vagas
};
```

### `texto.ts`

`leituraRanking(chave, cds: CDIndicador[]): string` — ex.:
`"{CD líder} lidera com {valor}; {CD lanterna} é o ponto de atenção ({valor}). Amplitude de {X}× entre o melhor e o pior."`
Para BH/Cursos, acrescenta a maior evolução e a maior piora.

### `pptx.ts`

Helpers reaproveitados do que já existe (`header`, `footer`, `card`,
`chartBarras`) + **novos**: `tabelaHeatmap(cds × indicadores)` e `podio(rankings)`.
`gerarDeckConsolidado(d: DadosConsolidado): Promise<Uint8Array>`.

Sai: `gerarDeckFilial`.

### Route (`route.ts`)

- `POST`, body `{ filialIds?: string[] }` (ausente/vazio ⇒ todos do escopo).
- `requireSession()` → **403 se `perfil !== 'admin'`**.
- Valida IDs contra o escopo visível.
- `coletarContexto` → `coletarConsolidado` → `gerarDeckConsolidado`.
- Responde **um** `.pptx`: `Relatorio_Consolidado_Indicadores_<AAAA-MM-DD>.pptx`.
- `export const runtime = 'nodejs'`, `dynamic = 'force-dynamic'`, `maxDuration = 60`.
- Remove: import de `jszip`, ramo do `.zip`, header `X-Relatorio-Falhas`.

### UI

Multi-seleção de CDs (default: todos) para poder comparar um subconjunto. Botão
**"Gerar relatório consolidado"** → `fetch` POST → baixa **um** `.pptx`. Toast de
sucesso/erro (`sonner`). Sem aviso de "_falhas.txt".

## Testes

- `ranking.test.ts` — **já passa**, sem mudança.
- `texto.test.ts` — reescrito para `leituraRanking` (líder, lanterna, amplitude,
  evolução; bordas: 1 CD, valores zero, sem histórico).
- `coletar.test.ts` — reescrito: testa a parte pura de `coletarConsolidado`
  (ordenação, posições, Δ%) com fixtures de contexto.
- `pptx.test.ts` — smoke: `gerarDeckConsolidado(fixture)` → `Uint8Array` não-vazio,
  9 slides; não quebra com indicador `semDados` e com 1 CD só.

## Riscos

- Legibilidade da tabela heatmap e do gráfico de ranking com ~15 CDs — validar
  num PowerPoint real (fontSize, altura de linha).
- `maxDuration` da Vercel: um único deck com 15 CDs deve ficar bem abaixo de 60 s
  (o modelo por-filial gerava 1 deck em ~2 s).
- Trabalho já implementado no modelo "por filial" (`coletarFilial`,
  `gerarDeckFilial`, ramo zip) será substituído — commits ficam no histórico da
  branch.
