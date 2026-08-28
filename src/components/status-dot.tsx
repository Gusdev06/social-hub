import { cn } from "@/lib/utils";

const CORES: Record<string, string> = {
  sent: "bg-accent-green",
  failed: "bg-accent-red",
  skipped: "bg-ash",
};

/**
 * Ponto colorido de status de evento. O padrão (pendente) é o amarelo do
 * sistema — e ele pulsa, porque pendente é a única situação em que o valor
 * ainda vai mudar sozinho.
 */
export function StatusDot({ status, className }: { status: string; className?: string }) {
  const pendente = !(status in CORES);
  return (
    <span
      title={status}
      className={cn(
        "size-1.5 shrink-0 rounded-full",
        CORES[status] ?? "bg-accent-yellow",
        pendente && "animate-pulsar",
        className,
      )}
    />
  );
}
