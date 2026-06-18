# ReplyDesk

On-brand replies to every customer review — for restaurants, dentists, salons, and any local business. Paste a review (or bulk-import a backlog), pick a tone, get a polished reply in your business's voice, and track your reputation on a live sentiment dashboard.

- **Marketing landing page** at `/`
- **The app** at `/app`

## How it works

- **No setup to try it.** A built-in local reply engine reflects the actual themes in a review (wait, food, service, pricing…) and runs instantly with zero config.
- **Better with Claude.** Add an Anthropic API key and Pro replies are written by Claude (`claude-opus-4-8`), with automatic fallback to the local engine if Claude is unreachable.
- **Free vs Pro.** Free = 15 replies/month on the local engine. Pro = unlimited, Claude-powered drafting, and bulk import.
- **Bulk import.** Paste reviews or upload a CSV and draft replies to a whole backlog at once. (Optional Google Business Profile connect is scaffolded — see below.)
- **Everything stays in the browser.** Business profile, saved replies, license, and API key live in `localStorage`.

## Run it

```bash
pnpm install
pnpm dev      # http://localhost:3000
```

Production:

```bash
pnpm build && pnpm start
```

## Configuration (all optional)

Copy `.env.example` → `.env.local` and fill what you need:

| Variable | Purpose |
|---|---|
| `ANTHROPIC_API_KEY` | Enables Claude drafting for Pro users. Without it, the local engine is used. |
| `NEXT_PUBLIC_PAYWALL` | `1` (default) shows the Free/Pro paywall UI; `0` gives everyone Pro. |
| `LICENSE_SECRET` | Any long random string. Set it to make the paywall **enforce** Pro server-side (Claude becomes a paid capability). |
| `STRIPE_SECRET_KEY` / `STRIPE_PRICE_ID` | Enables real Stripe Checkout for the Pro subscription. Create a recurring Price in Stripe and paste its id. |
| `NEXT_PUBLIC_APP_URL` | Public base URL for Stripe redirects in production (e.g. `https://replydesk.com`). |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | Enables the "Connect Google" OAuth button. |

**Billing flow:** when Stripe + `LICENSE_SECRET` are set, the upgrade button opens Stripe Checkout → on success the app verifies the session (`/api/license`) and stores a signed, expiring license token that the draft API checks before using Claude. When Stripe is **not** configured, "Upgrade" does a local demo unlock so you can preview the Pro experience. For production you'll want a Stripe webhook to revoke on cancellation — the MVP relies on a ~monthly token that renews on the next visit.

**Google import:** the paste / CSV importer works for everyone, today. Live review sync from Google additionally requires your app to be approved for the [Google Business Profile API](https://developers.google.com/my-business) (an allowlisted API) — the OAuth routes are scaffolded for when you have access.

## Deploy

Push to GitHub → import into [Vercel](https://vercel.com) → set the env vars above. For Stripe, also set the success/cancel domain via `NEXT_PUBLIC_APP_URL`.

## Stack

Next.js 15 (App Router) · React 19 · TypeScript · Tailwind CSS v4 · `@anthropic-ai/sdk` · Stripe + Google via REST (no extra SDKs)
