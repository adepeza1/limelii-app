"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ClipboardList, User } from "lucide-react";
import { useKindeBrowserClient } from "@kinde-oss/kinde-auth-nextjs";

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
  { label: "limelii AI", icon: ClipboardList, href: "/create" },
  { label: "Explore", iconSrc: "/images/limeliFavicon.png", href: "/plan", center: true },
  { label: "Collections", iconSrc: "/images/heart-alt.svg", href: "/saved" },
  { label: "Profile", icon: User, href: "/profile" },
];

function DiscoverIcon({ color }: { color: string }) {
  return (
    <svg aria-hidden="true" width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M9.34706 16.2668V6.41979C9.34706 5.08779 8.26806 4.00879 6.93606 4.00879C5.83706 4.00879 4.87806 4.75179 4.60206 5.81479L2.11206 15.4248" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M8.27191 13.7284C9.7067 15.1632 9.7067 17.4895 8.27191 18.9243C6.83712 20.359 4.51088 20.359 3.07609 18.9243C1.6413 17.4895 1.6413 15.1632 3.07609 13.7284C4.51088 12.2936 6.83712 12.2936 8.27191 13.7284" stroke={color} strokeWidth="1.5"/>
      <path d="M14.6528 16.2668V6.41979C14.6528 5.08779 15.7318 4.00879 17.0638 4.00879C18.1628 4.00879 19.1218 4.75179 19.3978 5.81479L21.8878 15.4248" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M14.6529 9.9998C14.6529 8.5318 13.4649 7.3418 11.9999 7.3418C10.5349 7.3418 9.34692 8.5318 9.34692 9.9998" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M9.34692 15.9998C9.34692 14.5318 10.5349 13.3418 11.9999 13.3418C13.4649 13.3418 14.6529 14.5318 14.6529 15.9998" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M20.924 13.7284C22.3588 15.1632 22.3588 17.4895 20.924 18.9243C19.4892 20.359 17.163 20.359 15.7282 18.9243C14.2934 17.4895 14.2934 15.1632 15.7282 13.7284C17.163 12.2936 19.4892 12.2936 20.924 13.7284" stroke={color} strokeWidth="1.5"/>
    </svg>
  );
}

function FolderIcon({ color }: { color: string }) {
  return (
    <svg aria-hidden="true" width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

function hasMobileAuthCookie(): boolean {
  if (typeof document === "undefined") return false;
  return document.cookie.split(";").some((c) => c.trim().startsWith("mobile_authed=1"));
}

export function BottomNav() {
  const pathname = usePathname();
  const { isAuthenticated: kindeAuth } = useKindeBrowserClient();
  const [mounted, setMounted] = useState(false);
  const [mobileAuthed, setMobileAuthed] = useState(false);
  const [keyboardOpen, setKeyboardOpen] = useState(false);

  useEffect(() => {
    setMounted(true);
    setMobileAuthed(hasMobileAuthCookie());
  }, []);

  useEffect(() => {
    const cap = (window as any).Capacitor;
    if (!cap?.isNativePlatform?.()) return;
    const subs: Array<{ remove: () => void }> = [];
    import("@capacitor/keyboard").then(({ Keyboard }) => {
      const register = async (event: string, open: boolean) => {
        try {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const handle = await (Keyboard.addListener as any)(event, () => {
            setKeyboardOpen(open);
          });
          subs.push(handle);
        } catch { /* event not supported on this platform */ }
      };
      register("keyboardWillShow", true);
      register("keyboardWillHide", false);
    }).catch(() => { /* plugin not available */ });
    return () => { subs.forEach((s) => s.remove()); };
  }, []);

  const isAuthenticated = kindeAuth || mobileAuthed;

  if (pathname === "/onboarding") return null;
  if (keyboardOpen) return null;

  return (
    <nav aria-label="Main navigation" className="fixed bottom-0 left-0 right-0 z-[750] bg-white border-t border-gray-100" style={{ touchAction: "manipulation" }}>
      <div className="max-w-5xl mx-auto flex items-end justify-around px-4" style={{ paddingTop: 4, paddingBottom: "calc(env(safe-area-inset-bottom) + 2px)" }}>
        {tabs.map((tab) => {
          const isActive =
            tab.href === "/"
              ? pathname === "/"
              : pathname.startsWith(tab.href);

          const isCenter = "center" in tab && tab.center;
          const color = isActive ? ACCENT : INACTIVE;

          if (tab.href === "/profile" && mounted && !isAuthenticated) {
            return (
              <Link
                key={tab.href}
                href="/login?redirect_to=/profile"
                className="flex flex-col items-center gap-1 min-w-[56px] cursor-pointer"
                style={{ touchAction: "manipulation" }}
                suppressHydrationWarning
              >
                <User className="w-6 h-6" style={{ color: INACTIVE }} strokeWidth={1.6} />
                <span className="text-[11px]" style={{ color: INACTIVE }}>Log In</span>
              </Link>
            );
          }

          return (
            <Link
              key={tab.href}
              href={tab.href}
              aria-current={isActive ? "page" : undefined}
              className="flex flex-col items-center gap-1 min-w-[56px] cursor-pointer"
              style={{ touchAction: "manipulation" }}
              onClick={tab.href === "/plan" && pathname.startsWith("/plan") ? () => window.dispatchEvent(new CustomEvent("explore-tab-clicked")) : undefined}
            >
              {tab.href === "/" ? (
                <DiscoverIcon color={color} />
              ) : tab.href === "/saved" ? (
                <FolderIcon color={color} />
              ) : isCenter ? (
                /* 24px layout placeholder keeps the row the same height as other tabs.
                   The actual icon is absolutely centred over it at a larger visual size. */
                <div style={{ position: "relative", width: 24, height: 24 }}>
                  <div
                    style={{
                      position: "absolute",
                      top: "50%",
                      left: "50%",
                      transform: "translate(-50%, -50%)",
                      width: 38,
                      height: 38,
                      backgroundImage: `url('${(tab as ImageTab).iconSrc}')`,
                      backgroundSize: "100%",
                      backgroundPosition: "center",
                      backgroundRepeat: "no-repeat",
                      filter: isActive ? "hue-rotate(35deg)" : "none",
                    }}
                  />
                </div>
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
