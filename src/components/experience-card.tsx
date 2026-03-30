"use client";

import { useState, useRef, useEffect } from "react";
import Image from "next/image";
import type { Experience, Place } from "@/app/page";
import { AddToCollectionSheet } from "./add-to-collection-sheet";
import { saveExperience, unsaveExperience } from "@/lib/saved";

function getPlaceImage(place: Place): string | null {
  if (place.display_images && place.display_images.length > 0) {
    return place.display_images[0].url;
  }
  return null;
}

function getPlaceLocation(place: Place): string {
  if (place.neighborhood) return place.neighborhood;
  if (place.borough) return place.borough;
  return "";
}

export function ExperienceCard({
  experience,
  onClick,
  className = "",
  compact = false,
  onUnsave,
}: {
  experience: Experience;
  onClick?: () => void;
  className?: string;
  compact?: boolean;
  onUnsave?: (id: number) => void;
}) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [visible, setVisible] = useState(false);
  const [saved, setSaved] = useState(false);
  const [showCollectionSheet, setShowCollectionSheet] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  const SAVED_KEY = "limelii_saved_items";

  useEffect(() => {
    try {
      const items = JSON.parse(localStorage.getItem(SAVED_KEY) ?? "{}");
      setSaved(!!items[experience.id]);
    } catch { /* ignore */ }
  }, [experience.id]);

  function flatSave() {
    // Update localStorage for instant UI
    try {
      const items = JSON.parse(localStorage.getItem(SAVED_KEY) ?? "{}");
      items[experience.id] = experience;
      localStorage.setItem(SAVED_KEY, JSON.stringify(items));
    } catch { /* ignore */ }
    setSaved(true);
    // Persist to server (fire and forget — localStorage is source of truth for UI)
    saveExperience(experience.id).catch(() => { /* ignore */ });
  }

  function toggleSave(e: React.MouseEvent) {
    e.stopPropagation();
    if (saved) {
      // Unsave
      try {
        const items = JSON.parse(localStorage.getItem(SAVED_KEY) ?? "{}");
        delete items[experience.id];
        localStorage.setItem(SAVED_KEY, JSON.stringify(items));
      } catch { /* ignore */ }
      setSaved(false);
      onUnsave?.(experience.id);
      // Remove from server (fire and forget)
      unsaveExperience(experience.id).catch(() => { /* ignore */ });
    } else {
      // Open sheet to choose flat save or collection
      setShowCollectionSheet(true);
    }
  }

  useEffect(() => {
    const el = cardRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => setVisible(entry.isIntersecting),
      { rootMargin: "200px" }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const placesWithImages = experience.places_id.filter(
    (p) => p.display_images && p.display_images.length > 0
  );

  const activePlace =
    placesWithImages[activeIndex] ?? experience.places_id[0];
  const mainImage = activePlace ? getPlaceImage(activePlace) : null;
  const location = activePlace ? getPlaceLocation(activePlace) : "";
  const placeCount = experience.places_id.length;

  return (
    <div
      ref={cardRef}
      className={`shrink-0 aspect-[33/38] rounded-[20px] overflow-hidden relative bg-gray-200 cursor-pointer ${compact ? "w-full" : "w-[280px] sm:w-[330px] md:w-full"} ${className}`}
      onClick={showCollectionSheet ? undefined : onClick}
    >
      {/* Main image – only rendered when near viewport */}
      {visible && mainImage && (
        <Image
          src={mainImage}
          alt={experience.title}
          fill
          className="object-cover"
          sizes="(max-width: 640px) 280px, (max-width: 768px) 330px, 50vw"
        />
      )}

      {/* Save button – top-right */}
      <button
        onClick={toggleSave}
        aria-label={saved ? "Unsave" : "Save"}
        className="absolute top-3 right-3 z-[2] w-9 h-9 flex items-center justify-center rounded-full bg-black/30 backdrop-blur-sm"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path
            d="M15.7 4C18.87 4 21 6.98 21 9.76C21 15.39 12.16 20 12 20C11.84 20 3 15.39 3 9.76C3 6.98 5.13 4 8.3 4C10.12 4 11.31 4.91 12 5.71C12.69 4.91 13.88 4 15.7 4Z"
            stroke="white"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            fill={saved ? "white" : "none"}
          />
        </svg>
      </button>

      {/* Inset place thumbnails – bottom-right box */}
      {visible && placesWithImages.length > 1 && (
        <div className="absolute right-3 bottom-3 z-[1] bg-black/30 backdrop-blur-sm rounded-2xl p-1.5 flex flex-col gap-1.5">
          {(compact ? placesWithImages.slice(0, 2) : placesWithImages).map((place, i) => {
            const thumbUrl = getPlaceImage(place);
            if (!thumbUrl) return null;
            const isOverflow = compact ? (i === 1 && placesWithImages.length > 2) : (i === 3 && placesWithImages.length > 4);
            return (
              <button
                key={place.id}
                onClick={(e) => { e.stopPropagation(); setActiveIndex(i); }}
                className={`${compact ? "w-8 h-8" : "w-10 h-10 sm:w-[52px] sm:h-[52px]"} rounded-lg overflow-hidden border-2 shadow-md relative ${i === activeIndex ? "border-white" : "border-white/60"}`}
              >
                <Image
                  src={thumbUrl}
                  alt={place.name}
                  width={52}
                  height={52}
                  className="object-cover w-full h-full"
                />
                {isOverflow && (
                  <div className="absolute inset-0 bg-black/50 flex items-center justify-center rounded-xl">
                    <span className="text-white text-[10px] font-bold">+{placesWithImages.length - 2}</span>
                  </div>
                )}
              </button>
            );
          })}
        </div>
      )}

      {/* Bottom info overlay */}
      <div className={`absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 to-transparent p-3 pt-10 ${placesWithImages.length > 1 ? "pr-16" : ""}`}>
        <div className="flex items-center gap-2 mb-2">
          {placeCount > 0 && (
            <span className="text-white/80 text-xs">
              {placeCount} {placeCount === 1 ? "option" : "options"}
            </span>
          )}
          {experience.rating > 0 && (
            <span className="bg-green-600 text-white text-xs font-medium px-2 py-0.5 rounded-full">
              {experience.rating.toFixed(1)}
            </span>
          )}
        </div>
        <h3 className="text-white text-sm font-semibold leading-tight line-clamp-2">
          {experience.title}
        </h3>
        {location && (
          <p className="text-white/70 text-xs flex items-center gap-1 mt-0.5 truncate">
            <svg
              width="12"
              height="12"
              viewBox="0 0 12 12"
              fill="none"
              className="shrink-0"
            >
              <path
                d="M6 1C3.79 1 2 2.79 2 5C2 7.75 6 11 6 11C6 11 10 7.75 10 5C10 2.79 8.21 1 6 1ZM6 6.5C5.17 6.5 4.5 5.83 4.5 5C4.5 4.17 5.17 3.5 6 3.5C6.83 3.5 7.5 4.17 7.5 5C7.5 5.83 6.83 6.5 6 6.5Z"
                fill="currentColor"
              />
            </svg>
            {location}
          </p>
        )}
      </div>

      {showCollectionSheet && (
        <AddToCollectionSheet
          experienceId={experience.id}
          onFlatSave={flatSave}
          onClose={() => setShowCollectionSheet(false)}
        />
      )}
    </div>
  );
}
