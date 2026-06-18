import { NextResponse } from "next/server";
import { signLicense } from "@/lib/license";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/* Verifies a completed Stripe Checkout session and issues a signed license
   token the client stores and presents on future draft calls. */
export async function POST(req: Request) {
  const sk = process.env.STRIPE_SECRET_KEY;
  const secret = process.env.LICENSE_SECRET;
  if (!sk || !secret) {
    return NextResponse.json({ error: "Billing is not configured" }, { status: 400 });
  }

  let sessionId: string | undefined;
  try {
    sessionId = (await req.json())?.sessionId;
  } catch {
    /* fall through */
  }
  if (!sessionId) {
    return NextResponse.json({ error: "Missing session id" }, { status: 400 });
  }

  const res = await fetch(
    `https://api.stripe.com/v1/checkout/sessions/${encodeURIComponent(sessionId)}`,
    { headers: { Authorization: `Bearer ${sk}` } },
  );
  const s = await res.json();
  if (!res.ok) {
    return NextResponse.json(
      { error: s?.error?.message || "Could not verify session" },
      { status: 500 },
    );
  }

  const paid = s.payment_status === "paid" || s.status === "complete";
  if (!paid) {
    return NextResponse.json({ error: "Payment not complete" }, { status: 402 });
  }

  const now = Date.now();
  const license = signLicense(
    {
      plan: "pro",
      iat: now,
      exp: now + 35 * 24 * 60 * 60 * 1000, // ~monthly; renews on next visit
      customer: typeof s.customer === "string" ? s.customer : undefined,
      sub: typeof s.subscription === "string" ? s.subscription : undefined,
    },
    secret,
  );

  return NextResponse.json({ license });
}
