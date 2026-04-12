"use client";

import { useState, useRef, useEffect } from "react";
import Image from "next/image";
import { ChevronLeft, Send, Maximize2 } from "lucide-react";
import { ShareSheet } from "./collection-share-sheet";

const SAVED_KEY = "limelii_saved";
const SAVED_ITEMS_KEY = "limelii_saved_items";
const SAVE_VERSION_KEY = "limelii_save_version";
const SAVE_VERSION = "4";

// Clear all stale save state if version changed — resets hearts on all devices
function checkSaveVersion() {
  if (typeof window === "undefined") return;
  if (localStorage.getItem(SAVE_VERSION_KEY) !== SAVE_VERSION) {
    localStorage.removeItem(SAVED_KEY);
    localStorage.removeItem(SAVED_ITEMS_KEY);
    localStorage.removeItem("limelii_saves_migrated");
    localStorage.setItem(SAVE_VERSION_KEY, SAVE_VERSION);
  }
}

function getSaved(): number[] {
  if (typeof window === "undefined") return [];
  checkSaveVersion();
  try { return JSON.parse(localStorage.getItem(SAVED_KEY) ?? "[]"); } catch { return []; }
}

function getSavedItems(): Record<string, Experience> {
  if (typeof window === "undefined") return {};
  try { return JSON.parse(localStorage.getItem(SAVED_ITEMS_KEY) ?? "{}"); } catch { return {}; }
}

function toggleSaved(experience: Experience): boolean {
  const ids = getSaved();
  const items = getSavedItems();
  const idx = ids.indexOf(experience.id);
  const saving = idx === -1;
  if (saving) {
    ids.push(experience.id);
    items[experience.id] = experience;
  } else {
    ids.splice(idx, 1);
    delete items[experience.id];
  }
  localStorage.setItem(SAVED_KEY, JSON.stringify(ids));
  localStorage.setItem(SAVED_ITEMS_KEY, JSON.stringify(items));
  // Sync to server in the background — don't block the UI
  if (saving) {
    saveExperience(experience.id).catch(() => {});
  } else {
    unsaveExperience(experience.id).catch(() => {});
  }
  return saving;
}
import dynamic from "next/dynamic";
import type { Experience, Place } from "@/app/page";
import { AddToCollectionSheet } from "./add-to-collection-sheet";
import { saveExperience, unsaveExperience } from "@/lib/saved";

const ExperienceMap = dynamic(
  () => import("./experience-map").then((m) => m.ExperienceMap),
  { ssr: false, loading: () => <div className="w-full h-[320px] bg-gray-100 rounded-xl" /> }
);

const FullscreenMap = dynamic(
  () => import("./experience-map").then((m) => m.FullscreenMap),
  { ssr: false }
);

function getPlaceImage(place: Place): string | null {
  return (place.display_images ?? []).find((img) => img.url)?.url
    ?? (place.images ?? []).find((img) => img.url)?.url
    ?? null;
}

function getFullAddress(place: Place): string {
  if (place.address) return place.address;
  const parts = [place.address_line_1, place.city, place.state, place.zipcode].filter(Boolean);
  return parts.join(", ");
}

function hasValue(val: string | null | undefined): val is string {
  return !!val && val.trim() !== "" && val.trim().toUpperCase() !== "NA";
}


