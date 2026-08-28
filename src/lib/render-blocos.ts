/**
 * Renderiza um slide a partir do SISTEMA VISUAL extraído do post-fonte + os
 * blocos de conteúdo. É isso que faz a arte sair parecida com o original em vez
 * de só reaproveitar o texto.
 */
import type { Bloco, Design } from "./claude";

const L = 1080;
const A = 1350;
const MARGEM = 84;

const SANS = '-apple-system, "Segoe UI", Inter, system-ui, Helvetica, Arial, sans-serif';
const SERIF = 'Georgia, "Times New Roman", "Iowan Old Style", serif';
const MONO = '"SF Mono", ui-monospace, Menlo, Consolas, "Courier New", monospace';

const cacheImg = new Map<string, HTMLImageElement>();

/** crossOrigin é obrigatório: sem ele o canvas fica "tainted" e toBlob explode. */
function carregar(src: string): Promise<HTMLImageElement> {
  const pronta = cacheImg.get(src);
  if (pronta?.complete) return Promise.resolve(pronta);
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => { cacheImg.set(src, img); resolve(img); };
    img.onerror = () => reject(new Error("não consegui carregar a imagem"));
    img.src = src;
  });
}

/** Cobre o canvas mantendo proporção — como object-fit: cover. */
function desenharCover(ctx: CanvasRenderingContext2D, img: HTMLImageElement) {
  const e = Math.max(L / img.width, A / img.height);
  const w = img.width * e, h = img.height * e;
  ctx.drawImage(img, (L - w) / 2, (A - h) / 2, w, h);
}

/** #RRGGBB → "r,g,b" pra usar em rgba(). */
function paraRgb(hex: string): string {
  const m = hex.replace("#", "").match(/.{2}/g);
  if (!m || m.length < 3) return "0,0,0";
  return m.slice(0, 3).map((h) => parseInt(h, 16)).join(",");
}

function familia(f: "sans" | "serif" | "mono"): string {
  return f === "serif" ? SERIF : f === "mono" ? MONO : SANS;
}

function quebrar(ctx: CanvasRenderingContext2D, texto: string, largura: number): string[] {
  const linhas: string[] = [];
  for (const p of texto.split("\n")) {
    if (!p.trim()) { linhas.push(""); continue; }
    let atual = "";
    for (const w of p.split(/\s+/)) {
      const t = atual ? `${atual} ${w}` : w;
      if (ctx.measureText(t).width > largura && atual) { linhas.push(atual); atual = w; }
      else atual = t;
    }
    if (atual) linhas.push(atual);
  }
  return linhas;
}

function retanguloArredondado(
  ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number,
) {
  const raio = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + raio, y);
  ctx.arcTo(x + w, y, x + w, y + h, raio);
  ctx.arcTo(x + w, y + h, x, y + h, raio);
  ctx.arcTo(x, y + h, x, y, raio);
  ctx.arcTo(x, y, x + w, y, raio);
  ctx.closePath();
}

/** Especificação tipográfica de cada tipo de bloco, na escala 1080×1350. */
function specDoBloco(b: Bloco, d: Design) {
  switch (b.tipo) {
    case "titulo":
      return { tam: 68, peso: 800, cor: d.texto, fonte: familia(d.fonteTitulo),
               entrelinha: 1.1, antes: 0, depois: 14, italico: false, caixaAlta: d.tituloCaixaAlta };
    case "subtitulo":
      return { tam: 40, peso: 400, cor: d.acento, fonte: familia(d.fonteSubtitulo),
               entrelinha: 1.25, antes: 4, depois: 34, italico: d.subtituloItalico, caixaAlta: false };
    case "label":
      return { tam: 27, peso: 800, cor: d.acento, fonte: SANS,
               entrelinha: 1.2, antes: 10, depois: 6, italico: false, caixaAlta: true };
    case "mono":
      return { tam: 27, peso: 400, cor: d.textoSecundario, fonte: MONO,
               entrelinha: 1.35, antes: 0, depois: 30, italico: false, caixaAlta: false };
    default:
      return { tam: 34, peso: 400, cor: d.textoSecundario, fonte: SANS,
               entrelinha: 1.4, antes: 6, depois: 22, italico: false, caixaAlta: false };
  }
}

