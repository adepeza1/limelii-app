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
    try {
      const res = await fetch(`${USER_API_BASE}/user/me`, {
        headers: { Authorization: `Bearer ${xanoToken}` },
        cache: "no-store",
      });
      if (res.ok) {
        const data = await res.json();
        if (data.name) {
          const parts = (data.name as string).trim().split(/\s+/);
          givenName = parts[0] ?? null;
          familyName = parts.slice(1).join(" ") || null;
        }
        email = data.email ?? null;
      }
    } catch {
      // Proceed with null user info — ProfileClient shows "User" fallback
    }
  }

  const params = await searchParams;

  return (
    <ProfileClient
      givenName={givenName}
      familyName={familyName}
      email={email}
      initialTab={params.tab === "preferences" ? "preferences" : "created"}
      initialCreating={params.creating === "true"}
    />
  );
}
