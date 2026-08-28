import { cn } from "@/lib/utils";

const CORES: Record<string, string> = {
  sent: "bg-success",
  failed: "bg-destructive",
  skipped: "bg-muted-foreground",
};

/** Ponto colorido de status de evento. Padrão (pendente) é warning. */
export function StatusDot({ status, className }: { status: string; className?: string }) {
  return (
    <span
      title={status}
      className={cn("size-2 shrink-0 rounded-full", CORES[status] ?? "bg-warning", className)}
    />
  );
}
