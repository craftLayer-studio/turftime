"use client";

import NextLink from "next/link";
import type { ReactNode } from "react";
import { LinkProvider } from "@astryxdesign/core/Link";
import { Theme } from "@astryxdesign/core/theme";
import { defaultThemeSlug, themes } from "../astryx-themes";

export function Providers({ children }: { children: ReactNode }) {
  return (
    <Theme theme={themes[defaultThemeSlug]} mode="light">
      <LinkProvider component={NextLink}>{children}</LinkProvider>
    </Theme>
  );
}
