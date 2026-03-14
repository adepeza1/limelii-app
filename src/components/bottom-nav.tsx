"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ClipboardList, User } from "lucide-react";
import Image from "next/image";
import { useKindeBrowserClient } from "@kinde-oss/kinde-auth-nextjs";
import { LoginLink } from "@kinde-oss/kinde-auth-nextjs/components";

const tabs = [
  { label: "Discover", iconSrc: "/images/Search.svg", href: "/" },
  { label: "Plan", icon: ClipboardList, href: "/plan" },
  { label: "Create", iconSrc: "/images/limeliFavicon.svg", href: "/create", center: true },
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
      <div className="max-w-5xl mx-auto flex items-center justify-around px-4 pt-3 pb-7">
        {tabs.map((tab) => {
          const isActive =
            tab.href === "/"
              ? pathname === "/"
              : pathname.startsWith(tab.href);

          const isCenter = "center" in tab;

          // Profile tab when NOT logged in
          if (tab.href === "/profile" && mounted && !isAuthenticated) {
            return (
              <LoginLink
                key={tab.href}
                postLoginRedirectURL="/auth/callback"
                className="flex flex-col items-center gap-1 min-w-[56px]"
                suppressHydrationWarning
              >
                <User className="w-6 h-6 text-gray-400" strokeWidth={1.6} />
                <span className="text-[11px] text-gray-400">Log In</span>
              </LoginLink>
            );
          }

          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`flex flex-col items-center gap-1 min-w-[56px] ${
                isCenter ? "-mt-6" : ""
              }`}
            >
              {"iconSrc" in tab ? (
                <Image
                  src={tab.iconSrc}
                  alt={tab.label}
                  width={isCenter ? 42 : 24}
                  height={isCenter ? 42 : 24}
                  className={isCenter ? "rounded-full shadow-md" : ""}
                />
              ) : (
                (() => {
                  const Icon = tab.icon;
                  return (
                    <Icon
                      className={`${
                        isCenter ? "w-10 h-10" : "w-6 h-6"
                      } ${isActive ? "text-[#416f7b]" : "text-gray-400"}`}
                      strokeWidth={1.6}
                    />
                  );
                })()
              )}

              {!isCenter && (
                <span
                  className={`text-[11px] ${
                    isActive
                      ? "text-[#416f7b] font-medium"
                      : "text-gray-400"
                  }`}
                >
                  {tab.label}
                </span>
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
