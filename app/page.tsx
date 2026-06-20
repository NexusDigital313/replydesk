import Link from "next/link";
import { FREE, PRO } from "@/lib/plan";

/* The Claude "spark" — a four-point sparkle. Our brand mark and section motif. */
function Spark({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden>
      <path d="M12 1.6c.7 5.6 2.8 7.7 8.4 8.4-5.6.7-7.7 2.8-8.4 8.4-.7-5.6-2.8-7.7-8.4-8.4 5.6-.7 7.7-2.8 8.4-8.4Z" />
    </svg>
  );
}

/* Brand mark — bold forward "motion" bars, matching the ReplyDesk promo emblem. */
function Mark({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden>
      <path d="M2 19.5 L6 19.5 L11 4.5 L7 4.5 Z" />
      <path d="M10 19.5 L14 19.5 L19 4.5 L15 4.5 Z" />
    </svg>
  );
}

export default function Landing() {
  return (
    <div className="min-h-screen overflow-x-clip bg-stone-950 text-stone-100">
      {/* nav */}
      <header className="sticky top-0 z-30 border-b border-stone-800/80 bg-stone-950/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-3.5">
          <div className="flex items-center gap-3">
            <Mark className="h-12 w-12 text-brand-500" />
            <span className="font-display text-3xl font-semibold tracking-tight">
              ReplyDesk
            </span>
          </div>
          <nav className="hidden items-center gap-7 text-sm font-medium text-stone-300 sm:flex">
            <a href="#features" className="transition-colors hover:text-stone-100">Features</a>
            <a href="#how" className="transition-colors hover:text-stone-100">How it works</a>
            <a href="#pricing" className="transition-colors hover:text-stone-100">Pricing</a>
            <a href="#faq" className="transition-colors hover:text-stone-100">FAQ</a>
          </nav>
          <Link
            href="/app"
            className="rounded-xl bg-brand-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-700"
          >
            Open app
          </Link>
        </div>
      </header>

      {/* hero */}
      <section className="relative mx-auto max-w-6xl px-5 pb-24 pt-14 sm:pt-20">
        <div className="grid items-center gap-12 lg:grid-cols-2">
          <div>
            <span className="rise inline-flex items-center gap-2 rounded-full bg-brand-500/10 px-3 py-1 text-xs font-semibold text-brand-300 ring-1 ring-brand-500/20">
              <Spark className="h-3.5 w-3.5" />
              For restaurants, dentists, salons & local business
            </span>
            <h1
              className="rise font-display mt-5 text-[2.6rem] font-medium leading-[1.06] sm:text-[3.4rem]"
              style={{ animationDelay: "0.06s" }}
            >
              Reply to every review
              <br />
              <span className="text-brand-400">in your voice</span>, in seconds.
            </h1>
            <p
              className="rise mt-5 max-w-md text-lg leading-relaxed text-stone-300"
              style={{ animationDelay: "0.12s" }}
            >
              Paste a customer review, pick a tone, and get a polished reply that
              sounds like you — not a robot. Plus a live dashboard of how your
              reputation is trending.
            </p>
            <div
              className="rise mt-7 flex flex-wrap items-center gap-3"
              style={{ animationDelay: "0.18s" }}
            >
              <Link
                href="/app"
                className="rounded-xl bg-brand-600 px-6 py-3 text-[15px] font-semibold text-white shadow-float transition hover:-translate-y-0.5 hover:bg-brand-700"
              >
                Start free →
              </Link>
              <a
                href="#pricing"
                className="rounded-xl border border-stone-700 bg-stone-900 px-6 py-3 text-[15px] font-semibold text-stone-200 transition hover:-translate-y-0.5 hover:bg-stone-800"
              >
                See pricing
              </a>
            </div>
            <p
              className="rise mt-4 text-sm text-stone-400"
              style={{ animationDelay: "0.24s" }}
            >
              No card required · 15 free replies a month · works in your browser
            </p>
            <div
              className="rise mt-5 inline-flex items-center gap-2 rounded-full border border-stone-700/70 bg-stone-900/60 px-3 py-1.5 text-xs font-medium text-stone-300"
              style={{ animationDelay: "0.28s" }}
            >
              <Spark className="h-3.5 w-3.5 text-brand-400" />
              Pro drafting powered by the{" "}
              <span className="font-semibold text-stone-100">Claude API</span> from Anthropic
            </div>
          </div>

          {/* floating product scene */}
          <div className="scene rise relative" style={{ animationDelay: "0.15s" }}>
            {/* ambient depth glow */}
            <div className="pointer-events-none absolute left-1/2 top-1/2 -z-10 h-[120%] w-[120%] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(closest-side,rgba(217,119,87,0.28),transparent)] blur-2xl" />

            {/* main card — statically tilted in space (no perpetual motion → no jitter) */}
            <div>
              <div className="tilt rounded-2xl border border-stone-800 bg-stone-900 p-5 shadow-float">
                <div className="mb-3 flex items-center gap-2 text-xs text-stone-500">
                  <span className="text-amber-500">★★☆☆☆</span>
                  <span className="font-medium text-stone-300">Dana M.</span>
                  <span>· new review</span>
                </div>
                <p className="rounded-lg bg-stone-800 px-3 py-2.5 text-sm italic text-stone-300">
                  “Waited 40 minutes and the pasta came out lukewarm. Server was
                  kind but the kitchen seemed overwhelmed.”
                </p>
                <div className="my-3 flex items-center justify-center gap-2 text-xs font-medium text-brand-400">
                  <span className="h-px w-8 bg-brand-500/30" />
                  <Spark className="h-3.5 w-3.5" />
                  ReplyDesk drafts
                  <span className="h-px w-8 bg-brand-500/30" />
                </div>
                <div className="rounded-lg border border-brand-500/20 bg-brand-500/10 px-3 py-3 text-sm leading-relaxed text-stone-200">
                  Hi Dana, we owe you an apology — a 40-minute wait and a lukewarm
                  plate isn’t the standard we hold ourselves to. We’re tightening up
                  the kitchen flow this week. We’d love to make it right: email us at
                  hello@luigis.com and your next visit is on us.
                  <div className="mt-2 text-stone-400">— The team at Luigi’s</div>
                </div>
                <div className="mt-3 flex items-center gap-2">
                  <span className="rounded-md bg-brand-600 px-2.5 py-1 text-xs font-semibold text-white">Copy</span>
                  <span className="rounded-md border border-stone-700 px-2.5 py-1 text-xs text-stone-400">Apologetic ▾</span>
                  <span className="ml-auto inline-flex items-center gap-1 rounded-full bg-brand-500/10 px-2 py-0.5 text-[11px] font-medium text-brand-300 ring-1 ring-brand-500/20">
                    <Spark className="h-3 w-3" /> Claude
                  </span>
                </div>
              </div>
            </div>

            {/* floating chips at different depths (lg+ to avoid mobile overflow) */}
            <div className="absolute -left-6 -top-6 z-20 hidden rounded-2xl bg-stone-900 px-3 py-2 shadow-chip ring-1 ring-stone-800 lg:block">
              <div className="flex items-center gap-2 text-xs font-medium text-stone-200">
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-brand-500 text-white">
                  <Spark className="h-4 w-4" />
                </span>
                Drafted in 30s
              </div>
            </div>

            <div className="absolute -bottom-7 left-6 z-20 hidden rounded-2xl bg-stone-900 px-3.5 py-2.5 shadow-chip ring-1 ring-stone-800 lg:block">
              <div className="text-[11px] font-medium uppercase tracking-wide text-stone-500">New rating</div>
              <div className="flex items-center gap-1.5 text-amber-500">
                ★★★★★ <span className="text-xs font-semibold text-stone-200">5.0</span>
              </div>
            </div>

            <div className="absolute -right-4 bottom-20 z-20 hidden h-12 w-12 items-center justify-center rounded-2xl bg-brand-600 text-white shadow-chip lg:flex">
              <Spark className="h-6 w-6" />
            </div>
          </div>
        </div>
      </section>

      {/* trust strip */}
      <section className="border-y border-stone-800 bg-stone-900">
        <div className="mx-auto grid max-w-6xl grid-cols-2 gap-6 px-5 py-9 text-center sm:grid-cols-4">
          {[
            ["88%", "of customers read replies to reviews"],
            ["1.7×", "more bookings when owners respond"],
            ["30s", "to a polished reply, every time"],
            ["5", "tones to match any situation"],
          ].map(([n, l]) => (
            <div key={l}>
              <div className="font-display text-3xl font-medium tracking-tight text-brand-400">{n}</div>
              <div className="mt-1 text-sm text-stone-400">{l}</div>
            </div>
          ))}
        </div>
      </section>

      {/* features */}
      <section id="features" className="mx-auto max-w-6xl px-5 py-20">
        <h2 className="font-display text-center text-[2rem] font-medium tracking-tight sm:text-4xl">
          Everything you need to stay on top of reviews
        </h2>
        <p className="mx-auto mt-3 max-w-xl text-center text-stone-400">
          Built for owners and front-desk staff who don’t have time to agonize
          over every reply.
        </p>
        <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {[
            ["Sounds like you", "Set your name, business type and voice once. Every reply matches your brand — not a generic template."],
            ["Five tones, one click", "Professional, warm, apologetic, grateful, or concise. Rewrite in any tone instantly."],
            ["Reads the review", "It reflects what the customer actually said — the wait, the food, the price — so replies feel real."],
            ["Reputation dashboard", "Average rating, sentiment split, and rating distribution update as you go."],
            ["Bulk import", "Paste or upload a backlog of reviews and draft replies to all of them in minutes."],
            ["Claude-powered", "Pro replies are written by Claude (Opus 4.8) for the most natural, on-point drafting."],
          ].map(([t, d]) => (
            <div key={t} className="transform-gpu rounded-2xl border border-stone-800 bg-stone-900 p-6 shadow-float transition duration-300 hover:-translate-y-1.5 hover:border-stone-700 hover:shadow-lift">
              <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-brand-500/10 text-brand-400">
                <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M20 6 9 17l-5-5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              <h3 className="font-display text-lg font-medium">{t}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-stone-400">{d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* how it works */}
      <section id="how" className="border-y border-stone-800 bg-stone-900">
        <div className="mx-auto max-w-6xl px-5 py-20">
          <h2 className="font-display text-center text-[2rem] font-medium tracking-tight sm:text-4xl">
            Three steps. Done.
          </h2>
          <div className="mt-12 grid gap-8 sm:grid-cols-3">
            {[
              ["1", "Paste the review", "Drop in the text and star rating — or bulk-import a whole backlog."],
              ["2", "Pick a tone", "Warm, apologetic, grateful… ReplyDesk drafts a reply in your voice."],
              ["3", "Copy & post", "Tweak if you like, copy, and paste it back to Google. Track it on your dashboard."],
            ].map(([n, t, d]) => (
              <div key={n} className="text-center">
                <div className="font-display mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-brand-600 text-lg font-medium text-white">
                  {n}
                </div>
                <h3 className="font-display mt-4 text-xl font-medium">{t}</h3>
                <p className="mx-auto mt-1.5 max-w-xs text-sm leading-relaxed text-stone-400">{d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* pricing */}
      <section id="pricing" className="mx-auto max-w-5xl px-5 py-20">
        <h2 className="font-display text-center text-[2rem] font-medium tracking-tight sm:text-4xl">
          Simple pricing
        </h2>
        <p className="mt-3 text-center text-stone-400">
          Start free. Upgrade when reviews start piling up.
        </p>
        <div className="mx-auto mt-12 grid max-w-3xl gap-6 sm:grid-cols-2">
          <PlanCard
            name="Free"
            price={FREE.price}
            period={FREE.period}
            features={FREE.features}
            cta="Start free"
            href="/app"
            highlight={false}
          />
          <PlanCard
            name="Pro"
            price={PRO.price}
            period={PRO.period}
            features={PRO.features}
            cta="Go Pro"
            href="/app?upgrade=1"
            highlight
          />
        </div>
      </section>

      {/* faq */}
      <section id="faq" className="border-t border-stone-800 bg-stone-900">
        <div className="mx-auto max-w-3xl px-5 py-20">
          <h2 className="font-display text-center text-[2rem] font-medium tracking-tight sm:text-4xl">
            Questions
          </h2>
          <div className="mt-10 space-y-4">
            {[
              ["Do I need an account?", "No. ReplyDesk runs in your browser — your business profile and saved replies stay on your device. Pro unlocks Claude-powered drafting and bulk import."],
              ["Does it post replies for me?", "You stay in control: ReplyDesk drafts the reply, you review and copy it into Google or wherever you respond."],
              ["What makes the replies good?", "It reads the actual review and writes in the voice and tone you set — referencing specifics instead of sounding canned. Pro uses Claude for the most natural results."],
              ["Can I import a backlog of reviews?", "Yes — Pro includes bulk import. Paste or upload your reviews and draft replies to all of them at once."],
            ].map(([q, a]) => (
              <div key={q} className="rounded-xl border border-stone-700 bg-stone-800/50 p-5">
                <h3 className="font-display text-lg font-medium">{q}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-stone-400">{a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* cta */}
      <section className="mx-auto max-w-6xl px-5 py-20">
        <div className="relative overflow-hidden rounded-3xl bg-brand-700 px-8 py-14 text-center text-white">
          <Spark className="pointer-events-none absolute -right-6 -top-6 h-32 w-32 text-white/10" />
          <h2 className="font-display text-3xl font-medium tracking-tight sm:text-4xl">
            Never dread a review again.
          </h2>
          <p className="mx-auto mt-3 max-w-md text-brand-100">
            Draft your first reply in under a minute. Free to start.
          </p>
          <Link
            href="/app"
            className="mt-7 inline-block rounded-xl bg-white px-7 py-3 text-[15px] font-semibold text-brand-700 shadow-sm transition hover:bg-brand-50"
          >
            Open ReplyDesk →
          </Link>
        </div>
      </section>

      <footer className="border-t border-stone-800 py-8">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-5 text-sm text-stone-400 sm:flex-row">
          <span className="inline-flex items-center gap-2">
            <Spark className="h-4 w-4 text-brand-500" />© {new Date().getFullYear()} ReplyDesk
          </span>
          <span>Made for local businesses · Drafting by Claude</span>
        </div>
      </footer>
    </div>
  );
}

function PlanCard({
  name,
  price,
  period,
  features,
  cta,
  href,
  highlight,
}: {
  name: string;
  price: string;
  period: string;
  features: string[];
  cta: string;
  href: string;
  highlight: boolean;
}) {
  return (
    <div
      className={`relative transform-gpu rounded-2xl border p-7 shadow-float transition duration-300 hover:-translate-y-1.5 hover:shadow-lift ${
        highlight
          ? "border-brand-500 bg-stone-900 ring-2 ring-brand-500/30"
          : "border-stone-800 bg-stone-900"
      }`}
    >
      {highlight && (
        <span className="absolute -top-3 left-7 inline-flex items-center gap-1 rounded-full bg-brand-600 px-3 py-1 text-xs font-semibold text-white">
          <Spark className="h-3 w-3" /> Most popular
        </span>
      )}
      <h3 className="font-display text-xl font-medium">{name}</h3>
      <div className="mt-2 flex items-baseline gap-1">
        <span className="font-display text-4xl font-medium tracking-tight">{price}</span>
        <span className="text-stone-400">{period}</span>
      </div>
      <ul className="mt-6 space-y-3">
        {features.map((f) => (
          <li key={f} className="flex items-start gap-2.5 text-sm text-stone-300">
            <svg viewBox="0 0 24 24" className="mt-0.5 h-4 w-4 flex-shrink-0 text-brand-400" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M20 6 9 17l-5-5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            {f}
          </li>
        ))}
      </ul>
      <Link
        href={href}
        className={`mt-7 block rounded-xl px-4 py-2.5 text-center text-[15px] font-semibold transition ${
          highlight
            ? "bg-brand-600 text-white hover:bg-brand-700"
            : "border border-stone-700 bg-stone-800 text-stone-200 hover:bg-stone-700"
        }`}
      >
        {cta}
      </Link>
    </div>
  );
}
