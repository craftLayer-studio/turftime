import type { Metadata } from "next";
import { Center } from "@astryxdesign/core/Center";
import { VStack } from "@astryxdesign/core/VStack";
import { formatPhone } from "@/domain";
import { LoginForm } from "@/components/LoginForm";
import { DEMO_OWNER_PHONE, DEMO_STAFF_PHONE } from "@/server/db/seed";

export const metadata: Metadata = { title: "Sign in" };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  return (
    <Center role="main" axis="both" padding={6} minHeight="100dvh">
      <VStack width="100%" maxWidth="30rem">
        <LoginForm
          next={typeof next === "string" ? next : null}
          demoPhones={[
            { label: "Owner (Sandeep)", phone: formatPhone(DEMO_OWNER_PHONE) },
            { label: "Staff (Imran)", phone: formatPhone(DEMO_STAFF_PHONE) },
          ]}
        />
      </VStack>
    </Center>
  );
}
