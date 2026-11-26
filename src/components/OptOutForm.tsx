"use client";

import { useState } from "react";
import { Banner } from "@astryxdesign/core/Banner";
import { Button } from "@astryxdesign/core/Button";
import { Card } from "@astryxdesign/core/Card";
import { Heading } from "@astryxdesign/core/Heading";
import { Text } from "@astryxdesign/core/Text";
import { VStack } from "@astryxdesign/core/VStack";
import { api } from "@/lib/api";

export function OptOutForm({ token, venue }: { token: string; venue: string | null }) {
  const [done, setDone] = useState<string | null>(null);
  if (!venue) return <Banner status="error" title="This link is not valid" />;
  const stop = (all: boolean) => async () => {
    await api(`/api/optout/${token}`, { body: { all } });
    setDone(all ? "You will get no more WhatsApp messages from this venue." : "You will get no more offers. Booking confirmations still come if you asked for them.");
  };
  return (
    <Card padding={8} maxWidth="30rem">
      <VStack gap={4}>
        <Heading level={1}>Stop messages from {venue}</Heading>
        {done ? (
          <Banner status="success" title="Done" description={done} />
        ) : (
          <>
            <Text>Choose what to stop. This is recorded straight away.</Text>
            <Button label="Stop offers only" variant="primary" clickAction={stop(false)} />
            <Button label="Stop all messages" variant="secondary" clickAction={stop(true)} />
          </>
        )}
      </VStack>
    </Card>
  );
}
