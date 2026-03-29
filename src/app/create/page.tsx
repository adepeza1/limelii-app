"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { ChatKit, useChatKit } from "@openai/chatkit-react";

export default function CreatePage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  const handleRouteChoice = useCallback(
    async (action: Record<string, unknown>) => {
      if (action.type !== "route.select") return;

      const payload = action.payload as {
        data?: { stops?: unknown[]; name?: string };
      } | null;

      const itineraryData = {
        locations: payload?.data?.stops ?? [],
        itinerary_name: payload?.data?.name ?? "",
      };

      try {
        const res = await fetch("/api/chatkit/add-experience", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(itineraryData),
        });

        if (!res.ok) {
          setError("Failed to save route. Please try again.");
          return;
        }

        router.push("/profile?creating=true");
      } catch {
        setError("Failed to save route. Please try again.");
      }
    },
    [router]
  );

  const { control } = useChatKit({
    api: {
      async getClientSecret(currentClientSecret) {
        const res = await fetch("/api/chatkit/session", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(
            currentClientSecret ? { currentClientSecret } : {}
          ),
        });
        if (!res.ok) throw new Error("Failed to get chatkit session");
        const data = await res.json();
        return data.client_secret;
      },
    },
    widgets: {
      onAction: handleRouteChoice,
    },
    theme: {
      colorScheme: "light",
      color: { accent: { primary: "#707070", level: 2 } },
      radius: "round",
      density: "normal",
      typography: {
        baseSize: 14,
        fontFamily: "Open Sans, sans-serif",
      },
    },
    composer: {
      placeholder: "Find new places to go in New York\u2026",
      attachments: {
        enabled: false,
        maxSize: 20 * 1024 * 1024,
        maxCount: 3,
        accept: { "application/pdf": [".pdf"], "image/*": [".png", ".jpg"] },
      },
    },
    startScreen: {
      greeting: "What can I help with today?",
      prompts: [
        {
          label: "I'm bored, entertain me",
          prompt: "I'm bored, entertain me",
          icon: "lightbulb",
        },
        {
          label: "Outside WFH Day",
          prompt: "I am WFH outside where could I go?",
          icon: "compass",
        },
        {
          label:
            "Out of town friends visiting, what should we do this weekend?",
          prompt:
            "Out of town friends visiting, what should we do this weekend?",
          icon: "compass",
        },
        {
          label: "First date ideas in Williamsburg",
          prompt: "First date ideas in Williamsburg",
          icon: "star",
        },
        {
          label: "After work drinks in Midtown",
          prompt: "After work drinks in Midtown",
          icon: "sparkle",
        },
        {
          label: "Cheap drinks in the East Village",
          prompt: "Cheap drinks in the East Village",
          icon: "atom",
        },
        {
          label: "Latin nightlife",
          prompt: "Latin nightlife",
          icon: "keys",
        },
        {
          label: "LGBTQ+ friendly bars",
          prompt: "LGBTQ+ friendly bars",
          icon: "plus",
        },
        {
          label: "Art galleries in Chelsea",
          prompt: "Art galleries in Chelsea",
          icon: "images",
        },
      ],
    },
  });

  return (
    <div className="flex flex-col h-[100dvh] bg-white">
      <header className="shrink-0 border-b border-gray-100">
        <div className="h-[env(safe-area-inset-top,44px)]" />
        <div className="max-w-5xl mx-auto px-4 py-2.5">
          <h1 className="text-lg font-medium text-black">Create</h1>
        </div>
      </header>

      <div className="flex-1 min-h-0 w-full max-w-5xl mx-auto px-1 pb-20 sm:pb-24 relative">
        <p className="absolute top-2 left-4 right-16 text-sm text-gray-500 z-10 pointer-events-none">Describe what you&apos;re in the mood for and we&apos;ll build you a personalized NYC itinerary.</p>
        <ChatKit control={control} className="h-full w-full" />
      </div>

      {error && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl p-6 mx-4 max-w-sm w-full shadow-lg text-center">
            <p className="text-gray-900 font-medium mb-4">{error}</p>
            <button
              onClick={() => setError(null)}
              className="w-full py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-medium transition-colors"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
