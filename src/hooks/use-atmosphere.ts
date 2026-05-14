"use client";

import { useState, useEffect } from "react";
import { getTimeSlot, type TimeSlot } from "@/lib/atmosphere-config";
import { useWeather, type WeatherState } from "@/hooks/use-weather";

export interface AtmosphereState extends WeatherState {
  timeSlot: TimeSlot;
}

export function useAtmosphere(): AtmosphereState {
  const [timeSlot, setTimeSlot] = useState<TimeSlot>(() => getTimeSlot(new Date().getHours()));
  const weather = useWeather();

  useEffect(() => {
    const tick = () => setTimeSlot(getTimeSlot(new Date().getHours()));

    // Recalculate time slot on foreground (user may have crossed a bracket)
    const onVisible = () => { if (document.visibilityState === "visible") tick(); };
    document.addEventListener("visibilitychange", onVisible);

    // Schedule a tick at the top of the next hour, then every hour after that
    const now = new Date();
    const msToNextHour =
      (60 - now.getMinutes()) * 60_000 - now.getSeconds() * 1_000 - now.getMilliseconds();
    let intervalId: ReturnType<typeof setInterval>;
    const timeoutId = setTimeout(() => {
      tick();
      intervalId = setInterval(tick, 60 * 60_000);
    }, msToNextHour);

    return () => {
      document.removeEventListener("visibilitychange", onVisible);
      clearTimeout(timeoutId);
      clearInterval(intervalId);
    };
  }, []);

  return { timeSlot, ...weather };
}
