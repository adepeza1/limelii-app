"use client";

import { useState, useRef, useEffect } from "react";
import Image from "next/image";
import { ChevronLeft, MoreVertical, Plus, Star, Maximize2 } from "lucide-react";

const SAVED_KEY = "limelii_saved";

function getSaved(): number[] {
  if (typeof window === "undefined") return [];
  try { return JSON.parse(localStorage.getItem(SAVED_KEY) ?? "[]"); } catch { return []; }
}

const SAVED_ITEMS_KEY = "limelii_saved_items";

function getSavedItems(): Record<string, Experience> {
  if (typeof window === "undefined") return {};
  try { return JSON.parse(localStorage.getItem(SAVED_ITEMS_KEY) ?? "{}"); } catch { return {}; }
}

function toggleSaved(experience: Experience): boolean {
  const ids = getSaved();
  const items = getSavedItems();
  const idx = ids.indexOf(experience.id);
  if (idx === -1) {
    ids.push(experience.id);
    items[experience.id] = experience;
  } else {
    ids.splice(idx, 1);
    delete items[experience.id];
  }
  localStorage.setItem(SAVED_KEY, JSON.stringify(ids));
  localStorage.setItem(SAVED_ITEMS_KEY, JSON.stringify(items));
  return idx === -1;
}
import dynamic from "next/dynamic";
import type { Experience, Place } from "@/app/page";

const ExperienceMap = dynamic(
  () => import("./experience-map").then((m) => m.ExperienceMap),
  { ssr: false, loading: () => <div className="w-full h-[320px] bg-gray-100 rounded-xl" /> }
);

const FullscreenMap = dynamic(
  () => import("./experience-map").then((m) => m.FullscreenMap),
  { ssr: false }
);

function getPlaceImage(place: Place): string | null {
  if (place.display_images && place.display_images.length > 0) {
    return place.display_images[0].url;
  }
  return null;
}

function getFullAddress(place: Place): string {
  if (place.address) return place.address;
  const parts = [place.address_line_1, place.city, place.state, place.zipcode].filter(Boolean);
  return parts.join(", ");
}

function hasValue(val: string | null | undefined): val is string {
  return !!val && val.trim() !== "" && val.trim().toUpperCase() !== "NA";
}

function StarRating({ rating }: { rating: number }) {
  const fullStars = Math.floor(rating);
  const hasHalf = rating - fullStars >= 0.5;
  return (
    <div className="flex items-center gap-[2px]">
      {Array.from({ length: 5 }).map((_, i) => (
        <Star
          key={i}
          className="w-4 h-4"
          fill={i < fullStars || (i === fullStars && hasHalf) ? "#facc15" : "none"}
          stroke={i < fullStars || (i === fullStars && hasHalf) ? "#facc15" : "#9ca3af"}
          strokeWidth={1.5}
        />
      ))}
    </div>
  );
}