function PlaceImageCard({
  place,
}: {
  place: Place;
}) {
  const images = [...(place.display_images ?? []), ...(place.images ?? [])].slice(0, 4).map((img) => img.url);
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);
  if (images.length === 0) return null;

  return (
    <div className="w-full aspect-[33/38] rounded-2xl overflow-hidden relative bg-gray-200">
      {images.length === 1 ? (
        <Image
          src={images[0]}
          alt={place.name}
          fill
          className="object-cover"
          sizes="(max-width: 640px) calc(100vw - 44px), 330px"
        />
      ) : expandedIndex !== null ? (
        <button
          className="absolute inset-0 w-full h-full"
          onClick={() => setExpandedIndex(null)}
          aria-label="Collapse photo"
        >
          <Image
            src={images[expandedIndex]}
            alt={`${place.name} ${expandedIndex + 1}`}
            fill
            className="object-cover"
            sizes="(max-width: 640px) calc(100vw - 44px), 330px"
          />
        </button>
      ) : (
        <div className="absolute inset-0 grid grid-cols-2 grid-rows-2 gap-[2px]">
          {images.map((url, i) => (
            <button
              key={i}
              className="relative overflow-hidden"
              onClick={() => setExpandedIndex(i)}
              aria-label={`Expand photo ${i + 1}`}
            >
              <Image
                src={url}
                alt={`${place.name} ${i + 1}`}
                fill
                className="object-cover"
                sizes="(max-width: 640px) calc(50vw - 22px), 165px"
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export function ExperienceDetail({
  experience,
  onBack,
  onSwipeBack,
  backLabel,
}: {
  experience: Experience;
  onBack: () => void;
  onSwipeBack?: () => void;
  backLabel?: string;
}) {
  const [activeSlide, setActiveSlide] = useState(0);
  const [mapExpanded, setMapExpanded] = useState(false);
  const [saved, setSaved] = useState(false);
  const [showCollectionSheet, setShowCollectionSheet] = useState(false);
  const [showShareSheet, setShowShareSheet] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const swipeTouchStart = useRef<{ x: number; y: number } | null>(null);
  const onBackRef = useRef(onBack);
  onBackRef.current = onBack;

  // Scroll to top on mount
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  // Block the native iOS edge-swipe back gesture without blocking taps.
  // We use a non-passive touchmove listener (not touchstart) so that a simple
  // tap on the back button still fires the click event normally.
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    let startX = 0;
    const onStart = (e: TouchEvent) => { startX = e.touches[0].clientX; };
    const onMove = (e: TouchEvent) => {
      if (startX >= 40) return;
      if (e.touches[0].clientX - startX > 8) e.preventDefault();
    };
    el.addEventListener("touchstart", onStart, { passive: true });
    el.addEventListener("touchmove", onMove, { passive: false });
    return () => {
      el.removeEventListener("touchstart", onStart);
      el.removeEventListener("touchmove", onMove);
    };
  }, []);

  // Sync saved state from localStorage on mount
  useEffect(() => {
    setSaved(getSaved().includes(experience.id));
  }, [experience.id]);

  const placesWithImages = experience.places_id.filter(
    (p) => (p.display_images?.length ?? 0) > 0 || (p.images?.length ?? 0) > 0
  );

  // Track active slide via scroll position
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const handleScroll = () => {
      const scrollLeft = el.scrollLeft;
      const cardWidth = el.firstElementChild
        ? (el.firstElementChild as HTMLElement).offsetWidth
        : 1;
      const index = Math.round(scrollLeft / (cardWidth + 8)); // 8 = gap-2
      setActiveSlide(Math.min(index, placesWithImages.length - 1));
    };
    el.addEventListener("scroll", handleScroll, { passive: true });
    return () => el.removeEventListener("scroll", handleScroll);
  }, [placesWithImages.length]);


  return (
    <div
      ref={containerRef}
      className="bg-white min-h-screen max-w-5xl mx-auto relative"
      onTouchStart={(e) => {
        const t = e.touches[0];
        if (t.clientX < 40) swipeTouchStart.current = { x: t.clientX, y: t.clientY };
      }}
      onTouchEnd={(e) => {
        if (!swipeTouchStart.current) return;
        const t = e.changedTouches[0];
        const dx = t.clientX - swipeTouchStart.current.x;
        const dy = Math.abs(t.clientY - swipeTouchStart.current.y);
        swipeTouchStart.current = null;
        if (dx > 60 && dy < 80) onBackRef.current();
      }}
    >
      {/* Header */}
      <header className="sticky top-0 z-10 bg-white">
        <div className="h-[44px]" />
        <div className="flex items-center gap-3 px-4 py-3 h-12">
          <button onClick={onBack} aria-label="Back" className="flex items-center gap-0.5 text-black">
            <ChevronLeft className="w-6 h-6" />
            {backLabel && <span className="text-sm font-medium">{backLabel}</span>}
          </button>
          <h1 className="flex-1 text-center text-lg font-medium text-black truncate">
            {experience.title}
          </h1>
          <button
            aria-label="Share"
            className="p-1"
            onClick={() => setShowShareSheet(true)}
          >
            <Send className="w-5 h-5 text-black" />
          </button>
        </div>
      </header>

      {/* Experience description subtitle */}
      <div className="px-4 pt-2 pb-4 flex items-start gap-3">
        <p className="flex-1 text-[13px] text-black leading-5">{experience.description}</p>
        <button
          onClick={() => {
            if (saved) {
              setSaved(toggleSaved(experience));
            } else {
              setShowCollectionSheet(true);
            }
          }}
          aria-label={saved ? "Unsave" : "Save"}
          className="shrink-0 w-9 h-9 flex items-center justify-center rounded-full bg-gray-100"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path
              d="M15.7 4C18.87 4 21 6.98 21 9.76C21 15.39 12.16 20 12 20C11.84 20 3 15.39 3 9.76C3 6.98 5.13 4 8.3 4C10.12 4 11.31 4.91 12 5.71C12.69 4.91 13.88 4 15.7 4Z"
              stroke={saved ? "#FB6983" : "#667085"}
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              fill={saved ? "#FB6983" : "none"}
            />
          </svg>
        </button>
      </div>

      {/* Scrollable content */}
      <div className="pb-4">
        {/* Swipeable location carousel: images + location description */}
        <div
          ref={scrollRef}
          className="flex overflow-x-auto hide-scrollbar snap-x snap-mandatory"
        >
          {placesWithImages.map((place) => {
            const details = place._location_details;
            const address = getFullAddress(place);
            return (
              <div key={place.id} className="snap-start shrink-0 w-full flex flex-col px-[22px]">
                <PlaceImageCard place={place} />
                <div className="mt-2 px-1">
                  <h3 className="text-base font-medium text-black">{place.name}</h3>
                  {place.neighborhood && (
                    <span className="text-xs text-gray-500">{place.neighborhood}</span>
                  )}
                  {details?.Description && details.Description !== "NA" && (
                    <p className="text-[13px] text-black leading-5 mt-1">
                      {details.Description}
                    </p>
                  )}
                  {/* Per-location details */}
                  {(details || address) && (
                    <div className="border border-[#eaecf0] rounded-2xl px-4 pt-2 pb-4 mt-3 flex flex-col gap-3">
                      <div className="flex flex-col gap-3">
                        {hasValue(details?.phone) && (
                          <div className="flex flex-col gap-0.5">
                            <span className="text-sm font-medium text-[#FF9A56]">Phone</span>
                            <a href={`tel:${details!.phone}`} className="text-[13px] text-black">
                              {details!.phone}
                            </a>
                          </div>
                        )}
                        {hasValue(details?.url) && (
                          <div className="flex flex-col gap-0.5">
                            <span className="text-sm font-medium text-[#FF9A56]">Website</span>
                            <a
                              href={details!.url!.startsWith("http") ? details!.url! : `https://${details!.url}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-[13px] text-blue-600 break-all"
                            >
                              {details!.url}
                            </a>
                          </div>
                        )}
                        {hasValue(address) && (
                          <div className="flex flex-col gap-0.5">
                            <span className="text-sm font-medium text-[#FF9A56]">Address</span>
                            <a
                              href={`https://maps.google.com/?q=${encodeURIComponent(address)}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-[13px] text-black underline"
                            >
                              {address}
                            </a>
                          </div>
                        )}
                        {hasValue(details?.operating_hours) && (
                          <div className="flex flex-col gap-0.5">
                            <span className="text-sm font-medium text-[#FF9A56]">Hours</span>
                            <span className="text-[13px] text-black whitespace-pre-line">{details!.operating_hours}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Dot indicators */}
        {placesWithImages.length > 1 && (
          <div className="flex items-center justify-center gap-1.5 py-3">
            {placesWithImages.map((_, i) => (
              <div
                key={i}
                className={`rounded-full transition-all ${
                  i === activeSlide
                    ? "w-2 h-2 bg-gray-900"
                    : "w-1.5 h-1.5 bg-gray-300"
                }`}
              />
            ))}
          </div>
        )}

        {/* Map */}
        <div className="px-4 flex flex-col gap-4">
          {/* Map */}
          <div className="relative">
            <div className="bg-white rounded-2xl shadow-[0px_4px_32px_0px_rgba(0,0,0,0.07)] overflow-hidden">
              <ExperienceMap places={experience.places_id} />
            </div>
            <button
              onClick={() => setMapExpanded(true)}
              className="absolute top-3 right-3 z-[1000] bg-white rounded-lg p-2 shadow-md"
              aria-label="Expand map"
            >
              <Maximize2 className="w-5 h-5 text-[#344054]" />
            </button>
          </div>

        </div>
      </div>

      {/* Fullscreen map overlay */}
      {mapExpanded && (
        <FullscreenMap
          places={experience.places_id}
          onClose={() => setMapExpanded(false)}
        />
      )}

      {showCollectionSheet && (
        <AddToCollectionSheet
          experienceId={experience.id}
          onFlatSave={() => setSaved(toggleSaved(experience))}
          onClose={() => setShowCollectionSheet(false)}
        />
      )}

      {showShareSheet && (
        <ShareSheet
          title="Share experience"
          subtitle={experience.title}
          shareUrl={typeof window !== "undefined" ? `${window.location.origin}/experience/${experience.id}` : undefined}
          shareTitle={experience.title}
          onClose={() => setShowShareSheet(false)}
          onSend={async (userIds) => {
            await Promise.all(
              userIds.map((userId) =>
                fetch(`/api/experiences/${experience.id}/share-to-user`, {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ recipient_user_id: userId }),
                })
              )
            );
          }}
        />
      )}
    </div>
  );
}
