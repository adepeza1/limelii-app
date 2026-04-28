import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const postLogoutRedirectUrl = searchParams.get("post_logout_redirect_url") ?? "/api/auth/login";

  const kindeLogoutUrl = new URL("/api/auth/logout", request.url);
  kindeLogoutUrl.searchParams.set("post_logout_redirect_url", postLogoutRedirectUrl);

  const response = NextResponse.redirect(kindeLogoutUrl);
  response.cookies.delete("xano_token");
  response.cookies.delete("xano_session");
  response.cookies.delete("mobile_authed");
  return response;
}

export async function POST() {
  const response = NextResponse.json({ success: true });
  response.cookies.delete("xano_token");
  response.cookies.delete("xano_session");
  response.cookies.delete("mobile_authed");
  return response;
}
