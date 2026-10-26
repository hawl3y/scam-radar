import { createHmac, timingSafeEqual } from "node:crypto";

// Signed links in emails let people change alerts without signing in
// (brief: never ask users to log in from an email).

function secret(): string {
  const s = process.env.EMAIL_TOKEN_SECRET;
  if (!s) throw new Error("Missing EMAIL_TOKEN_SECRET. See README.md.");
  return s;
}

function sign(payload: string, key: string): string {
  return createHmac("sha256", key).update(`email-prefs:${payload}`).digest("base64url");
}

export function createPrefsToken(userId: string, key = secret()): string {
  return `${Buffer.from(userId).toString("base64url")}.${sign(userId, key)}`;
}

export function verifyPrefsToken(token: string | null | undefined, key = secret()): string | null {
  if (!token) return null;
  const [encoded, signature, extra] = token.split(".");
  if (!encoded || !signature || extra !== undefined) return null;
  const userId = Buffer.from(encoded, "base64url").toString();
  if (!/^[0-9a-f-]{36}$/i.test(userId)) return null;
  const expected = Buffer.from(sign(userId, key));
  const given = Buffer.from(signature);
  return expected.length === given.length && timingSafeEqual(expected, given) ? userId : null;
}
