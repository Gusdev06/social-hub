# Estado do Social Hub — 2026-08-27

Painel de **produção e distribuição** de conteúdo dos perfis (Instagram + TikTok).

**Produção:** https://social-hub-zeta-two.vercel.app
**Credenciais do dashboard:** `grep DASHBOARD .env.local` (basic auth, usuário `gusta`)

---

## 🎬 NOVO — esteira de vídeo (`/produzir`)

Clona um criativo que já escalou trocando só o avatar, e remonta a edição do original
por cima. É a skill `trocar-avatar` + `clonar-edicao` virando produto.

**Validado de ponta a ponta em 27/08** contra o criativo real da Sophia Jones
(swipe zappdetect), custo real da rodada: **US$ 1,24**.

| Passo | Estado |
|---|---|
| `analisar` — mede faixas (px) e cortes (s) do original | ✅ reproduziu a medição de 24/08: 360x640, corte em 8,66s |
| `roteiro` — Whisper + pontuação + fatiamento | ✅ 3,94 sílabas/s, o mesmo ritmo calibrado da rodada manual |
| `imagem_base` — nota de casting + GPT Image 2 | ✅ |
| `clipes` — Kling 3.0, um por tick, encadeado | ✅ (ver ressalva abaixo) |
| `montar` — remove pausas, normaliza, costura | ✅ 1080x1920 |
| `compor` — remonta o split screen | ✅ |
| `publicar` — vira rascunho em `scheduled_posts` | ✅ |

### Onde o worker roda — decidido em 27/08: **na máquina do Gusta**

Nada de container. O único passo que não cabe em serverless é o `clipes` (272s), e ele
demora porque *espera* o Kling, não porque calcula. Medição dos outros: `analisar` ~30s,
`roteiro` ~30s, `imagem_base` ~40s, `montar` 17,7s, `compor` ~60-90s.

**O preço:** com o Mac desligado a esteira não anda. Mitigado com `worker_heartbeat` —
o worker bate ponto a cada volta e `/produzir` avisa na tela quando ele está fora, em
vez de deixar a rodada parada em "na fila" sem explicação.

Pra subir junto com o login: `worker/launchd/` tem o agente pronto (instruções no
`worker/README.md`).

Se um dia incomodar, as duas saídas seguem abertas e o desenho de fila no banco deixa
trocar o executor sem mexer em mais nada: container no Fly/Railway, ou reescrever
`clipes` pra dispara-e-checa e rodar tudo em Vercel Cron.

### ⚠️ Ressalva do teste: recusa de conteúdo

