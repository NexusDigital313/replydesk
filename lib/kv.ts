/* Tiny revocation store over the Vercel KV / Upstash Redis REST API — no SDK,
   consistent with how we call Stripe (fetch + Bearer token).

   When KV isn't configured the store is a no-op: nothing reads as revoked, so
   the app still runs fully DB-less and the /api/license re-verification (≤2-day
   token) remains the fallback. Configure KV + the Stripe webhook to upgrade that
   to INSTANT revocation. */

const KV_URL = process.env.KV_REST_API_URL;
const KV_TOKEN = process.env.KV_REST_API_TOKEN;

export const kvConfigured = !!(KV_URL && KV_TOKEN);

async function kvCmd(args: (string | number)[]): Promise<unknown> {
  if (!KV_URL || !KV_TOKEN) return null;
  const res = await fetch(KV_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${KV_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(args),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`KV ${args[0]} failed: ${res.status}`);
  const data = (await res.json()) as { result?: unknown };
  return data.result ?? null;
}

const key = (sub: string) => `revoked:${sub}`;
// keep the flag ~45 days — comfortably past the 2-day token — then let it expire
const TTL_SECONDS = 60 * 60 * 24 * 45;

export async function isRevoked(sub: string): Promise<boolean> {
  try {
    return (await kvCmd(["GET", key(sub)])) === "1";
  } catch {
    // Fail OPEN: a KV outage must never lock out a paying customer. Worst case
    // we fall back to the ≤2-day re-verification window.
    return false;
  }
}

export async function revoke(sub: string): Promise<void> {
  try {
    await kvCmd(["SET", key(sub), "1", "EX", TTL_SECONDS]);
  } catch {
    // Swallow — Stripe retries the webhook, and re-verification still catches it.
  }
}

export async function unrevoke(sub: string): Promise<void> {
  try {
    await kvCmd(["DEL", key(sub)]);
  } catch {
    /* ignore */
  }
}
