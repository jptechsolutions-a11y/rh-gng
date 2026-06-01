# 🚀 COMECE AQUI — Como colocar o sistema no ar

Tudo o que você precisa fazer (≈ 10 minutos):

## 1. Instalar o `clasp` (uma vez)

Abra o PowerShell e rode:

```bash
npm install -g @google/clasp
```

> Se ainda não tem Node.js: instale do site oficial https://nodejs.org/ (versão LTS).

## 2. Logar no Google

```bash
clasp login
```

Vai abrir o navegador. Faça login com **a mesma conta Google que tem acesso à planilha**.

## 3. Vincular o projeto à sua planilha

No PowerShell, dentro da pasta do projeto:

```bash
cd "C:/Users/juliano.correa/Desktop/G&G"
clasp create --type sheets --title "RH G&G" --parentId "1eZ4EXsnUV6t3w_A5K7lwGFK4zygjVGF0aQl2ykumqCo" --rootDir .
```

> Isso cria o arquivo `.clasp.json` localmente (já está no `.gitignore`).

## 4. Subir o código para o Apps Script

```bash
clasp push
```

Se ele perguntar se quer sobrescrever o `appsscript.json`, responda **Sim**.

## 5. Abrir o editor Apps Script

```bash
clasp open
```

Vai abrir o editor no navegador.

## 6. Executar `setupPlanilha` (cria abas + senhas)

No editor:
- Em cima, no seletor de função, escolha **`setupPlanilha`**.
- Clique **▶ Executar**.
- Vai pedir permissões — autorize tudo (Sheets + Drive).
- **Vá em `Ver > Logs`** — copie as senhas geradas (uma por filial + admin). **Anote em local seguro!**

## 7. Implantar como Web App

No editor, clique:
- **Implantar > Nova implantação**
- Tipo: **Aplicativo da Web**
- Descrição: `v0.1.0 MVP`
- Executar como: **Usuário que acessa**
- Quem tem acesso: **Qualquer pessoa**
- Clicar **Implantar** → copiar a **URL do aplicativo**.

## 8. Pronto!

Compartilhe a URL + a senha correspondente com cada filial. Para administrar, use a URL com o **usuário `admin`** e a senha gerada.

---

## Atualizações futuras

Quando quiser alterar o código:
1. Editar localmente
2. `clasp push`
3. Editor → **Implantar > Gerenciar implantações** → **✏ editar** → **Nova versão** → **Implantar**.

A URL **não muda** entre versões.

---

## Documentação completa

- [README.md](README.md) — visão geral
- [docs/SMOKE-TEST.md](docs/SMOKE-TEST.md) — roteiro de teste passo a passo
- [docs/superpowers/specs/2026-06-01-rh-gng-design.md](docs/superpowers/specs/2026-06-01-rh-gng-design.md) — spec completo
- [docs/superpowers/plans/2026-06-01-rh-gng.md](docs/superpowers/plans/2026-06-01-rh-gng.md) — plano de implementação
- [docs/LGPD.md](docs/LGPD.md) — adequação LGPD
- [docs/MIGRACAO.md](docs/MIGRACAO.md) — migração futura para Vercel
