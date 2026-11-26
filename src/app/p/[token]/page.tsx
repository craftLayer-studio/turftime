import type { Metadata } from "next";
import { BookingStatus } from "@/components/BookingStatus";
import { Layout, LayoutContent } from "@astryxdesign/core/Layout";

export const metadata: Metadata = { title: "Your booking", robots: { index: false } };

/** Player's booking page: hold timer, advance payment, split shares, cancellation. Also the split-pay link. */
export default async function BookingPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  return (
    <Layout
      height="auto"
      contentWidth="48rem"
      content={
        <LayoutContent role="main" padding={4} isScrollable={false}>
          <BookingStatus token={token} />
        </LayoutContent>
      }
    />
  );
}
