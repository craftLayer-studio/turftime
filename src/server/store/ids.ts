import { randomBytes, randomUUID } from "node:crypto";

export const newId = (prefix: string) => `${prefix}_${randomUUID().replace(/-/g, "").slice(0, 16)}`;

/** Unguessable URL token (128 bits, base64url). */
export const newToken = () => randomBytes(16).toString("base64url");
