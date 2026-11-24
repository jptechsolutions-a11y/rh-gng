-- QLP & Liderança: escala de trabalho do colaborador (dias da semana).
-- Aditiva e idempotente: não altera nem remove nada existente.

CREATE TABLE IF NOT EXISTS qlp_escalas (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome        text NOT NULL,
  dias        jsonb NOT NULL DEFAULT '[]'::jsonb,   -- lista de 0..6 (0 = domingo, 1 = segunda ... 6 = sábado)
  ativo       boolean NOT NULL DEFAULT true,
  created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS qlp_escalas_nome_uniq ON qlp_escalas (lower(nome));

ALTER TABLE qlp_colaboradores
  ADD COLUMN IF NOT EXISTS escala_id uuid REFERENCES qlp_escalas(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS qlp_colab_escala_idx ON qlp_colaboradores (escala_id);

INSERT INTO qlp_escalas (nome, dias) VALUES
  ('Segunda a Sexta', '[1,2,3,4,5]'::jsonb),
  ('Terça a Sábado',  '[2,3,4,5,6]'::jsonb)
ON CONFLICT DO NOTHING;

ALTER TABLE qlp_escalas ENABLE ROW LEVEL SECURITY;
