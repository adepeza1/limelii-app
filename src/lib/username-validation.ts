import {
  RegExpMatcher,
  englishDataset,
  englishRecommendedTransformers,
} from "obscenity";

const RESERVED_USERNAMES = new Set([
  "admin",
  "administrator",
  "root",
  "superuser",
  "sysadmin",
  "moderator",
  "mod",
  "staff",
  "support",
  "help",
  "helpdesk",
  "official",
  "verified",
  "system",
  "owner",
  "team",
  "limelii",
  "limelii_official",
  "limelii_team",
  "limelii_support",
  "limelii_admin",
  "limeliiapp",
  "limelii_app",

  "api",
  "app",
  "auth",
  "login",
  "logout",
  "signin",
  "signup",
  "register",
  "onboarding",
  "settings",
  "profile",
  "account",
  "billing",
  "checkout",
  "dashboard",
  "home",
  "feed",
  "explore",
  "search",
  "notifications",
  "messages",
  "inbox",
  "users",
  "user",
  "me",
  "you",
  "null",
  "undefined",
  "true",
  "false",
  "anonymous",
  "guest",
  "test",
  "testing",
  "demo",
  "example",

  "about",
  "contact",
  "privacy",
  "terms",
  "tos",
  "legal",
  "security",
  "abuse",
  "report",
  "feedback",
  "press",
  "jobs",
  "careers",
  "blog",
  "docs",
  "status",
  "help_center",

  "www",
  "mail",
  "email",
  "ftp",
  "smtp",
  "ssl",
  "static",
  "assets",
  "cdn",
  "media",
  "img",
  "images",
  "public",
  "private",
]);

const profanityMatcher = new RegExpMatcher({
  ...englishDataset.build(),
  ...englishRecommendedTransformers,
});

export type UsernameValidationResult =
  | { ok: true }
  | { ok: false; reason: "format" | "reserved" | "profanity"; message: string };

export function validateUsername(input: string): UsernameValidationResult {
  const username = input.trim().toLowerCase();

  if (username.length < 3 || username.length > 30) {
    return {
      ok: false,
      reason: "format",
      message: "Username must be 3–30 characters.",
    };
  }
  if (!/^[a-z0-9_]+$/.test(username)) {
    return {
      ok: false,
      reason: "format",
      message: "Lowercase letters, numbers, and underscores only.",
    };
  }

  if (RESERVED_USERNAMES.has(username)) {
    return {
      ok: false,
      reason: "reserved",
      message: "That username is reserved.",
    };
  }

  if (profanityMatcher.hasMatch(username)) {
    return {
      ok: false,
      reason: "profanity",
      message: "That username isn't allowed.",
    };
  }

  return { ok: true };
}
