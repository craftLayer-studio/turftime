"use client";

import { Badge } from "@astryxdesign/core/Badge";
import { Button } from "@astryxdesign/core/Button";
import { HStack } from "@astryxdesign/core/HStack";
import { Text } from "@astryxdesign/core/Text";
import { TopNav, TopNavItem } from "@astryxdesign/core/TopNav";
import { usePathname, useRouter } from "next/navigation";
import { api } from "@/lib/api";

export interface NavLink {
  href: string;
  label: string;
}

/** Top bar for staff and owner screens. */
export function SiteNav({ links, userName, role, isDemo }: { links: NavLink[]; userName: string; role: "owner" | "staff"; isDemo: boolean }) {
  const path = usePathname();
  const router = useRouter();
  return (
    <TopNav
      label="TurfTime"
      heading={
        <HStack gap={2} vAlign="center">
          <Text weight="bold" size="lg">
            TurfTime
          </Text>
          {isDemo ? <Badge variant="warning" label="Demo" /> : null}
        </HStack>
      }
      startContent={links.map((l) => (
        <TopNavItem key={l.href} href={l.href} label={l.label} isSelected={path === l.href} />
      ))}
      endContent={
        <HStack gap={2} vAlign="center">
          <Text type="supporting">
            {userName} ({role})
          </Text>
          <Button
            label="Sign out"
            variant="ghost"
            size="sm"
            clickAction={async () => {
              await api("/api/auth/logout", { body: {} });
              router.push("/login");
            }}
          />
        </HStack>
      }
    />
  );
}

export const OWNER_LINKS: NavLink[] = [
  { href: "/owner", label: "Dashboard" },
  { href: "/staff", label: "Desk" },
  { href: "/owner/players", label: "Players" },
  { href: "/owner/offers", label: "Fill offers" },
  { href: "/owner/messages", label: "WhatsApp outbox" },
  { href: "/owner/settings", label: "Settings" },
  { href: "/owner/qr", label: "QR sheet" },
];

export const STAFF_LINKS: NavLink[] = [{ href: "/staff", label: "Desk" }];
