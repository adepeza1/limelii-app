import { getKindeServerSession } from "@kinde-oss/kinde-auth-nextjs/server";
import { NextResponse } from "next/server";

import { refreshXanoToken } from "@/lib/api";

export async function POST() {
  const { isAuthenticated } = getKindeServerSession();
  const authenticated = await isAuthenticated();

  if (!authenticated) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
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
      `[token-fail] step=xano-token-route kindeId=${kindeId ?? "?"} err=${error instanceof Error ? error.message : String(error)}`
    );
    return NextResponse.json(
      { error: "Token exchange failed" },
      { status: 502 }
    );
  }
}
