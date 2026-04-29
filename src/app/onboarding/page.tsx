"use client";

import { useState } from "react";
import { CheckCircle2 } from "lucide-react";
import { LimeliiLogo } from "@/components/limelii-logo";

export default function OnboardingPage() {
  const [username, setUsername] = useState("");
  const [usernameState, setUsernameState] = useState<"idle" | "checking" | "available" | "taken" | "error">("idle");
  const [saving, setSaving] = useState(false);
  const [checkTimer, setCheckTimer] = useState<ReturnType<typeof setTimeout> | null>(null);

  function handleUsernameChange(val: string) {
    // Only allow lowercase letters, numbers, underscores
    const clean = val.toLowerCase().replace(/[^a-z0-9_]/g, "");
    setUsername(clean);
    setUsernameState("idle");

    if (checkTimer) clearTimeout(checkTimer);
    if (clean.length < 3) return;

    setUsernameState("checking");
    const t = setTimeout(async () => {
      try {
        const res = await fetch(`/api/user/check_username?username=${encodeURIComponent(clean)}`);
        if (res.ok) {
          const data = await res.json();
          setUsernameState(data.available ? "available" : "taken");
        }
      } catch {
        setUsernameState("idle");
      }
    }, 500);
    setCheckTimer(t);
  }

  async function handleSubmit() {
    if (!username || username.length < 3) return;
    setSaving(true);
    try {
      const res = await fetch("/api/user/username", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        const msg = data?.message ?? "";
        if (msg.toLowerCase().includes("taken") || msg.toLowerCase().includes("duplicate")) {
          setUsernameState("taken");
        } else {
          setUsernameState("error");
        }
        setSaving(false);
        return;
      }

      // Mark onboarding complete
      await fetch("/api/user/onboarding", { method: "POST" });
      window.location.href = "/";
    } catch {
      setUsernameState("error");
      setSaving(false);
    }
  }

  const isValid = username.length >= 3 && usernameState !== "taken";

  return (
    <div className="min-h-screen bg-white flex flex-col px-6 pt-16" style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 40px)" }}>
      {/* Logo */}
      <div className="mb-6">
        <LimeliiLogo height={32} width="auto" />
        <p className="text-sm text-[#667085] mt-2">Let's set up your profile</p>
      </div>

      {/* Step */}
      <div className="flex-1">
        <h1 className="text-xl font-bold text-[#101828] mb-1">Choose a username</h1>
        <p className="text-sm text-[#667085] mb-8">
          This is how others will find and tag you. You can change it later.
        </p>

        <div className="relative">
          <div className="flex items-center border-2 rounded-2xl px-4 py-3 transition-colors"
            style={{
              borderColor:
                usernameState === "available" ? "#12B76A" :
                usernameState === "taken" || usernameState === "error" ? "#F04438" :
                username.length > 0 ? "#FF9A56" : "#EAECF0"
            }}
          >
            <span className="text-[#98A2B3] text-base mr-0.5">@</span>
            <input
              type="text"
              value={username}
              onChange={(e) => handleUsernameChange(e.target.value)}
              placeholder="yourname"
              maxLength={30}
              autoFocus
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              className="flex-1 text-base text-[#101828] placeholder:text-[#D0D5DD] outline-none bg-transparent"
            />
            {usernameState === "available" && (
              <CheckCircle2 className="w-5 h-5 text-[#12B76A] shrink-0" />
            )}
          </div>
        </div>

        {/* Hint text */}
        <p className="mt-2 text-xs px-1"
          style={{
            color:
              usernameState === "available" ? "#12B76A" :
              usernameState === "taken" ? "#F04438" :
              usernameState === "error" ? "#F04438" :
              "#98A2B3"
          }}
        >
          {usernameState === "available" ? "Username is available!" :
           usernameState === "taken" ? "That username is already taken." :
           usernameState === "error" ? "Something went wrong. Please try again." :
           usernameState === "checking" ? "Checking availability…" :
           "Lowercase letters, numbers, and underscores only. Min 3 characters."}
        </p>
      </div>

      {/* CTA */}
      <button
        onClick={handleSubmit}
        disabled={saving || !isValid}
        className="w-full bg-[#FF9A56] text-white font-semibold rounded-2xl py-4 text-base transition-opacity disabled:opacity-40"
      >
        {saving ? "Setting up…" : "Continue"}
      </button>
    </div>
  );
}
