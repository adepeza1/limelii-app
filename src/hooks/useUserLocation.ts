"use client";

import { useState, useEffect } from "react";
import { getCurrentCoords, getLocationPermission } from "@/lib/geolocation";

export type LocationState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "granted"; lat: number; lng: number }
  | { status: "denied" }
  | { status: "unavailable" };

export function useUserLocation(): [LocationState, () => void] {
  const [location, setLocation] = useState<LocationState>({ status: "idle" });

  function request() {
    setLocation({ status: "loading" });
    getCurrentCoords()
      .then(({ lat, lng }) => setLocation({ status: "granted", lat, lng }))
      .catch((err: unknown) => {
        const code = (err as GeolocationPositionError)?.code;
        const msg = (err as Error)?.message ?? "";
        if (code === 1 || /denied/i.test(msg)) setLocation({ status: "denied" });
        else setLocation({ status: "unavailable" });
      });
  }

  // Auto-request only if permission was previously granted (no prompt shown)
  useEffect(() => {
    getLocationPermission().then((state) => {
      if (state === "granted") request();
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return [location, request];
}