type Medida = { altura: number; desenhar: (y: number) => void };

export async function desenharBlocos(
  canvas: HTMLCanvasElement,
  blocos: Bloco[],
  design: Design,
  opts: {
    indice: number; total: number; handle: string;
    /** Imagem de fundo opcional — mantém o layout, troca o fundo chapado. */
    imagem?: string;
    /** 0 = imagem crua · 1 = cor de fundo sólida por cima. */
    overlay?: number;
  },
): Promise<void> {
  canvas.width = L;
  canvas.height = A;
  const ctx0 = canvas.getContext("2d");
  if (!ctx0) return;
  const ctx = ctx0; // const não-nulo: as closures de desenho perdem o narrowing
  const d = design;

  if (opts.imagem) {
    try {
      desenharCover(ctx, await carregar(opts.imagem));
      // scrim na cor de fundo do tema: mantém o contraste do layout original
      ctx.fillStyle = `rgba(${paraRgb(d.fundo)},${opts.overlay ?? 0.82})`;
      ctx.fillRect(0, 0, L, A);
    } catch {
      ctx.fillStyle = d.fundo;
      ctx.fillRect(0, 0, L, A);
    }
  } else {
    ctx.fillStyle = d.fundo;
    ctx.fillRect(0, 0, L, A);
  }
  ctx.textBaseline = "top";
  ctx.textAlign = "left";

  const largura = L - MARGEM * 2;
  let topo = MARGEM;

  // cabeçalho: @ centralizado + numeração à direita, com filete embaixo
  if (d.temCabecalho) {
    ctx.font = `500 26px ${SANS}`;
    ctx.fillStyle = d.textoSecundario;
    ctx.textAlign = "center";
    ctx.fillText(opts.handle, L / 2, topo);
    if (d.numeracao === "topo-direita") {
      ctx.textAlign = "right";
      ctx.fillText(String(opts.indice + 1).padStart(2, "0"), L - MARGEM, topo);
    }
    ctx.textAlign = "left";
    topo += 46;
    ctx.globalAlpha = 0.18;
    ctx.fillStyle = d.textoSecundario;
    ctx.fillRect(MARGEM, topo, largura, 2);
    ctx.globalAlpha = 1;
    topo += 44;
  }

  // ── medição: monta as instruções de desenho e soma a altura ──
  function medir(escala: number): Medida[] {
    const saida: Medida[] = [];
    for (const b of blocos) {
      if (b.tipo === "cartao") {
        const padding = 44 * escala;
        const larguraInterna = largura - padding * 2;
        let h = padding;

        const tTam = 40 * escala;
        ctx.font = `700 ${tTam}px ${SANS}`;
        const tLinhas = quebrar(ctx, b.texto, larguraInterna);
        h += tLinhas.length * tTam * 1.2;

        const sTam = 30 * escala;
        let sLinhas: string[] = [];
        if (b.texto2) {
          h += 18 * escala;
          ctx.font = `400 ${sTam}px ${SANS}`;
          sLinhas = quebrar(ctx, b.texto2, larguraInterna);
          h += sLinhas.length * sTam * 1.35;
        }

        const iTam = 34 * escala;
        if (b.itens.length) h += 26 * escala + b.itens.length * iTam * 1.35 + (b.itens.length - 1) * 30 * escala;
        h += padding;

        saida.push({
          altura: h + 24 * escala,
          desenhar: (y) => {
            ctx.fillStyle = d.cartaoFundo ?? d.texto;
            retanguloArredondado(ctx, MARGEM, y, largura, h, d.raio || 28);
            ctx.fill();

            let cy = y + padding;
            ctx.textAlign = "left";
            ctx.fillStyle = d.cartaoTexto ?? d.fundo;
            ctx.font = `700 ${tTam}px ${SANS}`;
            for (const l of tLinhas) { ctx.fillText(l, MARGEM + padding, cy); cy += tTam * 1.2; }

            if (b.texto2) {
              cy += 18 * escala;
              ctx.globalAlpha = 0.62;
              ctx.font = `400 ${sTam}px ${SANS}`;
              for (const l of sLinhas) { ctx.fillText(l, MARGEM + padding, cy); cy += sTam * 1.35; }
              ctx.globalAlpha = 1;
            }

            if (b.itens.length) {
              cy += 26 * escala;
              ctx.textAlign = "center";
              b.itens.forEach((item, i) => {
                const ultimo = i === b.itens.length - 1;
                ctx.fillStyle = ultimo && b.destacarUltimo ? d.acento : (d.cartaoTexto ?? d.fundo);
                ctx.font = `700 ${iTam}px ${SANS}`;
                ctx.fillText(item.toUpperCase(), L / 2, cy);
                cy += iTam * 1.35;
                if (!ultimo) {
                  ctx.fillStyle = d.acento;
                  ctx.font = `700 ${iTam}px ${SANS}`;
                  ctx.fillText("↓", L / 2, cy);
                  cy += 30 * escala;
                }
              });
              ctx.textAlign = "left";
            }
          },
        });
        continue;
      }

      if (b.tipo === "lista") {
        const iTam = 36 * escala;
        const h = b.itens.length * iTam * 1.35 + (b.itens.length - 1) * 28 * escala + 30 * escala;
        saida.push({
          altura: h,
          desenhar: (y) => {
            let cy = y;
            ctx.textAlign = "center";
            b.itens.forEach((item, i) => {
              const ultimo = i === b.itens.length - 1;
              ctx.fillStyle = ultimo && b.destacarUltimo ? d.acento : d.texto;
              ctx.font = `700 ${iTam}px ${SANS}`;
              ctx.fillText(item.toUpperCase(), L / 2, cy);
              cy += iTam * 1.35;
              if (!ultimo) {
                ctx.fillStyle = d.acento;
                ctx.fillText("↓", L / 2, cy);
                cy += 28 * escala;
              }
            });
            ctx.textAlign = "left";
          },
        });
        continue;
      }

      const s = specDoBloco(b, d);
      const tam = s.tam * escala;
      ctx.font = `${s.italico ? "italic " : ""}${s.peso} ${tam}px ${s.fonte}`;
      const texto = s.caixaAlta ? b.texto.toUpperCase() : b.texto;
      const linhas = quebrar(ctx, texto, largura);
      saida.push({
        altura: s.antes * escala + linhas.length * tam * s.entrelinha + s.depois * escala,
        desenhar: (y) => {
          let cy = y + s.antes * escala;
          ctx.fillStyle = s.cor;
          ctx.textAlign = "left";
          ctx.font = `${s.italico ? "italic " : ""}${s.peso} ${tam}px ${s.fonte}`;
          for (const l of linhas) { ctx.fillText(l, MARGEM, cy); cy += tam * s.entrelinha; }
        },
      });
    }
    return saida;
  }

  // encolhe até caber — layout do original foi desenhado pra um volume de texto,
  // e o texto transposto quase nunca tem exatamente o mesmo tamanho
  const disponivel = A - topo - MARGEM - 40;
  let escala = 1;
  let medidas = medir(escala);
  let total = medidas.reduce((s, m) => s + m.altura, 0);
  while (total > disponivel && escala > 0.55) {
    escala -= 0.04;
    medidas = medir(escala);
    total = medidas.reduce((s, m) => s + m.altura, 0);
  }

  let y = topo;
  for (const m of medidas) { m.desenhar(y); y += m.altura; }

  if (d.numeracao === "rodape-direita") {
    ctx.textAlign = "right";
    ctx.font = `500 26px ${SANS}`;
    ctx.fillStyle = d.textoSecundario;
    ctx.fillText(String(opts.indice + 1).padStart(2, "0"), L - MARGEM, A - MARGEM);
    ctx.textAlign = "left";
  }
}
