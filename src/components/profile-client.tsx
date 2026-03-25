"use client";

import { useState, useEffect, useRef } from "react";
import { LogoutLink } from "@kinde-oss/kinde-auth-nextjs/components";
import {
  Settings,
  MapPin,
  Bookmark,
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

// ─── localStorage keys ────────────────────────────────────────────────────────
const SAVED_ITEMS_KEY = "limelii_saved_items";
const SAVED_KEY = "limelii_saved";
const PREFS_KEY = "limelii_preferences";

// ─── Types ────────────────────────────────────────────────────────────────────
interface UserPreferences {
  bio: string;
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

const NEIGHBORHOODS = [
  "All NYC",
  "Manhattan",
  "Brooklyn",
  "Queens",
  "Bronx",
  "Staten Island",
  "Lower East Side",
  "Williamsburg",
  "Astoria",
  "Harlem",
  "DUMBO",
  "Chelsea",
  "SoHo",
  "Upper West Side",
  "Bushwick",
  "Greenpoint",
];

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

function loadPreferences(): UserPreferences {
  if (typeof window === "undefined") {
    return { bio: "", neighborhood: "All NYC", groupType: "Friends", interests: [] };
  }
  try {
    return (
      JSON.parse(localStorage.getItem(PREFS_KEY) ?? "null") ?? {
        bio: "",
        neighborhood: "All NYC",
        groupType: "Friends",
        interests: [],
      }
    );
  } catch {
    return { bio: "", neighborhood: "All NYC", groupType: "Friends", interests: [] };
  }
}

// ─── Component ────────────────────────────────────────────────────────────────
export function ProfileClient({ givenName, familyName, email }: ProfileClientProps) {
  const [activeTab, setActiveTab] = useState<Tab>("created");
  const [savedCount, setSavedCount] = useState(0);
  const [collectionsCount, setCollectionsCount] = useState<number | null>(null);
  const [savedExperiences, setSavedExperiences] = useState<Experience[]>([]);
  const [selectedExperience, setSelectedExperience] = useState<Experience | null>(null);
  const savedScrollY = useRef(0);
  const [preferences, setPreferences] = useState<UserPreferences>({
    bio: "",
    neighborhood: "All NYC",
    groupType: "Friends",
    interests: [],
  });
  const [editingBio, setEditingBio] = useState(false);
  const [bioInput, setBioInput] = useState("");
  const [showSettings, setShowSettings] = useState(false);
  const [dragY, setDragY] = useState(0);
  const dragStartY = useRef(0);

  useEffect(() => {
    setSavedCount(getSavedCount());
    setSavedExperiences(getSavedExperiences());
    const prefs = loadPreferences();
    setPreferences(prefs);
    setBioInput(prefs.bio);
    listCollections()
      .then((data) => setCollectionsCount((data.my_collections?.length ?? 0) + (data.saved_collections?.length ?? 0)))
      .catch(() => setCollectionsCount(0));
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
    setSavedExperiences(getSavedExperiences());
    setSavedCount(getSavedCount());
    requestAnimationFrame(() => window.scrollTo(0, savedScrollY.current));
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
          <div className="mt-5 grid grid-cols-4 divide-x divide-gray-100 bg-gray-50 rounded-2xl overflow-hidden">
            <div className="py-3.5 flex flex-col items-center gap-0.5">
              <span className="text-[22px] font-bold text-gray-900 leading-none">—</span>
              <span className="text-[11px] text-gray-400 mt-1">Created</span>
            </div>
            <div className="py-3.5 flex flex-col items-center gap-0.5">
              <span className="text-[22px] font-bold text-gray-900 leading-none">
                {savedCount}
              </span>
              <span className="text-[11px] text-gray-400 mt-1">Saved</span>
            </div>
            <div className="py-3.5 flex flex-col items-center gap-0.5">
              <span className="text-[22px] font-bold text-gray-900 leading-none">
                {collectionsCount ?? "—"}
              </span>
              <span className="text-[11px] text-gray-400 mt-1">Collections</span>
            </div>
            <div className="py-3.5 flex flex-col items-center gap-0.5">
              <span className="text-[22px] font-bold text-gray-900 leading-none">—</span>
              <span className="text-[11px] text-gray-400 mt-1">Completed</span>
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
          {activeTab === "created" && <ProfileExperiences />}

          {/* Saved */}
          {activeTab === "saved" && (
            <div className="pt-2">
              {savedExperiences.length === 0 ? (
                <div className="px-5 py-16 flex flex-col items-center gap-3 text-center">
                  <div className="w-14 h-14 rounded-full bg-gray-100 flex items-center justify-center">
                    <Bookmark className="w-6 h-6 text-gray-400" strokeWidth={1.5} />
                  </div>
                  <p className="text-gray-900 font-semibold text-base">Nothing saved yet</p>
                  <p className="text-gray-500 text-sm max-w-[220px] leading-relaxed">
                    Tap &ldquo;Save idea&rdquo; on any experience to find it here.
                  </p>
                </div>
              ) : (
                <div className="px-5 pt-4 flex flex-col gap-4">
                  {savedExperiences.map((exp) => (
                    <ExperienceCard
                      key={exp.id}
                      experience={exp}
                      onClick={() => { savedScrollY.current = window.scrollY; setSelectedExperience(exp); }}
                    />
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Preferences */}
          {activeTab === "preferences" && (
            <div className="px-5 pt-6 space-y-7">
              {/* Group type */}
              <div>
                <p className="text-[13px] font-semibold text-gray-400 uppercase tracking-wide mb-3">
                  I usually go as
                </p>
                <div className="flex flex-wrap gap-2">
                  {GROUP_TYPES.map((type) => (
                    <button
                      key={type}
                      onClick={() => persistPreferences({ ...preferences, groupType: type })}
                      className={`px-4 py-2 rounded-full text-sm font-medium border transition-colors ${
                        preferences.groupType === type
                          ? "bg-[#416f7b] border-[#416f7b] text-white"
                          : "bg-white border-gray-200 text-gray-700 hover:border-gray-300"
                      }`}
                    >
                      {type}
                    </button>
                  ))}
                </div>
              </div>

              {/* Neighborhood */}
              <div>
                <p className="text-[13px] font-semibold text-gray-400 uppercase tracking-wide mb-3">
                  My neighborhood
                </p>
                <div className="flex flex-wrap gap-2">
                  {NEIGHBORHOODS.map((hood) => (
                    <button
                      key={hood}
                      onClick={() => persistPreferences({ ...preferences, neighborhood: hood })}
                      className={`px-4 py-2 rounded-full text-sm font-medium border transition-colors ${
                        preferences.neighborhood === hood
                          ? "bg-[#416f7b] border-[#416f7b] text-white"
                          : "bg-white border-gray-200 text-gray-700 hover:border-gray-300"
                      }`}
                    >
                      {hood}
                    </button>
                  ))}
                </div>
              </div>

              {/* Interests */}
              <div>
                <p className="text-[13px] font-semibold text-gray-400 uppercase tracking-wide mb-3">
                  I&apos;m into
                </p>
                <div className="flex flex-wrap gap-2">
                  {INTERESTS.map((interest) => (
                    <button
                      key={interest}
                      onClick={() => toggleInterest(interest)}
                      className={`px-4 py-2 rounded-full text-sm font-medium border transition-colors ${
                        preferences.interests.includes(interest)
                          ? "bg-[#FB6983] border-[#FB6983] text-white"
                          : "bg-white border-gray-200 text-gray-700 hover:border-gray-300"
                      }`}
                    >
                      {interest}
                    </button>
                  ))}
                </div>
              </div>

              {/* Hint */}
              <p className="text-xs text-gray-400 pb-2">
                These preferences will personalize your experience recommendations.
              </p>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
