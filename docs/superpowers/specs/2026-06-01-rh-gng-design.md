# Sistema de Gente & Gestão (RH) — G&G

**Data:** 2026-06-01
**Autor:** Juliano Patrick Correa
**Status:** Design aprovado verbalmente — aguardando revisão escrita

---

## 1. Visão geral

Sistema web para auxiliar entrevistas de RH nas 9 filiais do grupo G&G. Cada filial acessa via senha única, registra candidatos com roteiro guiado, ficha de avaliação e decisão final, alimentando um **Banco de Talentos** consultável e revisável. RH central (admin) tem visão consolidada, dashboards, filtros e exportação.

### 1.1 Filiais atendidas

| Código | UF | Nome |
|--------|----|------|
| 464 | MT | TREVO |
| 468 | MT | PONTE NOVA |
| 743 | MS | GUAICURUS |
| 783 | SC | SÃO JOSÉ |
| 264 | SC | PORTO BELO |
| 773 | RS | SÃO LEOPOLDO |
| 713 | SP | VARGEM GRANDE |
| 733 | SP | JACAREÍ |
| 364 | DF | SIA |

### 1.2 Objetivos do MVP

- Padronizar entrevistas em todas as filiais
- Registrar histórico imutável de candidatos e decisões
- Detectar reentradas pelo CPF (com histórico cruzado)
- Disponibilizar Banco de Talentos por filial
- Permitir gestão central pelo RH

### 1.3 Não-objetivos (fora do MVP)

- Folha de pagamento, ponto, gestão de colaboradores ativos
- Integração com ATS externos (Gupy, Kenoby, etc.)
- App mobile nativo (responsivo via navegador é suficiente)

---

## 2. Arquitetura

```
┌─────────────────────────────────────────────────────┐
│  Web App (Apps Script HTML Service)                 │
│  ├─ Login (senha por filial ou admin)               │
│  ├─ Painel da Filial                                │
│  ├─ Wizard de Entrevista (4 passos)                 │
│  ├─ Banco de Talentos (escopo: filial)              │
│  └─ Console Admin (dashboard + busca + config)      │
└────────────────────┬────────────────────────────────┘
                     │ google.script.run
┌────────────────────▼────────────────────────────────┐
│  Backend Apps Script                                │
│  ├─ Auth.gs                                         │
│  ├─ Candidatos.gs                                   │
│  ├─ Entrevistas.gs                                  │
│  ├─ Config.gs                                       │
│  ├─ Relatorios.gs                                   │
│  ├─ Drive.gs                                        │
│  ├─ Log.gs                                          │
│  └─ Utils.gs                                        │
└────────────────────┬────────────────────────────────┘
                     │ SpreadsheetApp / DriveApp
┌────────────────────▼────────────────────────────────┐
│  Google Sheets (banco) + Google Drive (PDFs)        │
│  Planilha alvo: 1eZ4EXsnUV6t3w_A5K7lwGFK4zygjVGF0… │
└─────────────────────────────────────────────────────┘
```

### 2.1 Decisões-chave

- **Apps Script Web App**: `doGet` serve a SPA; chamadas via `google.script.run`.
- **Sessões**: token em `PropertiesService` + cookie cliente, TTL 8h.
- **Senhas**: SHA-256 com salt fixo. Trocáveis via tela admin.
- **Storage de PDFs**: pasta `RH-G&G/Curriculos/<FILIAL>/<CPF>_<nome>.pdf` no Drive.
- **Modularidade**: lógica de negócio separada do `SpreadsheetApp` para facilitar migração futura para Next.js + Vercel + Supabase.

---

## 3. Estrutura da planilha

### 3.1 Abas de dados (1 por filial, total 9)

Nomes: `464-MT-TREVO`, `468-MT-PONTE-NOVA`, `743-MS-GUAICURUS`, `783-SC-SAO-JOSE`, `264-SC-PORTO-BELO`, `773-RS-SAO-LEOPOLDO`, `713-SP-VARGEM-GRANDE`, `733-SP-JACAREI`, `364-DF-SIA`.

Cada linha = uma entrevista. Colunas:

