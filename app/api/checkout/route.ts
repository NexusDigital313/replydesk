import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/* Creates a Stripe Checkout session (subscription) via the REST API — no SDK
   dependency. Returns { configured: false } when Stripe env vars are absent so
   the client can fall back to a local demo unlock. */
export async function POST(req: Request) {
  const sk = process.env.STRIPE_SECRET_KEY;
  const price = process.env.STRIPE_PRICE_ID;
  if (!sk || !price) {
    return NextResponse.json({ configured: false });
  }

  const origin =
    process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ||
    new URL(req.url).origin;

  const form = new URLSearchParams();
  form.set("mode", "subscription");
  form.set("line_items[0][price]", price);
  form.set("line_items[0][quantity]", "1");
  form.set("allow_promotion_codes", "true");
  form.set("success_url", `${origin}/app?upgrade=success&session_id={CHECKOUT_SESSION_ID}`);
  form.set("cancel_url", `${origin}/app?upgrade=cancel`);

  const res = await fetch("https://api.stripe.com/v1/checkout/sessions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${sk}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: form,
  });
  const data = await res.json();
  if (!res.ok) {
    return NextResponse.json(
      { error: data?.error?.message || "Stripe error" },
      { status: 500 },
    );
  }
  return NextResponse.json({ url: data.url });
}
