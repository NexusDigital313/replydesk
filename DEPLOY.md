# Shipping ReplyDesk

Next.js 15 app → **Vercel**. Build is green (`pnpm build`).

## Deploy (one command)

From this folder:

```bash
npx vercel        # first run: logs you in, links/creates the project, deploys a preview URL
npx vercel --prod # promote to your production domain
```

That's it for a **freemium launch** — no env vars required. The local reply engine
works for everyone, the paywall runs in soft/demo mode, and users can paste their
own Anthropic key for Claude drafting.

## Environment variables (set in Vercel → Project → Settings → Environment Variables)

Add only what you want to turn on. Nothing here is required to go live.

| Variable | When you need it | Effect |
|---|---|---|
| `ANTHROPIC_API_KEY` | You want to pay for Claude for all Pro users | Server drafts Pro replies with Claude. Omit → users bring their own key. |
| `NEXT_PUBLIC_PAYWALL` | Default `1` | `1` = show Free/Pro paywall. `0` = give everyone Pro (good for a pure demo). |
| `LICENSE_SECRET` | You want the paywall **enforced** server-side | Any long random string. Without it the paywall is UI-only and Claude is ungated. |
| `STRIPE_SECRET_KEY` + `STRIPE_PRICE_ID` | Charge real money | Enables real Stripe Checkout. Create a recurring Price in Stripe, paste its id. |
| `NEXT_PUBLIC_APP_URL` | Production w/ Stripe | Your live URL (e.g. `https://replydesk.com`) for Stripe redirect links. |
| `GOOGLE_CLIENT_ID` + `GOOGLE_CLIENT_SECRET` | "Connect Google" button | OAuth for Google Business import (live sync also needs Google API approval). |

### Launch presets
- **Freemium demo (fastest):** set nothing. Or set `NEXT_PUBLIC_PAYWALL=0` to let everyone try the full Pro experience.
- **Paid launch:** set `STRIPE_SECRET_KEY`, `STRIPE_PRICE_ID`, `LICENSE_SECRET`, `NEXT_PUBLIC_APP_URL` (+ `ANTHROPIC_API_KEY` if you cover Claude).

## Billing safety

Pro access is tied to the **live Stripe subscription**, no database required:

- The license token is short (2 days) and the app **re-verifies the subscription on
  every load** (`POST /api/license { subscription }`) — if Stripe reports it cancelled,
  refunded, or lapsed, the client drops to Free immediately and the token isn't renewed.
- Worst case someone keeps Pro is until their current token expires (≤2 days) without
  reopening the app.

If you want *instant* revocation (the moment they cancel, not on next visit), add a
Stripe webhook on `customer.subscription.deleted` — but that needs a small store (e.g.
Vercel KV) to record the revocation, since the license token lives in the browser. The
re-verification above is the DB-less default and is enough for launch. Ask if you want
the webhook + KV path.

## Notes
- All user data (business profile, saved replies, license, API key) lives in the browser's
  `localStorage` — there's no database to provision.
- API routes run on the Node.js runtime (already configured).
