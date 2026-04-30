import type { Metadata, Viewport } from "next";
import Script from "next/script";
import { Inter, Poppins } from "next/font/google";
import { KindeProvider } from "@kinde-oss/kinde-auth-nextjs";
import { BottomNav } from "@/components/bottom-nav";
import { SplashScreen } from "@/components/splash-screen";
import { ToastProvider } from "@/components/toast";
import { OnboardingWalkthrough } from "@/components/onboarding-walkthrough";
import { MixpanelProvider } from "@/components/mixpanel-provider";
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
  title: "limelii - Discover",
  description: "Discover experiences, events, and hidden gems near you",
};

export const viewport: Viewport = {
  viewportFit: "cover",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <KindeProvider>
      <html lang="en">
        <body className={`${inter.variable} ${poppins.variable} antialiased`} style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 4px)" }}>
          <Script
            src="https://cdn.platform.openai.com/deployments/chatkit/chatkit.js"
            strategy="beforeInteractive"
          />
          <ToastProvider>
            <MixpanelProvider />
            <SplashScreen>
              {children}
              <BottomNav />
            </SplashScreen>
            <OnboardingWalkthrough />
          </ToastProvider>
        </body>
      </html>
    </KindeProvider>
  );
}
