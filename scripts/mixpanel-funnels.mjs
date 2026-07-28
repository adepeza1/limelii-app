#!/usr/bin/env node
// REQUIRES A PAID MIXPANEL PLAN. The free plan blocks the Query API and every
// mode here returns HTTP 402 "Your plan does not allow API calls" — even with
// valid Service Account credentials. On the free plan, build the reports in the
// Mixpanel UI instead (see docs/mixpanel-funnels.md § "Free-plan UI walkthrough")
// and export CSV. This script is ready for when the project is upgraded.
//
// Pulls saved Mixpanel funnels via the Query API and prints a conversion table.
//
// Why saved funnels: Mixpanel's /query/funnels endpoint reports on funnels you
// built in the UI (it needs a funnel_id). So the flow is:
//   1. Build each funnel from docs/mixpanel-funnels.md in Mixpanel → Funnels.
//   2. Open it; copy the numeric id from the URL (…/funnels/<PROJECT>/<FUNNEL_ID>).
//   3. List those ids in MIXPANEL_FUNNELS below (id:label pairs).
//
// Auth: a Mixpanel Service Account (Project Settings → Service Accounts).
// Nothing here is committed — all secrets come from the environment.
//
// Usage:
//   # 1. List your saved funnels and their ids (no MIXPANEL_FUNNELS needed):
//   MIXPANEL_SA_USER=... MIXPANEL_SA_SECRET=... MIXPANEL_PROJECT_ID=... \
//   MIXPANEL_REGION=us node scripts/mixpanel-funnels.mjs --list
//
//   # 2. Pull conversion tables for the ids you got from --list:
//   MIXPANEL_SA_USER=... MIXPANEL_SA_SECRET=... MIXPANEL_PROJECT_ID=... \
//   MIXPANEL_REGION=us MIXPANEL_FUNNELS="12345:Core loop,12346:AI create" \
//   node scripts/mixpanel-funnels.mjs 2026-06-27 2026-07-27
//
// Args: [from_date] [to_date]  (YYYY-MM-DD; default = last 30 days ending today)
//       --list                 print saved funnel ids + names, then exit
//       --events               print total count per known event, then exit
//                              (diagnostic: is the pipeline wired? which events land?)

const {
  MIXPANEL_SA_USER,
  MIXPANEL_SA_SECRET,
  MIXPANEL_PROJECT_ID,
  MIXPANEL_REGION = "us", // "us" or "eu"
  MIXPANEL_FUNNELS = "",  // "id:label,id:label"
} = process.env;

function die(msg) {
  console.error(`✗ ${msg}`);
  process.exit(1);
}

if (!MIXPANEL_SA_USER || !MIXPANEL_SA_SECRET) {
  die("Set MIXPANEL_SA_USER and MIXPANEL_SA_SECRET (Service Account creds).");
}
if (!MIXPANEL_PROJECT_ID) die("Set MIXPANEL_PROJECT_ID (numeric project id).");

const listMode = process.argv.includes("--list");
const eventsMode = process.argv.includes("--events");

// Every event name emitted by the app (from src/**; keep in sync with track()).
const KNOWN_EVENTS = [
  "App Opened",
  "Page Viewed",
  "Experience Viewed",
  "Experience Saved",
  "Experience Unsaved",
  "Collection Viewed",
  "AI Itinerary Generated",
  "World Cup Banner Tapped",
  "reauth_banner_shown",
  "token_error",
];

const funnels = MIXPANEL_FUNNELS.split(",")
  .map((s) => s.trim())
  .filter(Boolean)
  .map((pair) => {
    const [id, ...rest] = pair.split(":");
    return { id: id.trim(), label: rest.join(":").trim() || id.trim() };
  });
if (!listMode && !eventsMode && !funnels.length) {
  die(
    'Set MIXPANEL_FUNNELS="id:label,id:label", or run with --list to discover saved funnel ids.'
  );
}

// Default window: trailing 30 days ending today (system date; args override).
const [argFrom, argTo] = process.argv.slice(2);
const today = new Date().toISOString().slice(0, 10);
const thirtyAgo = new Date(Date.now() - 30 * 864e5).toISOString().slice(0, 10);
const fromDate = argFrom || thirtyAgo;
const toDate = argTo || today;

const host =
  MIXPANEL_REGION.toLowerCase() === "eu" ? "eu.mixpanel.com" : "mixpanel.com";
const auth =
  "Basic " +
  Buffer.from(`${MIXPANEL_SA_USER}:${MIXPANEL_SA_SECRET}`).toString("base64");

async function listFunnels() {
  const url =
    `https://${host}/api/query/funnels/list?project_id=${encodeURIComponent(MIXPANEL_PROJECT_ID)}`;
  const res = await fetch(url, {
    headers: { Authorization: auth, Accept: "application/json" },
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`HTTP ${res.status}: ${body.slice(0, 300)}`);
  }
  return res.json();
}

