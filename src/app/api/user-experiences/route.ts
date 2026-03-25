import { getKindeServerSession } from "@kinde-oss/kinde-auth-nextjs/server";
import { NextResponse } from "next/server";

import { apiFetch } from "@/lib/api";

export async function GET() {
  const { isAuthenticated } = getKindeServerSession();
  const authenticated = await isAuthenticated();

  if (!authenticated) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const res = await apiFetch("/user_experiences");

  if (!res.ok) {
    return NextResponse.json(
      { error: "Failed to fetch experiences" },
      { status: res.status }
    );
  }

  const data = await res.json();
  return NextResponse.json(data);
}
