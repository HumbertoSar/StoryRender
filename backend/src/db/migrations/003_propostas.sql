CREATE TABLE IF NOT EXISTS propostas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  roteiro_id UUID NOT NULL REFERENCES roteiros(id) ON DELETE CASCADE,
  path JSONB NOT NULL,
  valor JSONB NOT NULL,
  status TEXT NOT NULL DEFAULT 'pendente',
  criado_em TIMESTAMPTZ NOT NULL DEFAULT now(),
  resolvida_em TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS propostas_roteiro_status_idx ON propostas (roteiro_id, status);
