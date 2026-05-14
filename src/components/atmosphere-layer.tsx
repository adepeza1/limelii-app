"use client";

import { useEffect } from "react";
import { useAtmosphere } from "@/hooks/use-atmosphere";
import { TINT_GRADIENTS } from "@/lib/atmosphere-config";

// Rain streaks: left edge (0–12%) and right edge (88–100%), never over center content
const RAIN: Array<{ left: number; delay: number; dur: number; h: number; op: number }> = [
  { left:  2, delay:  0.0, dur: 0.70, h: 55, op: 0.40 },
  { left:  5, delay: -0.3, dur: 0.85, h: 45, op: 0.35 },
  { left:  8, delay: -0.7, dur: 0.65, h: 65, op: 0.50 },
  { left: 11, delay: -1.2, dur: 0.75, h: 50, op: 0.40 },
  { left:  3, delay: -1.8, dur: 0.90, h: 40, op: 0.30 },
  { left:  7, delay: -0.5, dur: 0.80, h: 58, op: 0.45 },
  { left: 10, delay: -2.1, dur: 0.70, h: 48, op: 0.35 },
  { left: 89, delay: -0.2, dur: 0.80, h: 52, op: 0.45 },
  { left: 92, delay: -0.9, dur: 0.70, h: 60, op: 0.40 },
  { left: 95, delay: -1.5, dur: 0.85, h: 44, op: 0.35 },
  { left: 98, delay: -0.4, dur: 0.65, h: 58, op: 0.50 },
  { left: 91, delay: -2.0, dur: 0.75, h: 42, op: 0.30 },
  { left: 94, delay: -0.7, dur: 0.90, h: 55, op: 0.40 },
  { left: 97, delay: -1.3, dur: 0.70, h: 50, op: 0.45 },
];

// Snow flakes: edge-weighted distribution across the full screen
const SNOW: Array<{ left: number; delay: number; dur: number; sz: number; op: number }> = [
  { left:  4, delay:  0.0, dur: 5.0, sz: 4, op: 0.50 },
  { left: 11, delay: -2.0, dur: 7.0, sz: 3, op: 0.40 },
  { left:  2, delay: -4.0, dur: 6.0, sz: 5, op: 0.45 },
  { left: 88, delay: -1.0, dur: 4.5, sz: 4, op: 0.50 },
  { left: 93, delay: -3.0, dur: 6.5, sz: 3, op: 0.40 },
  { left: 97, delay: -5.0, dur: 5.5, sz: 5, op: 0.45 },
  { left: 20, delay: -2.5, dur: 7.0, sz: 3, op: 0.35 },
  { left: 78, delay: -1.5, dur: 5.0, sz: 4, op: 0.40 },
  { left: 34, delay: -3.5, dur: 6.0, sz: 3, op: 0.30 },
  { left: 65, delay: -0.5, dur: 7.5, sz: 4, op: 0.35 },
  { left: 45, delay: -4.0, dur: 5.5, sz: 3, op: 0.30 },
  { left: 54, delay: -2.0, dur: 6.5, sz: 4, op: 0.35 },
  { left: 25, delay: -6.0, dur: 4.5, sz: 5, op: 0.40 },
  { left: 72, delay: -1.0, dur: 8.0, sz: 3, op: 0.35 },
  { left:  7, delay: -3.0, dur: 7.0, sz: 4, op: 0.45 },
  { left: 86, delay: -5.5, dur: 5.0, sz: 5, op: 0.40 },
  { left: 42, delay: -0.8, dur: 6.5, sz: 3, op: 0.30 },
];

export function AtmosphereLayer() {
  const { timeSlot, condition } = useAtmosphere();

  // Pause particle animations when app is backgrounded
  useEffect(() => {
    const handle = () =>
      document.documentElement.toggleAttribute("data-bg-hidden", document.hidden);
    document.addEventListener("visibilitychange", handle);
    return () => document.removeEventListener("visibilitychange", handle);
  }, []);

  // Weather overrides time-of-day for the tint layer
  const tintKey = condition !== "clear" ? condition : timeSlot;
  const tintGradient = TINT_GRADIENTS[tintKey as keyof typeof TINT_GRADIENTS];

  return (
    <>
      {/* Tint overlay — key change triggers the atm-fade-in animation for cross-fade */}
      <div
        key={tintKey}
        aria-hidden="true"
        className="fixed inset-0 pointer-events-none z-[45]"
        style={{ background: tintGradient, animation: "atm-fade-in 4.5s ease-in-out both" }}
      />

      {/* Precipitation particles — key remount causes fade-in on state change */}
      {condition !== "clear" && (
        <div
          key={condition}
          aria-hidden="true"
          className="fixed inset-0 overflow-hidden pointer-events-none z-[46] atm-particles"
          style={{ animation: "atm-fade-in 2s ease-in-out both" }}
        >
          {condition === "rain" && RAIN.map((p, i) => (
            <div
              key={i}
              className="absolute top-0 atm-rain"
              style={{
                left: `${p.left}%`,
                width: 1,
                height: p.h,
                opacity: p.op,
                background: "linear-gradient(to bottom, transparent, rgba(138, 172, 212, 0.85), transparent)",
                animationDuration: `${p.dur}s`,
                animationDelay: `${p.delay}s`,
              }}
            />
          ))}

          {condition === "snow" && SNOW.map((p, i) => (
            <div
              key={i}
              className="absolute top-0 atm-snow"
              style={{
                left: `${p.left}%`,
                width: p.sz,
                height: p.sz,
                borderRadius: "50%",
                background: "rgba(220, 234, 255, 0.9)",
                opacity: p.op,
                animationDuration: `${p.dur}s`,
                animationDelay: `${p.delay}s`,
              }}
            />
          ))}
        </div>
      )}
    </>
  );
}