async function fetchEventCounts() {
  const url =
    `https://${host}/api/query/events` +
    `?project_id=${encodeURIComponent(MIXPANEL_PROJECT_ID)}` +
    `&event=${encodeURIComponent(JSON.stringify(KNOWN_EVENTS))}` +
    `&type=general&unit=day&from_date=${fromDate}&to_date=${toDate}`;
  const res = await fetch(url, {
    headers: { Authorization: auth, Accept: "application/json" },
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`HTTP ${res.status}: ${body.slice(0, 300)}`);
  }
  return res.json();
}

async function fetchFunnel({ id, label }) {
  const url =
    `https://${host}/api/query/funnels?project_id=${encodeURIComponent(MIXPANEL_PROJECT_ID)}` +
    `&funnel_id=${encodeURIComponent(id)}` +
    `&from_date=${fromDate}&to_date=${toDate}`;
  const res = await fetch(url, {
    headers: { Authorization: auth, Accept: "application/json" },
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`HTTP ${res.status} for "${label}" (id ${id}): ${body.slice(0, 300)}`);
  }
  return res.json();
}

// The funnels response is keyed by date; sum step counts across the window so
// the printed table is the whole-period funnel, not one arbitrary day.
function aggregate(json) {
  const data = json?.data ?? {};
  const perDay = Object.values(data);
  if (!perDay.length) return [];
  const stepCount = perDay[0].steps?.length ?? 0;
  const steps = Array.from({ length: stepCount }, (_, i) => ({
    label: perDay[0].steps[i]?.event ?? perDay[0].steps[i]?.step_label ?? `Step ${i + 1}`,
    count: 0,
  }));
  for (const day of perDay) {
    (day.steps ?? []).forEach((s, i) => {
      steps[i].count += s.count ?? 0;
    });
  }
  return steps;
}

function printTable(label, steps) {
  console.log(`\n▸ ${label}   (${fromDate} → ${toDate})`);
  if (!steps.length) {
    console.log("  (no data — check funnel id, date range, and that events are arriving)");
    return;
  }
  const top = steps[0].count || 1;
  let prev = steps[0].count || 1;
  for (let i = 0; i < steps.length; i++) {
    const s = steps[i];
    const fromPrev = i === 0 ? 100 : (s.count / prev) * 100;
    const fromTop = (s.count / top) * 100;
    const arrow = i === 0 ? "     " : `${fromPrev.toFixed(0).padStart(3)}% →`;
    console.log(
      `  ${arrow} ${String(s.count).padStart(7)}  ${fromTop.toFixed(0).padStart(3)}% of top  ${s.label}`
    );
    prev = s.count || prev;
  }
}

(async () => {
  console.log(`Mixpanel funnels · project ${MIXPANEL_PROJECT_ID} · ${host}`);

  if (eventsMode) {
    try {
      const json = await fetchEventCounts();
      const values = json?.data?.values ?? {};
      console.log(`\nEvent counts  (${fromDate} → ${toDate}):\n`);
      const rows = KNOWN_EVENTS.map((name) => {
        const byDay = values[name] ?? {};
        const total = Object.values(byDay).reduce((a, b) => a + (b ?? 0), 0);
        return { name, total };
      }).sort((a, b) => b.total - a.total);
      const grand = rows.reduce((a, r) => a + r.total, 0);
      for (const r of rows) {
        console.log(`  ${String(r.total).padStart(8)}  ${r.name}`);
      }
      console.log(`  ${"-".repeat(8)}`);
      console.log(`  ${String(grand).padStart(8)}  (total across known events)`);
      if (grand === 0) {
        console.log(
          "\n  Zero events in range. Check: token set in prod, ATT granted on iOS,\n" +
          "  and that you widened the date range past first deploy."
        );
      }
    } catch (err) {
      console.log(`\n✗ ${err.message}`);
      process.exit(1);
    }
    return;
  }

  if (listMode) {
    try {
      const rows = await listFunnels();
      if (!Array.isArray(rows) || !rows.length) {
        console.log("\n(no saved funnels — build them in Mixpanel → Funnels first)");
        return;
      }
      console.log("\nSaved funnels (copy id:name into MIXPANEL_FUNNELS):\n");
      for (const r of rows) {
        console.log(`  ${String(r.funnel_id).padStart(8)}  ${r.name}`);
      }
    } catch (err) {
      console.log(`\n✗ ${err.message}`);
      process.exit(1);
    }
    return;
  }

  for (const f of funnels) {
    try {
      const json = await fetchFunnel(f);
      printTable(f.label, aggregate(json));
    } catch (err) {
      console.log(`\n▸ ${f.label}\n  ✗ ${err.message}`);
    }
  }
  console.log(
    "\nCaveat: native events are ATT-authorized users only. Split by `platform`."
  );
})();
