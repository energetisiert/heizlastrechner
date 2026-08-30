import type { Metadata } from "next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import "./globals.css";

// Schriften wie im geprueften Prototyp per Link-Tag statt next/font/google,
// damit kein Build-Zeit-Fetch von Google Fonts noetig ist.
export const metadata: Metadata = {
  title: "Heizlastrechner | energetisiert.",
  description: "Heizlast berechnen ueber Gebaeudehuelle oder Verbrauch, kostenlos und ohne Anmeldung.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="de" className="h-full antialiased">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Montserrat:wght@600;700;800&family=Instrument+Sans:wght@400;500;600&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-full flex flex-col font-sans">
        {children}
        <SpeedInsights />
      </body>
    </html>
  );
}
