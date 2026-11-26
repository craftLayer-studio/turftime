import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Providers } from "./providers";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.APP_URL ?? "https://turftime.craftlayer.store"),
  title: { default: "TurfTime: zero-commission turf and court booking", template: "%s | TurfTime" },
  description: "Your own booking page for turfs, box cricket and badminton or pickleball courts. QR and link booking, advance payment, no double bookings, WhatsApp reminders. By CraftLayer.",
};

export const viewport: Viewport = { width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-IN">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
