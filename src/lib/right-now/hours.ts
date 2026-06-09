// Parse the Google-style operating_hours string Xano stores on a place and
// answer "is it open right now (NYC time)?" + when it closes.
//
// Example input:
//   "Monday: 6:00 PM – 1:00 AM\nTuesday: 5:00 PM – 4:00 AM\nWednesday: Closed"
//
// Handles: the en-dash separator, AM/PM, overnight wraps (close < open ⇒ closes
// after midnight), comma-separated multiple ranges per day, "Closed", and empty.

const DAY_INDEX: Record<string, number> = {
  sunday: 0, monday: 1, tuesday: 2, wednesday: 3, thursday: 4, friday: 5, saturday: 6,
};

interface Interval {
  open: number; // minutes from midnight
  close: number; // minutes from midnight; may be < open for overnight
}

function parseClock(raw: string): number | null {
  const m = raw.trim().match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (!m) return null;
  let h = parseInt(m[1], 10);
  const min = parseInt(m[2], 10);
  const ampm = m[3].toUpperCase();
  if (ampm === "PM" && h !== 12) h += 12;
  if (ampm === "AM" && h === 12) h = 0;
  return h * 60 + min;
}

/** weekday (0=Sun..6=Sat) → list of open intervals */
export function parseHours(str: string): Record<number, Interval[]> {
  const byDay: Record<number, Interval[]> = {};
  if (!str) return byDay;
  for (const line of str.split("\n")) {
    const idx = line.indexOf(":");
    if (idx === -1) continue;
    const dayName = line.slice(0, idx).trim().toLowerCase();
    const day = DAY_INDEX[dayName];
    if (day === undefined) continue;
    const rest = line.slice(idx + 1).trim();
    if (!rest || /closed/i.test(rest)) {
      byDay[day] = byDay[day] ?? [];
      continue;
    }
    // Split multiple ranges: "11:00 AM – 3:00 PM, 5:00 PM – 10:00 PM"
    for (const rangeRaw of rest.split(",")) {
      const range = rangeRaw.replace(/[–—]/g, "-"); // normalize dashes
      const parts = range.split("-");
      if (parts.length !== 2) continue;
      const open = parseClock(parts[0]);
      const close = parseClock(parts[1]);
      if (open === null || close === null) continue;
      (byDay[day] ??= []).push({ open, close });
    }
  }
  return byDay;
}

interface NowParts {
  day: number; // 0=Sun..6=Sat
  minutes: number; // minutes from midnight
}

export function nycNowParts(date = new Date()): NowParts {
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    weekday: "short",
    hour: "numeric",
    minute: "numeric",
    hour12: false,
  });
  const parts = fmt.formatToParts(date);
  const wd = parts.find((p) => p.type === "weekday")?.value ?? "Sun";
  const hour = parseInt(parts.find((p) => p.type === "hour")?.value ?? "0", 10) % 24;
  const minute = parseInt(parts.find((p) => p.type === "minute")?.value ?? "0", 10);
  const dayMap: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
  return { day: dayMap[wd] ?? 0, minutes: hour * 60 + minute };
}

function fmtClock(mins: number): string {
  const m = ((mins % 1440) + 1440) % 1440;
  let h = Math.floor(m / 60);
  const min = m % 60;
  const ampm = h >= 12 ? "PM" : "AM";
  h = h % 12;
  if (h === 0) h = 12;
  return `${h}:${String(min).padStart(2, "0")} ${ampm}`;
}

export interface OpenState {
  openNow: boolean;
  closesAt?: string; // formatted, e.g. "11:00 PM"
}

/** Is the venue open right now (NYC time)? */
export function isOpenNow(hoursStr: string, date = new Date()): OpenState {
  const byDay = parseHours(hoursStr);
  const { day, minutes } = nycNowParts(date);

  // Intervals that start today.
  for (const itv of byDay[day] ?? []) {
    if (itv.close >= itv.open) {
      if (minutes >= itv.open && minutes < itv.close) return { openNow: true, closesAt: fmtClock(itv.close) };
    } else {
      // Overnight: open from itv.open until midnight (continues tomorrow).
      if (minutes >= itv.open) return { openNow: true, closesAt: fmtClock(itv.close) };
    }
  }
  // Overnight interval that started yesterday and spills into this morning.
  const prev = (day + 6) % 7;
  for (const itv of byDay[prev] ?? []) {
    if (itv.close < itv.open && minutes < itv.close) return { openNow: true, closesAt: fmtClock(itv.close) };
  }
  return { openNow: false };
}
