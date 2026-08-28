"use server";

import { revalidatePath } from "next/cache";
import { and, desc, eq, isNull, lt, ne, or, sql } from "drizzle-orm";
import { db } from "@/db";
import { avatares, renderJobs, socialAccounts, type RenderManifest } from "@/db/schema";
import { requireDashboardAuth } from "@/lib/auth";
import { MODELO_PADRAO, custoClipe, ehModeloVideo, modeloDe } from "@/lib/modelos-video";

/** O mesmo lease do worker (`worker/index.ts`). Lock mais velho = worker morreu. */
const LEASE_MIN = Number(process.env.WORKER_LEASE_MIN ?? 20);

/**
 * Casa só com a rodada que o worker NÃO está executando neste instante.
 *
 * O painel mexe em `status`, `step` e no manifesto. Sem isto, um clique durante
 * um passo em andamento fazia três estragos: o `concluir` do worker gravava por
 * cima e a mudança sumia; a linha ficava `pending` COM lock, que é o estado
 * inconsistente que parece "fila travada"; e `pending` é justamente o que o
 * `pegarJob` procura, então o mesmo job podia ser pego de novo enquanto rodava —
 * vídeo gerado e pago duas vezes.
 *
 * A condição vai dentro do próprio UPDATE, não numa leitura antes: checar e
 * depois escrever deixa uma janela em que o worker pega o job no meio.
 */
const paradaLivre = (id: string) =>
  and(
    eq(renderJobs.id, id),
    or(
      ne(renderJobs.status, "running"),
      isNull(renderJobs.lockedAt),
      lt(renderJobs.lockedAt, new Date(Date.now() - LEASE_MIN * 60_000)),
    ),
  );

/** Erro que a tela mostra quando o clique chegou no meio de um passo. */
function exigirAplicado(linhas: unknown[]): void {
  if (!linhas.length) {
    throw new Error(
      "a rodada está no meio de um passo — espere ele terminar e tente de novo",
    );
  }
}


export type CriarState = { ok: true; id: string } | { ok: false; message: string } | null;

export async function criarJobAction(_prev: CriarState, form: FormData): Promise<CriarState> {
  try {
    await requireDashboardAuth();
  } catch {
    return { ok: false, message: "Não autorizado." };
  }

  const refVideoUrl = String(form.get("refVideoUrl") ?? "").trim();
  if (!refVideoUrl) return { ok: false, message: "Suba o criativo de referência primeiro." };

  const name = String(form.get("name") ?? "").trim() || `rodada ${new Date().toISOString().slice(0, 10)}`;
  const castingBrief = String(form.get("castingBrief") ?? "").trim() || null;

  // Vem de um radio no navegador: valida contra o registro em vez de confiar.
  // Um id inválido só apareceria lá na frente, como erro do WaveSpeed, depois de
  // já ter gasto os passos de análise e roteiro.
  const bruto = form.get("modeloVideo");
  if (bruto != null && !ehModeloVideo(bruto)) {
    return { ok: false, message: `Modelo de vídeo desconhecido: ${String(bruto)}.` };
  }
  const modeloVideo = ehModeloVideo(bruto) ? bruto : MODELO_PADRAO;

  // Hoje existe um workspace só; pego pela conta conectada, como o resto do app.
  const conta = await db.query.socialAccounts.findFirst({
    where: eq(socialAccounts.isActive, true),
  });
  if (!conta) return { ok: false, message: "Nenhuma conta conectada — falta o workspace." };

  // Avatar reusado: a rodada já nasce com o rosto e a nota, e o passo
  // `imagem_base` se reconhece pronto e não gasta nem gera outra pessoa.
  const avatarId = String(form.get("avatarId") ?? "").trim();
  let manifest: RenderManifest = { modeloVideo };
  if (avatarId) {
    const [a] = await db.select().from(avatares).where(eq(avatares.id, avatarId));
    if (!a) return { ok: false, message: "avatar salvo não encontrado." };
    manifest = { ...manifest, imagemBaseUrl: a.imagemUrl, casting: { nota: a.nota, promptBase: a.prompt ?? undefined } };
    await db.update(avatares).set({ usos: sql`${avatares.usos} + 1` }).where(eq(avatares.id, a.id));
  }

  const [job] = await db
    .insert(renderJobs)
    .values({
      workspaceId: conta.workspaceId,
      name,
      refVideoUrl,
      castingBrief,
      manifest,
    })
    .returning({ id: renderJobs.id });

  revalidatePath("/produzir");
  return { ok: true, id: job.id };
}

