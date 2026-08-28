import { headers } from "next/headers";

/**
 * Defesa em profundidade. O middleware ja exige basic auth fora de /api, mas
 * Server Actions executam com privilegio de servidor — publicar no Instagram,
 * apagar dados — entao cada uma revalida a credencial por conta propria.
 */
export async function requireDashboardAuth(): Promise<void> {
  const user = process.env.DASHBOARD_USER;
  const pass = process.env.DASHBOARD_PASSWORD;
  if (!user || !pass) throw new Error("dashboard sem credenciais configuradas");

  const header = (await headers()).get("authorization");
  if (!header?.startsWith("Basic ")) throw new Error("nao autorizado");

  const [u, p] = atob(header.slice(6)).split(":");
  if (u !== user || p !== pass) throw new Error("nao autorizado");
}
