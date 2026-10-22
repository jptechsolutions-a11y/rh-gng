CREATE TABLE IF NOT EXISTS pesquisas (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug             text NOT NULL UNIQUE,
  titulo           text NOT NULL,
  descricao        text,
  anonima          boolean NOT NULL DEFAULT false,
  status           text NOT NULL DEFAULT 'aberta',
  criada_por_nome  text NOT NULL,
  created_at       timestamptz NOT NULL DEFAULT now(),
  encerrada_em     timestamptz
);

CREATE TABLE IF NOT EXISTS pesquisa_perguntas (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pesquisa_id  uuid NOT NULL REFERENCES pesquisas(id) ON DELETE CASCADE,
  ordem        integer NOT NULL,
  texto        text NOT NULL,
  tipo         text NOT NULL,
  obrigatoria  boolean NOT NULL DEFAULT true,
  opcoes       jsonb NOT NULL DEFAULT '[]'::jsonb
);
CREATE INDEX IF NOT EXISTS pesquisa_perguntas_pesquisa_idx ON pesquisa_perguntas(pesquisa_id);

CREATE TABLE IF NOT EXISTS pesquisa_respostas (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pesquisa_id    uuid NOT NULL REFERENCES pesquisas(id) ON DELETE CASCADE,
  chapa          text,
  nome           text,
  funcao         text,
  secao          text,
  filial_id      uuid REFERENCES filiais(id) ON DELETE SET NULL,
  filial_codigo  text,
  created_at     timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS pesquisa_respostas_pesquisa_idx ON pesquisa_respostas(pesquisa_id);
CREATE UNIQUE INDEX IF NOT EXISTS pesquisa_respostas_chapa_unq ON pesquisa_respostas(pesquisa_id, chapa);

CREATE TABLE IF NOT EXISTS pesquisa_resposta_itens (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  resposta_id  uuid NOT NULL REFERENCES pesquisa_respostas(id) ON DELETE CASCADE,
  pergunta_id  uuid NOT NULL REFERENCES pesquisa_perguntas(id) ON DELETE CASCADE,
  valor        jsonb NOT NULL
);
CREATE INDEX IF NOT EXISTS pesquisa_itens_resposta_idx ON pesquisa_resposta_itens(resposta_id);
CREATE INDEX IF NOT EXISTS pesquisa_itens_pergunta_idx ON pesquisa_resposta_itens(pergunta_id);

-- RLS ligada sem policies: acesso só pelo backend (service role / conexão direta), como as demais tabelas.
ALTER TABLE pesquisas ENABLE ROW LEVEL SECURITY;
ALTER TABLE pesquisa_perguntas ENABLE ROW LEVEL SECURITY;
ALTER TABLE pesquisa_respostas ENABLE ROW LEVEL SECURITY;
ALTER TABLE pesquisa_resposta_itens ENABLE ROW LEVEL SECURITY;
