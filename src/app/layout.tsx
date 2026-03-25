import type { Metadata, Viewport } from "next";
import Script from "next/script";
import { Inter, Poppins } from "next/font/google";
import { KindeProvider } from "@kinde-oss/kinde-auth-nextjs";
import { BottomNav } from "@/components/bottom-nav";
import { SplashScreen } from "@/components/splash-screen";
import "@fontsource/mona-sans/400.css";
import "@fontsource/mona-sans/500.css";
import "@fontsource/mona-sans/600.css";
import "@fontsource/mona-sans/700.css";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["600"],
  variable: "--font-poppins",
});

export const metadata: Metadata = {
  title: "Limelii - Discover",
  description: "Discover experiences, events, and hidden gems near you",
};

export const viewport: Viewport = {
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <KindeProvider>
      <html lang="en">
        <body className={`${inter.variable} ${poppins.variable} antialiased`} style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 80px)" }}>
          <Script
            src="https://cdn.platform.openai.com/deployments/chatkit/chatkit.js"
            strategy="beforeInteractive"
          />
          <SplashScreen>
            {children}
            <BottomNav />
          </SplashScreen>
        </body>
      </html>
    </KindeProvider>
  );
}