function PlaceImageCard({
  place,
  rating,
}: {
  place: Place;
  rating: number;
}) {
  const images = (place.display_images || []).slice(0, 4).map((img) => img.url);
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);
  if (images.length === 0) return null;

  return (
    <div className="shrink-0 w-[85vw] max-w-[330px] aspect-[33/38] rounded-2xl overflow-hidden relative bg-gray-200">
      {images.length === 1 ? (
        <Image
          src={images[0]}
          alt={place.name}
          fill
          className="object-cover"
          sizes="(max-width: 640px) 85vw, 330px"
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
            sizes="(max-width: 640px) 85vw, 330px"
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
                sizes="(max-width: 640px) 42vw, 165px"
              />
            </button>
          ))}
        </div>
      )}
      {/* Bottom overlay with rating */}
      {expandedIndex === null && (
        <div className="absolute inset-x-0 bottom-0 p-4">
          <div className="backdrop-blur-[10px] bg-black/20 rounded-2xl px-4 py-3 flex items-center gap-4">
            <div className="flex flex-col gap-[2px]">
              <span className="text-white text-xs font-medium">234 people rated</span>
              <div className="flex items-center gap-1.5">
                <StarRating rating={rating} />
                <span className="text-white text-sm font-medium">{rating.toFixed(1)}</span>
              </div>
            </div>
            <button className="bg-[#416f7b] rounded-lg p-[2px] ml-auto">
              <Plus className="w-6 h-6 text-white" strokeWidth={2} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export function ExperienceDetail({
  experience,
  onBack,
}: {
  experience: Experience;
  onBack: () => void;
}) {
  const [activeSlide, setActiveSlide] = useState(0);
  const [mapExpanded, setMapExpanded] = useState(false);
  const [saved, setSaved] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Sync saved state from localStorage on mount
  useEffect(() => {
    setSaved(getSaved().includes(experience.id));
  }, [experience.id]);

  const placesWithImages = experience.places_id.filter(
    (p) => p.display_images && p.display_images.length > 0
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
    <div className="bg-white min-h-screen max-w-5xl mx-auto relative">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-white">
        <div className="h-[44px]" />
        <div className="flex items-center gap-3 px-4 py-3 h-12">
          <button onClick={onBack} aria-label="Back">
            <ChevronLeft className="w-6 h-6 text-black" />
          </button>
          <h1 className="flex-1 text-center text-lg font-medium text-black truncate">
            {experience.title}
          </h1>
          <button aria-label="More options">
            <MoreVertical className="w-6 h-6 text-black" />
          </button>
        </div>
      </header>

      {/* Experience description subtitle */}
      <div className="px-4 pt-2 pb-4 flex items-start gap-3">
        <p className="flex-1 text-sm text-gray-600 leading-5">{experience.description}</p>
        <button
          onClick={() => setSaved(toggleSaved(experience))}
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
          className="flex gap-2 overflow-x-auto hide-scrollbar pl-[22px] pr-4 snap-x snap-mandatory"
        >
          {placesWithImages.map((place) => {
            const details = place._location_details;
            const address = getFullAddress(place);
            return (
              <div key={place.id} className="snap-start shrink-0 w-[85vw] max-w-[330px] flex flex-col">
                <PlaceImageCard place={place} rating={experience.rating} />
                <div className="mt-2 px-1">
                  <h3 className="text-base font-medium text-black">{place.name}</h3>
                  {place.neighborhood && (
                    <span className="text-xs text-gray-500">{place.neighborhood}</span>
                  )}
                  {details?.Description && (
                    <p className="text-sm text-gray-600 leading-5 mt-1">
                      {details.Description}
                    </p>
                  )}
                  {/* Per-location details */}
                  {(details || address) && (
                    <div className="border border-[#eaecf0] rounded-2xl px-4 pt-2 pb-4 mt-3 flex flex-col gap-3">
                      <h4 className="text-base font-medium text-[#1d2939]">Details</h4>
                      <div className="flex flex-col gap-3">
                        {hasValue(details?.phone) && (
                          <div className="flex flex-col gap-0.5">
                            <span className="text-sm font-medium text-[#c2550a]">Phone</span>
                            <a href={`tel:${details!.phone}`} className="text-sm text-black">
                              {details!.phone}
                            </a>
                          </div>
                        )}
                        {hasValue(details?.url) && (
                          <div className="flex flex-col gap-0.5">
                            <span className="text-sm font-medium text-[#c2550a]">Website</span>
                            <a
                              href={details!.url!.startsWith("http") ? details!.url! : `https://${details!.url}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-sm text-blue-600 break-all"
                            >
                              {details!.url}
                            </a>
                          </div>
                        )}
                        {hasValue(address) && (
                          <div className="flex flex-col gap-0.5">
                            <span className="text-sm font-medium text-[#c2550a]">Address</span>
                            <a
                              href={`https://maps.google.com/?q=${encodeURIComponent(address)}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-sm text-black underline"
                            >
                              {address}
                            </a>
                          </div>
                        )}
                        {hasValue(details?.operating_hours) && (
                          <div className="flex flex-col gap-0.5">
                            <span className="text-sm font-medium text-[#c2550a]">Hours</span>
                            <span className="text-sm text-black whitespace-pre-line">{details!.operating_hours}</span>
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

    </div>
  );
}
