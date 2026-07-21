#!/usr/bin/env node
// Auto-classifies Discover experiences into a single category based on the
// tags each experience already carries (activities, budget, time_of_day, and
// the place types under places_id). Assigns category_id via an admin PATCH
// endpoint.
//
// What it does:
//   1. Ensures the derivable target categories exist (creates missing ones).
//   2. Reads GET /discovery and flattens every experience it returns.
//   3. Scores each experience against the DERIVABLE categories and picks the
//      single best match above THRESHOLD.
//   4. PATCHes category_id when the pick differs from what's there.
//
// Scope & safety:
//   - By default it only (re)classifies experiences that are UNCLASSIFIED:
//     category_id 0 / null, or in a category named "Other"/"Uncategorized".
//     Pass --all to also re-sort Good For Groups + Cultural Experiences.
//   - It NEVER touches experiences in a PROTECTED category (Staff Picks,
//     Hidden Gems) — those are editorial and can't be derived from tags.
//   - It never assigns TO a protected category.
//
// Usage:
//   node scripts/discover-seed/classify-experiences.mjs --dry-run
//   SEED_ADMIN_SECRET=xxx node scripts/discover-seed/classify-experiences.mjs
//   SEED_ADMIN_SECRET=xxx node scripts/discover-seed/classify-experiences.mjs --all
//
// Env: same as seed-discover.mjs (SEED_ADMIN_SECRET, SEED_ADMIN_BASE,
//      SEED_READ_BASE).

const XANO_DOMAIN = "https://xupl-quzd-sk5c.n7e.xano.io";
const PUBLIC_API_BASE = `${XANO_DOMAIN}/api:58lfyMpE`;

const DRY_RUN = process.argv.includes("--dry-run");
const RECLASSIFY_ALL = process.argv.includes("--all");
const READ_BASE = process.env.SEED_READ_BASE ?? PUBLIC_API_BASE;
const ADMIN_BASE = process.env.SEED_ADMIN_BASE ?? `${PUBLIC_API_BASE}/admin`;
const ADMIN_SECRET = process.env.SEED_ADMIN_SECRET ?? "";

// Categories the classifier is allowed to assign, in priority order
// (most-distinctive first). On a score tie, the earlier one wins — so a
// "Museum … & Martinis" lands in Cultural, not Late Night.
const DERIVABLE = [
  "Cultural Experiences",
  "Budget-Friendly",
  "Late Night",
  "Date Night",
  "Good For Groups",
];

// ── Keyword rules ──────────────────────────────────────────────────────────
// time_of_day is empty on every experience, so titles/descriptions are the
// primary signal. Each category has `strong` cues (worth STRONG_W when they
// appear in the title, TAG_W elsewhere) and `weak` cues (worth TAG_W anywhere).
// Edit these lists to tune the classifier — re-run with --dry-run to preview.
const STRONG_W = 5; // strong cue found in the title
const CUE_W = 2;    // strong cue in description/tags, or any weak cue
const KEYWORDS = {
  "Cultural Experiences": {
    strong: ["museum", "gallery", "galleries", "cultural", "culture", "history",
      "historic", "heritage", "landmark", "library", "theater", "theatre",
      "lincoln center", "exhibit", "sculpture", "monument", "art &", "art scene",
      "graffiti", "arts", "literary"],
    weak: ["art", "cathedral", "opera", "ballet"],
  },
  "Late Night": {
    strong: ["late night", "2am", "after dark", "nightlife", "dive bar", "night out",
      "bar crawl", "bar hop", "pub crawl", "speakeasy", "cocktail tour", "club"],
    weak: ["bars", "cocktail", "nightcap"],
  },
  "Date Night": {
    strong: ["romance", "romantic", "date night", "sunset", "for two", "candlelit",
      "intimate", "sail"],
    weak: ["evening", "wine"],
  },
  "Budget-Friendly": {
    strong: ["free", "cheap", "budget", "dollar slice", "$1", "coffee crawl"],
    weak: ["market", "coffee", "vintage", "thrift", "stroll", "promenade", "park"],
  },
  "Good For Groups": {
    strong: ["karaoke", "ping pong", "escape room", "bowling", "comedy club",
      "girls night", "guys night", "photo walk", "food tour", "brew tour"],
    weak: ["crawl", "hop", "hangout", "group", "tour", "brunch"],
  },
};
// Editorial categories — never assigned to, and members are never touched.
const PROTECTED = ["Staff Picks", "Hidden Gems"];
// Category names that count as "not yet classified".
const UNCLASSIFIED = ["other", "uncategorized"];
// A pick must beat this to be applied; otherwise the experience is left alone.
const THRESHOLD = 3;

const norm = (s) => String(s ?? "").trim().toLowerCase();
const lc = (arr) => (Array.isArray(arr) ? arr.map(norm) : []);

function log(...a) {
  console.log(...a);
}

async function api(method, url, body) {
  if (DRY_RUN && method !== "GET") {
    return { id: -1, ...(body ?? {}) };
  }
  const res = await fetch(url, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(method === "GET" ? {} : { "X-Admin-Secret": ADMIN_SECRET }),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
    cache: "no-store",
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`${method} ${url} -> ${res.status}\n${text}`);
  try {
    return JSON.parse(text);
  } catch {
    return { raw: text };
  }
}

