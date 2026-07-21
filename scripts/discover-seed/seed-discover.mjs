#!/usr/bin/env node
// Seeds new Discover categories + experiences into Xano.
//
//   1. Reads seed-data.json (categories + experiences).
//   2. Fetches the live /discovery response to learn which categories
//      already exist (so we never create a duplicate category).
//   3. Creates any missing categories via POST {ADMIN_BASE}/experience_categories,
//      building a name -> id map.
//   4. Creates each experience via POST {ADMIN_BASE}/experiences, resolving its
//      `category` name to a category id.
//
// The write endpoints are admin-only and must be exposed in Xano first — see
// ENDPOINTS.md in this folder for the exact contract these calls expect.
//
// Usage:
//   SEED_ADMIN_SECRET=xxxxx node scripts/discover-seed/seed-discover.mjs
//   node scripts/discover-seed/seed-discover.mjs --dry-run   (no secret needed)
//
// Env:
//   SEED_ADMIN_SECRET     required (unless --dry-run) — sent as X-Admin-Secret header
//   SEED_ADMIN_BASE       admin API group base; default = read API group + "/admin"
//   SEED_READ_BASE        base used for GET /discovery; default = public API group
//   SEED_CURATOR_USER_ID  creator_user_id stamped on new experiences; default 36
//   SEED_ACCESS           access value for new experiences; default "public"

import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const XANO_DOMAIN = "https://xupl-quzd-sk5c.n7e.xano.io";
const PUBLIC_API_BASE = `${XANO_DOMAIN}/api:58lfyMpE`;

const DRY_RUN = process.argv.includes("--dry-run");
const READ_BASE = process.env.SEED_READ_BASE ?? PUBLIC_API_BASE;
const ADMIN_BASE = process.env.SEED_ADMIN_BASE ?? `${PUBLIC_API_BASE}/admin`;
const ADMIN_SECRET = process.env.SEED_ADMIN_SECRET ?? "";
const CURATOR_USER_ID = Number(process.env.SEED_CURATOR_USER_ID ?? 36);
const ACCESS = process.env.SEED_ACCESS ?? "public";

const here = dirname(fileURLToPath(import.meta.url));

function log(...args) {
  console.log(...args);
}

async function postJson(url, body) {
  if (DRY_RUN) {
    log(`  [dry-run] POST ${url}`);
    log(`            ${JSON.stringify(body)}`);
    return { id: -1, ...body };
  }
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Admin-Secret": ADMIN_SECRET,
    },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  if (!res.ok) {
    throw new Error(`POST ${url} -> ${res.status} ${res.statusText}\n${text}`);
  }
  try {
    return JSON.parse(text);
  } catch {
    return { raw: text };
  }
}

function normalizeName(name) {
  return String(name ?? "").trim().toLowerCase();
}

async function fetchExistingCategories() {
  try {
    const res = await fetch(`${READ_BASE}/discovery`, { cache: "no-store" });
    if (!res.ok) throw new Error(`GET /discovery -> ${res.status}`);
    const data = await res.json();
    return Array.isArray(data.experience_categories) ? data.experience_categories : [];
  } catch (err) {
    log(`  ! Could not read existing categories (${err.message}). Assuming none exist.`);
    return [];
  }
}

async function main() {
  if (!DRY_RUN && !ADMIN_SECRET) {
    console.error(
      "Missing SEED_ADMIN_SECRET. Set it, or pass --dry-run to preview without writing."
    );
    process.exit(1);
  }

  const raw = await readFile(join(here, "seed-data.json"), "utf8");
  const seed = JSON.parse(raw);

  log(DRY_RUN ? "== DRY RUN (no writes) ==" : "== Seeding Discover content ==");
  log(`   admin base: ${ADMIN_BASE}`);
  log(`   curator user id: ${CURATOR_USER_ID}\n`);

  // ── Categories ────────────────────────────────────────────────────────────
  const existing = await fetchExistingCategories();
  const nameToId = new Map();
  for (const c of existing) nameToId.set(normalizeName(c.name), c.id);
  log(`Found ${existing.length} existing categories.`);

  let createdCats = 0;
  for (const cat of seed.categories ?? []) {
    const key = normalizeName(cat.name);
    if (nameToId.has(key)) {
      log(`  = category "${cat.name}" already exists (id ${nameToId.get(key)}), skipping`);
      continue;
    }
    log(`  + creating category "${cat.name}"`);
    const created = await postJson(`${ADMIN_BASE}/experience_categories`, {
      name: cat.name,
    });
    nameToId.set(key, created.id);
    createdCats++;
  }

  // ── Experiences ───────────────────────────────────────────────────────────
  let createdExps = 0;
  const skipped = [];
  for (const exp of seed.experiences ?? []) {
    const catId = nameToId.get(normalizeName(exp.category));
    if (catId == null) {
      skipped.push(`${exp.title} (unknown category "${exp.category}")`);
      continue;
    }
    const body = {
      title: exp.title,
      description: exp.description,
      category_id: catId,
      place_ids: exp.place_ids ?? [],
      creator_user_id: CURATOR_USER_ID,
      access: ACCESS,
      status: "done",
      neighborhoods: exp.neighborhoods ?? [],
      activities: exp.activities ?? [],
      budget: exp.budget ?? [],
      indoor_outdoor: exp.indoor_outdoor ?? [],
      time_of_day: exp.time_of_day ?? [],
      sort_order: 0,
    };
    log(`  + experience "${exp.title}" -> category ${catId} (${exp.category})`);
    await postJson(`${ADMIN_BASE}/experiences`, body);
    createdExps++;
  }

  log("\n== Summary ==");
  log(`  categories created: ${createdCats}`);
  log(`  experiences created: ${createdExps}`);
  if (skipped.length) {
    log(`  skipped (${skipped.length}):`);
    for (const s of skipped) log(`    - ${s}`);
  }
  if (DRY_RUN) log("\n  (dry run — nothing was written)");
}

main().catch((err) => {
  console.error("\nSeeding failed:", err.message);
  process.exit(1);
});
