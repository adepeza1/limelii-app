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
  return withKinde(req);
}

export const config = {
  matcher: [
    "/((?!api/auth|api/auth/mobile-login|api/auth/mobile-exchange|auth/callback|auth/mobile-callback|login|_next/static|_next/image|favicon\\.ico).*)",
  ],
};
