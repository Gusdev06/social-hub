import Link from "next/link";

export default function AutomationsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div>
      <header className="border-b border-neutral-900 px-8 py-5">
        <h1 className="text-xl font-semibold">Automação</h1>
      </header>
      <div className="flex gap-8 px-8 py-8">
        <nav className="w-56 shrink-0 space-y-1">
          <Item href="/automations" ativo>Minhas automações</Item>
          <Item href="/automations?visao=basico">Básico</Item>
          <Item href="/automations?visao=sequencias">Sequências</Item>
        </nav>
        <div className="flex-1 min-w-0">{children}</div>
      </div>
    </div>
  );
}

function Item({ href, children, ativo }: { href: string; children: React.ReactNode; ativo?: boolean }) {
  return (
    <Link
      href={href}
      className={`block rounded-lg px-3 py-2 text-sm ${
        ativo ? "bg-neutral-900 text-neutral-100" : "text-neutral-400 hover:text-neutral-100"
      }`}
    >
      {children}
    </Link>
  );
}
