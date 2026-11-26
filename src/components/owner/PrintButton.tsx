"use client";

import { Button } from "@astryxdesign/core/Button";

export function PrintButton() {
  return <Button label="Print QR sheet" variant="primary" onClick={() => window.print()} />;
}
