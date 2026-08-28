import { apagarAvatarAction, listarAvatares } from "../produzir/actions";
import { requireDashboardAuth } from "@/lib/auth";

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
    <main className="mx-auto max-w-5xl p-6 space-y-6">
      <header className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-lg font-semibold">Avatares salvos</h1>
          <p className="mt-0.5 text-xs text-neutral-500">
            {acervo.length === 0
              ? "Nenhum ainda."
              : `${acervo.length} personagem(ns) prontos para reusar`}
          </p>
        </div>
        <a href="/produzir" className="text-xs text-neutral-400 underline hover:text-neutral-200">
          ir para a esteira
        </a>
      </header>

      {acervo.length === 0 ? (
        <p className="rounded-lg border border-neutral-900 p-8 text-center text-sm text-neutral-500">
          Quando uma rodada gerar um rosto que você quer manter, use
          <br />
          <span className="text-neutral-300">“salvar este avatar para reusar”</span> no card dela.
        </p>
      ) : (
        <div className="space-y-3">
          {acervo.map((a) => (
            <div key={a.id} className="flex gap-4 rounded-lg border border-neutral-900 p-4">
              <img
                src={a.imagemUrl}
                alt={a.nome}
                className="h-40 w-24 shrink-0 rounded border border-neutral-800 object-cover"
              />
              <div className="min-w-0 flex-1 space-y-2">
                <div>
                  <h2 className="text-sm font-medium">{a.nome}</h2>
                  <p className="text-[11px] text-neutral-500">
                    salvo em {quando(a.criadoEm)} ·{" "}
                    {a.usos === 0 ? "nunca usado" : `usado em ${a.usos} rodada(s)`}
                  </p>
                </div>

                {/* A nota inteira, não um resumo: é o contrato de identidade do
                    personagem, e conferir antes de reusar custa segundos. */}
                <pre className="whitespace-pre-wrap font-mono text-[11px] leading-relaxed text-neutral-400">
                  {a.nota}
                </pre>

                <form action={apagarAvatarAction.bind(null, a.id)}>
                  <button className="rounded border border-neutral-900 px-2.5 py-1 text-[11px] text-neutral-500 hover:border-red-900/60 hover:text-red-300">
                    apagar do acervo
                  </button>
                </form>
              </div>
            </div>
          ))}
        </div>
      )}

      <p className="text-[11px] text-neutral-600">
        Apagar remove só o registro. A imagem continua no Storage — as rodadas que já usaram
        esse avatar seguem apontando para ela.
      </p>
    </main>
  );
}
