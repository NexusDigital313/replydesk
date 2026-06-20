import type { LicensePayload } from "./types";

/* Client-safe decode (no secret, no node:crypto). Reads the payload for UI
   purposes only — the server re-verifies the signature before honoring it. */
export function decodeLicense(token: string | null | undefined): LicensePayload | null {
  if (!token) return null;
  try {
    let body = token.split(".")[0];
    if (!body) return null;
    body = body.replace(/-/g, "+").replace(/_/g, "/");
    while (body.length % 4) body += "=";
    const json =
      typeof atob !== "undefined"
        ? atob(body)
        : Buffer.from(body, "base64").toString();
    const p = JSON.parse(json) as LicensePayload;
    if (typeof p.exp === "number" && p.exp < Date.now()) return null;
    if (p.plan !== "pro") return null;
    return p;
  } catch {
    return null;
  }
}
