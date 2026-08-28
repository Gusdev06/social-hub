import { cn } from "@/lib/utils";

/**
 * O "eyebrow" de seção. Existia em três tamanhos diferentes espalhados por
 * quatro arquivos; aqui vira uma escala explícita.
 */
export function SectionLabel({
  tamanho = "md",
  className,
  ...props
}: React.ComponentProps<"h2"> & { tamanho?: "sm" | "md" }) {
  return (
    <h2
      className={cn(
        "font-medium tracking-wide text-muted-foreground uppercase",
        tamanho === "sm" ? "text-[10px]" : "text-xs",
        className,
      )}
      {...props}
    />
  );
}