O clipe 3 do criativo da Sophia foi **recusado pela API** (`stop_reason=refusal`) —
a copy é de app de vigilância ("descubra as mensagens que apagaram", "confira o
celular"). A esteira reporta isso com mensagem própria e não tenta contornar.
Os clipes 1 e 2 já pagos ficaram preservados: é pra isso que existe um clipe por tick.
A validação de `montar`/`compor` foi feita com os 2 clipes.

### Aprendizados que custaram tempo

- **O criativo de referência é LAYOUT, não asset.** O rip da Ad Library vem em 360x640.
  Normalizar a montagem por ele jogava 9x os pixels fora e o avatar saía minúsculo na
  composição. O alvo é a resolução nativa dos clipes (1080x1920 do Kling).
- **O Whisper não pontua e come palavra.** Sem ponto, o fatiador empilha o roteiro
  inteiro num clipe de 15s. E pedir "devolva o mesmo texto pontuado" ao modelo faz ele
  comer uma palavra de vez em quando. Solução: reconstruir o texto a partir das palavras
  da transcrição, importando do modelo só a pontuação. Ainda assim o Whisper perdeu o
  "There's" que abre o gancho — por isso o painel deixa corrigir o roteiro à mão.
- **`--preview` do `montar_composto.py` sai antes de renderizar.** Precisa de duas
  passadas: uma pro frame de comparação, outra pro vídeo.
- **`drizzle-kit push` estoura neste banco** (TypeError lendo CHECK constraint). DDL novo
  vai à mão em `drizzle/` + `scripts/aplicar-sql.ts`.
- **O bucket `media` filtra mime type.** Áudio foi liberado em 27/08; teto de 50 MB por
  arquivo continua.

---

## ▶️ AÇÃO PENDENTE do webhook — o teste que destrava o DM

O webhook de comentário **ainda não foi visto funcionando**. Duas causas conhecidas
mascaram o resultado, e o teste abaixo elimina as duas de uma vez:

1. **Aceitar o convite de tester da @gustagoat.ai** (está *Pendente*)
   Logado como @gustagoat.ai → Instagram → Configurações → Apps e sites →
   aba **Convites do testador** → Aceitar
2. **Comentar `teste126` num post da @gustagoat.ia, usando a conta @gustagoat.ai**
3. Pedir pro agente puxar os logs: `npx vercel logs social-hub-zeta-two.vercel.app --json`
   procurando `POST /api/webhooks/instagram`

**Por que essas duas causas:**
- A Meta **não dispara** o webhook `comments` quando quem comenta é o dono da mídia.
  Então comentar da própria @gustagoat.ia nunca ia funcionar.
- Em Development mode, só gera evento quem tem **função no app**. Por isso a @gustagoat.ai
  precisa aceitar o convite antes.

**Se chegar:** não precisa publicar o app. Constrói e opera tudo em Development; Live +
App Review só importam quando terceiros forem conectar as contas deles.
**Se não chegar:** aí a hipótese de publicar volta — faltam só 2 cliques (ver abaixo).

---

## ✅ O que está pronto e testado

| Item | Status |
|---|---|
| Banco Supabase + 7 tabelas | ✅ |
| @gustagoat.ia conectada, token cifrado AES-256-GCM | ✅ expira **2026-10-24**, cron renova |
| Webhook: assinatura HMAC validando | ✅ teste da Meta respondeu **200** |
| Assinatura da conta em `comments` | ✅ corrigida via API (estava só `messages`) |
| Upload Supabase Storage (bucket `media`) | ✅ testado com arquivo real |
| Dashboard protegido (basic auth) | ✅ 401 sem credencial |
| `/posts` — listagem das publicações reais | ✅ 24 posts, paginação |
| `/compose` — upload + publicar/agendar | ✅ upload OK; **publicação nunca testada de verdade** |
| Páginas `/privacy` e `/data-deletion` públicas | ✅ |
| Crons (scheduler, sweep, refresh-tokens) | ✅ rodando |

## ⏳ Pendências

**Na Meta** (2 cliques manuais — o dropdown resiste à automação):
1. **Ícone 1024×1024** — arquivo em `assets/app-icon.png`, arrastar em
   *Configurações do app → Básico → Ícone do app*
2. **Categoria** — escolher "Negócio e Páginas" ou "Mensagens" no mesmo lugar
3. Salvar alterações → aí o botão **Publicar** destrava

**No produto:**
4. **Primeira automação de keyword** — não tem UI ainda; criar por script.
   Falta definir: **palavra-chave** e **texto do DM**.
5. Publicação de post nunca foi testada com dado real (o `Media ID is not available`
   foi corrigido: agora espera o container ficar `FINISHED` e converte imagem pra JPEG
   no navegador, porque o Instagram só aceita JPEG em foto).

## 🔒 Higiene de segurança

- **Trocar a senha do Instagram** — foi colada no chat da sessão
- **Rotacionar o `META_APP_SECRET`** — idem
- A `service_role` do Supabase **não** passou pelo chat (foi direto no arquivo) ✓
- 3 arquivos de teste (~90 KB) no bucket `media`, podem ser apagados

## 🧠 Aprendizados que custaram tempo

- **`subscribed_apps` é uma chamada de API separada.** O toggle "Ativado" do dashboard
  assinou só `messages`. Sem `POST /{ig-user-id}/subscribed_apps` com
  `subscribed_fields=comments`, o endpoint valida mas nenhum evento real chega.
  Foi a causa do primeiro teste falho.
- **O token do painel da Meta já vem long-lived.** `ig_exchange_token` responde
  "Session key invalid" — não é erro, é "já trocado". O certo é `ig_refresh_token`.
- **`Media ID is not available`** = publicar antes do container ficar `FINISHED`,
  ou formato recusado (PNG/WebP em foto).
- **O IG permite 1 private reply por comentário** (2º = subcode `2534014`).
  Por isso `comment_id` é UNIQUE no banco — o insert é a trava de idempotência.
- **Deployment Protection da Vercel** foi desligada pro webhook passar; o dashboard
  ficou protegido por basic auth no middleware (`/privacy` e `/data-deletion` liberadas).

## 📇 Identificadores

```
App Meta          1057840066946090  (socialflow)
Instagram App ID  891951430376232   (socialflow-IG)
IG User ID        17841475169391850 (@gustagoat.ia)
Supabase project  grbwshqevyahuukfdpfx
Verify token      socialflow-bcc3542a51e6d854
```

⚠️ **@gustagoat.ia** (com "IA") é a conta de conteúdo — é ela que importa aqui.
**@gustagoat.ai** (com "AI") é o perfil pessoal/founder, 6.159 seguidores.
