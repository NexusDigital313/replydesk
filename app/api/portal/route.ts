import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/* Opens the Stripe billing portal so a customer can manage / cancel. */
export async function POST(req: Request) {
  const sk = process.env.STRIPE_SECRET_KEY;
  if (!sk) {
    return NextResponse.json({ error: "Billing is not configured" }, { status: 400 });
  }

  let customer: string | undefined;
  try {
    customer = (await req.json())?.customer;
  } catch {
    /* ignore */
  }
  if (!customer) {
    return NextResponse.json({ error: "No customer on file" }, { status: 400 });
  }

  const origin =
    process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") || new URL(req.url).origin;

  const form = new URLSearchParams();
  form.set("customer", customer);
  form.set("return_url", `${origin}/app`);

  const res = await fetch("https://api.stripe.com/v1/billing_portal/sessions", {
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
