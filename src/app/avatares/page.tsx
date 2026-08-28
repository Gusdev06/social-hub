import { apagarAvatarAction, listarAvatares } from "../produzir/actions";
import { requireDashboardAuth } from "@/lib/auth";
import { PageDescription, PageHeader, PageShell, PageTitle } from "@/components/page-shell";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from "@/components/ui/empty";
import { ScrollArea } from "@/components/ui/scroll-area";

export const dynamic = "force-dynamic";

const quando = (d: Date) =>
  new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short" }).format(d);

/**
 * O acervo de avatares.
 *
 * Cada um guarda a imagem E a nota de casting. A nota reaparece literalmente em
 * todo prompt de clipe e é o que faz o modelo reconhecer a mesma pessoa entre um
 * clipe e outro — por isso ela aparece aqui inteira, e não escondida: é ela que
 * define o personagem, mais do que a foto.
 */
export default async function Avatares() {
  await requireDashboardAuth();
  const acervo = await listarAvatares();

  return (
    <PageShell>
      <PageHeader className="flex-row items-end justify-between gap-4">
        <div className="flex flex-col gap-1">
          <PageTitle className="text-lg">Avatares salvos</PageTitle>
          <PageDescription className="text-xs">
            {acervo.length === 0
              ? "Nenhum ainda."
              : `${acervo.length} personagem(ns) prontos para reusar`}
          </PageDescription>
        </div>
        <Button variant="link" size="sm" render={<a href="/produzir" />} nativeButton={false}>
          ir para a esteira
        </Button>
      </PageHeader>

      {acervo.length === 0 ? (
        <Empty>
          <EmptyHeader>
            <EmptyTitle>Nenhum avatar no acervo</EmptyTitle>
            <EmptyDescription>
              Quando uma rodada gerar um rosto que você quer manter, use “salvar este avatar para
              reusar” no card dela.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <div className="flex flex-col gap-3">
          {acervo.map((a) => (
            <Card key={a.id} className="flex-row gap-4 p-4">
              <img
                src={a.imagemUrl}
                alt={a.nome}
                className="h-40 w-24 shrink-0 rounded-md border object-cover"
              />
              <div className="flex min-w-0 flex-1 flex-col gap-2">
                <div className="flex flex-col gap-0.5">
                  <h2 className="text-sm font-medium">{a.nome}</h2>
                  <p className="text-[11px] text-muted-foreground">
                    salvo em {quando(a.criadoEm)} ·{" "}
                    {a.usos === 0 ? "nunca usado" : `usado em ${a.usos} rodada(s)`}
                  </p>
                </div>

                {/* A nota inteira, não um resumo: é o contrato de identidade do
                    personagem, e conferir antes de reusar custa segundos. */}
                <ScrollArea className="max-h-40">
                  <pre className="font-mono text-[11px] leading-relaxed whitespace-pre-wrap text-muted-foreground">
                    {a.nota}
                  </pre>
                </ScrollArea>

                <AlertDialog>
                  <AlertDialogTrigger
                    render={<Button variant="ghost" size="xs" className="self-start text-muted-foreground" />}
                  >
                    apagar do acervo
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Apagar “{a.nome}” do acervo?</AlertDialogTitle>
                      <AlertDialogDescription>
                        Remove só o registro. A imagem continua no Storage e as rodadas que já
                        usaram esse avatar seguem apontando para ela.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancelar</AlertDialogCancel>
                      <form action={apagarAvatarAction.bind(null, a.id)}>
                        <AlertDialogAction type="submit" variant="destructive">
                          Apagar
                        </AlertDialogAction>
                      </form>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </Card>
          ))}
        </div>
      )}
    </PageShell>
  );
}
