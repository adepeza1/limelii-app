"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Search, ClipboardList, User, PlusSquare } from "lucide-react";
import { useKindeBrowserClient } from "@kinde-oss/kinde-auth-nextjs";
import { LoginLink } from "@kinde-oss/kinde-auth-nextjs/components";

const tabs = [
  { label: "Discover", icon: Search, href: "/" },
  { label: "Create", icon: PlusSquare, href: "/create" },
  { label: "Plan", icon: ClipboardList, href: "/plan" },
  { label: "Profile", icon: User, href: "/profile" },
] as const;

export function BottomNav() {
  const pathname = usePathname();
  const { isAuthenticated } = useKindeBrowserClient();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-100">
      <div className="max-w-5xl mx-auto flex items-center justify-around px-4 pt-2 pb-6">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive =
            tab.href === "/"
              ? pathname === "/"
              : pathname.startsWith(tab.href);

          // Profile tab: show LoginLink when not authenticated
          if (tab.href === "/profile" && mounted && !isAuthenticated) {
            return (
              <LoginLink
                key={tab.href}
                postLoginRedirectURL="/auth/callback"
                className="flex flex-col items-center gap-1 min-w-[56px]"
                suppressHydrationWarning
              >
                <Icon
                  className={`w-6 h-6 ${isActive ? "text-[#416f7b]" : "text-gray-400"}`}
                  strokeWidth={1.6}
                />
                <span
                  className={`text-[11px] ${isActive ? "text-[#416f7b] font-medium" : "text-gray-400"}`}
                >
                  Log In
                </span>
              </LoginLink>
            );
          }

          return (
            <Link
              key={tab.href}
              href={tab.href}
              className="flex flex-col items-center gap-1 min-w-[56px]"
            >
              <Icon
                className={`w-6 h-6 ${isActive ? "text-[#416f7b]" : "text-gray-400"}`}
                strokeWidth={1.6}
              />
              <span
                className={`text-[11px] ${isActive ? "text-[#416f7b] font-medium" : "text-gray-400"}`}
              >
                {tab.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
