# Worker de produção de vídeo

Avança a esteira de `render_jobs`: pega um job, executa **um** passo, devolve pro banco.

## Por que ele existe fora da Vercel

Duas coisas não cabem em função serverless:

- **ffmpeg e numpy.** A leitura de estrutura mede média e desvio-padrão por linha de pixel
  pra achar as faixas; a montagem é ffmpeg puro.
- **O tempo.** Uma rodada leva 10~15 min e é *encadeada* — o clipe 2 nasce do último frame
  do clipe 1, então não dá pra paralelizar o caminho crítico.

O padrão é o mesmo que já resolve o webhook de comentário no app: **o banco é a fila**.
A diferença é que aqui quem consome é um processo longo-vivo, não um cron.

## Rodar local

```bash
npm run worker          # usa o .env.local
```

Precisa de `ffmpeg`, `python3` e `numpy` no PATH:

```bash
brew install ffmpeg && python3 -m pip install numpy
```

## Onde ele roda — decisão de 27/08: **na máquina do Gusta**

O painel está na Vercel, o executor aqui. Escolha consciente: o único passo que não
caberia em serverless é o `clipes`, e ele é longo porque *espera* o Kling, não porque
calcula. Container em Fly/Railway e reescrita pra Vercel Cron foram avaliados e ficaram
pra depois — o desenho de fila no banco deixa trocar o executor sem mexer em mais nada.

**O preço dessa escolha:** com o Mac desligado a esteira não anda. Por isso o worker
bate ponto em `worker_heartbeat` a cada volta do loop, e `/produzir` avisa na cara
quando ele está fora. Sem esse aviso o painel mentiria pra quem cria uma rodada do
celular.

Pra ele subir junto com o login e religar sozinho se cair:

```bash
cp worker/launchd/com.gusta.socialhub.worker.plist ~/Library/LaunchAgents/
launchctl load -w ~/Library/LaunchAgents/com.gusta.socialhub.worker.plist
tail -f /tmp/social-hub-worker.log
```

### Se um dia virar container

```bash
docker build -f worker/Dockerfile -t social-hub-worker .   # a partir da RAIZ
```

Sempre ligado (Fly.io, Railway) com `DATABASE_URL`, `SUPABASE_URL`,
`SUPABASE_SERVICE_ROLE_KEY`, `ANTHROPIC_API_KEY` e `WAVESPEED_API_KEY`.

Pode rodar mais de uma réplica: o `FOR UPDATE SKIP LOCKED` garante que dois workers
nunca peguem o mesmo job. Isso não é preciosismo — job duplicado aqui é crédito de
Kling queimado em dobro.

## Os passos

| Passo | O que faz | Custo | Pausa? |
|---|---|---|---|
| `analisar` | mede faixas (px) e cortes de layout (s) do criativo de referência | — | ✋ confira as faixas no frame |
| `roteiro` | transcreve (Whisper), restaura pontuação e fatia em 55–60 sílabas | $0,001 | ✋ confira a fala |
| `imagem_base` | escreve a nota de casting e gera o rosto (Seedream) | $0,045 | ✋ aprove o rosto |
| `clipes` | Kling 3.0, **um clipe por tick**, encadeando o último frame | $0,56/clipe | — |
| `montar` | tira as pausas, normaliza e costura os clipes | — | — |
| `compor` | remonta o split screen do original por cima | — | ✋ confira a escala |
| `publicar` | vira `scheduled_post` e cai no fan-out multi-perfil | — | — |

**Uma rodada de ~33s custa ≈ US$ 1,73** (3 clipes + imagem + transcrição).

As pausas não são burocracia: vídeo é o único passo caro, e todas elas ficam **antes**
dele. Aprovar um rosto errado ou um roteiro com palavra comida custa a rodada inteira.

Passo sem implementação **falha explicitamente** em vez de sumir — o painel tem que
mostrar onde a esteira termina hoje.

## O roteiro é o ativo

O Whisper devolve um bloco corrido sem pontuação, e o fatiador corta em fronteira de
frase — sem ponto, ele empilha o roteiro inteiro num clipe só de 15s.

Pedir "devolva o mesmo texto pontuado" ao modelo não é seguro: ele come uma palavra de
vez em quando (na referência da Sophia comeu o `is` de "the problem is hardly anyone
knows", duas tentativas seguidas). Por isso o texto final é **reconstruído a partir das
palavras da transcrição**, importando do modelo apenas os sinais de pontuação. Palavra
trocada deixa de ser um risco detectável e passa a ser impossível.

Ainda assim o Whisper erra pra menos — ele perdeu o `There's` que abre o gancho. Por
isso o painel deixa **corrigir o roteiro à mão e refatiar** (custo zero, não
re-transcreve).

## Retomada

`locked_at` é o lease. Se o worker morre no meio de um passo, o job fica `running` com
lease velho e outro worker (ou o mesmo, ao reiniciar) retoma depois de `WORKER_LEASE_MIN`
(20 min por padrão — um clipe do Kling leva minutos, então lease curto reprocessaria
trabalho que ainda está em pé).

Nenhum passo escreve no banco; ele calcula e devolve um `StepResult`, e o loop persiste.
É isso que garante que um passo interrompido não deixe manifesto pela metade.
