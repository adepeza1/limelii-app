"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { MapPin, Clock } from "lucide-react";
import type { Experience, Place } from "@/app/page";
import { track } from "@/lib/mixpanel";

// One match = one Experience (named "[Team A] vs [Team B]"). A single
// calendar day can carry several matches; the banner shows them as a
// horizontally-scrolling row. The set rotates automatically each day
// because Xano returns only *today's* matches (America/New_York date).
interface FeaturedMatch {
  experience_id: number;
  headline?: string | null;
  kickoff_local?: string | null;
  venue?: string | null;
  experience: Experience;
}

interface FeaturedResponse {
  date: string | null;
  matches: FeaturedMatch[];
}

function placeImage(place: Place): string | null {
  return (
    (place.display_images ?? []).find((img) => img.url)?.url ??
    (place.images ?? []).find((img) => img.url)?.url ??
    null
  );
}

function matchImage(exp: Experience): string | null {
  for (const place of exp.places_id ?? []) {
    const url = placeImage(place);
    if (url) return url;
  }
  return null;
}

export function WorldCupBanner() {
  const [matches, setMatches] = useState<FeaturedMatch[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/world-cup/featured")
      .then((r) => (r.ok ? r.json() : null))
      .then((data: FeaturedResponse | null) => {
        if (cancelled) return;
        // Drop malformed rows: a match is only renderable with its experience.
        const valid = (data?.matches ?? []).filter((m) => m?.experience?.id);
        setMatches(valid);
      })
      .catch(() => {
        if (!cancelled) setMatches([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Hide entirely until loaded, and on off days / failures (empty list).
  if (!matches || matches.length === 0) return null;

  return (
    <section className="mt-4 mb-2" aria-label="World Cup today">
      <div className="px-4 mb-3 flex items-center gap-2">
        <span
          className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-white"
          style={{ background: "linear-gradient(90deg, #FB6983 0%, #FF9A56 100%)" }}
        >
          ⚽ World Cup
        </span>
        <h2 className="text-base font-medium text-black">
          {matches.length > 1 ? "Today's matches" : "Today's match"}
        </h2>
      </div>

      <div className="flex gap-4 overflow-x-auto hide-scrollbar pl-[22px] pr-4 md:grid md:grid-cols-2 lg:grid-cols-3 md:pl-4 md:overflow-x-visible">
        {matches.map((m) => {
          const title = m.headline?.trim() || m.experience.title;
          const img = matchImage(m.experience);
          return (
            <Link
              key={m.experience_id}
              href={`/experience/${m.experience_id}`}
              onClick={() =>
                track("World Cup Banner Tapped", {
                  experience_id: m.experience_id,
                  headline: title,
                })
              }
              className="shrink-0 w-[280px] sm:w-[330px] md:w-auto rounded-[20px] overflow-hidden border border-black/10 relative"
            >
              <div className="relative aspect-[33/20] bg-gray-100">
                {img ? (
                  <Image
                    src={img}
                    alt={title}
                    fill
                    sizes="(max-width: 768px) 330px, 33vw"
                    className="object-cover"
                  />
                ) : (
                  <div
                    className="absolute inset-0"
                    style={{ background: "linear-gradient(135deg, #FB6983 0%, #FF9A56 100%)" }}
                  />
                )}
                {/* Bottom scrim so white text stays legible over any photo */}
                <div className="absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-black/70 to-transparent" />
                <div className="absolute inset-x-0 bottom-0 p-3.5">
                  <p className="text-white font-semibold text-[15px] leading-tight line-clamp-2">
                    {title}
                  </p>
                  <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-white/90 text-[12px]">
                    {m.kickoff_local && (
                      <span className="inline-flex items-center gap-1">
                        <Clock size={12} strokeWidth={2} />
                        {m.kickoff_local}
                      </span>
                    )}
                    {m.venue && (
                      <span className="inline-flex items-center gap-1">
                        <MapPin size={12} strokeWidth={2} />
                        {m.venue}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
