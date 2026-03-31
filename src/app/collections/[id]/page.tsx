"use client";

import { useState, useEffect } from "react";
import { ChevronLeft, Share2 } from "lucide-react";
import Link from "next/link";
import type { Experience } from "@/app/page";
import type { Collection } from "@/lib/collections";
import { saveCollection } from "@/lib/collections";
import { ExperienceCard } from "@/components/experience-card";
import { ExperienceDetail } from "@/components/experience-detail";
import { use } from "react";

interface PublicCollectionPageProps {
  params: Promise<{ id: string }>;
}

export default function PublicCollectionPage({ params }: PublicCollectionPageProps) {
  const { id } = use(params);
  const [collection, setCollection] = useState<Collection | null>(null);
  const [experiences, setExperiences] = useState<Experience[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selected, setSelected] = useState<Experience | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetch(`/api/collections/${id}`)
      .then((r) => {
        if (!r.ok) throw new Error("Collection not found or private");
        return r.json();
      })
      .then((col: Collection) => {
        setCollection(col);
        setExperiences(col._experiences ?? []);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [id]);

  async function handleShare() {
    const url = window.location.href;
    if (navigator.share) {
      await navigator.share({ title: collection?.name ?? "Collection", url });
    } else {
      await navigator.clipboard.writeText(url);
      alert("Link copied!");
    }
  }

  async function handleSave() {
    setSaving(true);
    try {
      await saveCollection(Number(id));
      setSaved(true);
    } catch {
      alert("Please log in to save this collection.");
    } finally {
      setSaving(false);
    }
  }

  if (selected) {
    return <ExperienceDetail experience={selected} onBack={() => setSelected(null)} />;
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <p className="text-[#667085] text-sm">Loading…</p>
      </div>
    );
  }

  if (error || !collection) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center gap-4 px-5">
        <p className="text-[#101828] font-semibold text-base">Collection not found</p>
        <p className="text-[#667085] text-sm text-center">
          This collection may be private or may no longer exist.
        </p>
        <Link href="/" className="text-[#FB6983] text-sm font-semibold">
          Back to Discover
        </Link>
      </div>
    );
  }

  return (
    <div className="bg-white min-h-screen max-w-5xl mx-auto">
      <div className="h-[44px]" />

      {/* Header */}
      <header className="flex items-center gap-3 px-4 py-3 h-12">
        <Link href="/" aria-label="Back to home">
          <ChevronLeft className="w-6 h-6 text-black" />
        </Link>
        <h1 className="flex-1 text-center text-lg font-medium text-black truncate">
          {collection.name}
        </h1>
        <button onClick={handleShare} aria-label="Share" className="p-2">
          <Share2 className="w-5 h-5 text-[#344054]" />
        </button>
      </header>

      {/* Meta */}
      <div className="px-5 pb-4">
        {collection.owner_handle && (
          <p className="text-xs text-[#98A2B3] mb-1">by @{collection.owner_handle}</p>
        )}
        {collection.description && (
          <p className="text-[#667085] text-sm mb-3">{collection.description}</p>
        )}
        <p className="text-xs text-[#98A2B3]">
          {experiences.length} {experiences.length === 1 ? "experience" : "experiences"}
        </p>

        {/* Save CTA */}
        {!saved ? (
          <button
            onClick={handleSave}
            disabled={saving}
            className="mt-4 w-full bg-[#FB6983] text-white font-semibold rounded-2xl py-3 text-sm disabled:opacity-50"
          >
            {saving ? "Saving…" : "Save Collection"}
          </button>
        ) : (
          <p className="mt-4 text-center text-sm text-[#027A48] font-medium">
            Saved to your Collections
          </p>
        )}
      </div>

      {/* Experience list */}
      {experiences.length === 0 ? (
        <div className="px-5 py-16 text-center">
          <p className="text-[#667085] text-sm">No experiences in this collection yet.</p>
        </div>
      ) : (
        <div className="px-5 flex flex-col gap-4 pb-28">
          {experiences.map((exp) => (
            <ExperienceCard
              key={exp.id}
              experience={exp}
              onClick={() => setSelected(exp)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
