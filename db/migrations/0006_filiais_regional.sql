-- Adiciona regional na tabela filiais para o módulo QLP & Liderança
-- usar "Regional" como escopo de líder (cobre todas filiais de uma regional)

ALTER TABLE filiais ADD COLUMN IF NOT EXISTS regional text;

-- Backfill: usar a regional mais comum entre os colaboradores ativos da filial
UPDATE filiais f
SET regional = sub.regional
FROM (
  SELECT DISTINCT ON (c.codfilial) c.codfilial, c.regional
  FROM qlp_colaboradores c
  WHERE c.ativo
  ORDER BY c.codfilial, c.regional
) sub
WHERE f.codigo = sub.codfilial::text;

CREATE INDEX IF NOT EXISTS filiais_regional_idx ON filiais(regional);
