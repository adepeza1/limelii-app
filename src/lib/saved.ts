export interface SavedExperienceRecord {
  id: number;
  created_at: number;
  users_id: number;
  experience_id: number;
}

export async function listSavedExperiences(): Promise<SavedExperienceRecord[]> {
  const res = await fetch("/api/saved-experiences");
  if (!res.ok) throw new Error("Failed to load saved experiences");
  return res.json();
}

export async function saveExperience(experienceId: number): Promise<void> {
  const res = await fetch("/api/saved-experiences", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ experience_id: experienceId }),
  });
  if (!res.ok) throw new Error("Failed to save experience");
}

export async function unsaveExperience(experienceId: number): Promise<void> {
  const res = await fetch(`/api/saved-experiences/${experienceId}`, {
    method: "DELETE",
  });
  if (!res.ok) throw new Error("Failed to unsave experience");
}
