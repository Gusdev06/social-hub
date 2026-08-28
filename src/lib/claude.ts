import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";

const MODEL = "claude-opus-5";

export function claudeConfigurado(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY);
}

function client(): Anthropic {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error("ANTHROPIC_API_KEY não configurada — a replicação de post fica indisponível.");
  }
  return new Anthropic();
}

/* ─────────────── passo 1: teardown do post-fonte ─────────────── */

const TeardownSchema = z.object({
  gancho: z.string().describe("A primeira frase/slide. O que faz parar o scroll."),
  mecanismo: z.string().describe("A estrutura que faz o post funcionar: promessa, lista, contraste, antes/depois, erro comum..."),
  formato: z.enum(["carrossel", "post-unico", "reel"]),
  slides: z.array(z.object({
    titulo: z.string(),
    corpo: z.string(),
  })).describe("Reconstrução slide a slide do que está no post-fonte."),
  identidadeVisual: z.string().describe("Paleta, tipografia, uso de fundo/textura, presença de rosto."),
  porQuePerformou: z.string().describe("A tese: qual tensão ou desejo isso ativa."),
  publicoOriginal: z.string().describe("Pra quem esse post foi escrito."),
  cta: z.string().nullable(),
});

export type Teardown = z.infer<typeof TeardownSchema>;

/**
 * Lê o post-fonte (prints e/ou legenda) e extrai a ESTRUTURA que fez performar.
 * O post não precisa ser do nicho do Gusta — é justamente a ideia: pegar o que
 * já foi validado em outro nicho e transpor.
 */
export async function fazerTeardown(opts: {
  /** URLs públicas dos prints — sobem pro Supabase antes, então não passam
   *  pelo corpo da Server Action (teto de 1 MB) nem viram base64 gigante. */
  imagens: string[];
  legenda?: string;
  url?: string;
}): Promise<Teardown> {
  const conteudo: Anthropic.ContentBlockParam[] = opts.imagens.map((u) => ({
    type: "image" as const,
    source: { type: "url" as const, url: u },
  }));

  conteudo.push({
    type: "text",
    text: [
      "Este é um post de Instagram que JÁ PERFORMOU.",
      opts.legenda ? `\nLegenda do post:\n"""\n${opts.legenda}\n"""` : "",
      opts.url ? `\nURL: ${opts.url}` : "",
      "\nFaça o teardown: extraia a estrutura que fez isso funcionar, não o assunto.",
      "Reconstrua os slides como estão no original. Seja específico e concreto —",
      "'gancho de negação' é inútil, 'nega uma crença cara do leitor na primeira linha' serve.",
    ].filter(Boolean).join("\n"),
  });

  const r = await client().messages.parse({
    model: MODEL,
    max_tokens: 16000,
    thinking: { type: "adaptive" },
    system:
      "Você é um estrategista de conteúdo que faz engenharia reversa de posts virais. " +
      "Seu trabalho é separar a ESTRUTURA (transponível) do ASSUNTO (descartável).",
    messages: [{ role: "user", content: conteudo }],
    output_config: { format: zodOutputFormat(TeardownSchema) },
  });

  if (!r.parsed_output) throw new Error("não consegui estruturar o teardown");
  return r.parsed_output;
}

/* ─────────────── passo 2: transpor pro posicionamento ─────────────── */

const PostSchema = z.object({
  titulo: z.string().describe("Nome interno do post, pra achar depois."),
  slides: z.array(z.object({
    titulo: z.string().describe("Linha grande do slide. Curta."),
    corpo: z.string().describe("Texto de apoio. Pode ser vazio no slide de capa."),
  })).min(3).max(10),
  legenda: z.string().describe("Legenda pronta pra publicar, com quebras de linha."),
  primeiroComentario: z.string().nullable().describe("Se o CTA pede link, vai aqui."),
  justificativa: z.string().describe("O que foi mantido da estrutura original e o que foi trocado."),
});

export type PostGerado = z.infer<typeof PostSchema>;

const POSICIONAMENTO = `
Posicionamento do Gusta (@gustagoat.ia):
- Temas: microsaas, distribuição, infosaas, infoproduto, marketing digital.
- Ele é ex-dev full-stack, 22 anos, vive 100% do digital. Construiu SaaS de verdade.
- A oferta no fim do funil é a MENTORIA.
- Voz: PT-BR direto, sem enrolação, sem "galera"/"pessoal", sem emoji decorativo.
  Frases curtas. Ele mostra o que fez, não o que teoriza.
- O que ele NÃO é mais: conteúdo de UGC, TikTok Shop, "ganhar dinheiro com IA" genérico.
`.trim();

