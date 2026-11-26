import type { Metadata } from "next";
import { BookingApp } from "@/components/BookingApp";
import { Layout, LayoutContent } from "@astryxdesign/core/Layout";

export const metadata: Metadata = { title: "Book a slot", robots: { index: false } };

/** Public booking page opened from the venue QR code or link. No login, no app. */
export default async function BookPage({ params, searchParams }: { params: Promise<{ token: string }>; searchParams: Promise<{ offer?: string }> }) {
  const { token } = await params;
  const { offer } = await searchParams;
  return (
    <Layout
      height="auto"
      contentWidth="48rem"
      content={
        <LayoutContent role="main" padding={4} isScrollable={false}>
          <BookingApp venueToken={token} offerToken={typeof offer === "string" ? offer.slice(0, 64) : null} />
        </LayoutContent>
      }
    />
  );
}
