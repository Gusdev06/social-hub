"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Field, FieldDescription } from "@/components/ui/field";
import { Textarea } from "@/components/ui/textarea";

/**
 * O roteiro é o ativo testado — e o que sai daqui vira US$ 0,56 por clipe no
 * Kling. Conferir e corrigir antes custa segundos; descobrir depois custa a
 * rodada.
 */
export function RoteiroEditor({
  id, texto, acao,
}: {
  id: string;
  texto: string;
  acao: (id: string, texto: string) => Promise<void>;
}) {
  const [v, setV] = useState(texto);
  const [pending, start] = useTransition();
  const [aberto, setAberto] = useState(false);

  if (!aberto) {
    return (
      <Button
        type="button"
        variant="link"
        size="xs"
        className="self-start text-muted-foreground"
        onClick={() => setAberto(true)}
      >
        corrigir o roteiro
      </Button>
    );
  }

  return (
    <Field>
      <Textarea
        value={v}
        onChange={(e) => setV(e.target.value)}
        rows={6}
        className="text-xs leading-relaxed"
      />
      <FieldDescription className="text-[11px]">
        A pontuação define onde os clipes cortam. Refatiar não re-transcreve — custo zero.
      </FieldDescription>
      <div className="flex gap-2">
        <Button
          type="button"
          size="xs"
          variant="secondary"
          disabled={pending || v.trim() === texto.trim()}
          onClick={() => start(() => acao(id, v))}
        >
          {pending ? "refatiando…" : "Salvar e refatiar"}
        </Button>
        <Button
          type="button"
          size="xs"
          variant="outline"
          onClick={() => { setV(texto); setAberto(false); }}
        >
          cancelar
        </Button>
      </div>
    </Field>
  );
}
