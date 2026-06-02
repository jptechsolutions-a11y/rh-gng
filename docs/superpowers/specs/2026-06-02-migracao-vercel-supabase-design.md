# Migração RH G&G — Vercel + Supabase

**Data:** 2026-06-02
**Status:** Aprovado para execução

## Contexto

Sistema atual em Google Apps Script + Sheets atinge limites de execução (6 min) e
performance com volume crescente. Migração para stack web moderna: Next.js 15 +
Supabase, deploy Vercel, repositório privado GitHub.

## Decisões travadas

- **Auth:** senha por filial + admin (igual hoje), porém com argon2id e cookies HttpOnly.
- **Dados:** começa zerado no Supabase (planilha antiga vira histórico read-only).
- **Repo:** `github.com/julianopatrickcorrea/rh-gng` privado.
- **Storage:** Supabase Storage (buckets `curriculos`, `laudos`).
- **Stack:** Next.js 15 App Router + TypeScript + Server Actions.
- **DB client:** Drizzle ORM via Supavisor pooler (porta 6543, transaction mode).
- **UI:** shadcn/ui + Tailwind + lucide-react + react-hook-form + zod + TanStack Query/Table.
- **Paleta:** Perlog laranja `#F37021` + navy `#1E2A4A` + neutros.

## Arquitetura

```
Browser → Vercel (Next.js 15) → Supavisor pooler → Postgres
                              → Supabase Storage (buckets privados)
```

- **Server Components** para leituras → uma conexão por request, devolvida ao pool em ms.
- **Server Actions** para mutações (login, salvar entrevista, upload, troca de status).
- **TanStack Query** no client com `staleTime` agressivo (config tables 1h, listagens 30s).
- **RLS no Postgres** garante isolamento por filial no nível do banco.

## Schema (resumo)

Tabelas: `filiais`, `admins`, `sessoes`, `entrevistas`, `cargos`, `roteiro`,
`criterios`, `opcoes`, `log_historico`, `log_acessos`.

Índices críticos:
- `entrevistas(filial_id, status)` — dashboard por filial
- `entrevistas(cpf)` — busca por CPF (unique constraint não, pode haver re-entrevista)
- `entrevistas(data_hora DESC)` — listagem ordenada
- GIN `to_tsvector('portuguese', nome || email)` — busca global admin

RLS:
- `entrevistas`: SELECT/INSERT/UPDATE onde `filial_id = current_setting('app.filial_id')::uuid`; admin bypass via service-role.
- `log_*`: INSERT permitido, UPDATE/DELETE bloqueados (append-only).

Schema SQL completo na migration `supabase/migrations/0001_initial.sql`.

## Auth

- `argon2id` para hash de senha (custos: memory=64MB, iterations=3, parallelism=1).
- Login: Server Action valida credenciais, gera token 64-char (`crypto.randomBytes`),
  insere em `sessoes` com TTL 8h, devolve cookie HttpOnly + Secure + SameSite=Lax.
- Middleware Next.js lê cookie, valida no DB, injeta `{ perfil, filial_id }` no
  request via `headers()` ou React context server-side.
- Logout: deleta sessão + limpa cookie.
- Rate limit login: 5 tentativas / 15 min por IP usando tabela `rate_limits` com
  cleanup via `pg_cron` (evita dependência externa Redis no MVP).

## UI / Identidade visual

- **Tailwind tokens** (`tailwind.config.ts`):
  ```ts
  perlog: {
    orange: '#F37021', accent: '#FF8A3D',
    navy: '#1E2A4A', navyDark: '#141C33',
    slate: '#475569', bg: '#F8FAFC',
  }
  ```
- **Fonte:** Inter via `next/font/google`.
- **Logo:** SVG inline (componente `<PerlogLogo />`), sem PNG.
- **Ícones:** lucide-react apenas. Proibido emoji no código e na UI.
- **Layout:** sidebar fixa navy escura + main area clara. Login split-screen.
- **Componentes shadcn:** Button, Card, Dialog, Form, Input, Select, Table, Tabs,
  Badge, Toast (Sonner), Stepper customizado para wizard 4 passos.
