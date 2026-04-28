import { getKindeServerSession as _getKindeServerSession } from "@kinde-oss/kinde-auth-nextjs/server";
import { cookies } from "next/headers";

export function getKindeServerSession() {
  const session = _getKindeServerSession();
  const originalIsAuthenticated = session.isAuthenticated;
  return {
    ...session,
    isAuthenticated: async (): Promise<boolean> => {
      const cookieStore = await cookies();
      if (cookieStore.has("xano_token")) return true;
      return (await originalIsAuthenticated()) ?? false;
    },
  } as ReturnType<typeof _getKindeServerSession>;
}
