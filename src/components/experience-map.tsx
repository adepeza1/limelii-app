"use client";

import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import type { Place } from "@/app/page";

function getCoords(place: Place): [number, number] | null {
  if (place.latlong?.data) {
    return [place.latlong.data.lat, place.latlong.data.lng];
  }
  return null;
}

function getPlaceImage(place: Place): string | null {
  if (place.display_images && place.display_images.length > 0) {
    return place.display_images[0].url;
  }
  return null;
}

function useLeafletMap(
  containerRef: React.RefObject<HTMLDivElement | null>,
  places: Place[]
) {
  const mapInstanceRef = useRef<L.Map | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    // Clean up any existing instance first
    if (mapInstanceRef.current) {
      mapInstanceRef.current.remove();
      mapInstanceRef.current = null;
    }

    const points = places
      .map((p) => ({ place: p, coords: getCoords(p) }))
      .filter(
        (p): p is { place: Place; coords: [number, number] } =>
          p.coords !== null
      );

    if (points.length === 0) return;

    const map = L.map(containerRef.current, {
      zoomControl: false,
      attributionControl: false,
    });
    mapInstanceRef.current = map;

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "&copy; OpenStreetMap contributors",
    }).addTo(map);

    L.control
      .attribution({ position: "bottomleft", prefix: false })
      .addTo(map);

    const bounds = L.latLngBounds(points.map((p) => p.coords));

    points.forEach(({ place, coords }) => {
      const label = place.name;
      const imageUrl = getPlaceImage(place);
      const imgHtml = imageUrl
        ? `<img src="${imageUrl}" style="width:30px;height:30px;object-fit:cover;display:block;border-radius:6px 0 0 6px;flex-shrink:0;" alt="" />`
        : "";
      const icon = L.divIcon({
        className: "",
        html: `
          <div style="display:flex;flex-direction:column;align-items:center;transform:translate(-50%,-100%);">
            <div style="background:#101828;border-radius:${imageUrl ? "6px" : "45px"};overflow:hidden;white-space:nowrap;display:inline-flex;align-items:center;">
              ${imgHtml}
              <span style="color:#fff;font-size:10px;font-weight:500;padding:4px 10px;">${label}</span>
            </div>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="#101828" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5a2.5 2.5 0 110-5 2.5 2.5 0 010 5z"/>
            </svg>
          </div>
        `,
        iconSize: [0, 0],
        iconAnchor: [0, 0],
      });
      L.marker(coords, { icon }).addTo(map);
    });

    map.fitBounds(bounds, { padding: [50, 50], maxZoom: 14 });

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, [containerRef, places]);
}

export function ExperienceMap({ places }: { places: Place[] }) {
  const mapRef = useRef<HTMLDivElement>(null);
  useLeafletMap(mapRef, places);
  return <div ref={mapRef} className="w-full h-[320px] rounded-xl" />;
}

export function FullscreenMap({
  places,
  onClose,
}: {
  places: Place[];
  onClose: () => void;
}) {
  const mapRef = useRef<HTMLDivElement>(null);
  useLeafletMap(mapRef, places);

  return (
    <div className="fixed inset-0 z-[9990] bg-white">
      <div ref={mapRef} className="w-full h-full" />
      <button
        onClick={onClose}
        className="absolute top-12 right-4 z-[1000] bg-white rounded-lg p-2 shadow-md"
        aria-label="Close map"
      >
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="#344054"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <line x1="18" y1="6" x2="6" y2="18" />
          <line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      </button>
    </div>
  );
}
