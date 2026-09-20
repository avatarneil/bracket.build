import { ClerkProvider } from "@clerk/nextjs";
import { shadcn } from "@clerk/ui/themes";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import { AccountSettingsProvider } from "@/contexts/AccountSettingsContext";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  colorScheme: "dark",
};

export const metadata: Metadata = {
  metadataBase: new URL("https://bracket.build"),
  title: "bracket.build | NFL Schedule & Playoff Predictions",
  description:
    "Follow preseason and regular-season games, then build and share your NFL playoff predictions.",
  applicationName: "bracket.build",
  authors: [{ name: "bracket.build" }],
  keywords: ["NFL", "playoffs", "bracket", "Super Bowl", "predictions", "football", "2025", "2026"],
  openGraph: {
    title: "bracket.build | NFL Schedule & Playoff Predictions",
    description: "Follow the NFL schedule, live scores, and playoff bracket in one place.",
    type: "website",
    siteName: "bracket.build",
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: "bracket.build | NFL Schedule & Playoff Predictions",
    description: "Follow the NFL schedule, live scores, and playoff bracket in one place.",
  },
  appleWebApp: {
    capable: true,
    title: "bracket.build",
    statusBarStyle: "black-translucent",
  },
  other: {
    "msapplication-TileColor": "#000000",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <ClerkProvider
          signInUrl="/sign-in"
          signUpUrl="/sign-up"
          signInFallbackRedirectUrl="/"
          signUpFallbackRedirectUrl="/"
          appearance={{
            theme: shadcn,
            elements: {
              formFieldInput: { minHeight: "44px", fontSize: "16px" },
              formButtonPrimary: { minHeight: "44px", touchAction: "manipulation" },
              socialButtonsIconButton: {
                minHeight: "44px",
                minWidth: "44px",
                touchAction: "manipulation",
              },
            },
          }}
        >
          <AccountSettingsProvider>{children}</AccountSettingsProvider>
          {/* Position toaster at top on mobile to avoid fixed bottom bar, bottom-right on desktop */}
          <Toaster richColors position="top-center" />
          <Analytics />
          <SpeedInsights />
        </ClerkProvider>
      </body>
    </html>
  );
}