/** Libera um job parado pra aprovação. É o "confirmei no olho, pode seguir". */
export async function aprovarAction(id: string): Promise<void> {
  await requireDashboardAuth();
  const aplicado = await db
    .update(renderJobs)
    .set({ status: "pending", lastError: null, updatedAt: new Date() })
    .where(paradaLivre(id))
    .returning({ id: renderJobs.id });
  exigirAplicado(aplicado);
  revalidatePath("/produzir");
}

/** Recoloca um job que falhou na fila — no MESMO passo, sem perder o manifesto. */
export async function reprocessarAction(id: string): Promise<void> {
  await requireDashboardAuth();
  const aplicado = await db
    .update(renderJobs)
    .set({ status: "pending", lastError: null, attempts: 0, updatedAt: new Date() })
    .where(paradaLivre(id))
    .returning({ id: renderJobs.id });
  exigirAplicado(aplicado);
  revalidatePath("/produzir");
}

export async function cancelarAction(id: string): Promise<void> {
  await requireDashboardAuth();
  await db
    .update(renderJobs)
    .set({ status: "canceled", updatedAt: new Date() })
    .where(eq(renderJobs.id, id));
  revalidatePath("/produzir");
}

export async function listarJobs() {
  return db.select().from(renderJobs).orderBy(desc(renderJobs.createdAt)).limit(30);
}

/**
 * Reprova o rosto e gera outro. Volta pro passo da imagem — o rosto reprovado
 * fica registrado no manifesto pra não voltar igual.
 */
export async function regerarImagemAction(id: string): Promise<void> {
  await requireDashboardAuth();
  const aplicado = await db
    .update(renderJobs)
    .set({ step: "imagem_base", status: "pending", lastError: null, updatedAt: new Date() })
    .where(paradaLivre(id))
    .returning({ id: renderJobs.id });
  exigirAplicado(aplicado);
  revalidatePath("/produzir");
}

/**
 * Refaz a composição noutra escala. Não existe fórmula confiável pro tamanho da
 * cabeça dentro da faixa sem medir: 0.70 é ponto de partida, não resposta.
 * Recompor é ffmpeg local — custo zero, segundos.
 */
export async function ajustarEscalaAction(id: string, escala: number): Promise<void> {
  await requireDashboardAuth();

  const job = await db.query.renderJobs.findFirst({ where: eq(renderJobs.id, id) });
  if (!job) return;

  const aplicado = await db
    .update(renderJobs)
    .set({
      manifest: { ...job.manifest, edicao: { ...job.manifest.edicao!, escala } },
      step: "compor",
      status: "pending",
      lastError: null,
      updatedAt: new Date(),
    })
    .where(paradaLivre(id))
    .returning({ id: renderJobs.id });
  exigirAplicado(aplicado);
  revalidatePath("/produzir");
}

/**
 * Corrige o roteiro à mão e refatia.
 *
 * O roteiro é o ativo testado do criativo, e a transcrição automática come
 * palavra — na referência da Sophia o Whisper perdeu o "There's" que abre o
 * gancho. Refatiar não re-transcreve: custo zero.
 */
