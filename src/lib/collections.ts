// ─── Types ────────────────────────────────────────────────────────────────────

export interface Collection {
  id: number;
  created_at: number;
  name: string;
  description: string;
  is_public: boolean;
  owner_user_id: number;
  owner_handle?: string; // populated by API for saved-from-others
  experience_ids: number[];
}

export interface SavedCollection {
  id: number;
  created_at: number;
  user_id: number;
  collection_id: number;
  collection: Collection; // joined by API
}

export interface CollectionsResponse {
  my_collections: Collection[];
  saved_collections: SavedCollection[];
}

// ─── Client-side API helpers ──────────────────────────────────────────────────
// These call the Next.js BFF routes, which in turn proxy to Xano.

export async function listCollections(): Promise<CollectionsResponse> {
  const res = await fetch("/api/collections");
  if (!res.ok) throw new Error("Failed to load collections");
  return res.json();
}

export async function createCollection(data: {
  name: string;
  description: string;
  is_public: boolean;
}): Promise<Collection> {
  const res = await fetch("/api/collections", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    try {
      const xano = JSON.parse(body.xano_error ?? "{}");
      if (xano.message?.toLowerCase().includes("duplicate")) {
        throw new Error("A collection with this name already exists.");
      }
    } catch (e) {
      if (e instanceof Error && e.message.includes("already exists")) throw e;
    }
    throw new Error("Failed to create collection");
  }
  return res.json();
}

export async function getCollection(id: number): Promise<Collection> {
  const res = await fetch(`/api/collections/${id}`);
  if (!res.ok) throw new Error("Failed to load collection");
  return res.json();
}

export async function updateCollection(
  id: number,
  data: Partial<{ name: string; description: string; is_public: boolean }>
): Promise<Collection> {
  const res = await fetch(`/api/collections/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("Failed to update collection");
  return res.json();
}

export async function deleteCollection(id: number): Promise<void> {
  const res = await fetch(`/api/collections/${id}`, { method: "DELETE" });
  if (!res.ok) throw new Error("Failed to delete collection");
}

export async function addExperienceToCollection(
  collectionId: number,
  experienceId: number,
  currentExperienceIds?: number[] | string
): Promise<Collection> {
  const res = await fetch(`/api/collections/${collectionId}/experiences`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ experience_id: experienceId, current_experience_ids: currentExperienceIds ?? [] }),
  });
  if (!res.ok) throw new Error("Failed to add experience to collection");
  return res.json();
}

export async function removeExperienceFromCollection(
  collectionId: number,
  experienceId: number,
  currentExperienceIds?: number[] | string
): Promise<Collection> {
  const res = await fetch(
    `/api/collections/${collectionId}/experiences/${experienceId}`,
    {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ current_experience_ids: currentExperienceIds ?? [] }),
    }
  );
  if (!res.ok) throw new Error("Failed to remove experience from collection");
  return res.json();
}

export async function listPublicCollections(): Promise<Collection[]> {
  const res = await fetch("/api/collections/public");
  if (!res.ok) throw new Error("Failed to load public collections");
  return res.json();
}

export async function saveCollection(collectionId: number): Promise<void> {
  const res = await fetch(`/api/collections/${collectionId}/save`, {
    method: "POST",
  });
  if (!res.ok) throw new Error("Failed to save collection");
}
