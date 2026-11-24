# QLP & Liderança — Escala do colaborador (design curto)

**Data:** 2026-11-24
**Branch:** `claude/adoring-galileo-xs7fil` (não vai para a `main` sem avaliação)

## Intenção
Registrar a escala de trabalho de cada colaborador (ex.: Segunda a Sexta, Terça a Sábado)
e permitir que o admin defina e personalize as escalas disponíveis. Vale para o QLP e para
a Liderança, que compartilham a tabela `qlp_colaboradores`.

## Objetivos
- Cada colaborador pode ter 1 escala (ou "Não definida").
- Admin cria, renomeia, ajusta os dias, desativa e exclui (se sem uso) escalas.
- Admin e filial atribuem escala (individual e em lote). Filial só na própria filial.
- Escala aparece no Quadro (coluna + filtro), em "Meu time", na ficha do colaborador,
  na exportação do quadro e nos indicadores.
- Toda troca de escala vai para o histórico do QLP (`escala_alterada`).

## Não-objetivos
- Escalas de revezamento (12x36, 6x1): escolha do usuário foi "só dias da semana".
- Não substitui `horario` (07:00–15:20), que continua vindo do XLS.
- Sem motivo obrigatório na troca de escala (diferente de vínculos).

## Anti-objetivo
O import do XLS **não pode** apagar nem sobrescrever a escala já definida.

## Abordagens consideradas
- **A (escolhida): catálogo `qlp_escalas` + `escala_id` no colaborador.** Padroniza nomes,
  permite filtrar e contar, impede apagar escala em uso.
- B: texto livre por colaborador. Rápido, mas gera variações ("Seg-Sex", "seg a sex") e
  filtro/gráfico sujos.
- C: lista em JSON de configuração. Não protege escala em uso e dificulta contagem.

## Desenho
- Tabela `qlp_escalas(id, nome, dias jsonb, ativo, created_at)`; `dias` é lista de 0–6
  (0 = domingo). Nome único sem diferenciar maiúsculas. Seeds: "Segunda a Sexta" e
  "Terça a Sábado".
- `qlp_colaboradores.escala_id` (nullable, FK). O upsert do import lista as colunas que
  atualiza, e `escala_id` não está entre elas.
- Migration `0017_qlp_escalas.sql`, idempotente, com RLS ligada (padrão do projeto).
- Server actions em `actions/qlp/escalas.ts`: criar/atualizar/excluir escala (admin);
  `definirEscalaColaboradores` (admin e filial; valida filial e escala ativa).
- Telas: `/qlp/escalas` (admin), coluna/filtro/edição/lote no Quadro.

## Decisões minhas (não perguntadas)
- Só admin gerencia o catálogo. Filial só escolhe.
- Excluir é permitido apenas se nenhum colaborador usa a escala; senão, desativar.
  Escala desativada continua visível em quem já a tem, mas não pode ser atribuída.
- Lote = selecionar linhas no Quadro e aplicar; sem modal novo.
