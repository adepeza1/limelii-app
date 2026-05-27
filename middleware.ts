import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@kinde-oss/kinde-auth-nextjs/middleware";

// Routes that must remain accessible without an account.
// The token (or the public discoverability of the resource) is the access grant.
function isPublicPath(pathname: string): boolean {
  if (pathname.startsWith("/c/")) return true; // shared collection pages
  if (pathname.startsWith("/experience/")) return true; // experience deep links
  if (pathname.startsWith("/api/c/")) return true; // public share API
  // /api/experiences/{id} is public, but /api/experiences/shared and
  // /api/experiences/{id}/share-to-user require auth.
  const expMatch = pathname.match(/^\/api\/experiences\/(\d+)\/?$/);
  if (expMatch) return true;
  return false;
}

async function kindeMiddleware(req: NextRequest) {
  const hasXanoToken = req.cookies.has("xano_token");
  if (!hasXanoToken && req.nextUrl.pathname !== "/auth/callback") {
    const callbackUrl = new URL("/auth/callback", req.url);
    callbackUrl.searchParams.set("redirect_to", req.nextUrl.pathname);
    return NextResponse.redirect(callbackUrl);
  }
}

type NextMiddleware = (req: NextRequest) => Promise<NextResponse>;
const withKinde = withAuth(kindeMiddleware, {
  isReturnToCurrentPage: true,
  loginPage: "/login",
}) as unknown as NextMiddleware;

export default async function middleware(req: NextRequest) {
  if (isPublicPath(req.nextUrl.pathname)) {
    return NextResponse.next();
  }
  if (req.cookies.has("xano_token")) {
    return NextResponse.next();
  }
  // No xano_token cookie. About to fall through to withKinde, which will
  // either render the page (Kinde SDK authenticated) or silently redirect
  // to /login. Log first so the "user was here, got bounced" event shows
  // up in Vercel — middleware doesn't otherwise leave a trail, which is
  // why we couldn't see what was failing for the signed-out-overnight
  // users. hadKindeRefresh=true on this line means the user had a valid
  // mobile refresh cookie but we redirected to login anyway — that's the
  // case worth fixing.
  const hadKindeRefresh = req.cookies.has("kinde_refresh");
  const hadMobileAuthed = req.cookies.has("mobile_authed");
  console.error(
    `[token-fail] step=middleware-no-xano-token path=${req.nextUrl.pathname} hadKindeRefresh=${hadKindeRefresh} hadMobileAuthed=${hadMobileAuthed} ua=${(req.headers.get("user-agent") ?? "").slice(0, 120).replace(/\s+/g, " ")}`
  );
  return withKinde(req);
}

export const config = {
  matcher: [
    "/((?!api/auth|api/auth/mobile-login|api/auth/mobile-exchange|api/revalidate|auth/callback|auth/mobile-callback|login|_next/static|_next/image|favicon\\.ico).*)",
  ],
};
