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

## ⚠️ Before charging real money

There's **no Stripe webhook** yet — a paid license token is valid ~35 days regardless of
cancellation/refund, so someone could cancel and keep Pro until it expires. Fine for a
soft launch; for real revenue, add a webhook (`/api/stripe/webhook`) that revokes on
`customer.subscription.deleted` and shorten the token, or re-verify the subscription on
each visit. Ask and I'll build it.

## Notes
- All user data (business profile, saved replies, license, API key) lives in the browser's
  `localStorage` — there's no database to provision.
- API routes run on the Node.js runtime (already configured).
