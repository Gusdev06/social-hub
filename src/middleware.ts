import { NextRequest, NextResponse } from "next/server";

/**
 * O webhook precisa ser publicamente acessivel (a Meta nao autentica), entao a
 * Deployment Protection da Vercel tem que ficar desligada. Consequencia: sem
 * isso aqui, o dashboard — que lista leads e conversas — ficaria aberto pra
 * qualquer um com a URL.
 *
 * Rotas /api tem a propria protecao e sao liberadas aqui:
 *   /api/webhooks/*  -> assinatura HMAC da Meta (verifyMetaSignature)
 *   /api/cron/*      -> Bearer CRON_SECRET
 */
export function middleware(req: NextRequest) {
  const path = req.nextUrl.pathname;

  // /api tem protecao propria (assinatura HMAC / CRON_SECRET).
  // /privacy e /data-deletion PRECISAM ser publicas: a Meta exige acesso livre a
  // elas pra publicar o app, e usuarios precisam conseguir ler sem login.
  if (path.startsWith("/api/") || path === "/privacy" || path === "/data-deletion") {
    return NextResponse.next();
  }

  const user = process.env.DASHBOARD_USER;
  const pass = process.env.DASHBOARD_PASSWORD;

  // Sem credenciais configuradas o dashboard fica fechado por padrao —
  // falhar fechado e melhor que vazar a base de leads por esquecimento.
  if (!user || !pass) {
    return new NextResponse("Dashboard sem credenciais configuradas.", { status: 503 });
  }

  const header = req.headers.get("authorization");
  if (header?.startsWith("Basic ")) {
    const [u, p] = atob(header.slice(6)).split(":");
    if (u === user && p === pass) return NextResponse.next();
  }

  return new NextResponse("Autenticacao necessaria", {
    status: 401,
    headers: { "WWW-Authenticate": 'Basic realm="Social Hub", charset="UTF-8"' },
  });
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
