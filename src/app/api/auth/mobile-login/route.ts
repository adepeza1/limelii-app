import { NextResponse } from "next/server";
import { randomBytes } from "crypto";

export async function GET() {
  const state = randomBytes(16).toString("hex");

  const params = new URLSearchParams({
    client_id: process.env.KINDE_CLIENT_ID!,
    redirect_uri: "https://limelii-app.vercel.app/auth/mobile-callback",
    response_type: "code",
    // Note: offline_access is required for the kinde_refresh cookie
    // path to work, but requesting it fails with invalid_scope until
    // the application has refresh tokens enabled in the Kinde dashboard
    // (Applications → limelii-app → "Tokens" or "Allowed scopes").
    // Re-add " offline_access" to the scope string after enabling it.
    scope: "openid profile email",
    state,
    prompt: "login",
  });

  const url = `${process.env.KINDE_ISSUER_URL}/oauth2/auth?${params}`;
  return NextResponse.json({ url });
}
