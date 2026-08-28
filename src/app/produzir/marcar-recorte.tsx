"use client";

import { useRef, useState, useTransition } from "react";

type Ret = { x0: number; y0: number; x1: number; y1: number };

/**
 * Marca à mão qual retângulo do original entra por cima do avatar.
 *
 * A análise só enxerga tiras horizontais — ela mede estatística por LINHA de
 * pixel. Um cartão do app flutuando no meio da tela, com a pessoa aparecendo dos
 * dois lados dele, não cabe nisso: a medição criaria uma faixa de largura total
 * e a remontagem levaria junto o ombro da pessoa original.
 *
 * Arrastar a caixa aqui resolve qualquer topologia em segundos, e produz
 * exatamente o dado que uma detecção automática teria que produzir — então
 * quando ela existir, entra neste mesmo campo sem retrabalho.
 */
export function MarcarRecorte({
  id, trecho, frameUrl, largura, altura, atual, acao,
}: {
  id: string;
  trecho: number;
  /** Um frame do ORIGINAL neste trecho — é sobre ele que se marca. */
  frameUrl: string;
  /** Dimensões da referência: o retângulo é salvo em pixels dela. */
  largura: number;
  altura: number;
  atual?: Ret;
  acao: (id: string, trecho: number, ret: Ret | null) => Promise<void>;
}) {
  const caixaRef = useRef<HTMLDivElement>(null);
  const [aberto, setAberto] = useState(false);
  const [arrasto, setArrasto] = useState<{ x: number; y: number } | null>(null);
  const [ret, setRet] = useState<Ret | null>(atual ?? null);
  const [pending, start] = useTransition();

  /** Ponto do mouse → fração 0..1 da imagem, independente do tamanho na tela. */
  const ponto = (e: React.MouseEvent) => {
    const r = caixaRef.current!.getBoundingClientRect();
    return {
      x: Math.min(1, Math.max(0, (e.clientX - r.left) / r.width)),
      y: Math.min(1, Math.max(0, (e.clientY - r.top) / r.height)),
    };
  };

  const paraPixel = (a: { x: number; y: number }, b: { x: number; y: number }): Ret => ({
    x0: Math.round(Math.min(a.x, b.x) * largura),
    y0: Math.round(Math.min(a.y, b.y) * altura),
    x1: Math.round(Math.max(a.x, b.x) * largura),
    y1: Math.round(Math.max(a.y, b.y) * altura),
  });

  const estilo = (r: Ret) => ({
    left: `${(r.x0 / largura) * 100}%`,
    top: `${(r.y0 / altura) * 100}%`,
    width: `${((r.x1 - r.x0) / largura) * 100}%`,
    height: `${((r.y1 - r.y0) / altura) * 100}%`,
  });

  if (!aberto) {
    return (
      <button
        onClick={() => setAberto(true)}
        className={`text-[11px] underline ${
          atual ? "text-emerald-400/80 hover:text-emerald-300" : "text-neutral-600 hover:text-neutral-400"
        }`}
      >
        {atual ? "recorte marcado à mão — editar" : "marcar recorte do original"}
      </button>
    );
  }

  return (
    <div className="mt-1 space-y-2 rounded border border-neutral-800 p-2.5">
      <p className="text-[11px] text-neutral-400">
        Arraste em volta do que vem do original neste trecho — o cartão do app, a barra,
        o que for. O resto do quadro vira o avatar.
      </p>

      <div
        ref={caixaRef}
        onMouseDown={(e) => { setArrasto(ponto(e)); setRet(null); }}
        onMouseMove={(e) => arrasto && setRet(paraPixel(arrasto, ponto(e)))}
        onMouseUp={() => setArrasto(null)}
        onMouseLeave={() => setArrasto(null)}
        className="relative w-fit cursor-crosshair select-none"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={frameUrl} alt="frame do original" draggable={false} className="h-72 rounded" />
        {ret && (
          <div
            style={estilo(ret)}
            className="pointer-events-none absolute border-2 border-emerald-400 bg-emerald-400/10"
          />
        )}
      </div>

      {ret && (
        <p className="font-mono text-[10px] text-neutral-500">
          x {ret.x0}–{ret.x1} · y {ret.y0}–{ret.y1} (em pixels da referência {largura}×{altura})
        </p>
      )}

      <div className="flex gap-2">
        <button
          disabled={pending || !ret}
          onClick={() => start(async () => { await acao(id, trecho, ret); setAberto(false); })}
          className="rounded bg-neutral-100 px-3 py-1.5 text-[11px] font-medium text-neutral-950 disabled:opacity-40"
        >
          {pending ? "salvando…" : "Usar este recorte"}
        </button>
        {atual && (
          <button
            disabled={pending}
            onClick={() => start(async () => { await acao(id, trecho, null); setAberto(false); })}
            className="rounded border border-neutral-800 px-3 py-1.5 text-[11px] text-neutral-400"
          >
            voltar ao automático
          </button>
        )}
        <button
          onClick={() => { setRet(atual ?? null); setAberto(false); }}
          className="rounded border border-neutral-800 px-3 py-1.5 text-[11px]"
        >
          cancelar
        </button>
      </div>
    </div>
  );
}
