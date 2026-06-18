import crypto from "node:crypto";
import type { LicensePayload } from "./types";

/* HMAC-signed license tokens. The Stripe checkout flow issues one after a
   successful payment (see app/api/license/route.ts); the draft API verifies
   it server-side before using Claude. No database required for the MVP —
   tokens are self-contained and expiring. */

function b64url(input: string): string {
  return Buffer.from(input).toString("base64url");
}

export function signLicense(payload: LicensePayload, secret: string): string {
  const body = b64url(JSON.stringify(payload));
  const sig = crypto.createHmac("sha256", secret).update(body).digest("base64url");
  return `${body}.${sig}`;
}

export function verifyLicense(
  token: string,
  secret: string,
): LicensePayload | null {
  try {
    const [body, sig] = token.split(".");
    if (!body || !sig) return null;
    const expected = crypto
      .createHmac("sha256", secret)
      .update(body)
      .digest("base64url");
    const a = Buffer.from(sig);
    const b = Buffer.from(expected);
    if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
    const payload = JSON.parse(
      Buffer.from(body, "base64url").toString(),
    ) as LicensePayload;
    if (typeof payload.exp === "number" && payload.exp < Date.now()) return null;
    if (payload.plan !== "pro") return null;
    return payload;
  } catch {
    return null;
  }
}
