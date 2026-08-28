-- Os vídeos prontos, guardados FORA de render_jobs.
--
-- A fila é descartável: o Gusta limpa render_jobs quando ela enche de teste, e
-- levava junto todo o histórico do que já tinha sido produzido — os arquivos
-- continuavam no Storage, órfãos, sem nada apontando pra eles.
--
-- Sem FK pra render_jobs de propósito: a rodada morre, o vídeo fica.
CREATE TABLE IF NOT EXISTS videos (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id   uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  job_id         uuid,
  nome           text NOT NULL,
  url            text NOT NULL,
  preview_url    text,
  ref_video_url  text,
  modelo         text,
  duracao_s      real,
  custo_cents    integer NOT NULL DEFAULT 0,
  criado_em      timestamptz NOT NULL DEFAULT now(),
  atualizado_em  timestamptz NOT NULL DEFAULT now()
);

-- Uma linha por rodada: recompor numa escala nova atualiza, não empilha.
CREATE UNIQUE INDEX IF NOT EXISTS videos_job_idx ON videos (job_id) WHERE job_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS videos_recentes_idx ON videos (criado_em DESC);
