import { NextResponse } from "next/server";
import { randomBytes } from "crypto";

export async function GET() {
  const state = randomBytes(16).toString("hex");

  const params = new URLSearchParams({
    client_id: process.env.KINDE_CLIENT_ID!,
    redirect_uri: "https://limelii-app.vercel.app/auth/mobile-callback",
    response_type: "code",
    // "offline" (NOT the OIDC-standard "offline_access") is Kinde's
    // scope name for requesting a refresh_token alongside the id_token.
    // Per Kinde's docs: "Kinde uses offline to request a refresh
    // token. The OIDC specification defines this scope as
    // offline_access, but Kinde does not support offline_access."
    // We need the refresh_token because the WebView has no Kinde
    // session cookies (mobile auth happens in SFSafariViewController,
    // separate cookie jar), so the Kinde SDK's refreshTokens() has
    // nothing to work with — refreshXanoToken uses the stored
    // refresh_token directly against Kinde's /oauth2/token endpoint
    // instead.
    scope: "openid profile email offline",
    state,
    prompt: "login",
  });

  const url = `${process.env.KINDE_ISSUER_URL}/oauth2/auth?${params}`;
  return NextResponse.json({ url });
}
