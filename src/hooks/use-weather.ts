"use client";

import { useState, useEffect } from "react";
import type { WeatherCondition } from "@/lib/atmosphere-config";

const CACHE_KEY = "limelii_weather_v1";
const CACHE_TTL = 30 * 60 * 1000; // 30 minutes
const NYC = { lat: 40.7128, lon: -74.006 };

export interface WeatherState {
  condition: WeatherCondition;
  tempF: number | null;
}

function readCache(): WeatherState | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const { condition, tempF, ts } = JSON.parse(raw);
    return Date.now() - ts < CACHE_TTL ? { condition, tempF } : null;
  } catch { return null; }
}

function writeCache(s: WeatherState) {
  try { localStorage.setItem(CACHE_KEY, JSON.stringify({ ...s, ts: Date.now() })); } catch {}
}

async function getCoords(): Promise<{ lat: number; lon: number }> {
  if (!navigator?.geolocation) return NYC;
  // Don't trigger the iOS location prompt for background weather lookups.
  // Only read the precise location when the user has already granted
  // permission. Otherwise (denied / prompt / Permissions API absent) fall
  // back to NYC silently so the prompt is reserved for user gestures —
  // namely the "Locate me" button on /plan.
  if (!navigator.permissions?.query) return NYC;
  try {
    const result = await navigator.permissions.query({ name: "geolocation" as PermissionName });
    if (result.state !== "granted") return NYC;
  } catch {
    return NYC;
  }
  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      (p) => resolve({ lat: p.coords.latitude, lon: p.coords.longitude }),
      () => resolve(NYC),
      { timeout: 5000, maximumAge: 300_000 }
    );
  });
}

async function fetchFresh(): Promise<WeatherState> {
  try {
    const { lat, lon } = await getCoords();
    const res = await fetch(`/api/weather?lat=${lat}&lon=${lon}`);
    if (!res.ok) throw new Error();
    const data: WeatherState = await res.json();
    writeCache(data);
    return data;
  } catch {
    return { condition: "clear", tempF: null };
  }
}

export function useWeather(): WeatherState {
  const [state, setState] = useState<WeatherState>({ condition: "clear", tempF: null });

  useEffect(() => {
    (async () => {
      const cached = readCache();
      if (cached) { setState(cached); return; }
      setState(await fetchFresh());
    })();

    const onVisible = async () => {
      if (document.visibilityState !== "visible") return;
      if (!readCache()) setState(await fetchFresh());
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, []);

  return state;
}
