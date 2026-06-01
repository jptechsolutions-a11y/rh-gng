# Migração futura para Vercel + Supabase

## Por que migrar
Apps Script tem limites de execução (6 min), performance limitada com planilhas grandes, e a UI fica restrita ao HTML Service. Quando o uso crescer, vale portar para uma stack web moderna.

## Estratégia
- `Repo.gs` → substituir por `SupabaseRepo` (mesma API pública).
- Endpoints `.gs` → portar para Next.js API Routes ou Edge Functions.
- UI Alpine + Tailwind → reescrever em Next.js + Tailwind (mesma estrutura, mesmos componentes lógicos).
- Sheets → migração ETL única; depois, planilha pode ser mantida apenas como visualização (export periódico).
- PDFs → migrar do Drive para Supabase Storage.

## Ordem sugerida
1. Modelar tabelas Supabase espelhando as colunas das abas de filial (uma tabela `entrevistas` com coluna `filial`).
2. Migrar dados existentes via script `scripts/migrate.ts`.
3. Subir API Next.js em paralelo, com o mesmo contrato dos endpoints atuais (`authLogin`, `bootstrap`, `salvarEntrevista`, etc.).
4. Trocar a URL do app para a nova; manter Apps Script disponível em modo somente-leitura por um período de transição.
5. Desativar Apps Script após validação.

## Riscos
- Diferenças sutis no comportamento de datas/timezone — testar com dados reais.
- Sincronização de senhas (rehash com salt diferente, se necessário).
- Garantir que `_LOG_HISTORICO` migra preservando a ordem cronológica.
