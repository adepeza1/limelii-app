"use client";

import Image from "next/image";
import { MapPin, Clock, Ticket, Share2 } from "lucide-react";
import { track } from "@/lib/mixpanel";
import type { RightNowCard as Card } from "@/lib/right-now/types";

function startsAtLabel(iso?: string): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (isNaN(d.getTime())) return null;
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    weekday: "short",
    hour: "numeric",
    minute: "2-digit",
  }).format(d);
}

export function RightNowCardView({ card }: { card: Card }) {
  const { availability: a } = card;

  function onAction() {
    track("Right Now CTA", { id: card.id, category: card.category, source: card.sourceType });
    window.open(card.action.url, "_blank", "noopener,noreferrer");
  }

  async function onShare() {
    track("Right Now Share", { id: card.id, category: card.category });
    try {
      if (navigator.share) await navigator.share({ title: card.title, url: card.action.url });
      else await navigator.clipboard.writeText(card.action.url);
    } catch {
      /* user dismissed */
    }
  }

  const meta: string[] = [];
  if (card.neighborhood) meta.push(card.neighborhood);
  if (card.distanceMi != null) meta.push(`${card.distanceMi.toFixed(1)} mi`);
  if (card.priceIndicator) meta.push(card.priceIndicator);

  return (
    <div className="bg-white rounded-2xl overflow-hidden shadow-sm border border-gray-100">
      {card.imageUrl ? (
        <div className="relative w-full aspect-[16/9] bg-gray-100">
          <Image src={card.imageUrl} alt={card.title} fill sizes="100vw" className="object-cover" />
        </div>
      ) : (
        <div className="w-full aspect-[16/9] bg-gradient-to-br from-gray-100 to-gray-200" />
      )}

      <div className="p-4">
        {/* availability line */}
        <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-[#FB6983]">
          {card.category === "events" ? (
            <>
              <Ticket className="w-3.5 h-3.5" strokeWidth={2} />
              <span>{startsAtLabel(a.startsAt) ?? "Upcoming"}{a.ticketsAvailable ? " · Tickets available" : ""}</span>
            </>
          ) : (
            <>
              <Clock className="w-3.5 h-3.5" strokeWidth={2} />
              <span>Open now{a.closesAt ? ` · until ${a.closesAt}` : ""}{a.walkIn ? " · Walk-in" : ""}</span>
            </>
          )}
        </div>

        <h3 className="mt-1 text-lg font-semibold text-gray-900 leading-snug">{card.title}</h3>
        {card.subtitle && <p className="text-sm text-gray-500 mt-0.5 line-clamp-1">{card.subtitle}</p>}

        {meta.length > 0 && (
          <div className="mt-1.5 flex items-center gap-1 text-xs text-gray-400">
            <MapPin className="w-3 h-3" strokeWidth={2} />
            <span>{meta.join(" · ")}</span>
          </div>
        )}

        <div className="mt-3 flex items-center gap-2">
          <button
            onClick={onAction}
            className="flex-1 bg-gray-900 text-white text-sm font-semibold rounded-full py-2.5 active:opacity-80 transition-opacity"
          >
            {card.action.label}
          </button>
          <button
            onClick={onShare}
            aria-label="Share"
            className="w-10 h-10 flex items-center justify-center rounded-full bg-gray-100 text-gray-600 active:opacity-70"
          >
            <Share2 className="w-4 h-4" strokeWidth={2} />
          </button>
        </div>
      </div>
    </div>
  );
}
