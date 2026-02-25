import { getKindeServerSession } from "@kinde-oss/kinde-auth-nextjs/server";
import { LogoutLink } from "@kinde-oss/kinde-auth-nextjs/components";
import { redirect } from "next/navigation";
import { ProfileExperiences } from "@/components/profile-experiences";

export default async function ProfilePage() {
  const { getUser, isAuthenticated } = getKindeServerSession();
  const authenticated = await isAuthenticated();

  if (!authenticated) {
    redirect("/api/auth/login?post_login_redirect_url=/auth/callback");
  }

  const user = await getUser();

  return (
    <main className="min-h-screen bg-white">
      <div className="sticky top-0 z-10 bg-white">
        <div className="h-[env(safe-area-inset-top,44px)]" />
        <div className="max-w-5xl mx-auto px-4 py-2.5 flex items-center justify-between">
          <h1 className="text-lg font-medium text-black">Profile</h1>
          <LogoutLink className="text-sm text-gray-500 hover:text-gray-700 transition-colors">
            Log Out
          </LogoutLink>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 pt-4 pb-2">
        <p className="text-gray-900 font-medium">
          {user?.given_name} {user?.family_name}
        </p>
        <p className="text-sm text-gray-500">{user?.email}</p>
      </div>

      <div className="mt-4">
        <h2 className="text-base font-semibold text-gray-900 px-4 max-w-5xl mx-auto mb-3">
          Your Experiences
        </h2>
        <ProfileExperiences />
      </div>
    </main>
  );
}
