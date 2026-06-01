# Smoke Test — RH G&G

## Pré
- `setupPlanilha()` executado; senhas anotadas do Logger.
- Web app implantado (Implantar > Nova implantação > Web app); URL acessível.

## Fluxo (todas as etapas devem passar sem erro)
1. Abrir a URL → tela de login.
2. Entrar com a senha gerada da filial **464** → painel da filial; cards zerados.
3. Clicar em **+ Nova entrevista**:
   - Passo 1: CPF válido inédito (ex: `529.982.247-25`), nome, cargo, escolaridade. Avançar.
   - Passo 2: turnos, CNH, indicação, etc. Avançar (currículo PDF é opcional).
   - Passo 3: responder perguntas do roteiro. Avançar.
   - Passo 4: mexer nos sliders dos critérios, escolher **Banco de Talentos**, salvar.
4. Conferir aba `464-MT-TREVO` da planilha: linha nova com todos os campos.
5. Conferir aba `_LOG_HISTORICO`: linha de criação com `de_status` vazio e `para_status = Banco de Talentos`.
6. Voltar ao painel → registro aparece na tabela.
7. Banco de Talentos → registro listado → clicar **Aprovar** → status atualiza + nova linha no log.
8. Logout. Tentar nova entrevista com o mesmo CPF → alerta amarelo de histórico aparece com a entrevista anterior.
9. Logout. Login com usuário `admin` e senha gerada → dashboard exibe os 4 gráficos com dados corretos.
10. Busca global pelo CPF → retorna o registro → **Exportar CSV** baixa o arquivo.
11. **⚙ Configurações** → adicionar cargo `Vendedor PJ` → conferir na planilha (`_CONFIG_CARGOS`).
12. Logout. Login filial → nova entrevista → dropdown de cargo mostra o novo cargo.
13. Logout. Admin → Configurações → **Trocar senha** da filial 464 para `nova123` → logar com a nova senha funciona.

## Critério de sucesso
Todos os 13 passos sem erro; dados consistentes entre Sheets, logs e UI.
