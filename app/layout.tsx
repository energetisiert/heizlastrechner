import type { Metadata, Viewport } from "next";
import "./globals.css";
import { IdleLogout } from "@/components/IdleLogout";

// Schriften wie im geprueften Prototyp per Link-Tag statt next/font/google,
// damit kein Build-Zeit-Fetch von Google Fonts noetig ist.
export const metadata: Metadata = {
  title: "Heizlastrechner | energetisiert.",
  description: "Heizlast berechnen ueber Gebaeudehuelle oder Verbrauch, kostenlos und ohne Anmeldung.",
};

// Ohne dieses explizite viewport-Meta behandeln mobile Browser die Seite wie
// eine ~980px breite Desktop-Seite und skalieren sie insgesamt herunter --
// dadurch wirkt alles verkleinert und schlecht zentriert. userScalable:false
// unterbindet zusaetzlich Pinch-Zoom in beide Richtungen (Produktentscheidung).
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
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
      <body className="min-h-full flex flex-col font-sans">{children}<IdleLogout /></body>
    </html>
  );
}
