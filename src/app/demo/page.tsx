import type { Metadata } from "next";
import { eq } from "drizzle-orm";
import { Banner } from "@astryxdesign/core/Banner";
import { Button } from "@astryxdesign/core/Button";
import { Card } from "@astryxdesign/core/Card";
import { Center } from "@astryxdesign/core/Center";
import { Grid } from "@astryxdesign/core/Grid";
import { Heading } from "@astryxdesign/core/Heading";
import { Text } from "@astryxdesign/core/Text";
import { VStack } from "@astryxdesign/core/VStack";
import { formatPhone } from "@/domain";
import { getDb } from "@/server/db/client";
import { orgs } from "@/server/db/schema";
import { DEMO_ORG_ID, DEMO_OWNER_PHONE, DEMO_STAFF_PHONE } from "@/server/db/seed";

export const metadata: Metadata = { title: "Try the demo" };
export const dynamic = "force-dynamic";

export default async function DemoPage() {
  const db = await getDb();
  const [org] = await db.select().from(orgs).where(eq(orgs.id, DEMO_ORG_ID));
  return (
    <Center role="main" axis="horizontal" padding={6}>
      <VStack gap={5} maxWidth="56rem" width="100%">
        <VStack gap={1}>
          <Heading level={1}>Try TurfTime</Heading>
          <Text type="supporting">A fictional venue, TurfTime Demo Arena in Pune, with four weeks of sample bookings. Payments and WhatsApp are simulated: no money moves and no message is sent.</Text>
        </VStack>
        <Banner status="warning" title="Demo data" description="All names and numbers are made up. The sign-in code is shown on screen." />
        <Grid columns={{ minWidth: 240, repeat: "fit" }} gap={4}>
          <Card>
            <VStack gap={2}>
              <Heading level={2}>1. Book as a player</Heading>
              <Text type="supporting">Open the booking page a QR code would open. Pick a slot, try split payment, pay the advance.</Text>
              {org ? <Button label="Open booking page" variant="primary" href={`/b/${org.publicToken}`} /> : <Text>Demo venue missing. Run pnpm db:seed.</Text>}
            </VStack>
          </Card>
          <Card>
            <VStack gap={2}>
              <Heading level={2}>2. Run the desk as staff</Heading>
              <Text type="supporting">Sign in with {formatPhone(DEMO_STAFF_PHONE)}. Book a walk-in, block a marketplace booking, collect a balance.</Text>
              <Button label="Staff sign in" variant="secondary" href="/login?next=/staff" />
            </VStack>
          </Card>
          <Card>
            <VStack gap={2}>
              <Heading level={2}>3. Check results as owner</Heading>
              <Text type="supporting">Sign in with {formatPhone(DEMO_OWNER_PHONE)}. See the heatmap, players, WhatsApp outbox, and send a fill offer.</Text>
              <Button label="Owner sign in" variant="secondary" href="/login?next=/owner" />
            </VStack>
          </Card>
        </Grid>
      </VStack>
    </Center>
  );
}
