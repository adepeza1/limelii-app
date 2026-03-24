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

    L.tileLayer("https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}", {
      attribution: "&copy; Google",
    }).addTo(map);

    L.control
      .attribution({ position: "bottomleft", prefix: false })
      .addTo(map);

    const bounds = L.latLngBounds(points.map((p) => p.coords));

    points.forEach(({ coords }) => {
      const icon = L.divIcon({
        className: "",
        html: `
          <div style="transform:translate(-50%,-100%);">
            <svg width="22" height="28" viewBox="0 0 36 44" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M18 0C8.059 0 0 8.059 0 18c0 11.25 18 26 18 26S36 29.25 36 18C36 8.059 27.941 0 18 0z" fill="#FB6983"/>
              <circle cx="18" cy="18" r="7" fill="white"/>
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
