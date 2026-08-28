# Worker de produção de vídeo. Precisa de ffmpeg (montagem) e numpy (a leitura
# de estrutura mede estatística por linha de pixel) — por isso não roda em
# serverless. Build a partir da RAIZ do repo: docker build -f worker/Dockerfile .
FROM node:22-slim

RUN apt-get update && apt-get install -y --no-install-recommends \
      ffmpeg python3 python3-numpy ca-certificates \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm i tsx typescript

COPY tsconfig.json ./
COPY src ./src
COPY worker ./worker

# Sem --env-file: em produção as variáveis vêm do ambiente do container.
CMD ["npx", "tsx", "worker/index.ts"]
