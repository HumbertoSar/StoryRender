CREATE TABLE IF NOT EXISTS eventos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  roteiro_id UUID NOT NULL REFERENCES roteiros(id) ON DELETE CASCADE,
  tipo TEXT NOT NULL,
  detalhes JSONB NOT NULL DEFAULT '{}'::jsonb,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS eventos_roteiro_id_idx ON eventos (roteiro_id);
