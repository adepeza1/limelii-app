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

    points.forEach(({ place, coords }) => {
      const icon = L.divIcon({
        className: "",
        html: `
          <div style="transform:translate(-50%,-100%);display:flex;flex-direction:column;align-items:center;gap:2px;">
            <span style="background:rgba(0,0,0,0.65);color:#fff;font-size:10px;font-weight:500;padding:2px 7px;border-radius:20px;white-space:nowrap;line-height:1.5;">${place.name}</span>
            <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 40 40" fill="none">
              <path fill-rule="evenodd" clip-rule="evenodd" d="M21.3989 33.5691L21.3954 33.5727C20.9323 34.0451 20.4661 34.5205 20 35C19.5338 34.5205 19.0677 34.0451 18.6045 33.5727L18.6011 33.5692C13.2695 28.1312 8.33331 23.0965 8.33331 17C8.33331 10.3726 13.5567 5 20 5C26.4433 5 31.6666 10.3726 31.6666 17C31.6666 23.0965 26.7305 28.1312 21.3989 33.5691ZM20 21.6667C22.7614 21.6667 25 19.4281 25 16.6667C25 13.9052 22.7614 11.6667 20 11.6667C17.2386 11.6667 15 13.9052 15 16.6667C15 19.4281 17.2386 21.6667 20 21.6667Z" fill="#FF677E" stroke="white" stroke-width="0.8" stroke-linecap="round" stroke-linejoin="round"/>
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
