"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Banner } from "@astryxdesign/core/Banner";
import { Button } from "@astryxdesign/core/Button";
import { Card } from "@astryxdesign/core/Card";
import { Heading } from "@astryxdesign/core/Heading";
import { Text } from "@astryxdesign/core/Text";
import { TextInput } from "@astryxdesign/core/TextInput";
import { VStack } from "@astryxdesign/core/VStack";
import { api } from "@/lib/api";

export function LoginForm({ next, demoPhones }: { next: string | null; demoPhones: { label: string; phone: string }[] }) {
  const router = useRouter();
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [sent, setSent] = useState(false);
  const [demoCode, setDemoCode] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function requestCode() {
    setError(null);
    try {
      const r = await api<{ demoCode: string | null }>("/api/auth/otp", { body: { phone } });
      setSent(true);
      setDemoCode(r.demoCode);
    } catch (e) {
      setError((e as Error).message);
    }
  }

  async function verify() {
    setError(null);
    try {
      const r = await api<{ role: "owner" | "staff" }>("/api/auth/verify", { body: { phone, code } });
      const safeNext = next && next.startsWith("/") && !next.startsWith("//") ? next : null;
      router.push(safeNext ?? (r.role === "owner" ? "/owner" : "/staff"));
      router.refresh();
    } catch (e) {
      setError((e as Error).message);
    }
  }

  return (
    <Card padding={8} width="100%">
      <VStack gap={4}>
        <VStack gap={1} hAlign="center">
          <Heading level={1}>Staff and owner sign in</Heading>
          <Text type="supporting">We send a one-time code to your mobile.</Text>
        </VStack>
        {error ? <Banner status="error" title={error} /> : null}
        <TextInput label="Mobile number" type="tel" inputMode="tel" value={phone} onChange={setPhone} placeholder="90000 00001" size="lg" width="100%" isReadOnly={sent} onEnter={requestCode} />
        {sent ? (
          <>
            {demoCode ? <Banner status="info" title={`Demo OTP: ${demoCode}`} description="Shown on screen because this is a demo. A live venue gets the code by SMS or WhatsApp." /> : null}
            <TextInput label="6-digit code" value={code} onChange={setCode} inputMode="numeric" autoComplete="one-time-code" size="lg" width="100%" onEnter={verify} />
            <Button label="Sign in" variant="primary" size="lg" clickAction={verify} isDisabled={code.length !== 6} />
            <Button label="Use a different number" variant="ghost" onClick={() => { setSent(false); setCode(""); setDemoCode(null); }} />
          </>
        ) : (
          <Button label="Send code" variant="primary" size="lg" clickAction={requestCode} isDisabled={!phone.trim()} />
        )}
        <VStack gap={1}>
          <Text type="label">Demo logins</Text>
          {demoPhones.map((d) => (
            <Button key={d.phone} label={`${d.label}: ${d.phone}`} variant="ghost" size="sm" onClick={() => { setPhone(d.phone); setSent(false); }} />
          ))}
        </VStack>
      </VStack>
    </Card>
  );
}
