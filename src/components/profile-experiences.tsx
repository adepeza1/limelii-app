"use client";

import { useEffect, useState } from "react";
import type { Experience } from "@/app/page";
import { ExperienceCard } from "./experience-card";
import { ExperienceDetail } from "./experience-detail";

export function ProfileExperiences() {
  const [experiences, setExperiences] = useState<Experience[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedExperience, setSelectedExperience] =
    useState<Experience | null>(null);

  useEffect(() => {
    async function fetchExperiences() {
      try {
        const res = await fetch("/api/user-experiences");
        if (!res.ok) {
          setError("Failed to load your experiences");
          return;
        }
        const data = await res.json();

        // The API returns { experiences: Experience[] } (flat array)
        setExperiences(Array.isArray(data.experiences) ? data.experiences : []);
      } catch {
        setError("Failed to load your experiences");
      } finally {
        setLoading(false);
      }
    }

    fetchExperiences();
  }, []);

  if (selectedExperience) {
    return (
      <ExperienceDetail
        experience={selectedExperience}
        onBack={() => setSelectedExperience(null)}
      />
    );
  }

  if (loading) {
    return (
      <div className="px-4 space-y-4 pb-24">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="w-full aspect-[33/38] rounded-[20px] bg-gray-100 animate-pulse"
          />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <p className="text-center text-gray-500 py-12 px-4">{error}</p>
    );
  }

  if (experiences.length === 0) {
    return (
      <p className="text-center text-gray-500 py-12 px-4">
        No experiences yet. Create one to get started!
      </p>
    );
  }

  return (
    <div className="px-4 pb-24 space-y-4 max-w-5xl mx-auto">
      {experiences.map((exp) => (
        <div key={exp.id} className="w-full">
          <ExperienceCard
            experience={exp}
            onClick={() => setSelectedExperience(exp)}
          />
        </div>
      ))}
    </div>
  );
}
