import { withAuth } from "@kinde-oss/kinde-auth-nextjs/middleware";
import { NextRequest, NextResponse } from "next/server";

export default withAuth(async function middleware(req: NextRequest) {
  // Redirect to /auth/callback when either the Xano token is missing or the
  // 24-hour session marker is absent (catches stale tokens from previous/deleted
  // accounts that were never cleared by a proper logout).
  const hasXanoToken = req.cookies.has("xano_token");
  const hasXanoSession = req.cookies.has("xano_session");

  if ((!hasXanoToken || !hasXanoSession) && req.nextUrl.pathname !== "/auth/callback") {
    const callbackUrl = new URL("/auth/callback", req.url);
    callbackUrl.searchParams.set("redirect_to", req.nextUrl.pathname);
    return NextResponse.redirect(callbackUrl);
  }
}, {
  isReturnToCurrentPage: true,
});

export const config = {
  matcher: [
    "/((?!api/auth|auth/callback|_next/static|_next/image|favicon\\.ico).*)",
  ],
};
