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
| `ANTHROPIC_API_KEY` | Enables Claude drafting for Pro users. Without it, the local engine is used (Pro users normally bring their own key). |
| `NEXT_PUBLIC_PAYWALL` | `1` (default) shows the Free/Pro paywall UI; `0` gives everyone Pro. |
| `NEXT_PUBLIC_LS_CHECKOUT_URL` | Lemon Squeezy product "Buy" link — where buyers check out and get a license key. |
| `NEXT_PUBLIC_LS_STORE_ID` / `NEXT_PUBLIC_LS_PRODUCT_ID` | Numeric LS store + product id. Locks activation to this product. |
| `NEXT_PUBLIC_LS_PRICE` | Price label on the upgrade button (e.g. `$149/yr`). |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | Enables the "Connect Google" OAuth button. |

**Billing flow:** Pro is sold through **Lemon Squeezy** (Merchant of Record — they handle VAT/sales tax). The upgrade button opens the LS checkout (`NEXT_PUBLIC_LS_CHECKOUT_URL`); after paying, the buyer gets a license key by email and pastes it into the app, which activates/validates it directly against LS's public license API from the browser (`lib/pro.ts`) — no ReplyDesk server in the billing path. Pro is re-checked on every load, so refunds/expiry drop to Free within a visit. When the LS vars are **not** set, "Upgrade" does a local demo unlock so you can preview the Pro experience.

**Google import:** the paste / CSV importer works for everyone, today. Live review sync from Google additionally requires your app to be approved for the [Google Business Profile API](https://developers.google.com/my-business) (an allowlisted API) — the OAuth routes are scaffolded for when you have access.

## Deploy

Push to GitHub → import into [Vercel](https://vercel.com) → set the env vars above. For paid launch, create the Lemon Squeezy product (with license keys ON) and set the four `NEXT_PUBLIC_LS_*` vars. See [DEPLOY.md](./DEPLOY.md).

## Stack

Next.js 15 (App Router) · React 19 · TypeScript · Tailwind CSS v4 · `@anthropic-ai/sdk` · Lemon Squeezy + Google via REST (no extra SDKs)