/** Transpõe a estrutura validada pro posicionamento do Gusta. */
export async function gerarPost(opts: {
  teardown: Teardown;
  angulo: string;
  formato: "carrossel" | "post-unico";
  cta: string;
  observacoes?: string;
}): Promise<PostGerado> {
  const r = await client().messages.parse({
    model: MODEL,
    max_tokens: 16000,
    thinking: { type: "adaptive" },
    output_config: { effort: "high", format: zodOutputFormat(PostSchema) },
    system: [
      "Você escreve conteúdo de Instagram para um operador brasileiro de microsaas.",
      POSICIONAMENTO,
      "",
      "Regra dura: você recebe a ESTRUTURA de um post que performou em OUTRO nicho.",
      "Mantenha o mecanismo — a mecânica que fez funcionar. Troque completamente o assunto.",
      "Nunca invente números, preços, faturamento ou resultado. Se precisar de um número",
      "que você não recebeu, escreva [NÚMERO] pro Gusta preencher.",
    ].join("\n"),
    messages: [{
      role: "user",
      content: [
        "ESTRUTURA VALIDADA (do post-fonte):",
        JSON.stringify(opts.teardown, null, 2),
        "",
        `ÂNGULO que o Gusta quer: ${opts.angulo}`,
        `FORMATO: ${opts.formato}`,
        `CTA: ${opts.cta}`,
        opts.observacoes ? `OBSERVAÇÕES: ${opts.observacoes}` : "",
        "",
        "Escreva o post transposto.",
      ].filter(Boolean).join("\n"),
    }],
  });

  if (!r.parsed_output) throw new Error("não consegui estruturar o post");
  return r.parsed_output;
}

/* ─────────────── passo 1b: extrair o SISTEMA VISUAL do post-fonte ─────────────── */

const DesignSchema = z.object({
  fundo: z.string().describe("Cor de fundo do slide, em hex. Ex: #F2EDE0"),
  texto: z.string().describe("Cor do texto principal, em hex."),
  textoSecundario: z.string().describe("Cor de textos de apoio, em hex."),
  acento: z.string().describe("Cor de destaque (labels, setas, palavra final), em hex."),
  cartaoFundo: z.string().nullable().describe("Se há um cartão/caixa destacada, a cor de fundo dela em hex. Senão null."),
  cartaoTexto: z.string().nullable().describe("Cor do texto dentro do cartão, em hex. Senão null."),
  raio: z.number().describe("Raio do arredondamento do cartão em px, escala 1080 de largura. 0 se não houver."),
  fonteTitulo: z.enum(["sans", "serif", "mono"]),
  fonteSubtitulo: z.enum(["sans", "serif", "mono"]),
  subtituloItalico: z.boolean(),
  tituloCaixaAlta: z.boolean(),
  temCabecalho: z.boolean().describe("Se o @ do autor aparece no topo."),
  numeracao: z.enum(["topo-direita", "rodape-direita", "nenhuma"]),
});

export type Design = z.infer<typeof DesignSchema>;

const BlocoSchema = z.object({
  tipo: z.enum(["titulo", "subtitulo", "label", "mono", "texto", "lista", "cartao"])
    .describe("titulo=linha grande · subtitulo=linha de apoio · label=etiqueta pequena colorida · mono=texto monoespaçado · texto=parágrafo · lista=itens com seta entre eles · cartao=caixa destacada"),
  texto: z.string().describe("Texto do bloco. No cartão, é o título dentro dele."),
  texto2: z.string().describe("Texto secundário. Só usado em cartao. Vazio se não houver."),
  itens: z.array(z.string()).describe("Itens da lista, na ordem. Vazio se não for lista/cartao com lista."),
  destacarUltimo: z.boolean().describe("Se o último item da lista sai na cor de acento."),
});

export type Bloco = z.infer<typeof BlocoSchema>;

const EstruturaSchema = z.object({
  design: DesignSchema,
  slides: z.array(z.object({
    blocos: z.array(BlocoSchema),
  })).describe("Um item por slide do post-fonte, com os blocos na ordem em que aparecem."),
});

