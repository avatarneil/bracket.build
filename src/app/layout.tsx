import { Analytics } from "@vercel/analytics/next";
import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
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
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
};

export const metadata: Metadata = {
  metadataBase: new URL("https://bracket.build"),
  title: "bracket.build | NFL Playoff Predictions 2025-26",
  description:
    "Build your NFL playoff bracket and share your Super Bowl predictions with friends and family. An unofficial bracket builder for the NFL postseason.",
  applicationName: "bracket.build",
  authors: [{ name: "bracket.build" }],
  keywords: [
    "NFL",
    "playoffs",
    "bracket",
    "Super Bowl",
    "predictions",
    "football",
    "2025",
    "2026",
  ],
  openGraph: {
    title: "bracket.build | NFL Playoff Predictions 2025-26",
    description:
      "Build your NFL playoff bracket and share your Super Bowl predictions with friends and family!",
    type: "website",
    siteName: "bracket.build",
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: "bracket.build | NFL Playoff Predictions 2025-26",
    description:
      "Build your NFL playoff bracket and share your Super Bowl predictions!",
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
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
        {/* Position toaster at top on mobile to avoid fixed bottom bar, bottom-right on desktop */}
        <Toaster richColors position="top-center" />
        <Analytics />
      </body>
    </html>
  );
}
