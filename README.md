# Social Hub

Painel de produção e distribuição de conteúdo dos perfis de Instagram e TikTok:

1. **Produzir** — clona um criativo de vídeo que já escalou trocando só o avatar,
   remontando a edição do original. Ver `worker/README.md`.
2. **Replicar** — teardown de um post que performou e transposição pro seu posicionamento.
3. **Comentário → DM** — alguém comenta a palavra-chave, recebe o DM automático.
4. **Publicação multi-perfil** — um post agendado uma vez, publicado em N perfis.
5. **Base de leads** — todo contato capturado fica no seu banco, não no de terceiros.

O loop é sempre o mesmo: **referência que performou → teardown → regerar com a sua
identidade → fan-out multi-perfil.** O que muda é a mídia — carrossel no `/replicar`,
vídeo no `/produzir`. Os dois desembocam em `scheduled_posts`.

## A realidade das duas plataformas

|                        | Instagram | TikTok |
| ---------------------- | --------- | ------ |
| Comentário → DM        | ✅ Private Reply, janela de 7 dias, **1 por comentário** | ❌ A Business Messaging API não deixa iniciar conversa com quem nunca te mandou DM |
| Publicação multi-perfil | ✅ ~50 posts/24h por conta | ⚠️ Exige auditoria (2–4 semanas) |

**O destravamento:** como são as suas próprias contas, o app da Meta pode ficar em
Development Mode. Qualquer usuário com **role no app** (admin/dev/tester) libera todas
as permissões sem App Review. Ou seja, o Instagram funciona hoje.

**O caminho crítico:** o TikTok não tem esse atalho. Enquanto o app não passar na
auditoria, todo post sai em **visibilidade privada** e o teto é de 5 usuários/24h.
Abra o pedido de auditoria na semana 1 e construa o Instagram enquanto espera.

## Setup

```bash
npm install
cp .env.example .env.local     # preencha as variáveis
npm run db:push                # cria as tabelas
npm run dev
npm run worker                 # a esteira de vídeo (precisa de ffmpeg + numpy)
```

> ⚠️ **`db:push` está quebrado neste banco.** O drizzle-kit 0.31 estoura com
> `TypeError` lendo CHECK constraint na introspecção. Enquanto não for corrigido, DDL
> novo vai escrito à mão em `drizzle/` e aplicado com
> `npx tsx --env-file=.env.local scripts/aplicar-sql.ts drizzle/000X_nome.sql`.

Gere os segredos:

```bash
openssl rand -base64 32   # TOKEN_ENCRYPTION_KEY
openssl rand -hex 32      # CRON_SECRET
```

### Checklist — Meta / Instagram

1. developers.facebook.com → criar app tipo **Business**
2. Adicionar o produto **Instagram** → *API setup with Instagram login*
3. Permissões: `instagram_business_basic`, `instagram_business_manage_messages`,
   `instagram_business_manage_comments`, `instagram_business_content_publish`
4. **Roles → adicionar suas contas IG como testers** — é isso que dispensa o App Review
5. Cada conta precisa ser **Business ou Creator** (perfil pessoal não tem API)
6. Webhooks → campo `comments` → URL `https://SEU-DOMINIO/api/webhooks/instagram`,
   verify token = o mesmo do `META_WEBHOOK_VERIFY_TOKEN`
7. Trocar o short-lived token por long-lived e gravar em `social_accounts`

### Checklist — TikTok

1. developers.tiktok.com → criar app
2. Scopes: `video.publish` (direct post) ou `video.upload` (vai pro inbox confirmar)
3. Verificar o domínio de onde a mídia é servida (PULL_FROM_URL exige isso)
4. **Abrir a auditoria já** — é o caminho crítico
5. A tela de publicação **precisa** exibir avatar + username do criador antes do post.
   Já está no dashboard; não remova, é verificado no review.

## Arquitetura

```
render_jobs ──→ worker externo (ffmpeg + Kling) ──→ scheduled_posts
                 um passo por vez, retomável

webhook (comments) ─→ grava em comment_events ─→ 200 OK imediato
                                │
                                └─ after() processa na hora
                                     ├─ casa keyword → automação
                                     ├─ private reply (o DM)
                                     ├─ upsert em leads
                                     └─ resposta pública (best-effort)

cron */5  sweep      → recupera eventos pendentes/travados
cron */5  scheduler  → publica posts vencidos, fan-out por perfil
cron 04h  refresh    → renova tokens antes de expirar
```

### Decisões que não são acidentais

- **`comment_id` é UNIQUE.** O IG permite exatamente um private reply por comentário
  (o segundo volta com subcode `2534014`). O insert único é a trava de idempotência —
  a Meta reentrega webhooks, e sem isso você manda DM duplicado.
- **Responder 200 antes de processar.** A Meta desativa a subscription se o endpoint
  demora. O banco é a fila; o `after()` é só o caminho rápido.
- **Tokens cifrados com AES-256-GCM.** Se o banco vazar, os tokens não vão junto.
- **Fan-out em `post_targets`.** Falha de uma conta não derruba as outras.
- **`workspaceId` em tudo.** Hoje é um workspace só. Se virar SaaS, não precisa migrar.
- **A esteira de vídeo roda fora da Vercel.** ffmpeg e numpy não existem em serverless, e
  uma rodada leva 10~15 min encadeados. O banco é a fila; o worker é um container.
- **O criativo de referência é layout, não asset.** Rip da Ad Library vem em 360x640. A
  montagem normaliza pela resolução NATIVA dos clipes (1080x1920 do Kling) — normalizar
  pela referência joga 9x os pixels fora e o avatar sai minúsculo na composição.

## Limites que viram bug se você esquecer

| Limite | Valor |
| --- | --- |
| Private replies | ~750/h por conta (100/s em Live) |
| Private reply por comentário | exatamente 1 |
| Janela do private reply | 7 dias |
| Publicação IG | ~50 posts/24h por conta |
| Long-lived token IG | 60 dias (renovado com 10 de folga) |
| Access token TikTok | 24h (refresh token: 365 dias) |
| Bucket `media` | 50 MB por arquivo; só image/*, video/mp4, video/quicktime e audio/* |
| Clipe do Kling | 3 a 15 s, e a duração tem que ser inteira |
| Custo de uma rodada de vídeo | ≈ US$ 1,73 para ~33 s (3 clipes + imagem + transcrição) |
