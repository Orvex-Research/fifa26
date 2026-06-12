import type { Metadata } from "next";
import "./globals.css";
import "./countdown.css";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";

const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://fifa26.eu.cc';

export const metadata: Metadata = {
  metadataBase: new URL(baseUrl),
  title: {
    default: "FIFA World Cup 2026 Live - Watch Live Matches & Streams",
    template: "%s | FIFA World Cup 2026 Live",
  },
  description: "Watch FIFA World Cup 2026 live streams, real-time match schedules, and HD broadcasts. The #1 destination for live FIFA World Cup 2026 coverage.",
  keywords: ["FIFA", "World Cup 2026", "Live Stream", "Football", "Soccer", "Matches"],
  openGraph: {
    title: "FIFA World Cup 2026 Live",
    description: "Watch FIFA World Cup 2026 live streams, real-time match schedules, and HD broadcasts.",
    url: baseUrl,
    siteName: "FIFA World Cup 2026 Live",
    locale: "en_US",
    type: "website",
    images: [
      {
        url: "/logo.png",
        width: 512,
        height: 512,
        alt: "FIFA World Cup 2026 Logo",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "FIFA World Cup 2026 Live",
    description: "Watch FIFA World Cup 2026 live streams, real-time match schedules, and HD broadcasts.",
    images: ["/logo.png"],
  },
  icons: {
    icon: [
      { url: '/logo.png', type: 'image/png', sizes: '512x512' },
    ],
    apple: [
      { url: '/logo.png', type: 'image/png', sizes: '512x512' },
    ],
    shortcut: '/logo.png',
  },
  verification: {
    google: "xXx3YZhikInZ8QsmYYXH-h68gJN_ZMuXyK8hpjbtFCk",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <meta name="google-site-verification" content="xXx3YZhikInZ8QsmYYXH-h68gJN_ZMuXyK8hpjbtFCk" />
      </head>
      <body>
        <div className="layout-container flex flex-col min-h-screen">
          <Navigation />
          <main className="main-wrapper flex-1">
            {children}
          </main>
          <Footer />
        </div>
      </body>
    </html>
  );
}

