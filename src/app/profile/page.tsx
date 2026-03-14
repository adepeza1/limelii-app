import { getKindeServerSession } from "@kinde-oss/kinde-auth-nextjs/server";
import { redirect } from "next/navigation";
import { ProfileClient } from "@/components/profile-client";

export default async function ProfilePage() {
  const { getUser, isAuthenticated } = getKindeServerSession();
  const authenticated = await isAuthenticated();

  if (!authenticated) {
    redirect("/api/auth/login?post_login_redirect_url=/auth/callback");
  }

  const user = await getUser();

  return (
    <ProfileClient
      givenName={user?.given_name ?? null}
      familyName={user?.family_name ?? null}
      email={user?.email ?? null}
    />
  );
}