- **Acessibilidade:** contraste AA mínimo, foco visível, `aria-label` em ícone-only.

## Endpoints / Server Actions

Mapeamento direto do Apps Script:

| Apps Script             | Next.js                                   |
|-------------------------|-------------------------------------------|
| `authLogin`             | `actions/auth.ts:login`                   |
| `authLogout`            | `actions/auth.ts:logout`                  |
| `bootstrap`             | Server Component (carrega na página)      |
| `salvarEntrevista`      | `actions/entrevistas.ts:salvar`           |
| `atualizarStatus`       | `actions/entrevistas.ts:atualizarStatus`  |
| `buscarPorCPF`          | `actions/entrevistas.ts:buscarPorCPF`     |
| `listarFilial`          | Server Component `/painel`                |
| `dashboard`             | Server Component `/admin`                 |
| `buscaGlobal`           | `actions/admin.ts:buscaGlobal`            |
| `exportarCSV`           | Route Handler `/api/export/csv`           |
| `uploadPDF`             | Route Handler `/api/upload` (multipart)   |

## Segurança

- argon2id para senhas.
- Cookies HttpOnly + Secure + SameSite=Lax.
- RLS ativa em todas as tabelas.
- Service-role key apenas em código server (nunca exposta).
- Validação zod client + server em toda entrada.
- Upload: whitelist `.pdf`, magic-byte check (`%PDF-`), tamanho máx 10MB.
- URLs assinadas Supabase Storage com TTL 5 min.
- Headers: CSP, HSTS, X-Frame-Options DENY, X-Content-Type-Options nosniff,
  Referrer-Policy strict-origin-when-cross-origin, Permissions-Policy.
- LGPD: checkbox de consentimento obrigatório no wizard, registro em
  `entrevistas.consentimento_lgpd_em`.
- CI: Dependabot, `npm audit --audit-level=high` falha o build.

## Estrutura de pastas

```
rh-gng/
├─ app/
│  ├─ (auth)/login/page.tsx
│  ├─ (filial)/painel/page.tsx
│  ├─ (filial)/entrevista/[id?]/page.tsx
│  ├─ (filial)/banco-talentos/page.tsx
│  ├─ (admin)/admin/page.tsx
│  ├─ (admin)/admin/config/page.tsx
│  ├─ api/upload/route.ts
│  ├─ api/export/csv/route.ts
│  ├─ layout.tsx
│  └─ globals.css
├─ actions/
│  ├─ auth.ts
│  ├─ entrevistas.ts
│  └─ admin.ts
├─ components/
│  ├─ ui/                  # shadcn
│  ├─ layout/Sidebar.tsx
│  ├─ layout/PerlogLogo.tsx
│  ├─ wizard/{Step1..Step4}.tsx
│  └─ tables/EntrevistasTable.tsx
├─ db/
│  ├─ schema.ts            # Drizzle schema
│  ├─ client.ts            # pooled client
│  └─ queries/
├─ lib/
│  ├─ auth.ts              # session helpers
│  ├─ rate-limit.ts
│  ├─ validators/          # zod schemas
│  └─ cn.ts
├─ middleware.ts
├─ supabase/
│  └─ migrations/0001_initial.sql
├─ tailwind.config.ts
├─ next.config.ts
├─ drizzle.config.ts
├─ package.json
└─ README.md
```

## Plano de deploy

1. Criar projeto Supabase (region `sa-east-1`).
2. Aplicar migration inicial.
3. Criar buckets Storage privados + policies.
4. Seed: 9 filiais + admin com senhas geradas (logadas uma vez).
5. Criar repo privado GitHub.
6. Push código.
7. Conectar repo ao Vercel, configurar env vars.
8. Deploy.
9. Revisão por subagentes (backend, frontend, security).
10. Ajustes finais e merge.

## Não-escopo (MVP)

- Migração ETL dos dados antigos da planilha.
- MFA para admin.
- 2FA por SMS.
- Notificações por e-mail.
- App mobile.

Esses entram em fases posteriores.
