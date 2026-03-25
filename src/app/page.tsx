import { Suspense } from "react";
import { DiscoverPage } from "@/components/discover-page";

import { API_BASE } from "@/lib/xano";

export interface Place {
  id: number;
  name: string;
  neighborhood: string;
  borough: string;
  address?: string;
  address_line_1?: string;
  city?: string;
  state?: string;
  zipcode?: string;
  latlong?: { type: string; data: { lat: number; lng: number } } | null;
  display_images: { url: string }[] | null;
  _location_details: {
    Description: string;
    location_type: string[];
    phone?: string;
    url?: string;
    operating_hours?: string;
    photo: { url: string | null } | null;
  } | null;
}

export interface Experience {
  id: number;
  title: string;
  description: string;
  rating: number;
  places_id: Place[];
  category_id: number;
  neighborhoods: string[];
  activities: string[];
  budget: string[];
  indoor_outdoor: string[];
}

export interface ExperienceCategory {
  id: number;
  name: string;
}

export interface DiscoveryResponse {
  experiences: Record<string, Experience[]>;
  experience_categories: ExperienceCategory[];
}

async function getDiscoveryData(): Promise<DiscoveryResponse> {
  const res = await fetch(`${API_BASE}/discovery`, {
    next: { revalidate: 60 },
  });
  if (!res.ok) throw new Error("Failed to fetch discovery data");
  return res.json();
}

async function DiscoverContent() {
  const data = await getDiscoveryData();
  return <DiscoverPage data={data} />;
}

function DiscoverSkeleton() {
  return (
    <div className="bg-white min-h-screen max-w-5xl mx-auto">
      <header className="sticky top-0 z-10 bg-white">
        <div className="h-[44px]" />
        <div className="flex items-center justify-between px-4 py-2.5 border-b border-gray-100">
          <h1 className="text-lg font-medium text-black">Discover</h1>
        </div>
      </header>
      <div className="px-4 py-3 flex gap-6">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-5 w-16 bg-gray-100 rounded animate-pulse" />
        ))}
      </div>
      <div className="flex gap-4 pl-[22px] pr-4 pb-8">
        {[1, 2].map((i) => (
          <div
            key={i}
            className="shrink-0 w-[280px] sm:w-[330px] aspect-[33/38] rounded-[20px] bg-gray-100 animate-pulse"
          />
        ))}
      </div>
    </div>
  );
}

export default function Page() {
  return (
    <Suspense fallback={<DiscoverSkeleton />}>
      <DiscoverContent />
    </Suspense>
  );
}
