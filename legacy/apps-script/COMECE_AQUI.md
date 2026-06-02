# 🚀 PRÓXIMOS PASSOS — Deploy do Sistema

✅ Já feito automaticamente:
- `clasp` instalado e logado
- Projeto Apps Script criado
- Planilha vinculada criada
- 22 arquivos enviados ao Apps Script

## IDs criados

| Recurso | URL |
|---------|-----|
| 📊 **Planilha do sistema** | https://drive.google.com/open?id=1Cs_4CYUzVoKaVvqwdzZHePT0tW-Jf-5_p4G8BZyQg-w |
| 📝 **Editor Apps Script** | https://script.google.com/d/15nuzkMAK1mnHXdplC1zmCJPjj3yOWddQd5yBnUykxdyUtxCryJP5lshp/edit |

> 💡 Renomeie a planilha "RH G&G" no Drive como preferir (não muda o ID).

---

## 1. Abrir o editor e rodar `setupPlanilha`

Abra o **Editor Apps Script**: https://script.google.com/d/15nuzkMAK1mnHXdplC1zmCJPjj3yOWddQd5yBnUykxdyUtxCryJP5lshp/edit

(ou rode `clasp open` no terminal)

No editor:

1. No seletor de função (em cima, ao lado do botão ▶), escolha **`setupPlanilha`**.
2. Clique **▶ Executar**.
3. Vai aparecer popup pedindo permissões → **Revisar permissões** → escolha sua conta → "Avançado" → "Acessar RH G&G (não seguro)" → **Permitir**.
4. Quando terminar (5–10s), abra os **Logs**: menu `Ver > Logs` (ou Ctrl+Enter).
5. **📝 ANOTE TODAS AS SENHAS** que aparecem no log — uma por filial + a do admin.

---

## 2. Implantar como Web App

Ainda no editor:

1. Clique no botão **Implantar** (canto superior direito) > **Nova implantação**.
2. Clique no ícone ⚙ ao lado de "Selecionar o tipo" > escolha **Aplicativo da Web**.
3. Preencha:
   - **Descrição**: `v0.1.0 MVP`
   - **Executar como**: **Usuário que acessa o app**
   - **Quem tem acesso**: **Qualquer pessoa**
4. Clique **Implantar**.
5. Copie a **URL do aplicativo da Web** que aparecer.

---

## 3. Distribuir

- 🔗 Mande a URL para cada filial junto com a senha correspondente que você anotou.
- 🔑 Para administrar (RH central), use a mesma URL + usuário `admin` + senha do admin.

---

## Atualizar o sistema no futuro

Quando quiser alterar código:

```bash
cd "C:/Users/juliano.correa/Desktop/G&G"
clasp push
```

Depois no editor: **Implantar > Gerenciar implantações** > **✏ editar** > **Versão: Nova versão** > **Implantar**. A URL **não muda**.

---

## Smoke test

Use o roteiro em [docs/SMOKE-TEST.md](docs/SMOKE-TEST.md) — 13 passos pra validar tudo.