| Col | Campo | Tipo | Observações |
|-----|-------|------|-------------|
| A | id_entrevista | texto | `ENT-YYYYMMDD-####` |
| B | data_hora | datetime | auto |
| C | filial | texto | redundância p/ filtros |
| D | cpf | texto | chave do candidato |
| E | nome | texto | |
| F | data_nasc | data | |
| G | rg | texto | |
| H | telefone | texto | |
| I | email | texto | |
| J | cidade | texto | |
| K | cargo_pretendido | seleção (`_CONFIG_CARGOS`) | |
| L | pretensao_salarial | número | |
| M | experiencias | texto longo | |
| N | linkedin | texto | opcional |
| O | escolaridade | seleção | |
| P | estado_civil | seleção | |
| Q | tem_filhos | sim/não | |
| R | possui_cnh | seleção (Não/A/B/AB/C/D/E) | |
| S | veiculo_proprio | sim/não | |
| T | disponibilidade_turnos | multi (`_CONFIG_OPCOES.turnos`) | |
| U | disponibilidade_inicio | data | |
| V | disponibilidade_viagem | sim/não | |
| W | pcd | sim/não | |
| X | pcd_tipo | texto | condicional |
| Y | pcd_laudo_url | link Drive | condicional |
| Z | indicacao | sim/não | |
| AA | indicado_por_nome | texto | condicional |
| AB | indicado_por_cargo | texto | condicional |
| AC | fumante | sim/não | |
| AD | ja_trabalhou_grupo | sim/não | |
| AE | ja_trabalhou_quando | texto | condicional |
| AF | curriculo_url | link Drive | opcional |
| AG | respostas_roteiro | JSON | `{"q_id":"resposta", ...}` |
| AH | notas_criterios | JSON | `{"crit_id":nota, ...}` |
| AI | media_notas | número | calculada |
| AJ | observacoes | texto longo | |
| AK | nota_geral | número (0–10) | |
| AL | status | seleção | `Aprovado` / `Reprovado` / `Banco de Talentos` / `Contratado` / `Em análise` |
| AM | motivo_decisao | texto | obrigatório se Reprovado |
| AN | proxima_etapa | texto | |
| AO | data_retorno | data | |
| AP | recrutador | texto | filial logada |
| AQ | atualizado_em | datetime | |
| AR | atualizado_por | texto | |

### 3.2 Abas de configuração

- **`_CONFIG_FILIAIS`**: `codigo | nome | senha_hash | ativa`
- **`_CONFIG_CARGOS`**: `nome_cargo | ativo`
- **`_CONFIG_ROTEIRO`**: `id | cargo (ou "TODOS") | ordem | pergunta | tipo (texto/sim-nao/escala)`
- **`_CONFIG_CRITERIOS`**: `id | nome_criterio | escala_max | peso | ativo`
- **`_CONFIG_OPCOES`**: `chave | valor` — listas suspensas editáveis (escolaridade, estado_civil, turnos, cnh, status)
- **`_CONFIG_ADMIN`**: `usuario | senha_hash`

### 3.3 Abas de log

- **`_LOG_HISTORICO`**: `id_entrevista | data_hora | de_status | para_status | usuario | motivo` — auditoria imutável de mudanças.
- **`_LOG_ACESSOS`**: `data_hora | filial/admin | acao | ip` — opcional.

---

## 4. Telas e fluxos

### 4.1 Login
Senha por filial (detecta filial pela senha) ou usuário+senha do admin. Token de 8h.

### 4.2 Painel da Filial
Cards: entrevistas hoje, no Banco de Talentos, aguardando retorno, aprovados no mês. Botão **+ Nova Entrevista**. Tabela de últimas entrevistas com filtros.

### 4.3 Wizard de Entrevista (4 passos)

**Passo 1 — Identificação**
CPF primeiro. Busca em todas as abas. Se já existe → alerta amarelo com histórico e opção "Usar dados anteriores". Dados pessoais, documentos, cargo, escolaridade, estado civil, filhos.

**Passo 2 — Perfil & Disponibilidade**
Experiências, pretensão, CNH, veículo, turnos, data de início, viagem, PCD (condicional), indicação (condicional), fumante, já trabalhou no grupo (condicional), uploads opcionais (CV, laudo PCD).

**Passo 3 — Entrevista guiada**
Carrega perguntas de `_CONFIG_ROTEIRO` filtradas por cargo + "TODOS". Cada pergunta vira campo (texto/sim-não/escala).

**Passo 4 — Avaliação & Decisão**
Sliders por critério (de `_CONFIG_CRITERIOS`). Média ponderada em tempo real. Observações, nota geral (0–10). Decisão: Aprovado / Banco de Talentos / Reprovado. Motivo obrigatório se Reprovado. Próxima etapa + data de retorno opcionais. Salvar grava na aba da filial + linha em `_LOG_HISTORICO`.

