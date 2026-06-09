export type RnCategory = "tables" | "events" | "activities";

export interface RightNowCard {
  /** source-prefixed id, e.g. "place:123" or "event:G5v..." */
  id: string;
  category: RnCategory;
  title: string;
  subtitle?: string;
  imageUrl?: string;
  neighborhood?: string;
  lat?: number;
  lng?: number;
  distanceMi?: number;
  priceIndicator?: string;
  availability: {
    // tables / activities
    openNow?: boolean;
    closesAt?: string;
    walkIn?: boolean;
    // events
    startsAt?: string; // ISO
    ticketsAvailable?: boolean;
    priceFrom?: number;
  };
  sourceType: "limelii" | "ticketmaster";
  action: { label: string; url: string };
}
