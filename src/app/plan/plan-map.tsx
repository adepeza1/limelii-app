"use client";

import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import type { Experience } from "@/app/page";

const NYC_CENTER: [number, number] = [40.7128, -74.006];

function getFirstCoords(exp: Experience): [number, number] | null {
  const p = (exp.places_id ?? [])[0];
  if (p?.latlong?.data) return [p.latlong.data.lat, p.latlong.data.lng];
  return null;
}

// Grid size in degrees based on zoom level — null means show individual pins
function gridSizeForZoom(zoom: number): number | null {
  if (zoom >= 13) return null;
  if (zoom >= 12) return 0.03;
  if (zoom >= 11) return 0.055;
  return 0.1;
}

interface Cluster {
  lat: number;
  lng: number;
  exps: Experience[];
}

function buildClusters(experiences: Experience[], gridSize: number): Cluster[] {
  const cells = new Map<string, Cluster>();
  for (const exp of experiences) {
    const coords = getFirstCoords(exp);
    if (!coords) continue;
    const [lat, lng] = coords;
    const kLat = Math.floor(lat / gridSize);
    const kLng = Math.floor(lng / gridSize);
    const key = `${kLat},${kLng}`;
    if (!cells.has(key)) {
      cells.set(key, {
        lat: (kLat + 0.5) * gridSize,
        lng: (kLng + 0.5) * gridSize,
        exps: [],
      });
    }
    cells.get(key)!.exps.push(exp);
  }
  return [...cells.values()];
}

function pinHtml(title: string): string {
  const safe = title.replace(/</g, "&lt;").replace(/>/g, "&gt;");
  return `
    <div style="transform:translate(-50%,-100%);display:flex;flex-direction:column;align-items:center;gap:2px;">
      <span style="background:rgba(0,0,0,0.65);color:#fff;font-size:10px;font-weight:500;padding:2px 7px;border-radius:20px;white-space:nowrap;line-height:1.5;max-width:130px;overflow:hidden;text-overflow:ellipsis;">${safe}</span>
      <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 40 40" fill="none">
        <path fill-rule="evenodd" clip-rule="evenodd" d="M21.3989 33.5691L21.3954 33.5727C20.9323 34.0451 20.4661 34.5205 20 35C19.5338 34.5205 19.0677 34.0451 18.6045 33.5727L18.6011 33.5692C13.2695 28.1312 8.33331 23.0965 8.33331 17C8.33331 10.3726 13.5567 5 20 5C26.4433 5 31.6666 10.3726 31.6666 17C31.6666 23.0965 26.7305 28.1312 21.3989 33.5691ZM20 21.6667C22.7614 21.6667 25 19.4281 25 16.6667C25 13.9052 22.7614 11.6667 20 11.6667C17.2386 11.6667 15 13.9052 15 16.6667C15 19.4281 17.2386 21.6667 20 21.6667Z" fill="#FF677E" stroke="white" stroke-width="0.8" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
    </div>
  `;
}

function clusterHtml(count: number): string {
  const size = count > 20 ? 52 : count > 10 ? 46 : 40;
  return `<div style="
    width:${size}px;height:${size}px;
    background:#FF677E;color:#fff;
    border-radius:50%;border:3px solid #fff;
    box-shadow:0 2px 10px rgba(0,0,0,0.3);
    display:flex;align-items:center;justify-content:center;
    font-weight:700;font-size:${count > 9 ? 13 : 15}px;
    transform:translate(-50%,-50%);
  ">${count}</div>`;
}

function redrawMarkers(
  map: L.Map,
  experiences: Experience[],
  markersRef: React.MutableRefObject<L.Layer[]>,
  onExpClick: (exp: Experience) => void
) {
  markersRef.current.forEach((m) => map.removeLayer(m));
  markersRef.current = [];

  if (experiences.length === 0) return;

  const zoom = map.getZoom();
  const gridSize = gridSizeForZoom(zoom);

  if (gridSize === null) {
    // Individual pins
    for (const exp of experiences) {
      const coords = getFirstCoords(exp);
      if (!coords) continue;
      const icon = L.divIcon({ className: "", html: pinHtml(exp.title), iconSize: [0, 0], iconAnchor: [0, 0] });
      const marker = L.marker(coords, { icon }).addTo(map);
      marker.on("click", () => onExpClick(exp));
      markersRef.current.push(marker);
    }
  } else {
    const clusters = buildClusters(experiences, gridSize);
    for (const cluster of clusters) {
      if (cluster.exps.length === 1) {
        // Single pin in cell — show as individual
        const exp = cluster.exps[0];
        const coords = getFirstCoords(exp);
        if (!coords) continue;
        const icon = L.divIcon({ className: "", html: pinHtml(exp.title), iconSize: [0, 0], iconAnchor: [0, 0] });
        const marker = L.marker(coords, { icon }).addTo(map);
        marker.on("click", () => onExpClick(exp));
        markersRef.current.push(marker);
      } else {
        // Cluster bubble
        const icon = L.divIcon({
          className: "",
          html: clusterHtml(cluster.exps.length),
          iconSize: [0, 0],
          iconAnchor: [0, 0],
        });
        const marker = L.marker([cluster.lat, cluster.lng], { icon }).addTo(map);
        marker.on("click", () => {
          const pts = cluster.exps.map(getFirstCoords).filter(Boolean) as [number, number][];
          if (pts.length) map.fitBounds(L.latLngBounds(pts), { padding: [60, 60], maxZoom: 14 });
        });
        markersRef.current.push(marker);
      }
    }
  }
}

export function PlanMap({
  experiences,
  onExperienceClick,
}: {
  experiences: Experience[];
  onExperienceClick: (exp: Experience) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markersRef = useRef<L.Layer[]>([]);
  const expRef = useRef(experiences);
  const clickRef = useRef(onExperienceClick);

  useEffect(() => { expRef.current = experiences; }, [experiences]);
  useEffect(() => { clickRef.current = onExperienceClick; }, [onExperienceClick]);

  // Init map once
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const map = L.map(containerRef.current, {
      zoomControl: false,
      attributionControl: false,
      center: NYC_CENTER,
      zoom: 11,
    });
    L.tileLayer("https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png", {
      subdomains: "abcd",
      maxZoom: 20,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
    }).addTo(map);

    map.on("zoomend", () => {
      redrawMarkers(map, expRef.current, markersRef, (exp) => clickRef.current(exp));
    });

    mapRef.current = map;
    return () => { map.remove(); mapRef.current = null; };
  }, []);

  // Redraw whenever experiences list changes
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    redrawMarkers(map, experiences, markersRef, onExperienceClick);
  }, [experiences, onExperienceClick]);

  return <div ref={containerRef} className="w-full h-full" />;
}
