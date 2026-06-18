import { NextResponse } from "next/server";
import { signLicense } from "@/lib/license";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/* Two jobs, no database:
   1. {sessionId}     — after Stripe Checkout, verify the session is paid and
                        issue a signed, short-lived Pro license token.
   2. {subscription}  — re-verify an existing license against the LIVE Stripe
                        subscription and re-issue a fresh token, or reject (402)
                        if it's no longer active. The client calls this on load,
                        so a cancelled / refunded / lapsed subscription loses Pro
                        within ~a visit instead of coasting on a long token. */

const LICENSE_TTL_MS = 2 * 24 * 60 * 60 * 1000; // 2 days; renews on each visit
const ACTIVE = new Set(["active", "trialing", "past_due"]); // past_due = brief grace

async function stripeGet(path: string, sk: string) {
  const res = await fetch(`https://api.stripe.com/v1/${path}`, {
    headers: { Authorization: `Bearer ${sk}` },
  });
  const data = await res.json();
  return { ok: res.ok, data };
}

function issue(secret: string, customer?: string, sub?: string) {
  const now = Date.now();
  return signLicense(
    { plan: "pro", iat: now, exp: now + LICENSE_TTL_MS, customer, sub },
    secret,
  );
}

export async function POST(req: Request) {
  const sk = process.env.STRIPE_SECRET_KEY;
  const secret = process.env.LICENSE_SECRET;
  if (!sk || !secret) {
    return NextResponse.json({ error: "Billing is not configured" }, { status: 400 });
  }

  let body: { sessionId?: string; subscription?: string } = {};
  try {
    body = (await req.json()) ?? {};
  } catch {
    /* fall through to validation below */
  }

  // ── Re-verification: is this subscription still active? ──
  if (body.subscription) {
    const { ok, data: sub } = await stripeGet(
      `subscriptions/${encodeURIComponent(body.subscription)}`,
      sk,
    );
    if (!ok) {
      return NextResponse.json(
        { error: sub?.error?.message || "Could not check subscription" },
        { status: 502 },
      );
    }
    if (!ACTIVE.has(sub.status)) {
      return NextResponse.json({ active: false, status: sub.status }, { status: 402 });
    }
    const customer = typeof sub.customer === "string" ? sub.customer : undefined;
    return NextResponse.json({ license: issue(secret, customer, sub.id) });
  }

  // ── First issuance: verify the completed Checkout session ──
  if (!body.sessionId) {
    return NextResponse.json({ error: "Missing session id" }, { status: 400 });
  }
  const { ok, data: s } = await stripeGet(
    `checkout/sessions/${encodeURIComponent(body.sessionId)}`,
    sk,
  );
  if (!ok) {
    return NextResponse.json(
      { error: s?.error?.message || "Could not verify session" },
      { status: 500 },
    );
  }
  const paid = s.payment_status === "paid" || s.status === "complete";
  if (!paid) {
    return NextResponse.json({ error: "Payment not complete" }, { status: 402 });
  }
  const customer = typeof s.customer === "string" ? s.customer : undefined;
  const sub = typeof s.subscription === "string" ? s.subscription : undefined;
  return NextResponse.json({ license: issue(secret, customer, sub) });
}
