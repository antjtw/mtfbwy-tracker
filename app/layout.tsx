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
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        {/* Stand-in fonts until the licensed ones are added */}
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Barlow:wght@400;500;700&family=Oswald:wght@600;700&display=swap"
        />
      </head>
      <body>
        <header className="site-header">
          <Link href="/" className="logo" aria-label="MTFBWY home">
            MTF
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
              <circle cx="12" cy="12" r="10.5" />
              <path d="M12 4v16M12 9l-4 4M12 9l4 4M12 13l-3 3M12 13l3 3" />
            </svg>
            BWY
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
