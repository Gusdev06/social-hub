"use client";

import { useState, useTransition } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Field, FieldDescription } from "@/components/ui/field";
import { ScrollArea } from "@/components/ui/scroll-area";
import { SectionLabel } from "@/components/section-label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

/**
 * O prompt de registro de um clipe — o texto que vai mesmo pro modelo de vídeo.
 *
 * Aparece ABERTO quando a rodada está parada esperando conferência deste clipe
 * (`portao`): é o momento em que o prompt importa, e escondê-lo atrás de um link
 * seria pedir confirmação de algo que o Gusta não está vendo.
 *
 * Salvar não gera nada de propósito. Conferir é preparação; quem dispara crédito
 * de vídeo é o "Confirmei — seguir".
 */
export function PromptManual({
  id, n, prompt, origem, enviado, portao, acao,
}: {
  id: string;
  n: number;
  prompt: string;
  origem?: "llm" | "humano";
  /** O que a LLM recebeu pra escrever este prompt. Ausente se foi escrito à mão. */
  enviado?: { sistema: string; usuario: string; modelo: string };
  /** A esteira parou esperando a conferência DESTE clipe. */
  portao?: boolean;
  acao: (id: string, n: number, prompt: string) => Promise<void>;
}) {
  const [v, setV] = useState(prompt);
  const [aberto, setAberto] = useState(false);
  const [pending, start] = useTransition();

  if (!aberto && !portao) {
    return (
      <Button
        type="button"
        variant="link"
        size="xs"
        className="self-start text-muted-foreground"
        onClick={() => setAberto(true)}
      >
        {!prompt
          ? "escrever o prompt à mão"
          : origem === "humano"
            ? "prompt seu — a LLM não é chamada neste clipe"
            : "ver o prompt usado"}
      </Button>
    );
  }

  return (
    <Field className={cn("mt-1", portao && "rounded-md border border-warning/40 bg-warning/5 p-3")}>
      {portao && (
        <Alert variant="warning" className="border-0 bg-transparent px-0 py-0">
          <AlertDescription className="text-[11px] text-warning">
            Confira o prompt do clipe {n} antes de gerar. Corrija aqui se precisar; depois use
            “Confirmei — seguir”.
          </AlertDescription>
        </Alert>
      )}
      <Textarea
        value={v}
        onChange={(e) => setV(e.target.value)}
        rows={5}
        placeholder="Seu prompt para este clipe. Preenchido, substitui o escritor de prompt — nenhuma chamada de LLM acontece."
        className="p-3 font-mono text-[11px] leading-relaxed"
      />
      <FieldDescription className="text-[11px]">
        Vale só para o clipe {n}. Vazio devolve o clipe para o escritor automático.
        {origem === "llm" && !portao && " Escrito pela LLM."}
      </FieldDescription>

      {/* O que a LLM RECEBEU. Fica recolhido porque são ~2 KB de texto que só
          importam quando o prompt sai estranho — e aí a pergunta é se ela
          interpretou mal ou se o insumo já chegou errado. */}
      {enviado && (
        <Collapsible className="flex flex-col gap-1.5">
          <CollapsibleTrigger
            render={
              <Button
                type="button"
                variant="link"
                size="xs"
                className="self-start text-muted-foreground"
              />
            }
          >
            ver o que foi enviado para a {enviado.modelo}
          </CollapsibleTrigger>
          <CollapsibleContent className="flex flex-col gap-2 rounded-md border bg-muted/30 p-2.5">
            <div className="flex flex-col gap-0.5">
              <SectionLabel tamanho="sm">instruções</SectionLabel>
              <ScrollArea className="max-h-48">
                <pre className="font-mono text-[10px] leading-relaxed whitespace-pre-wrap text-muted-foreground">
                  {enviado.sistema}
                </pre>
              </ScrollArea>
            </div>
            <div className="flex flex-col gap-0.5">
              <SectionLabel tamanho="sm">nota de casting + a fala deste clipe</SectionLabel>
              <ScrollArea className="max-h-48">
                <pre className="font-mono text-[10px] leading-relaxed whitespace-pre-wrap text-muted-foreground">
                  {enviado.usuario}
                </pre>
              </ScrollArea>
            </div>
          </CollapsibleContent>
        </Collapsible>
      )}

      <div className="flex gap-2">
        <Button
          type="button"
          size="xs"
          variant="secondary"
          disabled={pending || v.trim() === prompt.trim()}
          onClick={() => start(async () => { await acao(id, n, v); setAberto(false); })}
        >
          {pending ? "salvando…" : "Salvar"}
        </Button>
        <Button
          type="button"
          size="xs"
          variant="outline"
          onClick={() => { setV(prompt); setAberto(false); }}
        >
          cancelar
        </Button>
      </div>
    </Field>
  );
}