export type Estrutura = z.infer<typeof EstruturaSchema>;

/**
 * Lê os prints e devolve o SISTEMA VISUAL + a estrutura de blocos de cada slide.
 * É isso que permite reproduzir o layout do original em vez de só o texto.
 */
export async function extrairDesign(imagens: string[]): Promise<Estrutura> {
  const conteudo: Anthropic.ContentBlockParam[] = imagens.map((u) => ({
    type: "image" as const,
    source: { type: "url" as const, url: u },
  }));

  conteudo.push({
    type: "text",
    text:
      "Extraia o sistema visual deste carrossel e a estrutura de blocos de cada slide.\n" +
      "Cores: leia do pixel, em hex, sem arredondar pra cor 'próxima conhecida'.\n" +
      "Blocos: na ordem exata em que aparecem no slide, de cima pra baixo.\n" +
      "Se houver uma caixa/cartão destacada, use o tipo 'cartao' e coloque o conteúdo dele\n" +
      "em texto (título do cartão), texto2 (apoio) e itens (a lista dentro).",
  });

  const r = await client().messages.parse({
    model: MODEL,
    max_tokens: 16000,
    thinking: { type: "adaptive" },
    output_config: { effort: "high", format: zodOutputFormat(EstruturaSchema) },
    system:
      "Você é um diretor de arte que reproduz layouts com precisão. " +
      "Leia cores exatas, hierarquia tipográfica e ordem dos elementos.",
    messages: [{ role: "user", content: conteudo }],
  });

  if (!r.parsed_output) throw new Error("não consegui extrair o design");
  return r.parsed_output;
}

/* ─────────────── transpor mantendo a mesma estrutura de blocos ─────────────── */

const PostEstruturadoSchema = z.object({
  titulo: z.string(),
  slides: z.array(z.object({ blocos: z.array(BlocoSchema) })),
  legenda: z.string(),
  primeiroComentario: z.string().nullable(),
  justificativa: z.string(),
});

export type PostEstruturado = z.infer<typeof PostEstruturadoSchema>;

/** Troca o conteúdo mantendo EXATAMENTE os mesmos blocos, na mesma ordem. */
export async function gerarPostEstruturado(opts: {
  estrutura: Estrutura;
  teardown: Teardown;
  angulo: string;
  cta: string;
  observacoes?: string;
}): Promise<PostEstruturado> {
  const r = await client().messages.parse({
    model: MODEL,
    max_tokens: 16000,
    thinking: { type: "adaptive" },
    output_config: { effort: "high", format: zodOutputFormat(PostEstruturadoSchema) },
    system: [
      "Você escreve conteúdo de Instagram para um operador brasileiro de microsaas.",
      POSICIONAMENTO,
      "",
      "Regra dura: mantenha EXATAMENTE a mesma quantidade de slides e os mesmos tipos",
      "de bloco, na mesma ordem, do post-fonte. Você troca só o CONTEÚDO.",
      "Se o slide 2 tem titulo+subtitulo+label+mono+cartao, o seu slide 2 tem os mesmos",
      "cinco blocos, nos mesmos papéis. Respeite o comprimento aproximado de cada texto —",
      "o layout foi desenhado pra aquele volume.",
      "Nunca invente números. Se precisar de um que não recebeu, escreva [NÚMERO].",
    ].join("\n"),
    messages: [{
      role: "user",
      content: [
        "ESTRUTURA DE BLOCOS DO ORIGINAL:",
        JSON.stringify(opts.estrutura.slides, null, 2),
        "",
        "TEARDOWN (por que funcionou):",
        JSON.stringify(opts.teardown, null, 2),
        "",
        `ÂNGULO: ${opts.angulo}`,
        `CTA: ${opts.cta}`,
        opts.observacoes ? `OBSERVAÇÕES: ${opts.observacoes}` : "",
        "",
        "Escreva o post transposto com a mesma arquitetura de blocos.",
      ].filter(Boolean).join("\n"),
    }],
  });

  if (!r.parsed_output) throw new Error("não consegui estruturar o post");
  return r.parsed_output;
}

/* ─────────────── geração no sistema de 4 eixos ─────────────── */

