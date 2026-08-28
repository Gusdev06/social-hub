-- Fila de produção de vídeo. Aplicado à mão porque o `drizzle-kit push` quebra
-- ao introspectar este banco (bug de leitura de CHECK constraint na 0.31).
CREATE TABLE IF NOT EXISTS render_jobs (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id  uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  name          text NOT NULL,
  ref_video_url text NOT NULL,
  casting_brief text,
  step          text NOT NULL DEFAULT 'analisar',
  status        text NOT NULL DEFAULT 'pending',
  manifest      jsonb NOT NULL DEFAULT '{}'::jsonb,
  locked_at     timestamptz,
  locked_by     text,
  attempts      integer NOT NULL DEFAULT 0,
  last_error    text,
  cost_cents    integer NOT NULL DEFAULT 0,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),
  finished_at   timestamptz
);

CREATE INDEX IF NOT EXISTS render_jobs_claim_idx ON render_jobs (status, locked_at);
