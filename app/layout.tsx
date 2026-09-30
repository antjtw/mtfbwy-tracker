import type { Metadata, Viewport } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "MTFBWY Tracker",
  description: "Slot tracker for the MTFBWY RPG",
};

export const viewport: Viewport = { width: "device-width", initialScale: 1, themeColor: "#12171c" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-GB">
      <head>
        <link rel="preload" href="/fonts/ITCSerifGothic-Heavy.ttf" as="font" type="font/ttf" crossOrigin="" />
        <link rel="preload" href="/fonts/FFDINVariable.ttf" as="font" type="font/ttf" crossOrigin="" />
      </head>
      <body>
        <header className="site-header">
          <Link href="/" className="logo" aria-label="MTFBWY home">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo.svg" alt="MTFBWY" width={86} height={24} />
          </Link>
        </header>
        {children}
        <footer className="site-footer">
          <p>
            <strong>Legal disclaimer:</strong> MTFBWY RPG is a fan-created roleplaying game inspired by the Star Wars
            universe. All Star Wars material used within this game is the property of Lucasfilm Ltd. and The Walt Disney
            Company. This game is a non-commercial, fan-driven project intended solely for entertainment and educational
            purposes.
          </p>
        </footer>
      </body>
    </html>
  );
}
