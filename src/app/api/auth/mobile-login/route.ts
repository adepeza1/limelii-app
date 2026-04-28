import { NextResponse } from "next/server";
import { randomBytes } from "crypto";

export async function GET() {
  const state = randomBytes(16).toString("hex");

  const params = new URLSearchParams({
    client_id: process.env.KINDE_CLIENT_ID!,
    redirect_uri: "https://limelii-app.vercel.app/auth/mobile-callback",
    response_type: "code",
    scope: "openid profile email",
    state,
  });

  const url = `${process.env.KINDE_ISSUER_URL}/oauth2/auth?${params}`;
  return NextResponse.json({ url });
}
