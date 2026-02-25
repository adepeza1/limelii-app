import type { Metadata } from "next";
import Script from "next/script";
import { Inter, Poppins } from "next/font/google";
import { KindeProvider } from "@kinde-oss/kinde-auth-nextjs";
import { BottomNav } from "@/components/bottom-nav";
import { SplashScreen } from "@/components/splash-screen";
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

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <KindeProvider>
      <html lang="en">
        <body className={`${inter.variable} ${poppins.variable} antialiased pb-20`}>
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
