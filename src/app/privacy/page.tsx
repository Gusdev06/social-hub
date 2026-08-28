import { PageDescription, PageHeader, PageShell, PageTitle } from "@/components/page-shell";

export const metadata = { title: "Política de Privacidade — Social Hub" };

export default function Privacy() {
  return (
    <PageShell largura="sm" className="max-w-2xl gap-8 py-16">
      <PageHeader>
        <PageTitle>Política de Privacidade</PageTitle>
        <PageDescription>Atualizada em 25 de agosto de 2026</PageDescription>
      </PageHeader>

      <Section title="O que é o Social Hub">
        O Social Hub é uma ferramenta interna, de uso pessoal, operada por Gustavo
        (@gustagoat.ia) para gerenciar as próprias contas de Instagram e TikTok. Ele
        automatiza respostas por mensagem direta a comentários e agenda publicações.
        Não é um serviço aberto a terceiros.
      </Section>

      <Section title="Dados que coletamos">
        <ul className="flex list-disc flex-col gap-1 pl-5">
          <li>Dados das contas conectadas: identificador, nome de usuário e foto de perfil.</li>
          <li>Tokens de acesso fornecidos pelas plataformas, armazenados cifrados (AES-256-GCM).</li>
          <li>
            Comentários públicos feitos nas publicações dessas contas: texto do comentário,
            identificador e nome de usuário de quem comentou.
          </li>
          <li>Registro de quais mensagens automáticas foram enviadas e quando.</li>
        </ul>
      </Section>

      <Section title="Como usamos">
        Exclusivamente para enviar a mensagem direta solicitada por quem comentou uma
        palavra-chave, para publicar conteúdo nas contas conectadas e para exibir métricas
        de uso no painel interno. Não vendemos, alugamos nem compartilhamos esses dados com
        terceiros, e não os usamos para publicidade dirigida a terceiros.
      </Section>

      <Section title="Compartilhamento">
        Os dados ficam no banco de dados da aplicação, hospedado na Vercel e em provedor de
        PostgreSQL gerenciado. Há comunicação com as APIs oficiais da Meta (Instagram) e do
        TikTok, necessária para o funcionamento. Nenhum outro terceiro recebe os dados.
      </Section>

      <Section title="Retenção e exclusão">
        Mantemos os dados enquanto a conta estiver conectada. Você pode pedir a exclusão a
        qualquer momento pela página{" "}
        <a href="/data-deletion" className="underline">exclusão de dados</a>. Revogar o
        acesso do aplicativo nas configurações do Instagram também interrompe qualquer
        coleta nova.
      </Section>

      <Section title="Contato">
        Dúvidas ou solicitações: <strong>coven688@gmail.com</strong>
      </Section>
    </PageShell>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-2">
      <h2 className="text-base font-semibold">{title}</h2>
      <div className="text-sm leading-relaxed">{children}</div>
    </section>
  );
}
