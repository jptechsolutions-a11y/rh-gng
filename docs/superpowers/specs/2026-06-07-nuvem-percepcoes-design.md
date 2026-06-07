# Nuvem de Palavras — Percepção G&G

Data: 2026-06-07
Branch: v3

## Objetivo

Nova aba em `/escuta` que apresenta uma nuvem de palavras animada e dinâmica
das **percepções finais** (`escuta_reunioes.percepcao_final`). Palavras com mais
ocorrências aparecem maiores e mais escuras; clicar revela todas as percepções
em que ela apareceu, com a palavra destacada, data e filial.

## Escopo

- Filial: vê apenas a nuvem e percepções da própria filial.
- Admin: vê tudo, com filtro de filial (dropdown) e, quando sem filtro, cada
  card de percepção mostra a filial.
- Todos os cards mostram a data (`data_reuniao`) da reunião.

Fora de escopo: filtro por período, exportação, edição de stopwords pela UI.

## Navegação

Adicionar 5ª aba na escuta: `tab=nuvem`, label "Nuvem", ícone `Cloud` (lucide).
- Atualizar `components/escuta/escuta-tabs.shared.ts` (incluir `'nuvem'` no
  `TabKey` e `parseTab`).
- Atualizar `components/layout/nav-config.ts` (`ESCUTA_NAV_BASE`).
- Atualizar `app/(app)/escuta/page.tsx` para renderizar a view.

## Arquitetura

### Server Action (`actions/escuta.ts`)

```ts
listarPercepcoesNuvem(filtro?: { filialCodigo?: string }):
  Promise<Array<{ id, filialCodigo, filialNome, dataReuniao, texto }>>
```

Regras:
- Filial: força `filialCodigo = s.filialCodigo`, ignora `filtro`.
- Admin: aplica `filtro.filialCodigo` se vier.
- Seleciona `id, filial_codigo, filial_nome, data_reuniao, percepcao_final`
  ordenado por `data_reuniao desc`, limit 1000.
- Reaproveita índice `escuta_reunioes_filial_data_idx`.

Adicional para admin:
```ts
listarFiliaisComPercepcoes(): Promise<Array<{ codigo, nome }>>
```
Retorna `distinct (filial_codigo, filial_nome)` ordenado por nome — alimenta
o dropdown de filial. Só usado no perfil admin.

### Página

`app/(app)/escuta/page.tsx`: quando `active === 'nuvem'`, carrega
`listarPercepcoesNuvem()` (sem filtro server-side; filtro fica no client p/
admin alternar sem reload) e — se admin — `listarFiliaisComPercepcoes()`.
Passa para `<NuvemPercepcoes percepcoes={...} filiais={...} ehAdmin={...}/>`.

### Componente client (`components/escuta/NuvemPercepcoes.tsx`)

Responsabilidades:
1. Tokenização + contagem (client-side, memoizada por `percepcoes` + filtro).
2. Renderiza `react-wordcloud` com top 50 palavras.
3. Dropdown de filial (apenas admin).
4. Modal/painel lateral quando uma palavra é clicada.

Tokenização (`lib/escuta/nuvem.ts`, função pura, testável):
```ts
tokenizar(texto: string): string[]
contarOcorrencias(textos: string[]): Array<{ text: string; value: number }>
```
- Normalize: `toLowerCase` + `normalize('NFD').replace(/\p{Diacritic}/gu,'')`.
- Quebra por `/[^a-z0-9]+/`.
- Descarta tokens com menos de 3 chars.
- Descarta stopwords PT-BR (lista em `lib/escuta/stopwords-pt.ts`, ~150
  palavras: artigos, preposições, pronomes, conectivos, verbos auxiliares
  comuns: ser/estar/ter/haver/ir conjugados, advérbios genéricos).
- Retorna ordenado desc por `value`, fatiado em 50.

Escala visual (em `NuvemPercepcoes`):
- `minFreq`, `maxFreq` derivados do conjunto atual.
- Fonte: 14–72px (linear).
- Cor: HSL Conecta `hsl(214, 88%, L%)` com `L` indo de 65% (raras) a 25%
  (frequentes); pode usar `opacity` 0.5→1 alternativamente.
- `react-wordcloud` props: `options={{ rotations: 2, rotationAngles: [0, -20],
  fontSizes: [14, 72], transitionDuration: 600, deterministic: true,
  fontFamily: 'Poppins' }}` + `callbacks.onWordClick`.

Modal/painel:
- Ao clicar palavra, abre `Sheet` (já usado no projeto) lateral pela direita.
- Lista todas as percepções cujo texto (após normalização) contém a palavra
  como **token completo** (regex `\b<palavra>\b`).
- Cada item: chip data (`dd/MM/yyyy`), chip filial (só admin sem filtro),
  texto com a palavra destacada (`<mark>`).
- Ordenação: `dataReuniao desc`.

Filtro de filial (admin):
- `Select` simples acima da nuvem: "Todas as filiais" + lista.
- Re-deriva contagem e re-renderiza nuvem (animação built-in cuida da
  transição).

### Empty states

- Sem percepções: card centralizado "Nenhuma percepção registrada ainda."
- Sem percepções para a filial filtrada (admin): variante "Esta filial ainda
  não tem percepções."

## Dependência nova

`react-wordcloud` (peer: `d3` já indireto). Caso o pacote esteja desatualizado,
fallback: `@visx/wordcloud`. Decidir na fase de plan via `npm view`.

## Testes

Função pura `tokenizar` + `contarOcorrencias`:
- Caso vazio
- Acentos normalizados ("ação" e "acao" contam juntos)
- Stopwords removidas
- Tokens < 3 chars removidos
- Limite top 50
- Caso com pontuação e quebras de linha

## Riscos / decisões abertas

- Volume: se >500 reuniões, tokenização client pode pesar. Mitigação: limit
  1000 + memoização. Se virar problema, mover contagem para server action.
- Stopwords: lista inicial estática; ajustes futuros via PR (sem UI).
