import { getKindeServerSession } from "@kinde-oss/kinde-auth-nextjs/server";
import { NextResponse } from "next/server";
import { apiFetch } from "@/lib/api";

export async function GET() {
  const { isAuthenticated } = getKindeServerSession();
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [followsRes, collectionsRes] = await Promise.all([
    apiFetch("/user_follows"),
    apiFetch("/following_collections"),
  ]);

  return NextResponse.json({
    user_follows: followsRes.ok ? await followsRes.json() : { error: followsRes.status },
    following_collections: collectionsRes.ok ? await collectionsRes.json() : { error: collectionsRes.status },
  });
}
