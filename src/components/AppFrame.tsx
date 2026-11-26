import type { ReactNode } from "react";
import { Layout, LayoutContent, LayoutHeader } from "@astryxdesign/core/Layout";
import type { Session } from "@/server/session";
import { OWNER_LINKS, STAFF_LINKS, SiteNav } from "./SiteNav";

/** Frame for signed-in screens: top navigation plus content. */
export function AppFrame({ session, isDemo, children }: { session: Session; isDemo: boolean; children: ReactNode }) {
  return (
    <Layout
      height="auto"
      header={
        <LayoutHeader hasDivider padding={0}>
          <SiteNav links={session.role === "owner" ? OWNER_LINKS : STAFF_LINKS} userName={session.name} role={session.role} isDemo={isDemo} />
        </LayoutHeader>
      }
      content={
        <LayoutContent role="main" padding={6} isScrollable={false}>
          {children}
        </LayoutContent>
      }
    />
  );
}
