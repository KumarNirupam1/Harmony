import type { Metadata } from "next";
import { Geist, Geist_Mono, Instrument_Serif } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const instrument = Instrument_Serif({
  variable: "--font-instrument",
  subsets: ["latin"],
  weight: "400",
});

const site = "https://d32eo4z8j4qsxd.cloudfront.net";

export const metadata: Metadata = {
  metadataBase: new URL(site),
  title: "Harmony — Ride the current. Waste nothing.",
  description:
    "Mission planning for ocean-cleanup fleets. A differentiable physics engine that lets vessels ride ocean currents instead of fighting them.",
  icons: { icon: "/icon.svg" },
  openGraph: {
    title: "Harmony — Ride the current. Waste nothing.",
    description:
      "Differentiable mission planning for ocean-cleanup fleets. Compare Harmony against a random patrol on the same gyre.",
    url: site,
    siteName: "Harmony",
    type: "website",
    images: [{ url: "/og.svg", width: 1200, height: 630, alt: "Harmony wave mark" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Harmony — Ride the current. Waste nothing.",
    description:
      "Differentiable mission planning for ocean-cleanup fleets.",
    images: ["/og.svg"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} ${instrument.variable} h-full bg-background text-foreground antialiased`}
    >
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `try{if(localStorage.getItem("harmony-theme")==="dark")document.documentElement.classList.add("dark")}catch(e){}`,
          }}
        />
      </head>
      <body className="flex min-h-full flex-col bg-background text-foreground">{children}</body>
    </html>
  );
}
