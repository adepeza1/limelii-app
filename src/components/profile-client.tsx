"use client";

import { useState, useEffect, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { LogoutLink } from "@kinde-oss/kinde-auth-nextjs/components";
import {
  Settings,
  MapPin,
  Heart,
  PenLine,
  X,
  ChevronRight,
  Bell,
  Lock,
  UserCircle,
} from "lucide-react";
import { ProfileExperiences } from "@/components/profile-experiences";
import type { Experience } from "@/app/page";
import { ExperienceCard } from "@/components/experience-card";
import { ExperienceDetail } from "@/components/experience-detail";
import { listCollections } from "@/lib/collections";
import { listSavedExperiences, saveExperience } from "@/lib/saved";
import { API_BASE } from "@/lib/xano";
import type { DiscoveryResponse } from "@/app/page";

// ─── localStorage keys ────────────────────────────────────────────────────────
const SAVED_ITEMS_KEY = "limelii_saved_items";
const SAVED_KEY = "limelii_saved";
const PREFS_KEY = "limelii_preferences";
const MIGRATION_KEY = "limelii_saves_migrated";

// ─── Types ────────────────────────────────────────────────────────────────────
interface UserPreferences {
  bio: string;
  borough: string;
  neighborhood: string;
  groupType: string;
  interests: string[];
}

type Tab = "created" | "saved" | "preferences";

interface ProfileClientProps {
  givenName: string | null;
  familyName: string | null;
  email: string | null;
}

// ─── Constants ────────────────────────────────────────────────────────────────
const INTERESTS = [
  "Food & Drink",
  "Nightlife",
  "Arts & Culture",
  "Outdoors",
  "Music",
  "Sports",
  "Wellness",
  "Shopping",
  "Comedy",
  "Film",
  "Architecture",
  "History",
  "Family-friendly",
  "Dog-friendly",
];

const BOROUGHS = ["All NYC", "Manhattan", "Brooklyn", "Queens", "Bronx", "Staten Island"];

const NYC_NEIGHBORHOODS: Record<string, string[]> = {
  Manhattan: [
    "Battery Park City", "Chelsea", "Chinatown", "East Harlem", "East Village",
    "Financial District", "Flatiron", "Gramercy", "Greenwich Village", "Harlem",
    "Hell's Kitchen", "Inwood", "Kips Bay", "Little Italy", "Lower East Side",
    "Meatpacking District", "Midtown", "Morningside Heights", "Murray Hill",
    "NoHo", "Nolita", "SoHo", "Theater District", "Tribeca",
    "Upper East Side", "Upper West Side", "Washington Heights", "West Village",
  ],
  Brooklyn: [
    "Bay Ridge", "Bedford-Stuyvesant", "Boerum Hill", "Brighton Beach",
    "Brooklyn Heights", "Bushwick", "Carroll Gardens", "Clinton Hill",
    "Cobble Hill", "Crown Heights", "DUMBO", "East Flatbush", "East New York",
    "Flatbush", "Fort Greene", "Gowanus", "Greenpoint", "Manhattan Beach",
    "Park Slope", "Prospect Heights", "Red Hook", "Sheepshead Bay",
    "Sunset Park", "Williamsburg", "Windsor Terrace",
  ],
  Queens: [
    "Astoria", "Bayside", "Corona", "Elmhurst", "Flushing", "Forest Hills",
    "Fresh Meadows", "Howard Beach", "Jackson Heights", "Jamaica",
    "Kew Gardens", "Long Island City", "Maspeth", "Ozone Park",
    "Rego Park", "Richmond Hill", "Ridgewood", "Rockaway Beach",
    "Sunnyside", "Whitestone", "Woodhaven", "Woodside",
  ],
  Bronx: [
    "Baychester", "Bedford Park", "Belmont", "City Island", "Concourse",
    "Country Club", "Eastchester", "Fordham", "Hunts Point", "Kingsbridge",
    "Melrose", "Morris Heights", "Morris Park", "Morrisania", "Mott Haven",
    "Norwood", "Pelham Bay", "Riverdale", "Soundview", "Throgs Neck",
    "University Heights", "Wakefield", "Woodlawn",
  ],
  "Staten Island": [
    "Annadale", "Arden Heights", "Bay Terrace", "Dongan Hills", "Eltingville",
    "Fort Wadsworth", "Great Kills", "Huguenot", "Livingston", "Manor Heights",
    "Mariners Harbor", "New Brighton", "New Dorp", "New Springville",
    "Port Richmond", "Rosebank", "Rossville", "South Beach", "St. George",
    "Stapleton", "Todt Hill", "Tottenville", "West Brighton",
  ],
};

const GROUP_TYPES = ["Solo", "Couple", "Friends", "Family", "Work"];

// ─── Helpers ──────────────────────────────────────────────────────────────────
function getInitials(
  given: string | null | undefined,
  family: string | null | undefined
): string {
  const first = given?.[0]?.toUpperCase() ?? "";
  const last = family?.[0]?.toUpperCase() ?? "";
  return first + last || "U";
}

function getSavedCount(): number {
  if (typeof window === "undefined") return 0;
  try {
    const ids = JSON.parse(localStorage.getItem(SAVED_KEY) ?? "[]");
    return Array.isArray(ids) ? ids.length : 0;
  } catch {
    return 0;
  }
}

function getSavedExperiences(): Experience[] {
  if (typeof window === "undefined") return [];
  try {
    const items = JSON.parse(localStorage.getItem(SAVED_ITEMS_KEY) ?? "{}");
    return Object.values(items) as Experience[];
  } catch {
    return [];
  }
}

const DEFAULT_PREFS: UserPreferences = { bio: "", borough: "All NYC", neighborhood: "", groupType: "Friends", interests: [] };

function loadPreferences(): UserPreferences {
  if (typeof window === "undefined") return DEFAULT_PREFS;
  try {
    const saved = JSON.parse(localStorage.getItem(PREFS_KEY) ?? "null");
    if (!saved) return DEFAULT_PREFS;
    // Migrate old format: if borough missing, derive from neighborhood field
    if (!saved.borough) {
      const old = saved.neighborhood ?? "All NYC";
      const isBorough = BOROUGHS.includes(old);
      saved.borough = isBorough ? old : "All NYC";
      saved.neighborhood = isBorough ? "" : old;
    }
    return { ...DEFAULT_PREFS, ...saved };
  } catch {
    return DEFAULT_PREFS;
  }
}

// ─── Component ────────────────────────────────────────────────────────────────
export function ProfileClient({ givenName, familyName, email }: ProfileClientProps) {
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState<Tab>(
    searchParams.get("tab") === "preferences" ? "preferences" : "created"
  );
  const [creating, setCreating] = useState(searchParams.get("creating") === "true");
  const [savedCount, setSavedCount] = useState(0);
  const [collectionsCount, setCollectionsCount] = useState<number | null>(null);
  const [createdCount, setCreatedCount] = useState<number | null>(null);
  const [savedExperiences, setSavedExperiences] = useState<Experience[]>([]);
  const [selectedExperience, setSelectedExperience] = useState<Experience | null>(null);
  const savedScrollY = useRef(0);
  const [preferences, setPreferences] = useState<UserPreferences>(DEFAULT_PREFS);
  const [editingBio, setEditingBio] = useState(false);
  const [bioInput, setBioInput] = useState("");
  const [editingPrefs, setEditingPrefs] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [dragY, setDragY] = useState(0);
  const dragStartY = useRef(0);

  useEffect(() => {
    // Show localStorage values instantly while Xano loads
    setSavedCount(getSavedCount());
    setSavedExperiences(getSavedExperiences());
    const prefs = loadPreferences();
    setPreferences(prefs);
    setBioInput(prefs.bio);
    listCollections()
      .then((data) => setCollectionsCount((data.my_collections?.length ?? 0) + (data.saved_collections?.length ?? 0)))
      .catch(() => setCollectionsCount(0));
    // Migration: push localStorage saves to Xano
    // Re-runs whenever Xano has 0 valid records but localStorage has IDs
    async function migrateAndLoad() {
      const localIds: number[] = (() => {
        try { return JSON.parse(localStorage.getItem(SAVED_KEY) ?? "[]"); } catch { return []; }
      })();

      if (localIds.length > 0) {
        try {
          const existing = await listSavedExperiences();
          const validIds = new Set(existing.map((r) => r.experiences_id).filter((id) => id !== 0));
          // Re-migrate if Xano has no valid records despite localStorage having some
          if (validIds.size === 0) localStorage.removeItem(MIGRATION_KEY);
          if (!localStorage.getItem(MIGRATION_KEY)) {
            const toMigrate = localIds.filter((id) => !validIds.has(id));
            await Promise.all(toMigrate.map((id) => saveExperience(id).catch(() => {})));
            localStorage.setItem(MIGRATION_KEY, "1");
          }
        } catch { /* not logged in — skip */ }
      }
      // Fetch authoritative saved count + list from Xano
      try {
        const records = await listSavedExperiences();
        const res = await fetch(`${API_BASE}/discovery`);
        const data: DiscoveryResponse = await res.json();
        const all = Object.values(data.experiences ?? {}).flat();
        const savedIds = new Set(records.map((r) => r.experiences_id));
        const matched = all.filter((e) => savedIds.has(e.id));
        // Only update state from Xano — always authoritative once we get a response
        setSavedCount(matched.length);
        setSavedExperiences(matched);
      } catch { /* not logged in — localStorage fallback stays */ }
    }
    migrateAndLoad();
  }, []);

  function persistPreferences(updated: UserPreferences) {
    localStorage.setItem(PREFS_KEY, JSON.stringify(updated));
    setPreferences(updated);
  }

  function toggleInterest(interest: string) {
    const next = {
      ...preferences,
      interests: preferences.interests.includes(interest)
        ? preferences.interests.filter((i) => i !== interest)
        : [...preferences.interests, interest],
    };
    persistPreferences(next);
  }

  function handleSaveBio() {
    persistPreferences({ ...preferences, bio: bioInput });
    setEditingBio(false);
  }

  function handleBack() {
    setSelectedExperience(null);
    requestAnimationFrame(() => window.scrollTo(0, savedScrollY.current));
    // Refetch from Xano to reflect any save/unsave that happened in ExperienceDetail
    listSavedExperiences()
      .then(async (records) => {
        const res = await fetch(`${API_BASE}/discovery`);
        const data: DiscoveryResponse = await res.json();
        const all = Object.values(data.experiences ?? {}).flat();
        const savedIds = new Set(records.map((r) => r.experiences_id));
        const matched = all.filter((e) => savedIds.has(e.id));
        setSavedCount(matched.length);
        setSavedExperiences(matched);
      })
      .catch(() => {
        setSavedExperiences(getSavedExperiences());
        setSavedCount(getSavedCount());
      });
  }

  const initials = getInitials(givenName, familyName);
  const displayName =
    [givenName, familyName].filter(Boolean).join(" ") || email || "User";

  // ── If viewing a detail, take over full screen ──────────────────────────────
  if (selectedExperience) {
    return <ExperienceDetail experience={selectedExperience} onBack={handleBack} />;
  }

  return (
    <main className="min-h-screen bg-white">
      {/* Safe-area spacer */}
      <div className="h-[env(safe-area-inset-top,44px)]" />

      {/* ── Settings drawer ─────────────────────────────────────────────────── */}
      {showSettings && (
        <div
          className="fixed inset-0 z-50 bg-black/40 flex items-end"
          onClick={(e) => {
            if (e.target === e.currentTarget) { setShowSettings(false); setDragY(0); }
          }}
        >
          <div
            className="w-full bg-white rounded-t-3xl shadow-2xl"
            style={{ transform: `translateY(${Math.max(0, dragY)}px)`, transition: dragY === 0 ? "transform 0.3s ease" : "none" }}
            onTouchStart={(e) => { dragStartY.current = e.touches[0].clientY; }}
            onTouchMove={(e) => { const delta = e.touches[0].clientY - dragStartY.current; if (delta > 0) setDragY(delta); }}
            onTouchEnd={() => { if (dragY > 80) { setShowSettings(false); } setDragY(0); }}
          >
            {/* Drag handle */}
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-9 h-1 rounded-full bg-gray-200" />
            </div>

            <div className="px-6 pt-3 pb-[max(2rem,env(safe-area-inset-bottom,0px)+5rem)]">
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-base font-semibold text-gray-900">Settings</h2>
                <button
                  onClick={() => { setShowSettings(false); setDragY(0); }}
                  className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 text-gray-500 hover:bg-gray-200 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-1">
                {[
                  { icon: UserCircle, label: "Account Settings" },
                  { icon: Bell, label: "Notifications" },
                  { icon: Lock, label: "Privacy" },
                ].map(({ icon: Icon, label }) => (
                  <button
                    key={label}
                    className="w-full flex items-center justify-between py-3.5 px-4 rounded-xl hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <Icon className="w-4.5 h-4.5 text-gray-400" strokeWidth={1.7} />
                      <span className="text-sm font-medium text-gray-800">{label}</span>
                    </div>
                    <ChevronRight className="w-4 h-4 text-gray-300" />
                  </button>
                ))}

                <div className="pt-3 mt-2 border-t border-gray-100">
                  <LogoutLink className="w-full flex items-center px-4 py-3.5 rounded-xl hover:bg-gray-50 transition-colors text-left">
                    <span className="text-sm font-medium text-[#FB6983]">Log Out</span>
                  </LogoutLink>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Sticky header ───────────────────────────────────────────────────── */}
      <div className="sticky top-0 z-10 bg-white/95 backdrop-blur-sm border-b border-gray-100">
        <div className="max-w-5xl mx-auto px-5 py-3 flex items-center justify-between">
          <h1 className="text-lg font-semibold text-gray-900">Profile</h1>
          <button
            onClick={() => setShowSettings(true)}
            className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors"
            aria-label="Open settings"
          >
            <Settings className="w-[18px] h-[18px] text-gray-500" strokeWidth={1.8} />
          </button>
        </div>
      </div>

      <div className="max-w-5xl mx-auto">
        {/* ── Identity section ──────────────────────────────────────────────── */}
        <div className="px-5 pt-6 pb-5">
          <div className="flex items-start gap-4">
            {/* Avatar */}
            <div
              className="w-[72px] h-[72px] rounded-full flex-shrink-0 flex items-center justify-center text-white text-xl font-bold select-none shadow-sm"
              style={{
                background: "linear-gradient(135deg, #416f7b 0%, #FB6983 100%)",
              }}
            >
              {initials}
            </div>

            {/* Name, location, bio */}
            <div className="flex-1 min-w-0 pt-0.5">
              <p className="text-gray-900 font-semibold text-[17px] leading-tight truncate">
                {displayName}
              </p>

              {/* Neighborhood */}
              <button
                onClick={() => {
                  setActiveTab("preferences");
                }}
                className="flex items-center gap-1 mt-1 group"
                title="Edit in Preferences"
              >
                <MapPin
                  className="w-3.5 h-3.5 text-gray-400 flex-shrink-0 group-hover:text-[#416f7b] transition-colors"
                  strokeWidth={2}
                />
                <span className="text-sm text-gray-500 group-hover:text-[#416f7b] transition-colors">
                  {preferences.neighborhood}
                </span>
              </button>

              {/* Bio */}
              {editingBio ? (
                <div className="mt-2 flex items-center gap-2">
                  <input
                    autoFocus
                    value={bioInput}
                    onChange={(e) => setBioInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleSaveBio();
                      if (e.key === "Escape") setEditingBio(false);
                    }}
                    placeholder="Add a short bio…"
                    maxLength={80}
                    className="flex-1 text-sm border border-gray-200 rounded-lg px-2.5 py-1.5 outline-none focus:border-[#416f7b] transition-colors"
                  />
                  <button
                    onClick={handleSaveBio}
                    className="text-xs font-semibold text-[#416f7b] px-1 shrink-0"
                  >
                    Save
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setEditingBio(true)}
                  className="mt-1.5 flex items-center gap-1 group max-w-full"
                >
                  <span className="text-sm text-gray-500 group-hover:text-gray-700 transition-colors truncate">
                    {preferences.bio || "Add a short bio…"}
                  </span>
                  <PenLine className="w-3 h-3 text-gray-300 group-hover:text-gray-500 flex-shrink-0 transition-colors" />
                </button>
              )}
            </div>
          </div>

          {/* ── Stats bar ───────────────────────────────────────────────────── */}
          <div className="mt-5 grid grid-cols-3 divide-x divide-gray-100 bg-gray-50 rounded-2xl overflow-hidden">
            <div className="py-3.5 flex flex-col items-center gap-0.5">
              <span className="text-[22px] font-bold text-gray-900 leading-none">{createdCount ?? "—"}</span>
              <span className="text-[11px] text-gray-400 mt-1">Created</span>
            </div>
            <div className="py-3.5 flex flex-col items-center gap-0.5">
              <span className="text-[22px] font-bold text-gray-900 leading-none">{savedCount}</span>
              <span className="text-[11px] text-gray-400 mt-1">Saved</span>
            </div>
            <div className="py-3.5 flex flex-col items-center gap-0.5">
              <span className="text-[22px] font-bold text-gray-900 leading-none">{collectionsCount ?? "—"}</span>
              <span className="text-[11px] text-gray-400 mt-1">Collections</span>
            </div>
          </div>
        </div>

        {/* ── Tabs ────────────────────────────────────────────────────────── */}
        <div className="px-5 border-b border-gray-100">
          <div className="flex gap-6">
            {(
              [
                { id: "created", label: "Created" },
                { id: "saved", label: "Saved" },
                { id: "preferences", label: "Preferences" },
              ] as { id: Tab; label: string }[]
            ).map(({ id, label }) => (
              <button
                key={id}
                onClick={() => setActiveTab(id)}
                className={`pb-3 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === id
                    ? "border-[#416f7b] text-[#416f7b]"
                    : "border-transparent text-gray-400 hover:text-gray-600"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* ── Tab content ─────────────────────────────────────────────────── */}
        <div className="pb-28">
          {/* Created */}
          {activeTab === "created" && (
            <div className="pt-4">
              <ProfileExperiences
                onCountLoaded={setCreatedCount}
                creating={creating}
                onCreatingDone={() => setCreating(false)}
              />
            </div>
          )}

          {/* Saved */}
          {activeTab === "saved" && (
            <div className="pt-2">
              {savedExperiences.length === 0 ? (
                <div className="px-5 py-16 flex flex-col items-center gap-3 text-center">
                  <div className="w-14 h-14 rounded-full bg-gray-100 flex items-center justify-center">
                    <Heart className="w-6 h-6 text-gray-400" strokeWidth={1.5} />
                  </div>
                  <p className="text-gray-900 font-semibold text-base">Nothing saved yet</p>
                  <p className="text-gray-500 text-sm max-w-[220px] leading-relaxed">
                    Tap the heart on any experience to find it here.
                  </p>
                </div>
              ) : (
                <div className="px-4 pt-2 flex gap-1 items-start">
                  {[savedExperiences.filter((_, i) => i % 2 === 0), savedExperiences.filter((_, i) => i % 2 === 1)].map((col, colIdx) => (
                    <div key={colIdx} className="flex-1 flex flex-col gap-1">
                      {col.map((exp, rowIdx) => {
                        const isTall = colIdx === 0 ? rowIdx % 2 === 0 : rowIdx % 2 === 1;
                        return (
                          <ExperienceCard
                            key={exp.id}
                            experience={exp}
                            compact
                            className={`!aspect-auto !rounded-xl ${isTall ? "h-[220px]" : "h-[188px]"}`}
                            onClick={() => { savedScrollY.current = window.scrollY; setSelectedExperience(exp); }}
                          />
                        );
                      })}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Preferences */}
          {activeTab === "preferences" && (
            <div className="px-5 pt-6 pb-8">
              {/* Header row */}
              <div className="flex items-center justify-between mb-6">
                <p className="text-base font-semibold text-[#101828]">Your preferences</p>
                <button
                  onClick={() => setEditingPrefs((v) => !v)}
                  className={`text-xs font-semibold px-3 py-1.5 rounded-full border transition-colors ${
                    editingPrefs
                      ? "bg-[#FF9A56] border-[#FF9A56] text-white"
                      : "border-[#FF9A56] text-[#FF9A56] bg-white"
                  }`}
                >
                  {editingPrefs ? "Done" : "Edit"}
                </button>
              </div>

              <div className="space-y-7">
                {/* Group type */}
                <div>
                  <p className="text-[13px] font-semibold text-gray-400 uppercase tracking-wide mb-3">
                    I usually go as
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {GROUP_TYPES.map((type) => {
                      const active = preferences.groupType === type;
                      return editingPrefs ? (
                        <button
                          key={type}
                          onClick={() => persistPreferences({ ...preferences, groupType: type })}
                          className={`px-4 py-2 rounded-full text-sm font-medium border transition-colors ${
                            active ? "bg-[#FF9A56] border-[#FF9A56] text-white" : "bg-white border-gray-200 text-gray-700"
                          }`}
                        >
                          {type}
                        </button>
                      ) : active ? (
                        <span key={type} className="px-4 py-2 rounded-full text-sm font-medium bg-[#FF9A56]/10 border border-[#FF9A56]/30 text-[#FF9A56]">
                          {type}
                        </span>
                      ) : null;
                    })}
                    {!editingPrefs && !preferences.groupType && (
                      <span className="text-sm text-gray-400">Not set</span>
                    )}
                  </div>
                </div>

                {/* Location */}
                <div>
                  <p className="text-[13px] font-semibold text-gray-400 uppercase tracking-wide mb-3">
                    My location
                  </p>
                  {editingPrefs ? (
                    <>
                      <div className="flex flex-wrap gap-2 mb-3">
                        {BOROUGHS.map((b) => (
                          <button
                            key={b}
                            onClick={() => persistPreferences({ ...preferences, borough: b, neighborhood: "" })}
                            className={`px-4 py-2 rounded-full text-sm font-medium border transition-colors ${
                              preferences.borough === b
                                ? "bg-[#FF9A56] border-[#FF9A56] text-white"
                                : "bg-white border-gray-200 text-gray-700"
                            }`}
                          >
                            {b}
                          </button>
                        ))}
                      </div>
                      {preferences.borough !== "All NYC" && (
                        <div>
                          <p className="text-[13px] font-semibold text-gray-400 uppercase tracking-wide mb-3">Neighborhood</p>
                          <div className="flex flex-wrap gap-2">
                            {(NYC_NEIGHBORHOODS[preferences.borough] ?? []).map((hood) => (
                              <button
                                key={hood}
                                onClick={() => persistPreferences({
                                  ...preferences,
                                  neighborhood: preferences.neighborhood === hood ? "" : hood,
                                })}
                                className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                                  preferences.neighborhood === hood
                                    ? "bg-[#FF9A56] border-[#FF9A56] text-white"
                                    : "bg-gray-50 border-gray-200 text-gray-600"
                                }`}
                              >
                                {hood}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {preferences.borough && preferences.borough !== "All NYC" ? (
                        <>
                          <span className="px-4 py-2 rounded-full text-sm font-medium bg-[#FF9A56]/10 border border-[#FF9A56]/30 text-[#FF9A56]">
                            {preferences.borough}
                          </span>
                          {preferences.neighborhood && (
                            <span className="px-4 py-2 rounded-full text-sm font-medium bg-[#FF9A56]/10 border border-[#FF9A56]/30 text-[#FF9A56]">
                              {preferences.neighborhood}
                            </span>
                          )}
                        </>
                      ) : (
                        <span className="px-4 py-2 rounded-full text-sm font-medium bg-[#FF9A56]/10 border border-[#FF9A56]/30 text-[#FF9A56]">
                          All NYC
                        </span>
                      )}
                    </div>
                  )}
                </div>

                {/* Interests */}
                <div>
                  <p className="text-[13px] font-semibold text-gray-400 uppercase tracking-wide mb-3">
                    I&apos;m into
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {(editingPrefs ? INTERESTS : preferences.interests).map((interest) => {
                      const active = preferences.interests.includes(interest);
                      return editingPrefs ? (
                        <button
                          key={interest}
                          onClick={() => toggleInterest(interest)}
                          className={`px-4 py-2 rounded-full text-sm font-medium border transition-colors ${
                            active ? "bg-[#FF9A56] border-[#FF9A56] text-white" : "bg-white border-gray-200 text-gray-700"
                          }`}
                        >
                          {interest}
                        </button>
                      ) : (
                        <span key={interest} className="px-4 py-2 rounded-full text-sm font-medium bg-[#FF9A56]/10 border border-[#FF9A56]/30 text-[#FF9A56]">
                          {interest}
                        </span>
                      );
                    })}
                    {!editingPrefs && preferences.interests.length === 0 && (
                      <span className="text-sm text-gray-400">No interests set</span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
