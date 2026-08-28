"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Field, FieldLabel } from "@/components/ui/field";
import { Slider } from "@/components/ui/slider";

/**
 * O único número da composição que ainda é palpite. Recompor é ffmpeg local —
 * custo zero — então iterar aqui é mais barato que tentar acertar de primeira.
 */
export function Escala({
  id, escala, acao,
}: {
  id: string;
  escala: number;
  acao: (id: string, escala: number) => Promise<void>;
}) {
  const [v, setV] = useState(escala);
  const [pending, start] = useTransition();

  return (
    <Field>
      <FieldLabel htmlFor={`escala-${id}`} className="text-[11px] text-muted-foreground">
        escala do avatar na faixa: <span className="text-foreground">{v.toFixed(2)}</span>
      </FieldLabel>
      <Slider
        id={`escala-${id}`}
        min={0.4}
        max={1}
        step={0.02}
        value={v}
        onValueChange={(n) => setV(n as number)}
      />
      <Button
        type="button"
        variant="outline"
        size="xs"
        className="self-start"
        disabled={pending || v === escala}
        onClick={() => start(() => acao(id, v))}
      >
        {pending ? "recompondo…" : "Recompor nessa escala"}
      </Button>
    </Field>
  );
}
