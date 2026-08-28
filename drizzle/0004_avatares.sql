-- Avatares salvos pra reuso.
--
-- Guarda a imagem E a NOTA DE CASTING. A nota é o que importa tanto quanto a
-- foto: ela reaparece literalmente em todo prompt de clipe, e é o que faz o
-- modelo reconhecer que é a mesma pessoa entre um clipe e outro. Reusar só a
-- imagem daria o mesmo rosto no primeiro clipe e outra pessoa no terceiro.
CREATE TABLE IF NOT EXISTS avatares (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id  uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  nome          text NOT NULL,
  imagem_url    text NOT NULL,
  nota          text NOT NULL,
  /** O prompt que gerou a imagem — pra regerar variações do mesmo personagem. */
  prompt        text,
  /** Quantas rodadas já usaram. Ajuda a saber qual personagem está de pé. */
  usos          integer NOT NULL DEFAULT 0,
  criado_em     timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS avatares_recentes_idx ON avatares (criado_em DESC);
