// Lemon Squeezy config. All of these are safe in the browser — LS's license
// validate/activate endpoints are designed to be called client-side, so no
// secret lives here and no ReplyDesk server is needed.
//
// Pro comes in two flavors: a low-commitment monthly and a discounted annual.
// Create BOTH as products (or variants) in Lemon Squeezy, then fill the
// checkout links + numeric product ids below — directly or via NEXT_PUBLIC_*
// env vars on Vercel. A license from either one unlocks the app.
export interface PlanOption {
  /** Product → Share → "Checkout URL" (e.g. https://YOURSTORE.lemonsqueezy.com/buy/XXXXXXXX) */
  checkoutUrl: string;
  /** Numeric product id, so a license from a different store/product can't unlock this app. */
  productId: string;
  price: string;
  period: string;
  /** Optional pitch shown under the plan name (e.g. "Cancel anytime"). */
  note?: string;
  /** Optional highlight badge (e.g. "Save $79 · 2 months free"). */
  badge?: string;
}

export const LS = {
  // Numeric store id, shared by both plans.
  storeId: process.env.NEXT_PUBLIC_LS_STORE_ID ?? "",

  monthly: {
    checkoutUrl: process.env.NEXT_PUBLIC_LS_CHECKOUT_URL_MONTHLY ?? "",
    productId: process.env.NEXT_PUBLIC_LS_PRODUCT_ID_MONTHLY ?? "",
    price: "$19.99",
    period: "/mo",
    note: "Cancel anytime",
  } as PlanOption,

  annual: {
    checkoutUrl: process.env.NEXT_PUBLIC_LS_CHECKOUT_URL_ANNUAL ?? "",
    productId: process.env.NEXT_PUBLIC_LS_PRODUCT_ID_ANNUAL ?? "",
    price: "$149.99",
    period: "/yr",
    badge: "Save $79 · 2 months free",
  } as PlanOption,
};

/** Product ids we accept a license from. Empty = accept any (dev / pre-config). */
export const ACCEPTED_PRODUCT_IDS = [LS.monthly.productId, LS.annual.productId].filter(Boolean);

export const PRODUCT_NAME = "ReplyDesk Pro";

// Public-facing seller identity + support contact. Surfaced in the footer and
// on every legal page (/terms, /privacy, /refund, /contact). Lemon Squeezy is
// the Merchant of Record, but buyers — and their store-approval reviewers —
// still need a real, monitored way to reach a human behind the store.
//
// SWAP THESE before/at launch:
//   • SUPPORT_EMAIL — point it at an inbox you actually watch. A branded
//     address (e.g. support@yourdomain) reads better than a personal one;
//     either way it must be live, because reviewers (and customers) email it.
//   • SELLER_NAME   — must reconcile with the legal/business name you submit in
//     the Lemon Squeezy activation + KYC/KYB step, or approval stalls.
// Both can be overridden per-environment via NEXT_PUBLIC_* without a code change.
export const SUPPORT_EMAIL =
  process.env.NEXT_PUBLIC_SUPPORT_EMAIL ?? "jakep8888@proton.me";
export const SELLER_NAME = process.env.NEXT_PUBLIC_SELLER_NAME ?? "ReplyDeskPro";
