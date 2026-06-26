"use client";

import { useState } from "react";
import Image, { type ImageProps } from "next/image";

/** Neutral placeholder shown when an image is missing or fails to load.
 *  The icon scales with the box (a third of its size, capped) so it looks
 *  right in both a full-size card and a tiny inset thumbnail. */
export function PhotoFallback({ fill = false }: { fill?: boolean }) {
  return (
    <div
      className={`${fill ? "absolute inset-0" : "w-full h-full"} flex items-center justify-center bg-gradient-to-br from-gray-100 to-gray-200`}
      aria-hidden="true"
    >
      <svg
        viewBox="0 0 24 24"
        fill="none"
        className="w-1/3 h-1/3 max-w-[36px] max-h-[36px] text-gray-300"
      >
        <path
          d="M3 5.5A2.5 2.5 0 0 1 5.5 3h13A2.5 2.5 0 0 1 21 5.5v13a2.5 2.5 0 0 1-2.5 2.5h-13A2.5 2.5 0 0 1 3 18.5v-13Zm2.5-.5a.5.5 0 0 0-.5.5v8.6l3.3-3.3a1 1 0 0 1 1.4 0l3.3 3.3 2.3-2.3a1 1 0 0 1 1.4 0L19 15.9V5.5a.5.5 0 0 0-.5-.5h-13ZM9 9.5A1.5 1.5 0 1 1 6 9.5a1.5 1.5 0 0 1 3 0Z"
          fill="currentColor"
        />
      </svg>
    </div>
  );
}

/** Drop-in replacement for next/image that degrades to a placeholder when
 *  the source 404s or otherwise fails to load — used so dead/missing place
 *  photos read as intentional empty states instead of broken-image glyphs. */
export function SafeImage({ className, alt, ...props }: ImageProps) {
  const [failed, setFailed] = useState(false);
  if (failed) {
    return <PhotoFallback fill={(props as { fill?: boolean }).fill ?? false} />;
  }
  return (
    <Image
      {...props}
      alt={alt}
      className={className}
      onError={() => setFailed(true)}
    />
  );
}
