import Image from "next/image";
import { RightNowFeed } from "@/components/right-now/right-now-feed";

export default function RightNowPage() {
  // Behind a flag so production keeps the "Coming soon" placeholder until launch.
  if (process.env.NEXT_PUBLIC_RIGHT_NOW === "1") {
    return <RightNowFeed />;
  }

  return (
    <div className="bg-white min-h-screen max-w-5xl mx-auto flex flex-col">
      <div className="h-[env(safe-area-inset-top,44px)]" />
      <div
        className="flex-1 flex flex-col items-center justify-center px-8 text-center"
        style={{ paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 120px)" }}
      >
        <Image
          src="/images/limeliFavicon.png"
          alt="limelii"
          width={64}
          height={64}
          className="mb-6"
          priority
        />
        <h1 className="text-2xl font-bold text-gray-900">Right Now</h1>
        <p className="mt-2 text-sm text-gray-500 max-w-xs">
          See what&apos;s happening around you in the moment. Coming soon.
        </p>
        <span className="mt-6 inline-block rounded-full bg-[#f2f4f7] px-4 py-1.5 text-xs font-semibold text-gray-500">
          Coming soon
        </span>
      </div>
    </div>
  );
}