const SlideDataSchema = z.object({
  type: z.enum([
    "hook", "body", "cta", "quote", "stats", "list",
    "checklist", "process", "comparison", "image", "emoji", "number",
  ]).describe("hook=capa · body=texto · list/checklist/process=listas · stats=números · quote=citação · comparison=antes vs depois · number=número gigante · cta=chamada final"),
  title: z.string().describe("Linha grande. Vazio se o slide não tiver título."),
  text: z.string().describe("Texto de apoio. Vazio se não houver."),
  badge: z.string().describe("Etiqueta pequena acima do título. Vazio se não houver."),
  highlight: z.string().describe("A expressão dentro de title/text que sai na cor de acento. Vazio se nenhuma."),
  items: z.array(z.string()).describe("Itens de list/checklist/process. Vazio se não for lista."),
  stats: z.array(z.object({ value: z.string(), label: z.string() })).describe("Só em stats."),
  leftLabel: z.string(), leftItems: z.array(z.string()),
  rightLabel: z.string(), rightItems: z.array(z.string()),
  bigNumber: z.string().describe("Só em number."),
  author: z.string(), role: z.string(),
});

const CarrosselSchema = z.object({
  titulo: z.string().describe("Nome interno do post."),
  fonte: z.enum(["minimal", "editorial", "clean", "mono", "condensed"])
    .describe("Qual família mais se aproxima da tipografia do original."),
  superficie: z.enum(["dark", "white", "light", "paper", "gradient", "pastel", "neon", "ember"])
    .describe("Qual superfície mais se aproxima do fundo do original."),
  acento: z.enum(["yellow", "red", "teal", "coral", "orange", "violet", "lime", "blue", "fuchsia", "pink", "amber"])
    .describe("Qual acento mais se aproxima da cor de destaque do original."),
  proposito: z.enum(["carousel", "presentation"]),
  slides: z.array(SlideDataSchema).min(3).max(12),
  legenda: z.string(),
  primeiroComentario: z.string().nullable(),
  justificativa: z.string().describe("O que foi mantido da estrutura original e o que foi trocado."),
});

export type Carrossel = z.infer<typeof CarrosselSchema>;

/**
 * Gera o carrossel já no sistema de 4 eixos (fonte × superfície × acento ×
 * propósito). O Claude escolhe o TIPO de cada slide, então o layout sai do
 * componente em vez de eu tentar posicionar texto na mão.
 */
export async function gerarCarrossel(opts: {
  teardown: Teardown;
  estrutura?: Estrutura | null;
  angulo: string;
  cta: string;
  observacoes?: string;
}): Promise<Carrossel> {
  const r = await client().messages.parse({
    model: MODEL,
    max_tokens: 16000,
    thinking: { type: "adaptive" },
    output_config: { effort: "high", format: zodOutputFormat(CarrosselSchema) },
    system: [
      "Você escreve carrosséis de Instagram para um operador brasileiro de microsaas.",
      POSICIONAMENTO,
      "",
      "Você recebe a estrutura de um post que performou em OUTRO nicho. Mantenha o",
      "mecanismo e a quantidade de slides; troque o assunto por completo.",
      "",
      "Escolha o TIPO de cada slide pelo papel que ele cumpre: o primeiro é sempre hook.",
      "Use list/checklist/process quando o original enumera, stats quando mostra número,",
      "comparison quando contrasta dois lados, number quando um número domina o slide.",
      "Em cada slide, marque em 'highlight' a expressão que deve sair na cor de acento —",
      "é o que dá ritmo visual. Uma por slide, no máximo.",
      "Campos que não se aplicam ao tipo do slide vão vazios.",
      "",
      "Nunca invente números, preços ou faturamento. Use [NÚMERO] se precisar de um.",
    ].join("\n"),
    messages: [{
      role: "user",
      content: [
        opts.estrutura
          ? `DESIGN E BLOCOS DO ORIGINAL:\n${JSON.stringify(opts.estrutura, null, 2)}`
          : "",
        `TEARDOWN:\n${JSON.stringify(opts.teardown, null, 2)}`,
        "",
        `ÂNGULO: ${opts.angulo}`,
        `CTA: ${opts.cta}`,
        opts.observacoes ? `OBSERVAÇÕES: ${opts.observacoes}` : "",
        "",
        "Escreva o carrossel transposto e escolha os eixos de estilo mais próximos do original.",
      ].filter(Boolean).join("\n"),
    }],
  });

  if (!r.parsed_output) throw new Error("não consegui gerar o carrossel");
  return r.parsed_output;
}
