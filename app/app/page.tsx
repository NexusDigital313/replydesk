"use client";

import Link from "next/link";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type ReactNode,
} from "react";
import { useLocalStorage } from "@/lib/storage";
import { sentimentOf } from "@/lib/localEngine";
import { decodeLicense } from "@/lib/licenseClient";
import { parseReviews, type ParsedReview } from "@/lib/importParser";
import {
  PLAN_LIMITS,
  PAYWALL_ENABLED,
  PRO,
  FREE,
  monthKey,
} from "@/lib/plan";
import { SAMPLE_REVIEWS } from "@/lib/sample";
import {
  EMPTY_PROFILE,
  TONES,
  type BusinessProfile,
  type Plan,
  type ReviewItem,
  type Tone,
} from "@/lib/types";

/* ------------------------------ small atoms ------------------------------ */

/* The Claude "spark" — brand mark, shared with the landing page. */
function Spark({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden>
      <path d="M12 1.6c.7 5.6 2.8 7.7 8.4 8.4-5.6.7-7.7 2.8-8.4 8.4-.7-5.6-2.8-7.7-8.4-8.4 5.6-.7 7.7-2.8 8.4-8.4Z" />
    </svg>
  );
}

function Star({ filled, half = false }: { filled: boolean; half?: boolean }) {
  return (
    <svg viewBox="0 0 20 20" className="h-full w-full" aria-hidden>
      {half && (
        <defs>
          <linearGradient id="halfstar">
            <stop offset="50%" stopColor="currentColor" />
            <stop offset="50%" stopColor="transparent" />
          </linearGradient>
        </defs>
      )}
      <path
        d="M10 1.5l2.6 5.27 5.82.85-4.21 4.1.99 5.79L10 14.77l-5.2 2.73.99-5.79L1.58 7.62l5.82-.85L10 1.5z"
        fill={half ? "url(#halfstar)" : filled ? "currentColor" : "none"}
        stroke="currentColor"
        strokeWidth="1.1"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function StarsDisplay({ value, size = 16 }: { value: number; size?: number }) {
  const full = Math.floor(value);
  const half = value - full >= 0.5;
  return (
    <span className="inline-flex text-amber-400" aria-label={`${value} stars`}>
      {Array.from({ length: 5 }).map((_, i) => (
        <span key={i} style={{ width: size, height: size }}>
          <Star filled={i < full} half={!half ? false : i === full} />
        </span>
      ))}
    </span>
  );
}

function StarPicker({
  value,
  onChange,
}: {
  value: number;
  onChange: (v: number) => void;
}) {
  const [hover, setHover] = useState(0);
  const shown = hover || value;
  return (
    <div className="flex items-center gap-1.5" onMouseLeave={() => setHover(0)}>
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          onClick={() => onChange(n)}
          onMouseEnter={() => setHover(n)}
          aria-label={`${n} star${n > 1 ? "s" : ""}`}
          className="rounded text-amber-400 transition-transform hover:scale-110 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
        >
          <span className="block h-7 w-7">
            <Star filled={n <= shown} />
          </span>
        </button>
      ))}
      <span className="ml-2 text-sm font-medium text-stone-500">{shown} / 5</span>
    </div>
  );
}

function SourceBadge({ source }: { source: "claude" | "local" }) {
  return source === "claude" ? (
    <span className="inline-flex items-center gap-1 rounded-full bg-brand-50 px-2.5 py-0.5 text-xs font-medium text-brand-700 ring-1 ring-brand-200">
      <span className="h-1.5 w-1.5 rounded-full bg-brand-500" /> Claude
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 rounded-full bg-stone-100 px-2.5 py-0.5 text-xs font-medium text-stone-600 ring-1 ring-stone-200">
      <span className="h-1.5 w-1.5 rounded-full bg-stone-400" /> Local engine
    </span>
  );
}

function CopyButton({ text, label = "Copy" }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setCopied(true);
          setTimeout(() => setCopied(false), 1600);
        } catch {
          /* clipboard blocked */
        }
      }}
      className="inline-flex items-center gap-1.5 rounded-lg border border-stone-300 bg-white px-3 py-1.5 text-sm font-medium text-stone-700 transition hover:bg-stone-50 active:scale-95"
    >
      {copied ? "Copied ✓" : label}
    </button>
  );
}

/* --------------------------------- page --------------------------------- */

interface Usage {
  month: string;
  drafts: number;
}

