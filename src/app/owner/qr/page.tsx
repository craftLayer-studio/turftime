import type { Metadata } from "next";
import QRCode from "qrcode";
import { Card } from "@astryxdesign/core/Card";
import { Grid } from "@astryxdesign/core/Grid";
import { Heading } from "@astryxdesign/core/Heading";
import { HStack } from "@astryxdesign/core/HStack";
import { Text } from "@astryxdesign/core/Text";
import { VStack } from "@astryxdesign/core/VStack";
import { ownerPage } from "@/components/owner/OwnerPage";
import { PrintButton } from "@/components/owner/PrintButton";
import styles from "@/components/owner/owner.module.css";
import { appUrl } from "@/server/store/urls";
import { listResources } from "@/server/store/venue";

export const metadata: Metadata = { title: "QR sheet" };
export const dynamic = "force-dynamic";

/** Printable QR sheet: one poster for the venue plus one card per court. All open the same booking page. */
export default async function QrPage() {
  return ownerPage("/owner/qr", async ({ db, org }) => {
    const url = `${appUrl()}/b/${org.publicToken}`;
    const svg = await QRCode.toString(url, { type: "svg", margin: 1, errorCorrectionLevel: "M" });
    const src = `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
    const resources = await listResources(db, org.id);
    return (
      <VStack gap={5}>
        <HStack hAlign="between" vAlign="center" wrap="wrap" gap={3} className="no-print">
          <VStack gap={1}>
            <Heading level={1}>QR sheet</Heading>
            <Text type="supporting">Print and stick at the gate, the dugout and the counter. Share the same link in your Instagram bio and WhatsApp groups.</Text>
          </VStack>
          <PrintButton />
        </HStack>
        <Card padding={8}>
          <VStack gap={3} hAlign="center">
            <Heading level={2}>{org.name}</Heading>
            <Text type="large">Scan to book your slot</Text>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={src} alt={`QR code that opens ${url}`} className={styles.qr} />
            <Text type="code">{url}</Text>
            <Text type="supporting">Pay a small advance online. Balance at the venue. No app needed.</Text>
          </VStack>
        </Card>
        <Grid columns={{ minWidth: 220, repeat: "fill" }} gap={4}>
          {resources.map((r) => (
            <Card key={r.id}>
              <VStack gap={2} hAlign="center">
                <Text weight="bold">{r.name}</Text>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={src} alt={`QR code for booking ${r.name}`} className={styles.qr} />
                <Text type="supporting">Scan to book {r.sport.toLowerCase()}</Text>
              </VStack>
            </Card>
          ))}
        </Grid>
      </VStack>
    );
  });
}