// ── Budget parsing ────────────────────────────────────────────────────────
// Returns the highest dollar midpoint across a budget[] list, or null.
function maxBudget(budget) {
  let max = null;
  for (const b of budget ?? []) {
    const s = norm(b);
    if (s === "na" || s === "") continue;
    if (s.includes("free")) {
      max = Math.max(max ?? 0, 0);
      continue;
    }
    const nums = (s.match(/\d+/g) ?? []).map(Number);
    if (nums.length) {
      const mid = nums.reduce((x, y) => x + y, 0) / nums.length;
      max = Math.max(max ?? 0, mid);
    }
  }
  return max;
}
function hasFree(budget) {
  return (budget ?? []).some((b) => norm(b).includes("free"));
}

// ── Scoring ──────────────────────────────────────────────────────────────
// Each experience gets a score per derivable category; the highest wins, with
// DERIVABLE order breaking ties. Signal is mostly the title + description text,
// with tags and the budget field as support.
function scoreExperience(exp) {
  const title = norm(exp.title);
  const placeTypes = (exp.places_id ?? [])
    .flatMap((p) => (p?._location_details?.location_type ?? []))
    .map(norm);
  const tagText = [...lc(exp.activities), ...placeTypes].join(" ");
  const bodyText = `${norm(exp.description)} ${tagText}`;
  const mb = maxBudget(exp.budget);

  const scores = {};
  for (const [name, kw] of Object.entries(KEYWORDS)) {
    let s = 0;
    for (const cue of kw.strong ?? []) {
      if (title.includes(cue)) s += STRONG_W;
      else if (bodyText.includes(cue)) s += CUE_W;
    }
    for (const cue of kw.weak ?? []) {
      if (title.includes(cue) || bodyText.includes(cue)) s += CUE_W;
    }
    scores[name] = s;
  }

  // Budget-Friendly leans on the (populated) budget field too.
  if (hasFree(exp.budget)) scores["Budget-Friendly"] += STRONG_W;
  else if (mb != null && mb <= 20) scores["Budget-Friendly"] += CUE_W;
  // …but something clearly pricey can't be "budget-friendly".
  if (mb != null && mb >= 60) scores["Budget-Friendly"] = 0;

  return scores;
}

function bestPick(scores) {
  let best = null;
  // DERIVABLE is ordered most-specific-first, so it doubles as tie-break order.
  for (const name of DERIVABLE) {
    const s = scores[name] ?? 0;
    if (s >= THRESHOLD && (best == null || s > best.score)) best = { name, score: s };
  }
  return best;
}

async function ensureCategory(name, nameToId) {
  const key = norm(name);
  if (nameToId.has(key)) return nameToId.get(key);
  log(`  + creating missing category "${name}"`);
  const created = await api("POST", `${ADMIN_BASE}/experience_categories`, { name });
  nameToId.set(key, created.id);
  return created.id;
}

async function main() {
  if (!DRY_RUN && !ADMIN_SECRET) {
    console.error("Missing SEED_ADMIN_SECRET. Set it, or use --dry-run to preview.");
    process.exit(1);
  }

  log(DRY_RUN ? "== DRY RUN (no writes) ==" : "== Classifying experiences ==");
  log(`   scope: ${RECLASSIFY_ALL ? "ALL non-protected" : "unclassified only"}`);
  log(`   admin base: ${ADMIN_BASE}\n`);

  const data = await api("GET", `${READ_BASE}/discovery`);
  const cats = Array.isArray(data.experience_categories) ? data.experience_categories : [];
  const nameToId = new Map(cats.map((c) => [norm(c.name), c.id]));
  const idToName = new Map(cats.map((c) => [c.id, c.name]));

  // Make sure every derivable target category exists.
  for (const name of DERIVABLE) await ensureCategory(name, nameToId);
  const protectedIds = new Set(PROTECTED.map((n) => nameToId.get(norm(n))).filter((x) => x != null));

  // Flatten + de-dupe experiences returned by /discovery.
  const byId = new Map();
  for (const list of Object.values(data.experiences ?? {})) {
    for (const exp of list) if (!byId.has(exp.id)) byId.set(exp.id, exp);
  }
  const experiences = [...byId.values()];
  log(`Loaded ${experiences.length} experiences.\n`);

  let changed = 0;
  const skippedProtected = [];
  const noMatch = [];

  for (const exp of experiences) {
    const curId = exp.category_id ?? 0;
    const curName = idToName.get(curId) ?? "";
    const isUnclassified = curId === 0 || UNCLASSIFIED.includes(norm(curName));

    if (protectedIds.has(curId)) {
      skippedProtected.push(exp.title);
      continue;
    }
    if (!RECLASSIFY_ALL && !isUnclassified) continue; // leave curated ones alone

    const pick = bestPick(scoreExperience(exp));
    if (!pick) {
      if (isUnclassified) noMatch.push(exp.title);
      continue;
    }
    const targetId = nameToId.get(norm(pick.name));
    if (targetId === curId) continue; // already correct

    log(`  ~ "${exp.title}"  [${curName || "uncategorized"}] -> ${pick.name} (score ${pick.score})`);
    await api("PATCH", `${ADMIN_BASE}/experiences/${exp.id}`, { category_id: targetId });
    changed++;
  }

  log("\n== Summary ==");
  log(`  reclassified: ${changed}`);
  log(`  left as-is (protected editorial): ${skippedProtected.length}`);
  log(`  unclassified with no confident match (left alone): ${noMatch.length}`);
  if (noMatch.length) for (const t of noMatch) log(`    - ${t}`);
  if (DRY_RUN) log("\n  (dry run — nothing was written)");
}

main().catch((err) => {
  console.error("\nClassification failed:", err.message);
  process.exit(1);
});