export async function salvarRoteiroAction(id: string, texto: string): Promise<void> {
  await requireDashboardAuth();

  const job = await db.query.renderJobs.findFirst({ where: eq(renderJobs.id, id) });
  if (!job) return;

  const aplicado = await db
    .update(renderJobs)
    .set({
      manifest: { ...job.manifest, roteiroManual: texto.trim() },
      step: "roteiro",
      status: "pending",
      lastError: null,
      updatedAt: new Date(),
    })
    .where(paradaLivre(id))
    .returning({ id: renderJobs.id });
  exigirAplicado(aplicado);
  revalidatePath("/produzir");
}


/**
 * Pede um take alternativo do MESMO clipe em outro modelo, pra comparar.
 *
 * A geração leva minutos, então isso não roda aqui: marca o pedido no manifesto
 * e devolve a rodada pra fila. Quem gera é o worker, no passo `clipes`, com o
 * lease de sempre — assim dois pedidos seguidos não viram crédito queimado em
 * dobro.
 *
 * O take nasce da MESMA imagem de partida do clipe original. Sem isso a
 * comparação mediria a imagem-base junto com o modelo, e não o modelo.
 */
export async function pedirTakeAction(id: string, n: number, modelo: string): Promise<void> {
  await requireDashboardAuth();
  if (!ehModeloVideo(modelo)) throw new Error(`modelo de vídeo desconhecido: ${modelo}`);

  const [job] = await db.select().from(renderJobs).where(eq(renderJobs.id, id));
  if (!job) throw new Error("rodada não encontrada");

  const aplicado = await db
    .update(renderJobs)
    .set({
      manifest: { ...job.manifest, takePedido: { n, modelo } },
      step: "clipes",
      status: "pending",
      lastError: null,
      updatedAt: new Date(),
    })
    .where(paradaLivre(id))
    .returning({ id: renderJobs.id });
  exigirAplicado(aplicado);

  revalidatePath("/produzir");
}

/**
 * Promove um take alternativo a clipe oficial.
 *
 * Descarta os clipes SEGUINTES de propósito: cada clipe nasce do último frame do
 * anterior, então trocar o clipe 2 invalida o 3 em diante — eles partiriam de um
 * rosto que não existe mais na emenda. Melhor refazer do que costurar um salto.
 */
export async function usarTakeAction(id: string, n: number, modelo: string): Promise<void> {
  await requireDashboardAuth();
  if (!ehModeloVideo(modelo)) throw new Error(`modelo de vídeo desconhecido: ${modelo}`);

  const [job] = await db.select().from(renderJobs).where(eq(renderJobs.id, id));
  if (!job) throw new Error("rodada não encontrada");

  const m = job.manifest;
  const take = (m.takes ?? []).find((t) => t.n === n && t.modelo === modelo);
  if (!take) throw new Error(`take ${n} no ${modeloDe(modelo).rotulo} não existe`);

  const clipes = (m.clipes ?? [])
    .filter((c) => c.n <= n)
    .map((c) => (c.n === n ? { ...c, url: take.url, jobId: take.jobId, modelo } : c));

  const aplicado = await db
    .update(renderJobs)
    .set({
      // A montagem e tudo depois dela eram do clipe antigo: saem junto.
      manifest: {
        ...m, clipes,
        versaoBUrl: undefined, compostoUrl: undefined, previewUrl: undefined, edicao: undefined,
      },
      step: "clipes",
      status: "pending",
      lastError: null,
      updatedAt: new Date(),
    })
    .where(paradaLivre(id))
    .returning({ id: renderJobs.id });
  exigirAplicado(aplicado);

  revalidatePath("/produzir");
}

/**
 * Repete o passo que falhou em OUTRO modelo de vídeo.
 *
 * É o par do "Tentar de novo": quando o que quebrou foi a geração, insistir no
 * mesmo modelo costuma quebrar igual. Aqui o modelo da rodada muda e o passo é
 * refeito do ponto onde parou.
 *
 * Os clipes que já saíram ficam — foram pagos, e a cadeia continua do último
 * frame deles. A rodada pode acabar misturando modelos, e é por isso que cada
 * clipe carrega o seu no selo do painel.
 */
