import { getKindeServerSession } from "@kinde-oss/kinde-auth-nextjs/server";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { ProfileClient } from "@/components/profile-client";
import { apiFetch } from "@/lib/api";
import { USER_API_BASE } from "@/lib/xano";

export default async function ProfilePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string>>;
}) {
  const cookieStore = await cookies();
  const xanoToken = cookieStore.get("xano_token")?.value;

  const { getUser, isAuthenticated } = getKindeServerSession();
  const kindeAuth = await isAuthenticated();

  if (!kindeAuth && !xanoToken) {
    redirect("/login");
  }

  let givenName: string | null = null;
  let familyName: string | null = null;
  let email: string | null = null;

  if (kindeAuth) {
    const user = await getUser();
    givenName = user?.given_name ?? null;
    familyName = user?.family_name ?? null;
    email = user?.email ?? null;
  } else if (xanoToken) {
    // apiFetch handles 401 by refreshing the Xano token and retrying once.
    // If it still fails, the cookie is unrecoverable — send the user back
    // to login rather than rendering a broken profile with "User" fallback.
    const res = await apiFetch("/user/me", { cache: "no-store" }, USER_API_BASE);
    if (res.status === 401) {
      redirect("/api/auth/login");
    }
    if (res.ok) {
      const data = await res.json();
      if (data.name) {
        const parts = (data.name as string).trim().split(/\s+/);
        givenName = parts[0] ?? null;
        familyName = parts.slice(1).join(" ") || null;
      }
      email = data.email ?? null;
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
      givenName={givenName}
      familyName={familyName}
      email={email}
      initialTab={params.tab === "preferences" ? "preferences" : "created"}
      initialCreating={initialCreating}
    />
  );
}
