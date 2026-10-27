CREATE TABLE IF NOT EXISTS ic_imports (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  semana_ref          date NOT NULL,
  arquivo_nome        text NOT NULL,
  importado_por_nome  text NOT NULL,
  total_pendencias    integer NOT NULL DEFAULT 0,
  concluida           boolean NOT NULL DEFAULT false,
  created_at          timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS ic_pendencias (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  import_id      uuid NOT NULL REFERENCES ic_imports(id) ON DELETE CASCADE,
  filial_codigo  text NOT NULL,
  regional       text,
  chapa          text NOT NULL,
  nome           text NOT NULL,
  funcao         text,
  secao          text,
  codsituacao    text,
  categoria      text NOT NULL,
  tipo           text,
  data_pend      date
);
CREATE INDEX IF NOT EXISTS ic_pendencias_import_idx ON ic_pendencias(import_id);
CREATE INDEX IF NOT EXISTS ic_pendencias_filial_idx ON ic_pendencias(filial_codigo);

CREATE TABLE IF NOT EXISTS ic_headcount (
  import_id      uuid NOT NULL REFERENCES ic_imports(id) ON DELETE CASCADE,
  filial_codigo  text NOT NULL,
  qtd            integer NOT NULL,
  PRIMARY KEY (import_id, filial_codigo)
);

CREATE TABLE IF NOT EXISTS ic_responsaveis (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome        text NOT NULL,
  ordem       integer NOT NULL DEFAULT 0,
  cor         text NOT NULL DEFAULT '#0D2B6B',
  imagem      text,
  filiais     jsonb NOT NULL DEFAULT '[]'::jsonb,
  updated_at  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE ic_imports ENABLE ROW LEVEL SECURITY;
ALTER TABLE ic_pendencias ENABLE ROW LEVEL SECURITY;
ALTER TABLE ic_headcount ENABLE ROW LEVEL SECURITY;
ALTER TABLE ic_responsaveis ENABLE ROW LEVEL SECURITY;

-- Responsáveis iniciais (bandeira PERLOG). Só insere se a tabela estiver vazia.
INSERT INTO ic_responsaveis (nome, ordem, cor, filiais)
SELECT v.nome, v.ordem, v.cor, v.filiais::jsonb
FROM (VALUES
  ('Amanda / Gilmaraliny / Lohayne', 1, '#E8621A', '["264","773","783"]'),
  ('Lorrane', 2, '#0D2B6B', '["364"]'),
  ('Marllon / Anna', 3, '#E8621A', '["753","468","473"]'),
  ('Fabiana / Andresa', 4, '#0D2B6B', '["713"]'),
  ('Décio', 5, '#E8621A', '["892"]'),
  ('Wender / Jessica / Francisco / Lucas', 6, '#0D2B6B', '["743","167"]')
) AS v(nome, ordem, cor, filiais)
WHERE NOT EXISTS (SELECT 1 FROM ic_responsaveis);
