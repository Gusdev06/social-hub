/**
 * Renderiza slides de carrossel em canvas — sem biblioteca.
 * 1080×1350 (4:5) é o formato que ocupa mais altura no feed do Instagram.
 */

export type Slide = {
  titulo: string;
  corpo: string;
  /** URL pública da imagem de fundo. */
  imagem?: string;
  /** 0 = imagem crua · 1 = fundo sólido. Sem isso, texto sobre foto some. */
  overlay?: number;
  posicao?: "topo" | "centro" | "baixo";
  alinhamento?: "esquerda" | "centro";
  /** Multiplicador do tamanho da fonte (0.7 – 1.4). */
  escala?: number;
};

export type Tema = {
  nome: string;
  fundo: string; fundo2: string;
  titulo: string; corpo: string; acento: string;
  /** Cor do overlay sobre a imagem. */
  scrim: string;
};

export const TEMAS: Record<string, Tema> = {
  escuro: {
    nome: "Escuro · terracota",
    fundo: "#0E0E10", fundo2: "#17161A",
    titulo: "#F5F4F2", corpo: "#A8A5A0", acento: "#C2603F", scrim: "14,14,16",
  },
  claro: {
    nome: "Claro · grafite",
    fundo: "#F5F4F2", fundo2: "#E9E7E3",
    titulo: "#141414", corpo: "#5C5A56", acento: "#C2603F", scrim: "245,244,242",
  },
  azul: {
    nome: "Escuro · azul",
    fundo: "#0B1020", fundo2: "#131B33",
    titulo: "#F2F5FF", corpo: "#93A0C0", acento: "#4C7DF0", scrim: "11,16,32",
  },
};

const L = 1080;
const A = 1350;
const MARGEM = 96;
const FONTE = '-apple-system, "Segoe UI", system-ui, Helvetica, Arial, sans-serif';

const cache = new Map<string, HTMLImageElement>();

/** crossOrigin é obrigatório: sem ele o canvas é "tainted" e toBlob explode. */
function carregar(src: string): Promise<HTMLImageElement> {
  const pronta = cache.get(src);
  if (pronta?.complete) return Promise.resolve(pronta);
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => { cache.set(src, img); resolve(img); };
    img.onerror = () => reject(new Error("não consegui carregar a imagem"));
    img.src = src;
  });
}

function quebrar(ctx: CanvasRenderingContext2D, texto: string, largura: number): string[] {
  const linhas: string[] = [];
  for (const paragrafo of texto.split("\n")) {
    if (!paragrafo.trim()) { linhas.push(""); continue; }
    let atual = "";
    for (const palavra of paragrafo.split(/\s+/)) {
      const teste = atual ? `${atual} ${palavra}` : palavra;
      if (ctx.measureText(teste).width > largura && atual) { linhas.push(atual); atual = palavra; }
      else atual = teste;
    }
    if (atual) linhas.push(atual);
  }
  return linhas;
}

/** Maior corpo de fonte que ainda cabe — evita slide minúsculo ou transbordando. */
function ajustar(
  ctx: CanvasRenderingContext2D, texto: string, largura: number, alturaMax: number,
  o: { min: number; max: number; peso: number; entrelinha: number },
): { tamanho: number; linhas: string[] } {
  for (let t = o.max; t >= o.min; t -= 2) {
    ctx.font = `${o.peso} ${t}px ${FONTE}`;
    const linhas = quebrar(ctx, texto, largura);
    if (linhas.length * t * o.entrelinha <= alturaMax) return { tamanho: t, linhas };
  }
  ctx.font = `${o.peso} ${o.min}px ${FONTE}`;
  return { tamanho: o.min, linhas: quebrar(ctx, texto, largura) };
}

function grao(ctx: CanvasRenderingContext2D, intensidade = 9) {
  const img = ctx.getImageData(0, 0, L, A);
  const d = img.data;
  for (let i = 0; i < d.length; i += 4) {
    const n = (Math.random() - 0.5) * intensidade * 2;
    d[i] += n; d[i + 1] += n; d[i + 2] += n;
  }
  ctx.putImageData(img, 0, 0);
}

/** Cobre o canvas mantendo proporção — como object-fit: cover. */
function desenharCover(ctx: CanvasRenderingContext2D, img: HTMLImageElement) {
  const escala = Math.max(L / img.width, A / img.height);
  const w = img.width * escala;
  const h = img.height * escala;
  ctx.drawImage(img, (L - w) / 2, (A - h) / 2, w, h);
}

