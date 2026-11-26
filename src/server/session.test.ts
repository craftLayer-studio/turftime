import { describe, expect, it } from "vitest";
import { decodeSession, encodeSession } from "./session";

describe("session cookie", () => {
  const s = { userId: "u1", orgId: "o1", role: "owner" as const, name: "A", exp: Date.now() + 60_000 };

  it("round-trips a signed session", () => {
    expect(decodeSession(encodeSession(s))).toMatchObject({ userId: "u1", role: "owner" });
  });

  it("rejects tampered or expired cookies", () => {
    const token = encodeSession(s);
    const forged = Buffer.from(JSON.stringify({ ...s, role: "owner", orgId: "o2" })).toString("base64url") + "." + token.split(".")[1];
    expect(decodeSession(forged)).toBeNull();
    expect(decodeSession(encodeSession({ ...s, exp: 1 }))).toBeNull();
    expect(decodeSession("junk")).toBeNull();
  });
});
