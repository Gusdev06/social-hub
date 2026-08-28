"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Field, FieldDescription } from "@/components/ui/field";
import { Input } from "@/components/ui/input";

/**
 * Guarda o avatar desta rodada no acervo, pra reusar em outras.
 *
 * O que é salvo não é só a imagem: vai junto a nota de casting, que reaparece
 * literalmente em todo prompt de clipe e é o que faz o modelo reconhecer a mesma
 * pessoa entre um clipe e outro. Por isso o botão só aparece quando os dois
 * existem.
 */
export function SalvarAvatar({
  id, sugestao, acao,
}: {
  id: string;
  /** O brief da rodada vira o nome proposto — quase sempre é o nome certo. */
  sugestao: string;
  acao: (id: string, nome: string) => Promise<void>;
}) {
  const [aberto, setAberto] = useState(false);
  const [nome, setNome] = useState(sugestao);
  const [salvo, setSalvo] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [pending, start] = useTransition();

  if (salvo) {
    return <p className="text-[11px] text-success">avatar salvo no acervo</p>;
  }

  if (!aberto) {
    return (
      <Button
        type="button"
        variant="link"
        size="xs"
        className="self-start text-muted-foreground"
        onClick={() => setAberto(true)}
      >
        salvar este avatar para reusar
      </Button>
    );
  }

  return (
    <Field>
      <Input
        value={nome}
        onChange={(e) => setNome(e.target.value)}
        placeholder="como você vai chamar esse personagem"
        className="text-xs"
      />
      <FieldDescription className="text-[11px]">
        Salva a imagem e a nota de casting. Nas próximas rodadas dá para escolher este
        avatar e a esteira pula a geração do rosto.
      </FieldDescription>
      {erro && <p className="text-[11px] text-destructive">{erro}</p>}
      <div className="flex gap-2">
        <Button
          type="button"
          size="xs"
          variant="secondary"
          disabled={pending || !nome.trim()}
          onClick={() =>
            start(async () => {
              try {
                await acao(id, nome);
                setSalvo(true);
              } catch (e) {
                setErro((e as Error).message);
              }
            })
          }
        >
          {pending ? "salvando…" : "Salvar no acervo"}
        </Button>
        <Button type="button" size="xs" variant="outline" onClick={() => setAberto(false)}>
          cancelar
        </Button>
      </div>
    </Field>
  );
}
