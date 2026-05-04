// Shared username validation. Used by both the client (for instant
// feedback as the user types) and the BFF routes (so the same rule
// can't be bypassed by hitting Xano directly).

const RESERVED = new Set([
  // Brand / company / staff
  "limelii", "limeli", "limelii_official", "official", "support",
  "help", "team", "staff", "founder", "ceo", "owner",
  // Roles / system
  "admin", "administrator", "root", "system", "moderator", "mod",
  "security", "bot", "service", "operator",
  // Routing / reserved
  "api", "auth", "login", "logout", "signup", "register",
  "settings", "profile", "account", "user", "users", "me",
  "www", "null", "undefined", "true", "false",
  // Generic things people impersonate
  "info", "contact", "noreply", "test",
]);

// Common profanity / slurs. Substring match after light leetspeak
// normalization. Kept short and conservative — tune as needed.
const PROFANITY = [
  "fuck", "shit", "bitch", "asshole", "dick", "cock", "pussy",
  "cunt", "slut", "whore", "faggot", "fag", "nigger", "nigga",
  "retard", "rape", "nazi", "kike", "tranny",
];

function normalizeForProfanity(s: string): string {
  return s
    .toLowerCase()
    .replace(/_/g, "") // strip underscores so "f_u_c_k" doesn't sneak through
    .replace(/0/g, "o")
    .replace(/1/g, "i")
    .replace(/3/g, "e")
    .replace(/4/g, "a")
    .replace(/5/g, "s")
    .replace(/7/g, "t");
}

export type UsernameValidation =
  | { ok: true }
  | { ok: false; reason: string };

export function validateUsername(input: string): UsernameValidation {
  const trimmed = input.trim().toLowerCase();
  if (!trimmed) return { ok: false, reason: "Pick a username." };
  if (trimmed.length < 3) return { ok: false, reason: "Username must be at least 3 characters." };
  if (trimmed.length > 30) return { ok: false, reason: "Username can't be more than 30 characters." };
  if (!/^[a-z0-9_]+$/.test(trimmed)) {
    return { ok: false, reason: "Use lowercase letters, numbers, and underscores only." };
  }
  if (RESERVED.has(trimmed)) {
    return { ok: false, reason: "That username is reserved. Try a different one." };
  }
  const normalized = normalizeForProfanity(trimmed);
  for (const word of PROFANITY) {
    if (normalized.includes(word)) {
      return { ok: false, reason: "Please choose a different username." };
    }
  }
  return { ok: true };
}
