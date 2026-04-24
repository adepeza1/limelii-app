"use client";

import { useState, useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import Image from "next/image";
import { MapPin, Sparkles, ChevronRight } from "lucide-react";
import { haptic } from "@/lib/haptics";

const KEY = "limelii_walkthrough_v1";

interface Slide {
  id: string;
  headline?: string;
  body?: string;
}

const SLIDES: Slide[] = [
  { id: "welcome" },
  {
    id: "discover",
    headline: "Explore NYC your way",
    body: "Browse curated experiences filtered by vibe, budget, and neighborhood — and let AI plan your perfect day.",
  },
  {
    id: "share",
    headline: "Save, collect & share",
    body: "Heart your favorites, organize them into collections, and share them with the people you love exploring with.",
  },
];

export function OnboardingWalkthrough() {
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);
  const [visible, setVisible] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [step, setStep] = useState(0);
  const [userId, setUserId] = useState<number | null>(null);
  const touchStartX = useRef(0);
  const touchStartY = useRef(0);

  useEffect(() => {
    fetch("/api/user/me")
      .then((r) => (r.ok ? r.json() : null))
      .then((user) => {
        if (!user?.id) return;
        if (localStorage.getItem(`${KEY}_${user.id}`)) return;
        setUserId(user.id);
        setMounted(true);
        // Double rAF so opacity transition actually fires after mount
        requestAnimationFrame(() => requestAnimationFrame(() => setVisible(true)));
      })
      .catch(() => {});
  }, []);

  function dismiss() {
    haptic("light");
    setLeaving(true);
    if (userId) localStorage.setItem(`${KEY}_${userId}`, "1");
    setTimeout(() => setMounted(false), 350);
  }

  function next() {
    haptic(step === SLIDES.length - 1 ? "success" : "light");
    if (step < SLIDES.length - 1) setStep((s) => s + 1);
    else dismiss();
  }

  function prev() {
    haptic("light");
    if (step > 0) setStep((s) => s - 1);
  }

  if (pathname === "/onboarding") return null;
  if (!mounted) return null;

  const isFirst = step === 0;
  const isLast = step === SLIDES.length - 1;

  return (
    <div
      className={`fixed inset-x-0 top-0 h-[100dvh] z-[800] transition-opacity duration-300 ${
        visible && !leaving ? "opacity-100" : "opacity-0"
      }`}
      onTouchStart={(e) => {
        touchStartX.current = e.touches[0].clientX;
        touchStartY.current = e.touches[0].clientY;
      }}
      onTouchEnd={(e) => {
        const dx = touchStartX.current - e.changedTouches[0].clientX;
        const dy = Math.abs(e.changedTouches[0].clientY - touchStartY.current);
        if (Math.abs(dx) > 50 && dy < 80) {
          if (dx > 0) next();
          else prev();
        }
      }}
    >
      {/* Slide container */}
      <div className="relative w-full h-full overflow-hidden">
        {SLIDES.map((slide, i) => (
          <div
            key={slide.id}
            className="absolute inset-0 transition-transform duration-300 ease-out will-change-transform"
            style={{ transform: `translateX(${(i - step) * 100}%)` }}
          >
            {slide.id === "welcome" ? (
              <WelcomeSlide />
            ) : slide.id === "discover" ? (
              <FeatureSlide
                bgColor="#FDFAF6"
                illustration={
                  <div
                    className="w-52 h-52 rounded-full overflow-hidden flex items-center justify-center"
                    style={{ backgroundColor: "#F2ECE6" }}
                  >
                    <Image
                      src="/images/limeliFavicon.png"
                      alt="Discover"
                      width={192}
                      height={192}
                      className="w-full h-full object-contain"
                    />
                  </div>
                }
                headline={slide.headline!}
                body={slide.body!}
              />
            ) : (
              <FeatureSlide
                bgColor="#FFF0F5"
                illustration={
                  <div className="w-52 h-52 rounded-full bg-[#FFD6E4] flex items-center justify-center">
                    <Sparkles size={80} className="text-[#FB6983]" strokeWidth={1.5} />
                  </div>
                }
                headline={slide.headline!}
                body={slide.body!}
              />
            )}
          </div>
        ))}
      </div>

      {/* Controls — always on top */}
      <div
        className="absolute bottom-0 left-0 right-0 flex flex-col items-center gap-5 px-6"
        style={{ paddingBottom: "max(4rem, calc(env(safe-area-inset-bottom) + 3rem))" }}
      >
        {/* Dot indicators */}
        <div className="flex items-center gap-2">
          {SLIDES.map((_, i) => (
            <button
              key={i}
              onClick={() => setStep(i)}
              className={`rounded-full transition-all duration-300 ${
                i === step
                  ? isFirst
                    ? "w-7 h-2 bg-white"
                    : "w-7 h-2 bg-[#FB6983]"
                  : isFirst
                  ? "w-2 h-2 bg-white/35"
                  : "w-2 h-2 bg-[#FB6983]/25"
              }`}
            />
          ))}
        </div>

        {/* Buttons row */}
        <div className="w-full flex items-center justify-between">
          <button
            onClick={dismiss}
            className={`text-sm font-medium transition-colors ${
              isFirst ? "text-white/60" : "text-[#98A2B3]"
            }`}
          >
            Skip
          </button>

          <button
            onClick={next}
            className={`flex items-center gap-1.5 px-7 py-3 rounded-2xl font-semibold text-sm transition-all active:scale-95 ${
              isFirst
                ? "bg-white text-[#FB6983] shadow-md"
                : isLast
                ? "bg-[#FB6983] text-white shadow-md"
                : "bg-[#FB6983] text-white shadow-sm"
            }`}
          >
            {isLast ? "Get Started" : "Next"}
            {!isLast && <ChevronRight size={15} />}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Slide: Welcome ────────────────────────────────────────────────────────────

function WelcomeSlide() {
  return (
    <div
      className="w-full h-full relative flex flex-col items-center justify-center px-8 overflow-hidden"
      style={{ background: "linear-gradient(160deg, #FB6983 0%, #FF9A56 100%)" }}
    >
      {/* Decorative blobs */}
      <div className="absolute -top-24 -right-24 w-80 h-80 rounded-full bg-white/10 pointer-events-none" />
      <div className="absolute -bottom-16 -left-16 w-72 h-72 rounded-full bg-white/10 pointer-events-none" />
      <div className="absolute top-1/3 -left-8 w-32 h-32 rounded-full bg-white/[0.07] pointer-events-none" />

      {/* Content */}
      <div className="relative flex flex-col items-center gap-5">
        {/* Logo — CSS filter makes the coral SVG render white */}
        <Image
          src="/limelii-logo.svg"
          alt="Limelii"
          width={200}
          height={79}
          className="brightness-0 invert"
          priority
        />

        {/* Route icon from favicon, tinted white */}
        <Image
          src="/images/limeliFavicon.png"
          alt=""
          width={72}
          height={72}
          className="opacity-80 brightness-0 invert"
        />

        <div className="text-center mt-1">
          <p className="text-white text-2xl font-bold leading-snug">
            Where Experiences Begin
          </p>
          <p className="text-white/75 text-base mt-2 leading-relaxed max-w-[260px]">
            Your personal guide to the best of New York City.
          </p>
        </div>
      </div>
    </div>
  );
}

// ─── Slide: Feature ────────────────────────────────────────────────────────────

function FeatureSlide({
  bgColor,
  illustration,
  headline,
  body,
}: {
  bgColor: string;
  illustration: React.ReactNode;
  headline: string;
  body: string;
}) {
  return (
    <div className="w-full h-full flex flex-col" style={{ backgroundColor: bgColor }}>
      {/* Illustration — upper portion */}
      <div className="flex-1 flex items-center justify-center">
        {illustration}
      </div>

      {/* Text — lower portion, padded above controls */}
      <div className="px-8 pb-44">
        <h2 className="text-[#101828] font-bold text-[26px] leading-tight mb-3">
          {headline}
        </h2>
        <p className="text-[#667085] text-base leading-relaxed">
          {body}
        </p>
      </div>
    </div>
  );
}
