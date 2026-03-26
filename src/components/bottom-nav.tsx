"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ClipboardList, User } from "lucide-react";
import Image from "next/image";
import { useKindeBrowserClient } from "@kinde-oss/kinde-auth-nextjs";
import { LoginLink } from "@kinde-oss/kinde-auth-nextjs/components";

import type { LucideIcon } from "lucide-react";

const ACCENT = "#FF9A56";
const INACTIVE = "#9ca3af";

type ImageTab = {
  label: string;
  href: string;
  iconSrc: string;
  center?: boolean;
};

type IconTab = {
  label: string;
  href: string;
  icon: LucideIcon;
  center?: boolean;
};

type Tab = ImageTab | IconTab;

const tabs: Tab[] = [
  { label: "Discover", iconSrc: "/images/Search.svg", href: "/" },
  { label: "Plan", icon: ClipboardList, href: "/plan" },
  { label: "Create", iconSrc: "/images/limeliFavicon.svg", href: "/create", center: true },
  { label: "Saved", iconSrc: "/images/heart-alt.svg", href: "/saved" },
  { label: "Profile", icon: User, href: "/profile" },
];

function DiscoverIcon({ color }: { color: string }) {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M9.34706 16.2668V6.41979C9.34706 5.08779 8.26806 4.00879 6.93606 4.00879C5.83706 4.00879 4.87806 4.75179 4.60206 5.81479L2.11206 15.4248" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M8.27191 13.7284C9.7067 15.1632 9.7067 17.4895 8.27191 18.9243C6.83712 20.359 4.51088 20.359 3.07609 18.9243C1.6413 17.4895 1.6413 15.1632 3.07609 13.7284C4.51088 12.2936 6.83712 12.2936 8.27191 13.7284" stroke={color} strokeWidth="1.5"/>
      <path d="M14.6528 16.2668V6.41979C14.6528 5.08779 15.7318 4.00879 17.0638 4.00879C18.1628 4.00879 19.1218 4.75179 19.3978 5.81479L21.8878 15.4248" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M14.6529 9.9998C14.6529 8.5318 13.4649 7.3418 11.9999 7.3418C10.5349 7.3418 9.34692 8.5318 9.34692 9.9998" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M9.34692 15.9998C9.34692 14.5318 10.5349 13.3418 11.9999 13.3418C13.4649 13.3418 14.6529 14.5318 14.6529 15.9998" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M20.924 13.7284C22.3588 15.1632 22.3588 17.4895 20.924 18.9243C19.4892 20.359 17.163 20.359 15.7282 18.9243C14.2934 17.4895 14.2934 15.1632 15.7282 13.7284C17.163 12.2936 19.4892 12.2936 20.924 13.7284" stroke={color} strokeWidth="1.5"/>
    </svg>
  );
}

function HeartIcon({ color }: { color: string }) {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M15.7 4C18.87 4 21 6.98 21 9.76C21 15.39 12.16 20 12 20C11.84 20 3 15.39 3 9.76C3 6.98 5.13 4 8.3 4C10.12 4 11.31 4.91 12 5.71C12.69 4.91 13.88 4 15.7 4Z" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

export function BottomNav() {
  const pathname = usePathname();
  const { isAuthenticated } = useKindeBrowserClient();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-100">
      <div className="max-w-5xl mx-auto flex items-end justify-around px-4 pt-1" style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 0px)" }}>
        {tabs.map((tab) => {
          const isActive =
            tab.href === "/"
              ? pathname === "/"
              : pathname.startsWith(tab.href);

          const isCenter = "center" in tab && tab.center;
          const color = isActive ? ACCENT : INACTIVE;

          if (tab.href === "/profile" && mounted && !isAuthenticated) {
            return (
              <LoginLink
                key={tab.href}
                postLoginRedirectURL="/auth/callback"
                className="flex flex-col items-center gap-1 min-w-[56px]"
                suppressHydrationWarning
              >
                <User className="w-6 h-6" style={{ color: INACTIVE }} strokeWidth={1.6} />
                <span className="text-[11px]" style={{ color: INACTIVE }}>Log In</span>
              </LoginLink>
            );
          }

          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`flex flex-col items-center gap-1 min-w-[56px] ${isCenter ? "scale-110" : ""}`}
            >
              {tab.href === "/" ? (
                <DiscoverIcon color={color} />
              ) : tab.href === "/saved" ? (
                <HeartIcon color={color} />
              ) : isCenter ? (
                <Image
                  src={(tab as ImageTab).iconSrc}
                  alt={tab.label}
                  width={48}
                  height={48}
                  priority
                  className="object-contain"
                />
              ) : (
                (() => { const Icon = (tab as IconTab).icon; return <Icon className="w-6 h-6" style={{ color }} strokeWidth={1.6} />; })()
              )}

              <span className="text-[11px] font-medium" style={{ color }}>
                {tab.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
