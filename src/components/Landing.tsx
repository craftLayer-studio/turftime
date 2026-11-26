"use client";

import { Badge } from "@astryxdesign/core/Badge";
import { Button } from "@astryxdesign/core/Button";
import { Card } from "@astryxdesign/core/Card";
import { Divider } from "@astryxdesign/core/Divider";
import { Grid } from "@astryxdesign/core/Grid";
import { Heading } from "@astryxdesign/core/Heading";
import { HStack } from "@astryxdesign/core/HStack";
import { Layout, LayoutContent, LayoutFooter, LayoutHeader } from "@astryxdesign/core/Layout";
import { Link } from "@astryxdesign/core/Link";
import { Table } from "@astryxdesign/core/Table";
import { Text } from "@astryxdesign/core/Text";
import { TopNav } from "@astryxdesign/core/TopNav";
import { VStack } from "@astryxdesign/core/VStack";

const FEATURES = [
  { title: "Booking page from a QR or link", body: "Players scan the QR at the gate or tap your Instagram bio link, see live slots with prices, and book in under a minute. No app." },
  { title: "Advance payment, balance at venue", body: "Collect 30% (your choice) by UPI to confirm. Slots are held for 7 minutes while the player pays, then released." },
  { title: "Never double-booked", body: "Online, phone, walk-in and marketplace bookings share one calendar. The database itself refuses a second booking for the same slot." },
  { title: "Peak, off-peak and weekend prices", body: "Set evening peak rates, cheaper afternoons, weekend and holiday prices. The right price shows on every slot." },
  { title: "Split payment among players", body: "The captain shares one WhatsApp link. Each friend pays their share. The slot confirms when the advance is covered." },
  { title: "Your players, your CRM", body: "Every player and split-payer is saved with consent: visits, spend, no-shows and tags like Regular or Lapsed." },
  { title: "WhatsApp confirmations and reminders", body: "Booking confirmations go out at once and reminders 3 hours before play, only to players who said yes." },
  { title: "Fill empty afternoons", body: "Send a discount on an empty slot to opted-in regulars who play at similar times. See the rupees recovered." },
  { title: "Owner dashboard", body: "Utilisation heatmap by hour, revenue, advance vs balance, and no-show rate, on your phone." },
];

const PLANS = [
  { id: "ppb", plan: "Pay per booking", price: "₹0 + ₹19 per online booking", fit: "Try it with no fixed fee" },
  { id: "starter", plan: "Starter", price: "₹1,499 / month", fit: "1 venue, up to 2 courts" },
  { id: "growth", plan: "Growth", price: "₹2,999 / month", fit: "Up to 6 courts" },
  { id: "pro", plan: "Pro", price: "₹5,499 / month", fit: "Multi-venue, up to 15 courts" },
];

const SAMPLE = [
  { t: "6 pm", p: "₹1,400", s: "Peak" },
  { t: "7 pm", p: "Booked", s: "" },
  { t: "8 pm", p: "₹1,400", s: "Peak" },
  { t: "3 pm", p: "₹560", s: "Offer" },
];

