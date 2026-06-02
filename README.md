# RH G&G — Perlog

Plataforma corporativa de Gente & Gestão para condução de entrevistas e gestão do
banco de talentos das 9 filiais do Grupo Perlog.

Stack: **Next.js 15 (App Router) · TypeScript · Tailwind + shadcn/ui · Drizzle ORM ·
Supabase Postgres (Supavisor pooled) · Supabase Storage · Vercel**.

## Setup local

```bash
npm install
cp .env.example .env.local
# preencha SUPABASE_URL, DATABASE_URL, DIRECT_URL, SUPABASE_SERVICE_ROLE_KEY, SESSION_SECRET
npm run seed         # cria filiais e admin (imprime senhas — anote!)
npm run dev
```

Acesse http://localhost:3000.

## Scripts

| Comando            | Função                              |
|--------------------|-------------------------------------|
| `npm run dev`      | Servidor de desenvolvimento         |
| `npm run build`    | Build de produção                   |
| `npm run typecheck`| `tsc --noEmit`                      |
| `npm run lint`     | ESLint                              |
| `npm run db:push`  | Sincroniza schema Drizzle ao DB     |
| `npm run db:studio`| Drizzle Studio                      |
| `npm run seed`     | Popula filiais e admin              |

## Arquitetura

```
app/                  rotas (App Router)
  (app)/              área autenticada (layout com sidebar)
  login/              tela pública de login
  api/                route handlers (upload, csv, health)
actions/              Server Actions (auth, entrevistas, admin)
components/           UI (ui/, layout/, wizard/, brand/)
db/                   schema Drizzle + cliente pooled + queries cacheadas
lib/                  auth (password, session, rate-limit) + validators
supabase/             migrations de referência
scripts/              seed
legacy/               código antigo (Apps Script + planilha) — não usado
```

## Segurança

- Senhas em argon2id.
- Sessões em cookie HttpOnly + Secure + SameSite=Lax, TTL 8h.
- Rate-limit no login (5/15min por IP) em tabela Postgres.
- RLS ativa em todas as tabelas (acesso via service-role server-side somente).
- Storage privado + URLs assinadas com TTL 5 min.
- Upload: whitelist PDF + magic-byte check + 10 MB.
- Headers: CSP, HSTS, X-Frame-Options DENY, X-Content-Type-Options nosniff.
- Logs append-only via triggers de banco (UPDATE/DELETE bloqueados).

## Deploy

Vercel + Supabase, ambos via MCP. Veja `docs/superpowers/specs/2026-06-02-migracao-vercel-supabase-design.md`.