### 4.4 Banco de Talentos (filial)
Lista só da própria filial com status `Banco de Talentos`. Filtros: cargo, cidade, disponibilidade, data, nota mínima. Ficha completa com histórico. Botões: Aprovar / Reprovar / Reagendar / Promover a Contratado — toda mudança vai pro `_LOG_HISTORICO`.

### 4.5 Console Admin
- **Dashboard**: gráficos por filial, mês, taxa de aprovação, banco consolidado, top cargos, tempo médio entrevista→decisão.
- **Busca global**: por CPF, nome, cargo, filial, status, período.
- **Banco de Talentos consolidado**: todas as filiais.
- **Exportação**: CSV/Excel do resultado filtrado.
- **Gestão**: CRUD em roteiro, critérios, cargos, opções, senhas de filial; visualização de `_LOG_HISTORICO`.

### 4.6 UX
Responsivo (tablet/celular). Auto-save de rascunho a cada 30s. Validação de CPF/email/telefone/datas. Idioma pt-BR.

---

## 5. Implementação

### 5.1 Stack
- Apps Script V8 + HTML Service
- Alpine.js (CDN) para reatividade
- Tailwind CSS (CDN) para estilo
- Chart.js (CDN) para gráficos

### 5.2 Estrutura de arquivos

```
/
├─ Code.gs                    (doGet, roteamento)
├─ src/
│  ├─ Auth.gs
│  ├─ Candidatos.gs
│  ├─ Entrevistas.gs
│  ├─ Config.gs
│  ├─ Relatorios.gs
│  ├─ Drive.gs
│  ├─ Log.gs
│  └─ Utils.gs
├─ ui/
│  ├─ index.html
│  ├─ login.html
│  ├─ painel-filial.html
│  ├─ entrevista.html
│  ├─ banco-talentos.html
│  ├─ admin.html
│  ├─ admin-config.html
│  ├─ styles.html
│  └─ scripts.html
└─ appsscript.json
```

### 5.3 Setup inicial — `setupPlanilha()`
1. Cria as 9 abas de filial com cabeçalhos.
2. Cria abas `_CONFIG_*` e `_LOG_*`.
3. Popula valores padrão (filiais com senhas geradas e exibidas uma única vez; critérios, opções, cargos iniciais).
4. Cria pasta `RH-G&G/Curriculos/` no Drive.

### 5.4 Segurança
- SHA-256 + salt para senhas.
- Token de sessão validado em toda chamada do backend.
- Filtro server-side por filial — front-end nunca recebe dados de outras unidades.
- LGPD: campo de consentimento no Passo 1; documento `LGPD.md` com finalidade.

### 5.5 Testes
- `runAllTests()` (Tests.gs): validaCPF, hash, parse JSON, média ponderada, UUID.
- Roteiro manual de smoke test.

### 5.6 Deploy
- Implantação Apps Script como Web App ("executar como o usuário que acessa").
- Versões registradas + `CHANGELOG.md`.

### 5.7 Migração futura (Vercel + Supabase)
- Repositório `SheetsRepo` substituível por `SupabaseRepo`.
- Frontend Alpine → Next.js sem retrabalho de UX.
- Documento `MIGRACAO.md`.

---

## 6. Riscos & mitigações

| Risco | Mitigação |
|-------|-----------|
| Limite de execução Apps Script (6 min) | Operações em lote evitadas; `CacheService` (5 min) |
| Concorrência de gravação | `LockService` em saves |
| Crescimento da planilha | Aba `_ARQUIVO` para entrevistas > 2 anos |
| Senha comprometida | Troca via admin; `_LOG_ACESSOS` |
| Perda de rascunho | Auto-save 30s em `PropertiesService` + `localStorage` |
| Apps Script offline | Mensagem clara; rascunho local |

---

## 7. Entregáveis do MVP

1. Web app funcional (login, entrevista, banco, admin)
2. Planilha configurada (`setupPlanilha()` executada)
3. Manual rápido (PDF, 2 páginas)
4. `CHANGELOG.md`, `LGPD.md`, `MIGRACAO.md`

---

## 8. Cronograma estimado

| Fase | Conteúdo | Duração |
|------|----------|---------|
| 1 | Auth + estrutura + setup planilha | 1–2 dias |
| 2 | Cadastro + wizard de entrevista | 2–3 dias |
| 3 | Banco de Talentos + decisão + logs | 1–2 dias |
| 4 | Admin (dashboard, busca, exportação, config) | 2–3 dias |
| 5 | Testes, manual, ajustes finais | 1 dia |
| **Total** | | **8–11 dias** |
