-- Adiciona CPF ao cadastro de passageiros do módulo Transporte
-- Aplicado via Supabase MCP apply_migration (padrão do projeto — o journal
-- do drizzle-kit não reflete as migrations 0001+, que sempre foram aplicadas
-- assim, não via `drizzle-kit migrate`).

ALTER TABLE transporte_cadastro ADD COLUMN IF NOT EXISTS cpf text;
