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

### Instant revocation (optional, built-in)

For revocation the moment a customer cancels (not just on next visit), turn on the
webhook + KV path:

1. **Create a KV store:** Vercel dashboard → Storage → create a KV (Upstash Redis) store
   and link it to this project. `KV_REST_API_URL` and `KV_REST_API_TOKEN` are added to the
   project's env automatically.
2. **Add the Stripe webhook:** Stripe → Developers → Webhooks → add endpoint
   `https://YOUR_DOMAIN/api/stripe/webhook`, subscribe to
   `customer.subscription.deleted`, `customer.subscription.updated`,
   `customer.subscription.paused`, and copy its **Signing secret** into
   `STRIPE_WEBHOOK_SECRET`.

How it works: the webhook verifies Stripe's signature, then flags the subscription as
revoked in KV; `/api/draft` checks that flag before calling Claude, so access stops on the
next draft. It **fails open** — if KV is unreachable, paying customers are never wrongly
locked out, and the ≤2-day re-verification remains the backstop. Leave KV/webhook unset and
you simply keep the visit-based revocation above (fine for launch).

## Notes
- All user data (business profile, saved replies, license, API key) lives in the browser's
  `localStorage` — there's no database to provision.
- API routes run on the Node.js runtime (already configured).
