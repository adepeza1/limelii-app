import { getKindeServerSession } from "@kinde-oss/kinde-auth-nextjs/server";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { ProfileClient } from "@/components/profile-client";
import { USER_API_BASE } from "@/lib/xano";

export default async function ProfilePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string>>;
}) {
  const cookieStore = await cookies();
  const xanoToken = cookieStore.get("xano_token")?.value;

  const { isAuthenticated } = getKindeServerSession();
  const kindeAuth = await isAuthenticated();

  if (!kindeAuth && !xanoToken) {
    redirect("/login");
  }

  // Quick probe so we can show a re-auth banner if the xano_token cookie
  // outlived the underlying token. Name + email are loaded client-side
  // from /api/user/me to keep a single source of truth.
  let authError = false;
  if (xanoToken) {
    try {
      const res = await fetch(`${USER_API_BASE}/user/me`, {
        headers: { Authorization: `Bearer ${xanoToken}` },
        cache: "no-store",
      });
      if (res.status === 401 || res.status === 403) {
        authError = true;
        let kindeId: string | undefined;
        try {
          const u = await getKindeServerSession().getUser();
          kindeId = u?.id ?? undefined;
        } catch {}
        console.error(
          `[token-fail] step=profile-probe status=${res.status} kindeId=${kindeId ?? "?"}`
        );
      }
    } catch {
      // Network failure; let the client handle it.
    }
  }

  const params = await searchParams;
  // `creating` may be the literal string "true" (legacy) or a numeric id
  // pointing at the experience the user just submitted. The numeric form
  // lets us poll for that exact row to finish generating.
  const creatingParam = params.creating;
  let initialCreating: boolean | number = false;
  if (creatingParam === "true") {
    initialCreating = true;
  } else if (creatingParam && /^\d+$/.test(creatingParam)) {
    initialCreating = parseInt(creatingParam, 10);
  }

  return (
    <ProfileClient
      authError={authError}
      initialTab={params.tab === "preferences" ? "preferences" : "created"}
      initialCreating={initialCreating}
    />
  );
}