export async function tentarComModeloAction(id: string, modelo: string): Promise<void> {
  await requireDashboardAuth();
  if (!ehModeloVideo(modelo)) throw new Error(`modelo de vídeo desconhecido: ${modelo}`);

  const [job] = await db.select().from(renderJobs).where(eq(renderJobs.id, id));
  if (!job) throw new Error("rodada não encontrada");

  const aplicado = await db
    .update(renderJobs)
    .set({
      manifest: { ...job.manifest, modeloVideo: modelo, takePedido: undefined },
      status: "pending",
      lastError: null,
      attempts: 0,
      updatedAt: new Date(),
    })
    .where(paradaLivre(id))
    .returning({ id: renderJobs.id });
  exigirAplicado(aplicado);

  revalidatePath("/produzir");
}

/**
 * Salva (ou apaga, se vier vazio) o prompt manual de um clipe.
 *
 * Não recoloca a rodada na fila de propósito: escrever o prompt é preparação,
 * não gatilho. Quem decide gerar é o botão de gerar — senão salvar um rascunho
 * de texto dispararia crédito de vídeo sem querer.
 */
export async function salvarPromptManualAction(id: string, n: number, prompt: string): Promise<void> {
  await requireDashboardAuth();

  const [job] = await db.select().from(renderJobs).where(eq(renderJobs.id, id));
  if (!job) throw new Error("rodada não encontrada");

  const limpo = prompt.trim();
  const outros = (job.manifest.prompts ?? []).filter((p) => p.n !== n);

  const aplicado = await db
    .update(renderJobs)
    .set({
      manifest: {
        ...job.manifest,
        // Salvo por humano: marcado como tal, e o portão não pede confirmação de novo.
        prompts: limpo
          ? [...outros, { n, prompt: limpo, origem: "humano" as const }].sort((a, b) => a.n - b.n)
          : outros,
      },
      updatedAt: new Date(),
    })
    .where(paradaLivre(id))
    .returning({ id: renderJobs.id });
  exigirAplicado(aplicado);

  revalidatePath("/produzir");
}

/**
 * Salva o avatar da rodada pra reusar em outras.
 *
 * Guarda a imagem E a nota de casting. A nota reaparece literalmente em todo
 * prompt de clipe e é o que mantém a mesma pessoa entre um clipe e outro —
 * salvar só a imagem daria o rosto certo no clipe 1 e outra pessoa no clipe 3.
 */
export async function salvarAvatarAction(id: string, nome: string): Promise<void> {
  await requireDashboardAuth();

  const [job] = await db.select().from(renderJobs).where(eq(renderJobs.id, id));
  if (!job) throw new Error("rodada não encontrada");

  const { imagemBaseUrl, casting } = job.manifest;
  if (!imagemBaseUrl || !casting?.nota) {
    throw new Error("esta rodada ainda não tem rosto gerado");
  }

  await db.insert(avatares).values({
    workspaceId: job.workspaceId,
    nome: nome.trim() || job.castingBrief?.slice(0, 40) || "avatar sem nome",
    imagemUrl: imagemBaseUrl,
    nota: casting.nota,
    prompt: casting.promptBase,
  });

  revalidatePath("/produzir");
  revalidatePath("/avatares");
}

export async function apagarAvatarAction(id: string): Promise<void> {
  await requireDashboardAuth();
  // A imagem fica no Storage: outras rodadas já feitas apontam pra ela.
  await db.delete(avatares).where(eq(avatares.id, id));
  revalidatePath("/avatares");
  revalidatePath("/produzir");
}

export async function listarAvatares() {
  return db.select().from(avatares).orderBy(desc(avatares.criadoEm)).limit(60);
}
