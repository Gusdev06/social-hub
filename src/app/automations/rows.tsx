"use client";

import Link from "next/link";
import { Trash2Icon } from "lucide-react";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { deleteAutomations, toggleAutomation } from "./actions";
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
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type Linha = {
  id: string;
  name: string;
  isActive: boolean;
  keywords: string[];
  triggerScope: string;
  mediaIds: string[];
  executions: number;
  clicks: number;
  createdAt: string;
  username: string;
};

const ESCOPO: Record<string, string> = {
  specific: "Publicação ou Reel específico",
  any: "qualquer publicação ou Reel",
  next: "próxima publicação ou Reel",
};

export function AutomationRows({ linhas }: { linhas: Linha[] }) {
  const [sel, setSel] = useState<string[]>([]);
  const [pending, start] = useTransition();

  const todas = sel.length === linhas.length && linhas.length > 0;

  function excluirSelecionadas() {
    const n = sel.length;
    start(async () => {
      await deleteAutomations(sel);
      setSel([]);
      toast.success(`${n} automação(ões) excluída(s).`);
    });
  }

  return (
    <div className="flex flex-col gap-3">
      {sel.length > 0 && (
        <AlertDialog>
          <AlertDialogTrigger
            render={<Button variant="destructive" size="sm" className="self-start" disabled={pending} />}
          >
            <Trash2Icon data-icon="inline-start" />
            Excluir {sel.length}
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Excluir {sel.length} automação(ões)?</AlertDialogTitle>
              <AlertDialogDescription>
                Os gatilhos param de responder imediatamente. Não dá pra desfazer.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction variant="destructive" onClick={excluirSelecionadas}>
                Excluir
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-10">
              <Checkbox
                checked={todas}
                aria-label="Selecionar todas"
                onCheckedChange={(v) => setSel(v ? linhas.map((l) => l.id) : [])}
              />
            </TableHead>
            <TableHead>Nome</TableHead>
            <TableHead className="w-20 text-right">Execuções</TableHead>
            <TableHead className="w-16 text-right">CTR</TableHead>
            <TableHead className="w-28 text-right">Modificado</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {linhas.map((a) => {
            const ctr = a.executions > 0 ? (a.clicks / a.executions) * 100 : 0;
            return (
              <TableRow key={a.id}>
                <TableCell>
                  <Checkbox
                    checked={sel.includes(a.id)}
                    aria-label={`Selecionar ${a.name}`}
                    onCheckedChange={(v) =>
                      setSel((s) => (v ? [...s, a.id] : s.filter((x) => x !== a.id)))
                    }
                  />
                </TableCell>
                <TableCell className="max-w-0">
                  <div className="flex min-w-0 items-center gap-3">
                    <Badge
                      variant={a.isActive ? "destructive" : "secondary"}
                      title={a.isActive ? "Clique pra pausar" : "Clique pra ativar"}
                      render={
                        <button
                          type="button"
                          onClick={() => start(() => toggleAutomation(a.id, !a.isActive))}
                        />
                      }
                    >
                      {a.isActive ? "LIVE" : "PAUSADA"}
                    </Badge>
                    <Link href={`/automations/${a.id}`} className="truncate font-medium hover:underline">
                      {a.name}
                    </Link>
                  </div>
                  <p className="mt-1 truncate text-xs text-muted-foreground">
                    O usuário deixa um comentário em {ESCOPO[a.triggerScope]}
                    {a.keywords.length > 0 && (
                      <> com <span className="text-foreground">{a.keywords.join(", ")}</span></>
                    )}
                    {" · "}@{a.username}
                  </p>
                </TableCell>
                <TableCell className="text-right tabular-nums">{a.executions}</TableCell>
                <TableCell className="text-right tabular-nums">{ctr.toFixed(1)}%</TableCell>
                <TableCell className="text-right text-xs text-muted-foreground">
                  {new Date(a.createdAt).toLocaleDateString("pt-BR")}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