export default function AppPage() {
  const { value: profile, set: setProfile, hydrated: pHydrated } =
    useLocalStorage<BusinessProfile>("replydesk.profile", EMPTY_PROFILE);
  const { value: reviews, set: setReviews, hydrated: rHydrated } =
    useLocalStorage<ReviewItem[]>("replydesk.reviews", []);
  const { value: apiKey, set: setApiKey } = useLocalStorage<string>(
    "replydesk.key",
    "",
  );
  const { value: license, set: setLicense, hydrated: lHydrated } =
    useLocalStorage<string>("replydesk.license", "");
  const { value: demoPro, set: setDemoPro } = useLocalStorage<boolean>(
    "replydesk.demoPro",
    false,
  );
  const { value: usage, set: setUsage } = useLocalStorage<Usage>(
    "replydesk.usage",
    { month: monthKey(), drafts: 0 },
  );

  const decoded = decodeLicense(license);
  const plan: Plan = !PAYWALL_ENABLED || decoded || demoPro ? "pro" : "free";
  const limits = PLAN_LIMITS[plan];
  const usedThisMonth = usage.month === monthKey() ? usage.drafts : 0;
  const remaining = Number.isFinite(limits.draftsPerMonth)
    ? Math.max(0, limits.draftsPerMonth - usedThisMonth)
    : Infinity;

  const [text, setText] = useState("");
  const [author, setAuthor] = useState("");
  const [rating, setRating] = useState(5);
  const [tone, setTone] = useState<Tone>("warm");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{
    reply: string;
    source: "claude" | "local";
    warning?: string;
  } | null>(null);
  const [edited, setEdited] = useState("");
  const [justSaved, setJustSaved] = useState(false);

  const [settingsOpen, setSettingsOpen] = useState(false);
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  function flash(msg: string) {
    setToast(msg);
    setTimeout(() => setToast((t) => (t === msg ? null : t)), 3200);
  }

  // sync compose tone with the business default once, after hydration
  const tonePinned = useRef(false);
  useEffect(() => {
    if (!tonePinned.current && pHydrated) {
      setTone(profile.tone);
      tonePinned.current = true;
    }
  }, [pHydrated, profile.tone]);

  // handle return-from-Stripe / Google params once
  const paramsHandled = useRef(false);
  useEffect(() => {
    if (paramsHandled.current) return;
    paramsHandled.current = true;
    const p = new URLSearchParams(window.location.search);
    const upgrade = p.get("upgrade");
    const google = p.get("google");
    if (upgrade === "success") {
      const sid = p.get("session_id");
      if (sid) {
        fetch("/api/license", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sessionId: sid }),
        })
          .then((r) => r.json())
          .then((d) => {
            if (d.license) {
              setLicense(d.license);
              flash("You're on Pro — thank you! 🎉");
            } else flash(d.error || "Could not verify your payment.");
          })
          .catch(() => flash("Could not verify your payment."));
      }
    } else if (upgrade === "1") setUpgradeOpen(true);
    else if (upgrade === "cancel") flash("Checkout cancelled.");
    if (google === "connected") {
      flash("Google connected. Live review sync needs API approval — paste yours below for now.");
      setImportOpen(true);
    } else if (google === "unconfigured") {
      flash("Google import isn't set up yet — paste or upload your reviews.");
      setImportOpen(true);
    } else if (google === "error") {
      flash("Google connection failed — paste or upload your reviews.");
      setImportOpen(true);
    }
    if (upgrade || google) window.history.replaceState({}, "", "/app");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Re-verify a real (Stripe) license against the live subscription on load, so a
  // cancelled / refunded / lapsed subscription loses Pro within ~a visit instead
  // of coasting on a long-lived token. Demo and free unlocks are unaffected.
  const licenseChecked = useRef(false);
  useEffect(() => {
    if (licenseChecked.current || !lHydrated) return;
    const d = decodeLicense(license);
    if (!d?.sub) return; // no real subscription token to check
    licenseChecked.current = true;
    fetch("/api/license", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ subscription: d.sub }),
    })
      .then(async (r) => {
        if (r.ok) {
          const j = await r.json();
          if (j.license) setLicense(j.license); // still active — refresh the token
        } else if (r.status === 402) {
          setLicense(""); // subscription ended — back to Free
          flash("Your Pro subscription has ended — you're back on the free plan.");
        }
        // 400 (billing not configured) / 5xx / network: leave the license as-is
      })
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lHydrated, license]);

  const setupNeeded = pHydrated && !profile.name.trim();

  function bumpUsage(n = 1) {
    setUsage((prev) => {
      const m = monthKey();
      const base = prev.month === m ? prev.drafts : 0;
      return { month: m, drafts: base + n };
    });
  }

  async function generate(overrideTone?: Tone) {
    if (!text.trim()) {
      setError("Paste a review first.");
      return;
    }
    if (plan === "free" && remaining <= 0) {
      setUpgradeOpen(true);
      return;
    }
    const t = overrideTone ?? tone;
    setLoading(true);
    setError(null);
    setJustSaved(false);
    try {
      const res = await fetch("/api/draft", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          review: text,
          rating,
          tone: t,
          author,
          business: profile,
          apiKey,
          license,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to draft a reply.");
      setResult({ reply: data.reply, source: data.source, warning: data.warning });
      setEdited(data.reply);
      bumpUsage();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
      setResult(null);
    } finally {
      setLoading(false);
    }
  }

  function appendReviews(items: ReviewItem[]) {
    setReviews((prev) => {
      const next = [...items, ...prev];
      return Number.isFinite(limits.historyMax)
        ? next.slice(0, limits.historyMax)
        : next;
    });
  }

  function saveToHistory() {
    if (!result) return;
    appendReviews([
      {
        id: crypto.randomUUID(),
        text: text.trim(),
        rating,
        author: author.trim(),
        reply: edited.trim(),
        tone,
        source: result.source,
        createdAt: Date.now(),
      },
    ]);
    setJustSaved(true);
    setTimeout(() => setJustSaved(false), 1800);
  }

  function loadSample() {
    const s = SAMPLE_REVIEWS[Math.floor(Math.random() * SAMPLE_REVIEWS.length)];
    setText(s.text);
    setRating(s.rating);
    setAuthor(s.author);
    setResult(null);
    setError(null);
  }

  async function startUpgrade() {
    try {
      const res = await fetch("/api/checkout", { method: "POST" });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
        return;
      }
      if (data.configured === false) {
        // No Stripe configured — local demo unlock so the flow is previewable.
        setDemoPro(true);
        setUpgradeOpen(false);
        flash("Pro unlocked (demo mode — add Stripe keys to charge for real).");
        return;
      }
      flash(data.error || "Couldn't start checkout.");
    } catch {
      flash("Couldn't start checkout.");
    }
  }

  async function manageBilling() {
    const customer = decoded?.customer;
    if (!customer) {
      flash("No billing account on file.");
      return;
    }
    try {
      const res = await fetch("/api/portal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ customer }),
      });
      const data = await res.json();
      if (data.url) window.location.href = data.url;
      else flash(data.error || "Couldn't open billing.");
    } catch {
      flash("Couldn't open billing.");
    }
  }

  return (
    <div className="min-h-screen">
      {/* header */}
      <header className="border-b border-line bg-bone/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-5 py-4">
          <Link href="/" className="flex items-center gap-2.5">
            <Spark className="h-7 w-7 text-brand-500" />
            <div>
              <div className="font-display text-lg font-semibold leading-none tracking-tight">ReplyDesk</div>
              <div className="text-xs text-stone-500">On-brand replies to every review</div>
            </div>
          </Link>

          <div className="flex items-center gap-2">
            {PAYWALL_ENABLED &&
              (plan === "pro" ? (
                <span className="hidden items-center gap-1 rounded-full bg-brand-50 px-2.5 py-1 text-xs font-semibold text-brand-700 ring-1 ring-brand-200 sm:inline-flex">
                  ★ Pro
                </span>
              ) : (
                <button
                  onClick={() => setUpgradeOpen(true)}
                  className="rounded-lg bg-brand-600 px-3 py-1.5 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-700"
                >
                  Upgrade
                </button>
              ))}
            <button
              onClick={() => setImportOpen(true)}
              className="hidden items-center gap-1.5 rounded-lg border border-stone-300 bg-white px-3 py-1.5 text-sm font-medium text-stone-700 transition hover:bg-stone-50 sm:inline-flex"
            >
              Import
            </button>
            <button
              onClick={() => setSettingsOpen(true)}
              className="inline-flex items-center gap-2 rounded-lg border border-stone-300 bg-white px-3 py-1.5 text-sm font-medium text-stone-700 transition hover:bg-stone-50"
            >
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="3" />
                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
              </svg>
              <span className="hidden sm:inline">{profile.name ? profile.name : "Set up"}</span>
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-5 py-8">
        {setupNeeded && (
          <button
            onClick={() => setSettingsOpen(true)}
            className="mb-6 flex w-full items-center justify-between rounded-xl border border-amber-200 bg-amber-50 px-5 py-3.5 text-left transition hover:bg-amber-100/70"
          >
            <span className="text-sm text-amber-900">
              <strong>Finish setup:</strong> add your business name, type and voice so replies sound like you.
            </span>
            <span className="text-sm font-semibold text-amber-900">Set up →</span>
          </button>
        )}

        {PAYWALL_ENABLED && plan === "free" && (
          <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-stone-200 bg-white px-5 py-3 text-sm shadow-sm">
            <span className="text-stone-600">
              <strong className="text-stone-800">{remaining}</strong> of{" "}
              {limits.draftsPerMonth} free replies left this month
            </span>
            <button
              onClick={() => setUpgradeOpen(true)}
              className="font-semibold text-brand-700 hover:text-brand-600"
            >
              Go unlimited with Pro →
            </button>
          </div>
        )}

        <div className="grid gap-6 lg:grid-cols-2">
          {/* compose */}
          <section className="rounded-2xl border border-line bg-white p-6 shadow-float">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-display text-base font-medium tracking-tight">New review</h2>
              <button onClick={loadSample} className="text-sm font-medium text-brand-700 hover:text-brand-600">
                Try a sample
              </button>
            </div>

            <label className="mb-1.5 block text-sm font-medium text-stone-700">Review text</label>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={5}
              placeholder="Paste the customer's review here…"
              className="w-full resize-y rounded-xl border border-stone-300 bg-stone-50/50 px-3.5 py-3 text-[15px] leading-relaxed outline-none transition placeholder:text-stone-400 focus:border-brand-500 focus:bg-white focus:ring-4 focus:ring-brand-500/10"
            />

            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-stone-700">Rating</label>
                <StarPicker value={rating} onChange={setRating} />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-stone-700">
                  Reviewer name <span className="text-stone-400">(optional)</span>
                </label>
                <input
                  value={author}
                  onChange={(e) => setAuthor(e.target.value)}
                  placeholder="e.g. Dana"
                  className="w-full rounded-xl border border-stone-300 bg-stone-50/50 px-3.5 py-2.5 text-[15px] outline-none transition placeholder:text-stone-400 focus:border-brand-500 focus:bg-white focus:ring-4 focus:ring-brand-500/10"
                />
              </div>
            </div>

            <div className="mt-4">
              <label className="mb-1.5 block text-sm font-medium text-stone-700">Tone</label>
              <div className="flex flex-wrap gap-2">
                {TONES.map((t) => (
                  <button
                    key={t.value}
                    onClick={() => setTone(t.value)}
                    title={t.hint}
                    className={`rounded-lg border px-3 py-1.5 text-sm font-medium transition ${
                      tone === t.value
                        ? "border-brand-600 bg-brand-600 text-white shadow-sm"
                        : "border-stone-300 bg-white text-stone-600 hover:border-stone-400"
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            <button
              onClick={() => generate()}
              disabled={loading}
              className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-brand-600 px-4 py-3 text-[15px] font-semibold text-white shadow-sm transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? (
                <>
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                  Drafting…
                </>
              ) : (
                <>Draft reply</>
              )}
            </button>

            {error && (
              <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 ring-1 ring-red-200">{error}</p>
            )}
          </section>

          {/* result */}
          <section className="rounded-2xl border border-line bg-white p-6 shadow-float">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-display text-base font-medium tracking-tight">Suggested reply</h2>
              {result && <SourceBadge source={result.source} />}
            </div>

            {!result && !loading && (
              <div className="flex h-[280px] flex-col items-center justify-center rounded-xl border border-dashed border-stone-200 text-center">
                <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-brand-50 text-brand-600">
                  <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.8">
                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
                <p className="max-w-xs text-sm text-stone-500">
                  Paste a review and hit <strong>Draft reply</strong>. Your reply shows up here, ready to tweak and copy.
                </p>
              </div>
            )}

            {loading && !result && <div className="h-[280px] animate-pulse rounded-xl bg-stone-100" />}

            {result && (
              <>
                {result.warning && (
                  <p className="mb-3 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800 ring-1 ring-amber-200">
                    {result.warning}
                  </p>
                )}
                <textarea
                  value={edited}
                  onChange={(e) => setEdited(e.target.value)}
                  rows={8}
                  className="w-full resize-y rounded-xl border border-stone-300 bg-stone-50/40 px-3.5 py-3 text-[15px] leading-relaxed outline-none transition focus:border-brand-500 focus:bg-white focus:ring-4 focus:ring-brand-500/10"
                />

                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <CopyButton text={edited} label="Copy reply" />
                  <button
                    onClick={() => generate()}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-stone-300 bg-white px-3 py-1.5 text-sm font-medium text-stone-700 transition hover:bg-stone-50"
                  >
                    ↻ Regenerate
                  </button>
                  <button
                    onClick={saveToHistory}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-brand-600 px-3 py-1.5 text-sm font-medium text-white transition hover:bg-brand-700"
                  >
                    {justSaved ? "Saved ✓" : "Save to history"}
                  </button>
                </div>

                <div className="mt-4">
                  <p className="mb-1.5 text-xs font-medium uppercase tracking-wide text-stone-400">
                    Rewrite in another tone
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {TONES.filter((t) => t.value !== tone).map((t) => (
                      <button
                        key={t.value}
                        onClick={() => {
                          setTone(t.value);
                          generate(t.value);
                        }}
                        className="rounded-md border border-stone-200 bg-stone-50 px-2.5 py-1 text-xs font-medium text-stone-600 transition hover:border-brand-300 hover:text-brand-700"
                      >
                        {t.label}
                      </button>
                    ))}
                  </div>
                </div>
              </>
            )}
          </section>
        </div>

        <Dashboard reviews={rHydrated ? reviews : []} />
        <History
          reviews={rHydrated ? reviews : []}
          onDelete={(id) => setReviews((prev) => prev.filter((r) => r.id !== id))}
        />
      </main>

      {settingsOpen && (
        <SettingsModal
          profile={profile}
          apiKey={apiKey}
          plan={plan}
          canManage={!!decoded?.customer}
          onManage={manageBilling}
          onSaveProfile={setProfile}
          onSaveKey={setApiKey}
          onClose={() => setSettingsOpen(false)}
        />
      )}

      {upgradeOpen && (
        <UpgradeModal onUpgrade={startUpgrade} onClose={() => setUpgradeOpen(false)} />
      )}

      {importOpen && (
        <ImportModal
          isPro={plan === "pro"}
          profile={profile}
          apiKey={apiKey}
          license={license}
          onUpgrade={() => {
            setImportOpen(false);
            setUpgradeOpen(true);
          }}
          onImport={(items) => {
            appendReviews(items);
            setImportOpen(false);
            flash(`Imported ${items.length} repl${items.length === 1 ? "y" : "ies"}.`);
          }}
          onClose={() => setImportOpen(false)}
        />
      )}

      {toast && (
        <div className="fixed inset-x-0 bottom-5 z-[60] flex justify-center px-4">
          <div className="rounded-xl bg-stone-900 px-4 py-2.5 text-sm font-medium text-white shadow-lg">
            {toast}
          </div>
        </div>
      )}
    </div>
  );
}

/* ------------------------------- dashboard ------------------------------- */

function Dashboard({ reviews }: { reviews: ReviewItem[] }) {
  const stats = useMemo(() => {
    const total = reviews.length;
    const avg = total ? reviews.reduce((s, r) => s + r.rating, 0) / total : 0;
    const split = { positive: 0, neutral: 0, negative: 0 };
    for (const r of reviews) split[sentimentOf(r.rating)]++;
    const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    const thisWeek = reviews.filter((r) => r.createdAt >= weekAgo).length;
    const dist = [5, 4, 3, 2, 1].map((n) => ({
      n,
      count: reviews.filter((r) => r.rating === n).length,
    }));
    return { total, avg, split, thisWeek, dist };
  }, [reviews]);

  const pct = (n: number) => (stats.total ? Math.round((n / stats.total) * 100) : 0);

  return (
    <section className="mt-8">
      <h2 className="mb-3 font-display text-base font-medium tracking-tight">Reputation snapshot</h2>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Replies handled" value={String(stats.total)} sub="all time" />
        <Stat
          label="Average rating"
          value={stats.total ? stats.avg.toFixed(1) : "—"}
          sub={stats.total ? <StarsDisplay value={stats.avg} size={13} /> : "no data yet"}
        />
        <Stat label="This week" value={String(stats.thisWeek)} sub="replies saved" />
        <div className="rounded-2xl border border-line bg-white p-5 shadow-float">
          <div className="text-xs font-medium uppercase tracking-wide text-stone-400">Sentiment</div>
          <div className="mt-3 flex h-2.5 w-full overflow-hidden rounded-full bg-stone-100">
            <div className="bg-brand-500" style={{ width: `${pct(stats.split.positive)}%` }} />
            <div className="bg-amber-400" style={{ width: `${pct(stats.split.neutral)}%` }} />
            <div className="bg-red-400" style={{ width: `${pct(stats.split.negative)}%` }} />
          </div>
          <div className="mt-2.5 flex justify-between text-xs text-stone-500">
            <span className="text-brand-700">▲ {stats.split.positive}</span>
            <span className="text-amber-600">● {stats.split.neutral}</span>
            <span className="text-red-500">▼ {stats.split.negative}</span>
          </div>
        </div>
      </div>

      {stats.total > 0 && (
        <div className="mt-4 rounded-2xl border border-line bg-white p-5 shadow-float">
          <div className="mb-3 text-xs font-medium uppercase tracking-wide text-stone-400">Rating distribution</div>
          <div className="space-y-2">
            {stats.dist.map((d) => (
              <div key={d.n} className="flex items-center gap-3">
                <span className="flex w-12 items-center gap-1 text-sm text-stone-500">
                  {d.n} <span className="text-amber-400">★</span>
                </span>
                <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-stone-100">
                  <div className="h-full rounded-full bg-brand-400" style={{ width: `${pct(d.count)}%` }} />
                </div>
                <span className="w-8 text-right text-sm tabular-nums text-stone-500">{d.count}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}

function Stat({ label, value, sub }: { label: string; value: string; sub: ReactNode }) {
  return (
    <div className="rounded-2xl border border-line bg-white p-5 shadow-float">
      <div className="text-xs font-medium uppercase tracking-wide text-stone-400">{label}</div>
      <div className="mt-1 text-3xl font-semibold tracking-tight text-stone-800">{value}</div>
      <div className="mt-1 text-sm text-stone-500">{sub}</div>
    </div>
  );
}

/* -------------------------------- history -------------------------------- */

function History({
  reviews,
  onDelete,
}: {
  reviews: ReviewItem[];
  onDelete: (id: string) => void;
}) {
  if (!reviews.length) return null;
  return (
    <section className="mt-8">
      <h2 className="mb-3 font-display text-base font-medium tracking-tight">Saved replies</h2>
      <div className="space-y-3">
        {reviews.map((r) => (
          <article key={r.id} className="rounded-2xl border border-line bg-white p-5 shadow-float">
            <div className="mb-2 flex items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-3">
                <StarsDisplay value={r.rating} size={15} />
                {r.author && <span className="text-sm font-medium text-stone-700">{r.author}</span>}
                <span className="text-xs text-stone-400">{new Date(r.createdAt).toLocaleDateString()}</span>
                <SourceBadge source={r.source} />
              </div>
              <div className="flex items-center gap-2">
                <CopyButton text={r.reply} />
                <button
                  onClick={() => onDelete(r.id)}
                  className="rounded-lg border border-stone-300 bg-white px-2.5 py-1.5 text-sm text-stone-500 transition hover:border-red-300 hover:text-red-600"
                  aria-label="Delete"
                >
                  Delete
                </button>
              </div>
            </div>
            <p className="mb-2 border-l-2 border-stone-200 pl-3 text-sm italic text-stone-500">{r.text}</p>
            <p className="whitespace-pre-wrap text-[15px] leading-relaxed text-stone-800">{r.reply}</p>
          </article>
        ))}
      </div>
    </section>
  );
}

/* ------------------------------- settings -------------------------------- */

function SettingsModal({
  profile,
  apiKey,
  plan,
  canManage,
  onManage,
  onSaveProfile,
  onSaveKey,
  onClose,
}: {
  profile: BusinessProfile;
  apiKey: string;
  plan: Plan;
  canManage: boolean;
  onManage: () => void;
  onSaveProfile: (p: BusinessProfile) => void;
  onSaveKey: (k: string) => void;
  onClose: () => void;
}) {
  const [draft, setDraft] = useState<BusinessProfile>(profile);
  const [key, setKey] = useState(apiKey);

  function save() {
    onSaveProfile(draft);
    onSaveKey(key.trim());
    onClose();
  }

  const field =
    "w-full rounded-xl border border-stone-300 bg-stone-50/50 px-3.5 py-2.5 text-[15px] outline-none transition placeholder:text-stone-400 focus:border-brand-500 focus:bg-white focus:ring-4 focus:ring-brand-500/10";

  return (
    <Overlay onClose={onClose}>
      <div className="mb-5 flex items-center justify-between">
        <h3 className="font-display text-lg font-medium tracking-tight">Business settings</h3>
        <CloseX onClose={onClose} />
      </div>

      <div className="space-y-4">
        <Labeled label="Business name">
          <input className={field} value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} placeholder="Luigi's Trattoria" />
        </Labeled>
        <Labeled label="Business type">
          <input className={field} value={draft.type} onChange={(e) => setDraft({ ...draft, type: e.target.value })} placeholder="Restaurant, dental clinic, salon…" />
        </Labeled>
        <Labeled label="Default voice">
          <div className="flex flex-wrap gap-2">
            {TONES.map((t) => (
              <button
                key={t.value}
                onClick={() => setDraft({ ...draft, tone: t.value })}
                className={`rounded-lg border px-3 py-1.5 text-sm font-medium transition ${
                  draft.tone === t.value
                    ? "border-brand-600 bg-brand-600 text-white"
                    : "border-stone-300 bg-white text-stone-600 hover:border-stone-400"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </Labeled>
        <Labeled label="Sign-off" optional>
          <input className={field} value={draft.signature} onChange={(e) => setDraft({ ...draft, signature: e.target.value })} placeholder="— The team at Luigi's" />
        </Labeled>
        <Labeled label="Make-it-right contact" optional>
          <input className={field} value={draft.contact} onChange={(e) => setDraft({ ...draft, contact: e.target.value })} placeholder="hello@luigis.com or (555) 123-4567" />
        </Labeled>

        <div className="rounded-xl border border-stone-200 bg-stone-50 p-4">
          <Labeled label="Anthropic API key" optional>
            <input className={field + " font-mono text-sm"} value={key} onChange={(e) => setKey(e.target.value)} placeholder="sk-ant-…" type="password" autoComplete="off" />
          </Labeled>
          <p className="mt-2 text-xs text-stone-500">
            With a key, replies are written by Claude (claude-opus-4-8). Without one, ReplyDesk uses its built-in local engine. Stored only in this browser.
          </p>
        </div>

        {PAYWALL_ENABLED && (
          <div className="flex items-center justify-between rounded-xl border border-stone-200 bg-stone-50 px-4 py-3 text-sm">
            <span className="text-stone-600">
              Plan: <strong className={plan === "pro" ? "text-brand-700" : "text-stone-800"}>{plan === "pro" ? "Pro" : "Free"}</strong>
            </span>
            {plan === "pro" && canManage && (
              <button onClick={onManage} className="font-medium text-brand-700 hover:text-brand-600">
                Manage subscription
              </button>
            )}
          </div>
        )}
      </div>

      <div className="mt-6 flex justify-end gap-2">
        <button onClick={onClose} className="rounded-xl border border-stone-300 bg-white px-4 py-2.5 text-sm font-medium text-stone-700 transition hover:bg-stone-50">
          Cancel
        </button>
        <button onClick={save} className="rounded-xl bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-700">
          Save
        </button>
      </div>
    </Overlay>
  );
}

/* ------------------------------- upgrade --------------------------------- */

function UpgradeModal({ onUpgrade, onClose }: { onUpgrade: () => void; onClose: () => void }) {
  return (
    <Overlay onClose={onClose}>
      <div className="mb-1 flex items-center justify-between">
        <h3 className="font-display text-lg font-medium tracking-tight">Upgrade to Pro</h3>
        <CloseX onClose={onClose} />
      </div>
      <p className="mb-5 text-sm text-stone-500">Unlimited replies, the best drafting, and bulk import.</p>

      <div className="rounded-2xl border-2 border-brand-600 bg-white p-5">
        <div className="flex items-baseline gap-1">
          <span className="text-4xl font-semibold tracking-tight">{PRO.price}</span>
          <span className="text-stone-500">{PRO.period}</span>
        </div>
        <ul className="mt-4 space-y-2.5">
          {PRO.features.map((f) => (
            <li key={f} className="flex items-start gap-2.5 text-sm text-stone-700">
              <svg viewBox="0 0 24 24" className="mt-0.5 h-4 w-4 flex-shrink-0 text-brand-600" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M20 6 9 17l-5-5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              {f}
            </li>
          ))}
        </ul>
        <button
          onClick={onUpgrade}
          className="mt-5 w-full rounded-xl bg-brand-600 px-4 py-3 text-[15px] font-semibold text-white shadow-sm transition hover:bg-brand-700"
        >
          Upgrade — {PRO.price}{PRO.period}
        </button>
        <p className="mt-2 text-center text-xs text-stone-400">Cancel anytime · secure checkout via Stripe</p>
      </div>
    </Overlay>
  );
}

/* -------------------------------- import --------------------------------- */

interface BulkRow extends ParsedReview {
  reply: string;
  source: "claude" | "local";
}

function ImportModal({
  isPro,
  profile,
  apiKey,
  license,
  onUpgrade,
  onImport,
  onClose,
}: {
  isPro: boolean;
  profile: BusinessProfile;
  apiKey: string;
  license: string;
  onUpgrade: () => void;
  onImport: (items: ReviewItem[]) => void;
  onClose: () => void;
}) {
  const [raw, setRaw] = useState("");
  const [parsed, setParsed] = useState<ParsedReview[] | null>(null);
  const [rows, setRows] = useState<BulkRow[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);

  if (!isPro) {
    return (
      <Overlay onClose={onClose}>
        <div className="mb-1 flex items-center justify-between">
          <h3 className="font-display text-lg font-medium tracking-tight">Bulk import</h3>
          <CloseX onClose={onClose} />
        </div>
        <p className="mb-5 text-sm text-stone-500">Reply to a whole backlog of reviews at once.</p>
        <div className="rounded-2xl border border-stone-200 bg-stone-50 p-6 text-center">
          <div className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-full bg-brand-50 text-brand-700">★</div>
          <p className="text-sm text-stone-600">Bulk import is a <strong>Pro</strong> feature. Paste or upload your reviews and ReplyDesk drafts replies to all of them.</p>
          <button onClick={onUpgrade} className="mt-4 rounded-xl bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-700">
            Upgrade to Pro
          </button>
        </div>
      </Overlay>
    );
  }

  function parse() {
    const list = parseReviews(raw).slice(0, 50);
    setParsed(list);
    setRows(null);
  }

  function onFile(e: ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    const reader = new FileReader();
    reader.onload = () => setRaw(String(reader.result || ""));
    reader.readAsText(f);
  }

  async function draftAll() {
    if (!parsed?.length) return;
    setBusy(true);
    setProgress(0);
    const out: BulkRow[] = [];
    for (let i = 0; i < parsed.length; i++) {
      setProgress(i + 1);
      const r = parsed[i];
      try {
        const res = await fetch("/api/draft", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            review: r.text,
            rating: r.rating,
            tone: profile.tone,
            author: r.author,
            business: profile,
            apiKey,
            license,
          }),
        });
        const data = await res.json();
        out.push({ ...r, reply: data.reply || "", source: data.source || "local" });
      } catch {
        out.push({ ...r, reply: "", source: "local" });
      }
    }
    setRows(out);
    setBusy(false);
  }

  function saveAll() {
    if (!rows) return;
    const items: ReviewItem[] = rows
      .filter((r) => r.reply.trim())
      .map((r) => ({
        id: crypto.randomUUID(),
        text: r.text,
        rating: r.rating,
        author: r.author,
        reply: r.reply.trim(),
        tone: profile.tone,
        source: r.source,
        createdAt: Date.now(),
      }));
    onImport(items);
  }

  return (
    <Overlay onClose={onClose} wide>
      <div className="mb-1 flex items-center justify-between">
        <h3 className="font-display text-lg font-medium tracking-tight">Bulk import</h3>
        <CloseX onClose={onClose} />
      </div>
      <p className="mb-4 text-sm text-stone-500">
        Paste reviews (one per blank-line block) or a CSV with rating / review / name columns. Up to 50 at a time.
      </p>

      <div className="mb-3 flex items-center gap-2">
        <a
          href="/api/google/start"
          className="inline-flex items-center gap-1.5 rounded-lg border border-stone-300 bg-white px-3 py-1.5 text-sm font-medium text-stone-700 transition hover:bg-stone-50"
        >
          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor"><path d="M12 11v2.8h4a3.95 3.95 0 0 1-1.7 2.6v2.1h2.7c1.6-1.5 2.5-3.6 2.5-6.2 0-.6-.05-1.1-.15-1.6H12z"/><path d="M12 21c2.3 0 4.2-.75 5.6-2l-2.7-2.1c-.75.5-1.7.8-2.9.8-2.2 0-4.1-1.5-4.8-3.5H4.4v2.2A8.5 8.5 0 0 0 12 21z" opacity=".7"/></svg>
          Connect Google
        </a>
        <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-stone-300 bg-white px-3 py-1.5 text-sm font-medium text-stone-700 transition hover:bg-stone-50">
          Upload CSV
          <input type="file" accept=".csv,.txt" onChange={onFile} className="hidden" />
        </label>
      </div>

      {!rows && (
        <>
          <textarea
            value={raw}
            onChange={(e) => {
              setRaw(e.target.value);
              setParsed(null);
            }}
            rows={7}
            placeholder={"Dana M. — ★★☆☆☆\nWaited 40 minutes and the food was cold.\n\nPriya — 5 stars\nBest haircut in years, lovely team!"}
            className="w-full resize-y rounded-xl border border-stone-300 bg-stone-50/50 px-3.5 py-3 text-sm leading-relaxed outline-none transition placeholder:text-stone-400 focus:border-brand-500 focus:bg-white focus:ring-4 focus:ring-brand-500/10"
          />

          {!parsed ? (
            <button
              onClick={parse}
              disabled={!raw.trim()}
              className="mt-3 rounded-xl bg-stone-800 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-stone-900 disabled:opacity-50"
            >
              Preview {raw.trim() ? "" : "reviews"}
            </button>
          ) : (
            <div className="mt-3">
              <p className="mb-2 text-sm text-stone-600">
                Found <strong>{parsed.length}</strong> review{parsed.length === 1 ? "" : "s"}.
              </p>
              <div className="max-h-44 space-y-1.5 overflow-y-auto rounded-xl border border-stone-200 p-2">
                {parsed.map((r, i) => (
                  <div key={i} className="flex items-center gap-2 rounded-lg bg-stone-50 px-2.5 py-1.5 text-xs">
                    <StarsDisplay value={r.rating} size={12} />
                    {r.author && <span className="font-medium text-stone-600">{r.author}</span>}
                    <span className="truncate text-stone-500">{r.text}</span>
                  </div>
                ))}
              </div>
              <button
                onClick={draftAll}
                disabled={busy || !parsed.length}
                className="mt-3 inline-flex items-center gap-2 rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-700 disabled:opacity-60"
              >
                {busy ? (
                  <>
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                    Drafting {progress}/{parsed.length}…
                  </>
                ) : (
                  <>Draft all {parsed.length} replies</>
                )}
              </button>
            </div>
          )}
        </>
      )}

      {rows && (
        <div>
          <div className="max-h-72 space-y-2 overflow-y-auto pr-1">
            {rows.map((r, i) => (
              <div key={i} className="rounded-xl border border-stone-200 bg-white p-3">
                <div className="mb-1 flex items-center gap-2">
                  <StarsDisplay value={r.rating} size={13} />
                  {r.author && <span className="text-xs font-medium text-stone-600">{r.author}</span>}
                  <SourceBadge source={r.source} />
                </div>
                <p className="mb-1 text-xs italic text-stone-400">{r.text}</p>
                <p className="whitespace-pre-wrap text-sm text-stone-800">{r.reply}</p>
              </div>
            ))}
          </div>
          <div className="mt-4 flex justify-end gap-2">
            <button onClick={() => setRows(null)} className="rounded-xl border border-stone-300 bg-white px-4 py-2.5 text-sm font-medium text-stone-700 transition hover:bg-stone-50">
              Back
            </button>
            <button onClick={saveAll} className="rounded-xl bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-700">
              Save all to history
            </button>
          </div>
        </div>
      )}
    </Overlay>
  );
}

/* ------------------------------- shared UI ------------------------------- */

function Overlay({
  children,
  onClose,
  wide = false,
}: {
  children: ReactNode;
  onClose: () => void;
  wide?: boolean;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-stone-900/40 p-0 backdrop-blur-sm sm:items-center sm:p-6"
      onClick={onClose}
    >
      <div
        className={`max-h-[92vh] w-full overflow-y-auto rounded-t-2xl bg-white p-6 shadow-2xl sm:rounded-2xl ${wide ? "max-w-2xl" : "max-w-lg"}`}
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );
}

function CloseX({ onClose }: { onClose: () => void }) {
  return (
    <button onClick={onClose} className="rounded-lg p-1.5 text-stone-400 hover:bg-stone-100 hover:text-stone-600" aria-label="Close">
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M18 6 6 18M6 6l12 12" strokeLinecap="round" />
      </svg>
    </button>
  );
}

function Labeled({
  label,
  optional = false,
  children,
}: {
  label: string;
  optional?: boolean;
  children: ReactNode;
}) {
  return (
    <div>
      <label className="mb-1.5 block text-sm font-medium text-stone-700">
        {label} {optional && <span className="text-stone-400">(optional)</span>}
      </label>
      {children}
    </div>
  );
}
