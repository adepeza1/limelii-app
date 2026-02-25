import { withAuth } from "@kinde-oss/kinde-auth-nextjs/middleware";
import { NextRequest, NextResponse } from "next/server";

export default withAuth(async function middleware(req: NextRequest) {
  // If the user is authenticated with Kinde but has no Xano token,
  // redirect to /auth/callback to perform the token exchange.
  const hasXanoToken = req.cookies.has("xano_token");

  if (!hasXanoToken && req.nextUrl.pathname !== "/auth/callback") {
    const callbackUrl = new URL("/auth/callback", req.url);
    return NextResponse.redirect(callbackUrl);
  }
}, {
  isReturnToCurrentPage: true,
});

export const config = {
  matcher: ["/create/:path*", "/plan/:path*", "/profile/:path*"],
};
