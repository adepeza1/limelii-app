"use client";

import { List, Map } from "lucide-react";

export type HomeView = "discover" | "explore";

const ITEMS: { v: HomeView; label: string; Icon: typeof List }[] = [
  { v: "discover", label: "Feed", Icon: List },
  { v: "explore", label: "Map", Icon: Map },
];

/** Compact Feed / Map segmented control used on the home page. */
export function ViewToggle({
  value,
  onChange,
  className = "",
}: {
  value: HomeView;
  onChange: (v: HomeView) => void;
  className?: string;
}) {
  return (
    <div
      role="tablist"
      aria-label="Feed or Map"
      className={`inline-flex items-center gap-0.5 rounded-full bg-[#f2f4f7] p-0.5 ${className}`}
    >
      {ITEMS.map(({ v, label, Icon }) => {
        const active = value === v;
        return (
          <button
            key={v}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(v)}
            className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-semibold transition-colors ${
              active
                ? "bg-white text-gray-900 shadow-sm ring-1 ring-black/5"
                : "text-gray-500"
            }`}
          >
            <Icon className="w-4 h-4" strokeWidth={2} />
            {label}
          </button>
        );
      })}
    </div>
  );
}
