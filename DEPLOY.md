<!--
  Copyright (c) 2026 Jacob Douglas Parmenter. All Rights Reserved.
  Proprietary and Confidential.

  Unauthorized reproduction, copying, modification, distribution,
  redistribution, publication, reverse engineering, decompilation, or
  disassembly of this file, in whole or in part, via any medium, is
  strictly prohibited without explicit prior written authorization.
-->

# Shipping ReplyDesk

Next.js 15 app → **Netlify**. Build is green (`pnpm build`). Config lives in
`netlify.toml` (`@netlify/plugin-nextjs` runs the App Router server-side).

## Deploy (from this folder)

```bash
netlify login                       # one-time browser auth
netlify init                        # create/link a Netlify site (reads netlify.toml)
netlify env:import .env.local       # push the NEXT_PUBLIC_LS_* + app-url vars
netlify deploy --build --prod       # build on Netlify + promote to production
```

That's it for a **freemium launch** — no env vars are strictly required. The local
reply engine works for everyone, the paywall runs in soft/demo mode, and users can
paste their own Anthropic key for Claude drafting. Once the site is linked, every
`git push` to `main` auto-deploys.

## Environment variables (set in Netlify → Site configuration → Environment variables, or `netlify env:import .env.local`)

Add only what you want to turn on. Nothing here is required to go live.

| Variable | When you need it | Effect |
|---|---|---|
| `ANTHROPIC_API_KEY` | You want to pay for Claude for all Pro users | Server drafts Pro replies with Claude. Omit → users bring their own key. |
| `NEXT_PUBLIC_PAYWALL` | Default `1` | `1` = show Free/Pro paywall. `0` = give everyone Pro (good for a pure demo). |
| `NEXT_PUBLIC_LS_CHECKOUT_URL` | Charge real money | Lemon Squeezy product "Buy" link. Buyers check out there and get a license key by email. |
| `NEXT_PUBLIC_LS_STORE_ID` + `NEXT_PUBLIC_LS_PRODUCT_ID` | Charge real money | Numeric LS store + product id. Locks activation so a key from another store/product can't unlock this app. |
| `NEXT_PUBLIC_LS_PRICE` | Cosmetic | Price label on the upgrade button (e.g. `$149/yr`). Keep in sync with the LS product. |
| `GOOGLE_CLIENT_ID` + `GOOGLE_CLIENT_SECRET` | "Connect Google" button | OAuth for Google Business import (live sync also needs Google API approval). |

### Launch presets
- **Freemium demo (fastest):** set nothing. Or set `NEXT_PUBLIC_PAYWALL=0` to let everyone try the full Pro experience.
- **Paid launch:** set the four `NEXT_PUBLIC_LS_*` vars (+ `ANTHROPIC_API_KEY` only if you want to cover Claude for buyers instead of having them bring their own key).

## Billing — Lemon Squeezy (Merchant of Record)

ReplyDesk Pro is sold through **Lemon Squeezy**, which acts as Merchant of Record —
they handle VAT/sales tax and the checkout, so there's no ReplyDesk server or database
in the billing path.

1. **Create the product** in Lemon Squeezy and turn ON **License keys** (set an
   activation/device limit and an expiry that matches your plan).
2. **Wire it up** via the `NEXT_PUBLIC_LS_*` env vars above (checkout URL + store/product ids).
3. **Flow:** buyer clicks **Get ReplyDesk Pro** → pays on LS's hosted checkout →
   receives a license key by email → pastes it into the app → the app calls LS's public
   **activate/validate** license API straight from the browser (`lib/pro.ts`) and unlocks Pro.

### Revocation / expiry
Pro is re-checked against Lemon Squeezy on every load (`revalidate()` in `lib/pro.ts`).
A refunded, expired, or deactivated key drops to Free within a visit — no webhook required.
The check **fails open** on a network error so a paying customer is never wrongly locked out.

## Notes
- All user data (business profile, saved replies, license, API key) lives in the browser's
  `localStorage` — there's no database to provision.
- API routes run on the Node.js runtime (already configured).
