"use client";

import { useState, useEffect } from "react";
import Image from "next/image";

export function SplashScreen({ children }: { children: React.ReactNode }) {
  const [visible, setVisible] = useState(true);
  const [fading, setFading] = useState(false);

  useEffect(() => {
    const fadeTimer = setTimeout(() => setFading(true), 1700);
    const hideTimer = setTimeout(() => setVisible(false), 2000);
    return () => {
      clearTimeout(fadeTimer);
      clearTimeout(hideTimer);
    };
  }, []);

  return (
    <>
      {visible && (
        <div
          className={`fixed inset-0 z-[9999] bg-[#d3dde3] flex flex-col items-center justify-center transition-opacity duration-300 ${
            fading ? "opacity-0" : "opacity-100"
          }`}
        >
          <Image
            src="/limelii-logo.svg"
            alt="Limelii"
            width={319}
            height={126}
            priority
          />
          <p className="mt-4 text-[#f78539] text-sm font-semibold font-[family-name:var(--font-poppins),sans-serif]">
            Where Experiences Begin
          </p>
        </div>
      )}
      {children}
    </>
  );
}
