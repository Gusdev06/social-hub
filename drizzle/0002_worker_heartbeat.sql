-- Sinal de vida do worker. Ver a nota em src/db/schema.ts.
CREATE TABLE IF NOT EXISTS worker_heartbeat (
  id            text PRIMARY KEY,
  last_seen_at  timestamptz NOT NULL DEFAULT now(),
  ultimo_passo  text
);
