import { NextResponse } from "next/server";
import { randomBytes } from "crypto";

export async function GET() {
  const state = randomBytes(16).toString("hex");

  const params = new URLSearchParams({
    client_id: process.env.KINDE_CLIENT_ID!,
    redirect_uri: "https://limelii-app.vercel.app/auth/mobile-callback",
    response_type: "code",
    // offline_access tells Kinde to return a refresh_token alongside the
    // id_token. We need it because the WebView has no Kinde session
    // cookies (the OAuth happens in SFSafariViewController, separate
    // cookie jar), so the Kinde SDK's refreshTokens() can't recover
    // expired Xano tokens on its own.
    scope: "openid profile email offline_access",
    state,
    prompt: "login",
  });

  const url = `${process.env.KINDE_ISSUER_URL}/oauth2/auth?${params}`;
  return NextResponse.json({ url });
}