export function Landing() {
  return (
    <Layout
      height="auto"
      header={
        <LayoutHeader hasDivider padding={0}>
          <TopNav
            heading={
              <Text weight="bold" size="lg">
                TurfTime
              </Text>
            }
            endContent={
              <HStack gap={2}>
                <Button label="Sign in" variant="ghost" href="/login" />
                <Button label="Try the demo" variant="primary" href="/demo" />
              </HStack>
            }
          />
        </LayoutHeader>
      }
      content={
        <LayoutContent role="main" padding={6} isScrollable={false}>
          <VStack gap={10} maxWidth="72rem" width="100%">
            <Grid columns={{ minWidth: 320, max: 2, repeat: "fit" }} gap={8} align="center">
              <VStack gap={5}>
                <Badge label="For turfs, box cricket, badminton and pickleball courts" variant="green" />
                <Heading level={1} type="display-2" textWrap="balance">
                  Your own booking app. Zero commission.
                </Heading>
                <Text type="large" color="secondary">
                  Fill every slot and get paid upfront. Players book and pay an advance from a QR code or link; your staff book walk-ins on the same calendar, so a slot can never be sold twice.
                </Text>
                <HStack gap={3} wrap="wrap">
                  <Button label="Try the demo" variant="primary" size="lg" href="/demo" />
                  <Button label="See pricing" variant="secondary" size="lg" href="#pricing" />
                </HStack>
              </VStack>
              <Card elevation="med" padding={6}>
                <VStack gap={3}>
                  <Text weight="bold">Box Cricket A, today</Text>
                  <Grid columns={2} gap={2}>
                    {SAMPLE.map((s) => (
                      <Card key={s.t} variant={s.s === "Offer" ? "green" : s.p === "Booked" ? "muted" : "default"} padding={3}>
                        <VStack gap={0.5}>
                          <Text weight="semibold">{s.t}</Text>
                          <Text type="supporting">{s.p}</Text>
                          <Text type="supporting" size="xsm" color="accent">
                            {s.s || " "}
                          </Text>
                        </VStack>
                      </Card>
                    ))}
                  </Grid>
                  <Button label="Hold slot and pay ₹420" variant="primary" width="100%" href="/demo" />
                </VStack>
              </Card>
            </Grid>

            <VStack gap={4}>
              <Heading level={2}>Everything a busy turf needs</Heading>
              <Grid columns={{ minWidth: 260, repeat: "fit" }} gap={4}>
                {FEATURES.map((f) => (
                  <VStack key={f.title} gap={1}>
                    <Text weight="semibold">{f.title}</Text>
                    <Text type="supporting">{f.body}</Text>
                  </VStack>
                ))}
              </Grid>
            </VStack>

            <Divider />

            <VStack gap={3}>
              <Heading level={2}>How it works</Heading>
              <Grid columns={{ minWidth: 220, repeat: "fit" }} gap={4}>
                <Card variant="muted"><VStack gap={1}><Text weight="semibold">1. Print your QR</Text><Text type="supporting">Set courts, hours and prices. Print the QR sheet and add the link to your Instagram bio.</Text></VStack></Card>
                <Card variant="muted"><VStack gap={1}><Text weight="semibold">2. Players book and pay</Text><Text type="supporting">They pick a slot, pay the advance by UPI and get a WhatsApp confirmation.</Text></VStack></Card>
                <Card variant="muted"><VStack gap={1}><Text weight="semibold">3. Staff run the desk</Text><Text type="supporting">Walk-ins, phone bookings and marketplace blocks in two taps. Collect the balance after play.</Text></VStack></Card>
                <Card variant="muted"><VStack gap={1}><Text weight="semibold">4. You fill the gaps</Text><Text type="supporting">See empty hours on the heatmap and send offers to your regulars.</Text></VStack></Card>
              </Grid>
            </VStack>

            <VStack gap={3}>
              <Heading level={2}>
                <Link href="#pricing" color="inherit">
                  Pricing
                </Link>
              </Heading>
              <Text type="supporting">Flat fee, 0% commission. Prices exclude 18% GST. Annual billing: 2 months free. Payment gateway fees are paid by the venue to its gateway.</Text>
              <Table data={PLANS} idKey="id" columns={[{ key: "plan", header: "Plan" }, { key: "price", header: "Price" }, { key: "fit", header: "For" }]} />
            </VStack>
          </VStack>
        </LayoutContent>
      }
      footer={
        <LayoutFooter hasDivider>
          <HStack gap={4} wrap="wrap" hAlign="between">
            <Text type="supporting">
              TurfTime by <Link href="https://craftlayer.store">CraftLayer Studio</Link>. Support: <Link href="mailto:turftime@craftlayer.store">turftime@craftlayer.store</Link>. General: <Link href="mailto:hello@craftlayer.store">hello@craftlayer.store</Link>.
            </Text>
            <Text type="supporting">
              Commercial licences: <Link href="mailto:licensing@craftlayer.store">licensing@craftlayer.store</Link>
            </Text>
          </HStack>
        </LayoutFooter>
      }
    />
  );
}
