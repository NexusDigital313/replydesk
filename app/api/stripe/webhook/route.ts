import { NextResponse } from "next/server";
import crypto from "node:crypto";
import { revoke, unrevoke } from "@/lib/kv";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/* Stripe webhook → instant Pro revocation. Verifies the Stripe-Signature header
   with node:crypto (no SDK), then flags/unflags the subscription in KV so the
   draft API cuts Claude off the moment a subscription is cancelled — not just on
   the customer's next visit. Point a Stripe webhook at /api/stripe/webhook for:
   customer.subscription.deleted / updated / paused. */

const ACTIVE = new Set(["active", "trialing", "past_due"]);
const TOLERANCE_SECONDS = 60 * 5; // reject signatures older than 5 minutes (replay)

function verifySignature(payload: string, header: string | null, secret: string): boolean {
  if (!header) return false;
  let t = "";
  const sigs: string[] = [];
  for (const part of header.split(",")) {
    const i = part.indexOf("=");
    if (i === -1) continue;
    const k = part.slice(0, i);
    const v = part.slice(i + 1);
    if (k === "t") t = v;
    else if (k === "v1") sigs.push(v);
  }
  if (!t || sigs.length === 0) return false;

  const ts = Number.parseInt(t, 10);
  if (!Number.isFinite(ts) || Math.abs(Date.now() / 1000 - ts) > TOLERANCE_SECONDS) {
    return false;
  }

  const expected = crypto
    .createHmac("sha256", secret)
    .update(`${t}.${payload}`)
    .digest("hex");
  const a = Buffer.from(expected);
  return sigs.some((s) => {
    const b = Buffer.from(s);
    return a.length === b.length && crypto.timingSafeEqual(a, b);
  });
}

export async function POST(req: Request) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "Webhook not configured" }, { status: 400 });
  }

  const payload = await req.text(); // RAW body — required for signature verification
  const sig = req.headers.get("stripe-signature");
  if (!verifySignature(payload, sig, secret)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  let event: { type?: string; data?: { object?: Record<string, unknown> } };
  try {
    event = JSON.parse(payload);
  } catch {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const obj = event.data?.object ?? {};
  const subId = obj.object === "subscription" && typeof obj.id === "string" ? obj.id : undefined;
  const status = typeof obj.status === "string" ? obj.status : "";

  if (subId) {
    switch (event.type) {
      case "customer.subscription.deleted":
        await revoke(subId);
        break;
      case "customer.subscription.updated":
      case "customer.subscription.paused":
        if (ACTIVE.has(status)) await unrevoke(subId);
        else await revoke(subId);
        break;
      default:
        break; // ignore all other event types
    }
  }

  return NextResponse.json({ received: true });
}
