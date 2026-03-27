"use client";

import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import type { Experience } from "@/app/page";

function getFirstCoords(exp: Experience): [number, number] | null {
  const firstPlace = (exp.places_id ?? [])[0];
  if (firstPlace?.latlong?.data) {
    return [firstPlace.latlong.data.lat, firstPlace.latlong.data.lng];
  }
  return null;
}

const NYC_CENTER: [number, number] = [40.7128, -74.006];

export function PlanMap({ experiences }: { experiences: Experience[] }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markersRef = useRef<L.Marker[]>([]);

  // Initialize map once
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const map = L.map(containerRef.current, {
      zoomControl: false,
      attributionControl: false,
      center: NYC_CENTER,
      zoom: 11,
    });
    L.tileLayer("https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}", {
      attribution: "&copy; Google",
    }).addTo(map);
    mapRef.current = map;
    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Update markers when experiences change
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];

    const points: [number, number][] = [];

    experiences.forEach((exp) => {
      const coords = getFirstCoords(exp);
      if (!coords) return;
      points.push(coords);

      const safeName = exp.title.replace(/</g, "&lt;").replace(/>/g, "&gt;");
      const icon = L.divIcon({
        className: "",
        html: `
          <div style="transform:translate(-50%,-100%);display:flex;flex-direction:column;align-items:center;gap:2px;">
            <span style="background:rgba(0,0,0,0.65);color:#fff;font-size:10px;font-weight:500;padding:2px 7px;border-radius:20px;white-space:nowrap;line-height:1.5;max-width:130px;overflow:hidden;text-overflow:ellipsis;">${safeName}</span>
            <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 40 40" fill="none">
              <path fill-rule="evenodd" clip-rule="evenodd" d="M21.3989 33.5691L21.3954 33.5727C20.9323 34.0451 20.4661 34.5205 20 35C19.5338 34.5205 19.0677 34.0451 18.6045 33.5727L18.6011 33.5692C13.2695 28.1312 8.33331 23.0965 8.33331 17C8.33331 10.3726 13.5567 5 20 5C26.4433 5 31.6666 10.3726 31.6666 17C31.6666 23.0965 26.7305 28.1312 21.3989 33.5691ZM20 21.6667C22.7614 21.6667 25 19.4281 25 16.6667C25 13.9052 22.7614 11.6667 20 11.6667C17.2386 11.6667 15 13.9052 15 16.6667C15 19.4281 17.2386 21.6667 20 21.6667Z" fill="#FF677E" stroke="white" stroke-width="0.8" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </div>
        `,
        iconSize: [0, 0],
        iconAnchor: [0, 0],
      });

      const marker = L.marker(coords, { icon }).addTo(map);
      markersRef.current.push(marker);
    });

    if (points.length > 0) {
      const bounds = L.latLngBounds(points);
      map.fitBounds(bounds, { padding: [80, 80], maxZoom: 13 });
    } else {
      map.setView(NYC_CENTER, 11);
    }
  }, [experiences]);

  return (
    <div
      ref={containerRef}
      className="w-full h-full"
      style={{ filter: "saturate(0.65) brightness(1.03)" }}
    />
  );
}
