"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ChatKit, useChatKit } from "@openai/chatkit-react";
import { track } from "@/lib/mixpanel";

const AI_CONSENT_KEY = "limelii_ai_consent";

export default function CreatePage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [consentGiven, setConsentGiven] = useState<boolean | null>(null);

  useEffect(() => {
    setConsentGiven(localStorage.getItem(AI_CONSENT_KEY) === "1");
  }, []);

  const acceptConsent = () => {
    localStorage.setItem(AI_CONSENT_KEY, "1");
    setConsentGiven(true);
  };

  const declineConsent = () => {
    router.push("/");
  };

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
        track("AI Itinerary Generated", { name: itineraryData.itinerary_name, stop_count: (itineraryData.locations as unknown[]).length });
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
      placeholder: "Find new places to go in New York…",
      attachments: {
        enabled: false,
        maxSize: 20 * 1024 * 1024,
        maxCount: 3,
        accept: { "application/pdf": [".pdf"], "image/*": [".png", ".jpg"] },
      },
    },
    startScreen: {
      greeting: "Describe what you're in the mood for and we'll build you a personalized NYC itinerary.",
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

  if (consentGiven === null) {
    return <div className="flex flex-col h-[100dvh] bg-white" />;
  }

  if (!consentGiven) {
    return (
      <div className="flex flex-col h-[100dvh] bg-white">
        <header className="shrink-0 border-b border-gray-100">
          <div className="h-[env(safe-area-inset-top,44px)]" />
          <div className="max-w-5xl mx-auto px-4 py-2.5">
            <h1 className="text-lg font-medium text-black">limelii AI</h1>
          </div>
        </header>

        <div className="flex-1 flex items-center justify-center px-6">
          <div className="max-w-md w-full bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
            <h2 className="text-xl font-semibold text-gray-900 mb-3">
              Use AI to plan your day
            </h2>
            <p className="text-sm text-gray-700 mb-4 leading-relaxed">
              limelii AI uses <strong>OpenAI</strong> to turn your prompts into
              personalized NYC itineraries.
            </p>
            <div className="text-sm text-gray-700 mb-5 leading-relaxed">
              <p className="font-medium mb-2 text-gray-900">What gets sent to OpenAI:</p>
              <ul className="list-disc pl-5 space-y-1">
                <li>The prompts and messages you type</li>
                <li>A list of NYC venues from our catalog (no personal information)</li>
              </ul>
              <p className="font-medium mt-3 mb-2 text-gray-900">What does NOT get sent:</p>
              <ul className="list-disc pl-5 space-y-1">
                <li>Your name, email, or account details</li>
                <li>Your location</li>
                <li>Your saved collections or profile data</li>
              </ul>
            </div>
            <p className="text-xs text-gray-500 mb-5 leading-relaxed">
              OpenAI processes this data to generate responses and may retain it
              per their{" "}
              <a
                href="https://openai.com/policies/privacy-policy"
                target="_blank"
                rel="noopener noreferrer"
                className="underline"
              >
                privacy policy
              </a>
              . See our own{" "}
              <a href="/privacy" className="underline">
                Privacy Policy
              </a>{" "}
              for full details.
            </p>
            <div className="flex flex-col gap-2">
              <button
                onClick={acceptConsent}
                className="w-full py-3 rounded-full text-white font-semibold"
                style={{
                  background: "linear-gradient(135deg, #FB6983, #FF9A56)",
                }}
              >
                I agree, continue
              </button>
              <button
                onClick={declineConsent}
                className="w-full py-3 rounded-full text-gray-700 font-medium bg-gray-100"
              >
                Not now
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[100dvh] bg-white">
      <header className="shrink-0 border-b border-gray-100">
        <div className="h-[env(safe-area-inset-top,44px)]" />
        <div className="max-w-5xl mx-auto px-4 py-2.5">
          <h1 className="text-lg font-medium text-black">Create</h1>
        </div>
      </header>

      <div className="flex-1 min-h-0 w-full max-w-5xl mx-auto px-1 pb-20 sm:pb-24">
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
