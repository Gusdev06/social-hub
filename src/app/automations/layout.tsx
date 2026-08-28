import Link from "next/link";
import { Button } from "@/components/ui/button";

const NAV = [
  { href: "/automations", label: "Minhas automações", ativo: true },
  { href: "/automations?visao=basico", label: "Básico" },
  { href: "/automations?visao=sequencias", label: "Sequências" },
];

export default function AutomationsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div>
      <header className="border-b px-8 py-5">
        <h1 className="text-xl font-semibold">Automação</h1>
      </header>
      <div className="flex gap-8 px-8 py-8">
        <nav className="flex w-56 shrink-0 flex-col gap-1">
          {NAV.map((item) => (
            <Button
              key={item.href}
              variant={item.ativo ? "secondary" : "ghost"}
              className="justify-start"
              render={<Link href={item.href} />}
              nativeButton={false}
            >
              {item.label}
            </Button>
          ))}
        </nav>
        <div className="min-w-0 flex-1">{children}</div>
      </div>
    </div>
  );
}
