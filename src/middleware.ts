import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, verifySession } from "@/lib/auth/session";

/**
 * The landing page is public. The portal (/app) needs a session (pages re-check MFA and role on the server).
 * Provider webhooks (Vapi, Dograh, Twilio) and the dialer tick check their own secrets / signatures.
 */
const SELF_AUTH_API = ["/api/vapi/webhook", "/api/dialer/tick", "/api/health", "/api/twilio/voice", "/api/dograh/webhook"];
const SELF_AUTH_PREFIX = ["/api/dograh/tools/"];

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (SELF_AUTH_API.includes(pathname) || SELF_AUTH_PREFIX.some((p) => pathname.startsWith(p))) return NextResponse.next();

  // CSRF: browser requests that change data must come from this site (server actions get the same check from Next.js).
  if (req.method !== "GET" && req.method !== "HEAD" && pathname.startsWith("/api/")) {
    const origin = req.headers.get("origin");
    let ok = false;
    try {
      ok = Boolean(origin) && new URL(origin!).host === req.headers.get("host");
    } catch {
      ok = false;
    }
    if (!ok) return NextResponse.json({ message: "Cross-site request blocked" }, { status: 403 });
  }

  const session = await verifySession(req.cookies.get(SESSION_COOKIE)?.value);
  if (session) return NextResponse.next();
  if (pathname.startsWith("/api/")) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  const url = req.nextUrl.clone();
  url.pathname = "/login";
  url.search = pathname === "/app" ? "" : `?next=${encodeURIComponent(pathname)}`;
  return NextResponse.redirect(url);
}

// Only private areas run the middleware: the public landing page, sign-in and static files stay fast.
export const config = { matcher: ["/app", "/app/:path*", "/setup-mfa", "/api/:path*"] };
