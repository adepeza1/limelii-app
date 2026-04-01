import { getKindeServerSession } from "@kinde-oss/kinde-auth-nextjs/server";
import { redirect } from "next/navigation";
import { ProfileClient } from "@/components/profile-client";

export default async function ProfilePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string>>;
}) {
  const { getUser, isAuthenticated } = getKindeServerSession();
  const authenticated = await isAuthenticated();

  if (!authenticated) {
    redirect("/api/auth/login?post_login_redirect_url=/auth/callback");
  }

  const user = await getUser();
  const params = await searchParams;

  return (
    <ProfileClient
      givenName={user?.given_name ?? null}
      familyName={user?.family_name ?? null}
      email={user?.email ?? null}
      initialTab={params.tab === "preferences" ? "preferences" : "created"}
      initialCreating={params.creating === "true"}
    />
  );
}
