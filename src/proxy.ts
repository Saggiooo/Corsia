import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE } from "@/lib/auth/cookie";

/**
 * Primo filtro, il vecchio middleware rinominato "proxy" da Next 16: senza
 * cookie di sessione non si entra. La validita' vera della sessione la
 * controlla il server con `requireUser`, perche' qui il database non e'
 * raggiungibile.
 */
export default function proxy(request: NextRequest) {
  if (request.cookies.has(SESSION_COOKIE)) return NextResponse.next();

  const url = request.nextUrl.clone();
  url.pathname = "/accedi";
  url.search = request.nextUrl.pathname === "/" ? "" : `?da=${encodeURIComponent(request.nextUrl.pathname)}`;

  return NextResponse.redirect(url);
}

export const config = {
  matcher: [
    /*
     * Tutto tranne: accesso e registrazione, gli asset statici, le icone
     * generate, il manifest e il service worker.
     */
    "/((?!accedi|registrati|_next/static|_next/image|favicon.ico|icon|apple-icon|manifest.webmanifest|sw.js).*)",
  ],
};
