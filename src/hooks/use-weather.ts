"use client";

import { useState, useEffect } from "react";
import type { WeatherCondition } from "@/lib/atmosphere-config";
import { getCurrentCoords, getLocationPermission } from "@/lib/geolocation";

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
    // Treat a null temp as a miss so we re-fetch. This self-heals stale caches
    // from before the WeatherKit repoint, when the dead OpenWeather path
    // returned (and cached) tempF: null for up to 30 minutes.
    if (tempF == null) return null;
    return Date.now() - ts < CACHE_TTL ? { condition, tempF } : null;
  } catch { return null; }
}

function writeCache(s: WeatherState) {
  try { localStorage.setItem(CACHE_KEY, JSON.stringify({ ...s, ts: Date.now() })); } catch {}
}

async function getCoords(): Promise<{ lat: number; lon: number }> {
  try {
    // Weather is passive: only use device location if it's ALREADY granted —
    // never prompt for it, so the prompt stays reserved for explicit user
    // gestures (the "Current Location" button on /plan). Fall back to NYC
    // otherwise. The shared helper uses native @capacitor/geolocation when the
    // plugin is in the running binary (persisted permission), and
    // navigator.geolocation everywhere else.
    if ((await getLocationPermission()) !== "granted") return NYC;
    const { lat, lng } = await getCurrentCoords({ timeout: 5000 });
    return { lat, lon: lng };
  } catch {
    return NYC;
  }
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