export async function desenharSlide(
  canvas: HTMLCanvasElement,
  slide: Slide,
  opts: { indice: number; total: number; tema: Tema; handle: string },
): Promise<void> {
  canvas.width = L;
  canvas.height = A;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  const { tema } = opts;
  const capa = opts.indice === 0;
  const posicao = slide.posicao ?? "centro";
  const alinhado = slide.alinhamento ?? "esquerda";
  const escala = slide.escala ?? 1;

  if (slide.imagem) {
    try {
      desenharCover(ctx, await carregar(slide.imagem));
    } catch {
      ctx.fillStyle = tema.fundo;
      ctx.fillRect(0, 0, L, A);
    }
    // scrim: mais forte no lado onde o texto fica, pra manter contraste
    const op = slide.overlay ?? 0.62;
    const g = ctx.createLinearGradient(
      0, posicao === "topo" ? 0 : posicao === "baixo" ? A : A * 0.15,
      0, posicao === "topo" ? A : posicao === "baixo" ? 0 : A * 0.85,
    );
    g.addColorStop(0, `rgba(${tema.scrim},${Math.min(1, op + 0.22)})`);
    g.addColorStop(0.55, `rgba(${tema.scrim},${op})`);
    g.addColorStop(1, `rgba(${tema.scrim},${Math.max(0, op - 0.3)})`);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, L, A);
  } else {
    const g = ctx.createLinearGradient(0, 0, L, A);
    g.addColorStop(0, tema.fundo);
    g.addColorStop(1, tema.fundo2);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, L, A);
    grao(ctx);
  }

  const larguraUtil = L - MARGEM * 2;
  const x = alinhado === "centro" ? L / 2 : MARGEM;
  ctx.textAlign = alinhado === "centro" ? "center" : "left";
  ctx.textBaseline = "top";

  if (capa && !slide.imagem) {
    ctx.fillStyle = tema.acento;
    ctx.fillRect(alinhado === "centro" ? L / 2 - 44 : MARGEM, MARGEM, 88, 8);
  }

  const t = ajustar(ctx, slide.titulo, larguraUtil, capa ? 620 : 430, {
    min: Math.round(40 * escala), max: Math.round((capa ? 104 : 76) * escala),
    peso: 700, entrelinha: 1.16,
  });
  const alturaTitulo = t.linhas.length * t.tamanho * 1.16;

  const c = slide.corpo
    ? ajustar(ctx, slide.corpo, larguraUtil, 420, {
        min: Math.round(28 * escala), max: Math.round(42 * escala),
        peso: 400, entrelinha: 1.45,
      })
    : null;
  const alturaCorpo = c ? c.linhas.length * c.tamanho * 1.45 : 0;
  const alturaBloco = alturaTitulo + (alturaCorpo ? alturaCorpo + 48 : 0);

  let y =
    posicao === "topo" ? MARGEM + 60
    : posicao === "baixo" ? A - MARGEM - 90 - alturaBloco
    : (A - alturaBloco) / 2;

  ctx.fillStyle = tema.titulo;
  ctx.font = `700 ${t.tamanho}px ${FONTE}`;
  for (const linha of t.linhas) { ctx.fillText(linha, x, y); y += t.tamanho * 1.16; }

  if (c && slide.corpo) {
    y += 48;
    ctx.fillStyle = tema.corpo;
    ctx.font = `400 ${c.tamanho}px ${FONTE}`;
    for (const linha of c.linhas) { ctx.fillText(linha, x, y); y += c.tamanho * 1.45; }
  }

  // rodapé
  ctx.textBaseline = "alphabetic";
  ctx.textAlign = "left";
  ctx.font = `500 28px ${FONTE}`;
  ctx.fillStyle = slide.imagem ? tema.titulo : tema.corpo;
  ctx.fillText(opts.handle, MARGEM, A - MARGEM);

  ctx.textAlign = "right";
  ctx.fillStyle = tema.acento;
  ctx.fillText(`${opts.indice + 1}/${opts.total}`, L - MARGEM, A - MARGEM);

  if (opts.indice < opts.total - 1) {
    ctx.font = `700 34px ${FONTE}`;
    ctx.fillText("→", L - MARGEM, A - MARGEM - 52);
  }
  ctx.textAlign = "left";
}

export function canvasParaBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error("falha ao gerar a arte"))),
      "image/jpeg", // o Instagram só aceita JPEG em foto
      0.94,
    );
  });
}
