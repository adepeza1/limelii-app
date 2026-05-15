import { getKindeServerSession } from "@kinde-oss/kinde-auth-nextjs/server";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { refreshXanoToken } from "@/lib/api";

export async function POST() {
  const cookieStore = await cookies();
  const hasMobileRefresh = !!cookieStore.get("kinde_refresh")?.value;

  // Mobile users authenticate in SFSafariViewController, so the Kinde SDK
  // has no session cookies in the WebView — their durable auth state lives
  // in kinde_refresh (set by /api/auth/mobile-exchange). Only fall back to
  // the SDK's isAuthenticated() check when that cookie is absent.
  if (!hasMobileRefresh) {
    const { isAuthenticated } = getKindeServerSession();
    if (!(await isAuthenticated())) {
      console.error(
        "[token-fail] step=xano-token-gate hasMobileRefresh=false sdkAuth=false"
      );
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  try {
    await refreshXanoToken();
    return NextResponse.json({ success: true });
  } catch (error) {
    let kindeId: string | undefined;
    try {
      const u = await getKindeServerSession().getUser();
      kindeId = u?.id ?? undefined;
    } catch {}
    console.error(
      `[token-fail] step=xano-token-route hasMobileRefresh=${hasMobileRefresh} kindeId=${kindeId ?? "?"} err=${error instanceof Error ? error.message : String(error)}`
    );
    return NextResponse.json(
      { error: "Token exchange failed" },
      { status: 502 }
    );
  }
}
