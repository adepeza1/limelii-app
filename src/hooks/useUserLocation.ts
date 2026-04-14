"use client";

import { useState, useEffect } from "react";

export type LocationState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "granted"; lat: number; lng: number }
  | { status: "denied" }
  | { status: "unavailable" };

export function useUserLocation(): [LocationState, () => void] {
  const [location, setLocation] = useState<LocationState>({ status: "idle" });

  function request() {
    if (!navigator?.geolocation) {
      setLocation({ status: "unavailable" });
      return;
    }
    setLocation({ status: "loading" });
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocation({
          status: "granted",
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
        });
      },
      (err) => {
        if (err.code === err.PERMISSION_DENIED) {
          setLocation({ status: "denied" });
        } else {
          setLocation({ status: "unavailable" });
        }
      },
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 300000 }
    );
  }

  // Auto-request if permission was previously granted (no prompt shown)
  useEffect(() => {
    if (!navigator?.permissions) return;
    navigator.permissions.query({ name: "geolocation" }).then((result) => {
      if (result.state === "granted") request();
    }).catch(() => { /* permissions API unavailable */ });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return [location, request];
}
