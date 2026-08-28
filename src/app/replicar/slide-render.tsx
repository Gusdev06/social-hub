"use client";

import type { SlideData, StylePreset } from "@/lib/carousel/types";

/**
 * Um slide, em HTML. Renderiza em 1080×1350 e é escalado por transform pro
 * preview — assim o que você vê é literalmente o que o html-to-image exporta.
 */
export function SlideRender({
  slide, preset, indice, total, handle, largura = 1080, altura = 1350,
}: {
  slide: SlideData;
  preset: StylePreset;
  indice: number;
  total: number;
  handle: string;
  largura?: number;
  altura?: number;
}) {
  const p = preset;
  const capa = slide.type === "hook";
  const tamTitulo = p.titleFontSize ?? 44;

  const fundo = p.bgGradient
    ? { backgroundImage: p.bgGradient }
    : { backgroundColor: p.bg };

  return (
    <div
      style={{
        width: largura, height: altura, ...fundo,
        color: p.textColor, fontFamily: p.fontFamily,
        padding: 88, display: "flex", flexDirection: "column",
        position: "relative", overflow: "hidden",
      }}
    >
      {/* cabeçalho */}
      <div style={{
        display: "flex", justifyContent: "space-between", alignItems: "center",
        fontSize: 26, color: p.textSecondary, fontWeight: 500, letterSpacing: 0.2,
      }}>
        <span>{handle}</span>
        <span>{String(indice + 1).padStart(2, "0")}</span>
      </div>

      <div style={{
        flex: 1, display: "flex", flexDirection: "column",
        justifyContent: capa ? "center" : "flex-start",
        paddingTop: capa ? 0 : 56, gap: 28,
      }}>
        {slide.badge && (
          <span style={{
            fontSize: 24, fontWeight: 800, letterSpacing: 1.4,
            textTransform: "uppercase", color: p.highlightColor,
          }}>{slide.badge}</span>
        )}

        {slide.title && (
          <h2 style={{
            fontSize: capa ? tamTitulo * 2.1 : tamTitulo * 1.35,
            fontWeight: p.titleFontWeight ?? 800,
            textTransform: (p.titleUppercase ?? true) ? "uppercase" : "none",
            lineHeight: 1.05, margin: 0, letterSpacing: -0.5,
            color: p.titleColor ?? p.textColor,
            fontFamily: capa ? (p.hookFontFamily ?? p.fontFamily) : p.fontFamily,
          }}>
            {realce(slide.title, slide.highlight, p.highlightColor)}
          </h2>
        )}

        {slide.text && (
          <p style={{
            fontSize: 38, fontWeight: p.bodyFontWeight ?? 500,
            lineHeight: p.bodyLineHeight ?? 1.35, margin: 0,
            color: p.bodyColor ?? p.textColor, opacity: slide.title ? 0.78 : 1,
          }}>
            {realce(slide.text, slide.highlight, p.highlightColor)}
          </p>
        )}

        {/* listas */}
        {slide.items && slide.items.length > 0 && (
          <ul style={{ margin: 0, padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: 22 }}>
            {slide.items.map((it, i) => (
              <li key={i} style={{ display: "flex", gap: 20, alignItems: "flex-start", fontSize: 36, lineHeight: 1.3 }}>
                <span style={{ color: p.highlightColor, fontWeight: 800, flexShrink: 0 }}>
                  {slide.type === "checklist" ? "✓" : slide.type === "process" ? `${i + 1}` : "—"}
                </span>
                <span>{it}</span>
              </li>
            ))}
          </ul>
        )}

        {/* números */}
        {slide.stats && slide.stats.length > 0 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 34, marginTop: 8 }}>
            {slide.stats.map((s, i) => (
              <div key={i}>
                <div style={{ fontSize: 88, fontWeight: 900, lineHeight: 1, color: p.highlightColor }}>{s.value}</div>
                <div style={{ fontSize: 30, color: p.textSecondary, marginTop: 8 }}>{s.label}</div>
              </div>
            ))}
          </div>
        )}

        {slide.bigNumber && (
          <div style={{ fontSize: 300, fontWeight: 900, lineHeight: 0.9, color: p.highlightColor }}>
            {slide.bigNumber}
          </div>
        )}

        {slide.emoji && <div style={{ fontSize: 260, lineHeight: 1 }}>{slide.emoji}</div>}

        {/* citação */}
        {slide.type === "quote" && slide.author && (
          <div style={{ marginTop: 8, fontSize: 30, color: p.textSecondary }}>
            — {slide.author}{slide.role ? `, ${slide.role}` : ""}
          </div>
        )}

        {/* comparação */}
        {slide.leftItems && slide.rightItems && (
          <div style={{ display: "flex", gap: 32, marginTop: 8 }}>
            {([[slide.leftLabel, slide.leftItems, false], [slide.rightLabel, slide.rightItems, true]] as const).map(
              ([label, itens, destaque], c) => (
                <div key={c} style={{
                  flex: 1, padding: 32, borderRadius: 24,
                  border: `2px solid ${destaque ? p.highlightColor : p.textSecondary}`,
                }}>
                  <div style={{
                    fontSize: 26, fontWeight: 800, textTransform: "uppercase", marginBottom: 18,
                    color: destaque ? p.highlightColor : p.textSecondary, letterSpacing: 1,
                  }}>{label}</div>
                  {itens.map((it, i) => (
                    <div key={i} style={{ fontSize: 30, lineHeight: 1.35, marginBottom: 10 }}>{it}</div>
                  ))}
                </div>
              ),
            )}
          </div>
        )}

        {slide.points && slide.points.length > 0 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            {slide.points.map((pt, i) => (
              <div key={i} style={{ display: "flex", gap: 18, fontSize: 34, lineHeight: 1.3 }}>
                <span style={{ color: pt.type === "plus" ? p.highlightColor : p.textSecondary, fontWeight: 900 }}>
                  {pt.type === "plus" ? "+" : "−"}
                </span>
                <span>{pt.text}</span>
              </div>
            ))}
          </div>
        )}

        {slide.imageSrc && (
          <img src={slide.imageSrc} alt=""
            style={{ width: "100%", borderRadius: 24, objectFit: "cover", maxHeight: 620 }} />
        )}
        {slide.imageCaption && (
          <p style={{ fontSize: 26, color: p.textSecondary, margin: 0 }}>{slide.imageCaption}</p>
        )}
      </div>

      {/* rodapé */}
      <div style={{
        display: "flex", justifyContent: "space-between", alignItems: "center",
        fontSize: 28, color: p.textSecondary,
      }}>
        <span />
        {indice < total - 1 && <span style={{ color: p.highlightColor, fontWeight: 800 }}>→</span>}
      </div>
    </div>
  );
}

/** Pinta a expressão destacada com a cor de acento, sem quebrar o resto. */
function realce(texto: string, alvo: string | undefined, cor: string) {
  if (!alvo?.trim()) return texto;
  const partes = texto.split(new RegExp(`(${alvo.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`, "gi"));
  return partes.map((parte, i) =>
    parte.toLowerCase() === alvo.toLowerCase()
      ? <span key={i} style={{ color: cor }}>{parte}</span>
      : <span key={i}>{parte}</span>,
  );
}
