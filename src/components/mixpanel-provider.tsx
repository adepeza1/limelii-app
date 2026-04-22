"use client";

import { useEffect } from "react";
import { useKindeAuth } from "@kinde-oss/kinde-auth-nextjs";
import { initMixpanel, identify } from "@/lib/mixpanel";

export function MixpanelProvider() {
  const { user } = useKindeAuth();

  useEffect(() => {
    initMixpanel();
  }, []);

  useEffect(() => {
    if (user?.id) {
      identify(user.id, {
        $email: user.email ?? undefined,
        $name: [user.given_name, user.family_name].filter(Boolean).join(" ") || undefined,
      });
    }
  }, [user?.id]);

  return null;
}
