import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@kinde-oss/kinde-auth-nextjs/middleware";

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
  if (req.cookies.has("xano_token")) {
    return NextResponse.next();
  }
  return withKinde(req);
}

export const config = {
  matcher: [
    "/((?!api/auth|api/auth/mobile-login|api/auth/mobile-exchange|auth/callback|login|_next/static|_next/image|favicon\\.ico).*)",
  ],
};
