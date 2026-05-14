export type TimeSlot = "morning" | "day" | "sunset" | "night" | "lateNight" | "dawn";
export type WeatherCondition = "clear" | "rain" | "snow";

export function getTimeSlot(hour: number): TimeSlot {
  if (hour >= 23 || hour < 2)  return "lateNight"; // 11pm–1:59am
  if (hour >= 2  && hour < 6)  return "dawn";      // 2am–5:59am
  if (hour >= 6  && hour < 11) return "morning";   // 6am–10:59am
  if (hour >= 11 && hour < 17) return "day";       // 11am–4:59pm
  if (hour >= 17 && hour < 19) return "sunset";    // 5pm–6:59pm
  return "night";                                  // 7pm–10:59pm
}

// PM-editable copy table — can be moved to remote config without eng changes
export const GREETING_COPY: Record<TimeSlot, string> = {
  morning:   "Morning. Where to?",
  day:       "Free this afternoon?",
  sunset:    "Golden hour. Where to?",
  night:     "Free tonight?",
  lateNight: "Still up?",
  dawn:      "Up early?",
};

// Tint gradients — max effective opacity ~17–18% across all states
// Weather conditions take precedence over time-of-day when rendering
export const TINT_GRADIENTS: Record<TimeSlot | Exclude<WeatherCondition, "clear">, string> = {
  morning:   "radial-gradient(ellipse 80% 55% at 50% 0%, rgba(255, 235, 170, 0.17) 0%, transparent 100%)",
  day:       "radial-gradient(ellipse 100% 100% at 50% 50%, rgba(255, 248, 210, 0.12) 0%, transparent 100%)",
  sunset:    "radial-gradient(ellipse 80% 55% at 50% 100%, rgba(255, 148, 48, 0.18) 0%, transparent 100%)",
  night:     "radial-gradient(ellipse 55% 70% at 0% 50%, rgba(44, 37, 100, 0.14) 0%, transparent 60%), radial-gradient(ellipse 55% 70% at 100% 50%, rgba(44, 37, 100, 0.14) 0%, transparent 60%)",
  lateNight: "radial-gradient(ellipse 65% 65% at 0% 0%, rgba(44, 30, 110, 0.16) 0%, transparent 70%), radial-gradient(ellipse 65% 65% at 100% 100%, rgba(110, 32, 94, 0.12) 0%, transparent 70%)",
  dawn:      "radial-gradient(ellipse 80% 55% at 50% 0%, rgba(255, 205, 196, 0.10) 0%, transparent 100%)",
  rain:      "radial-gradient(ellipse 100% 80% at 50% 0%, rgba(48, 62, 88, 0.17) 0%, transparent 100%)",
  snow:      "radial-gradient(ellipse 100% 80% at 50% 0%, rgba(176, 204, 234, 0.14) 0%, transparent 100%)",
};
