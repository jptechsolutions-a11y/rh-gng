# RH G&G

Web app de **Gente & Gestão** para conduzir entrevistas guiadas e gerir banco de talentos das 9 filiais do grupo.

- Login por filial (senha única) + admin (usuário + senha)
- Wizard de entrevista (4 passos: identificação, perfil, roteiro, avaliação)
- Banco de Talentos por filial
- Console admin com dashboard, busca global, exportação CSV e gestão de roteiro/critérios/cargos/senhas
- Dados na Planilha Google + PDFs no Drive
- Histórico imutável de mudanças de status

## Setup (uma vez)

```bash
npm install -g @google/clasp
clasp login                  # abre navegador
clasp create --type sheets \
  --title "RH G&G" \
  --parentId "19TcyRi3TT9X7ef4ikCYz5B6q3LMmz_U8EDt-FPmAbaE" \
  --rootDir .
clasp push
```

No editor Apps Script (`clasp open`):
1. Executar a função `setupPlanilha` (autorizar acessos).
2. Ver o log (`Ver > Logs`) — **anote as senhas geradas**.
3. **Implantar > Nova implantação > Web app**
   - Executar como: o usuário que acessa
   - Quem tem acesso: qualquer pessoa
4. Copiar a URL e compartilhar com as filiais.

## Estrutura

```
Code.gs                doGet + include
src/Auth.gs            login filial/admin, sessões
src/Candidatos.gs      busca por CPF, listagem filial
src/Entrevistas.gs     salvar/atualizar entrevistas
src/Config.gs          endpoints bootstrap + CRUD config
src/Relatorios.gs      dashboard admin + busca global
src/Drive.gs           upload de PDFs
src/Log.gs             logs de acesso
src/Repo.gs            camada Sheets
src/Setup.gs           bootstrap das abas (executar 1x)
src/Tests.gs           runAllTests
src/Utils.gs           uuid, sha256, validaCPF
ui/                    SPA Alpine + Tailwind
docs/                  LGPD, CHANGELOG, MIGRACAO, SMOKE-TEST
```

## Documentação

- Spec: [`docs/superpowers/specs/2026-06-01-rh-gng-design.md`](docs/superpowers/specs/2026-06-01-rh-gng-design.md)
- Plano: [`docs/superpowers/plans/2026-06-01-rh-gng.md`](docs/superpowers/plans/2026-06-01-rh-gng.md)
- LGPD: [`docs/LGPD.md`](docs/LGPD.md)
- Migração futura para Vercel/Supabase: [`docs/MIGRACAO.md`](docs/MIGRACAO.md)
- Smoke test: [`docs/SMOKE-TEST.md`](docs/SMOKE-TEST.md)
