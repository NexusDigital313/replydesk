"use client";
// Copyright (c) 2026 Jacob Douglas Parmenter. All Rights Reserved.
// Proprietary and Confidential.
//
// Unauthorized reproduction, copying, modification, distribution,
// redistribution, publication, reverse engineering, decompilation, or
// disassembly of this file, in whole or in part, via any medium, is
// strictly prohibited without explicit prior written authorization.


import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { JSX, ReactNode } from "react";
import { getSettings, saveSettings, type RefundPolicy } from "@/lib/settings";
import { involvesCommitment } from "@/lib/triage";
import { draftReply, rewriteReply, hasKey, type Nudge as EngineNudge } from "@/lib/anthropic";
import { loadProfile, type VoiceProfile } from "@/lib/voice";

/* ============================================================================
 * WorkspaceScreen — ReplyDesk "the payoff"
 * Top bar + two-pane body (inbox rail / reply stage) with pre-written
 * coffee-roastery sample data that matches the VoiceInterview screen.
 *
 * Prototype behavior (scripted, runs immediately):
 *  - Pre-written drafts + tone variants per message.
 *  - Tone nudges (Warmer / Shorter / More formal / Regenerate) each play a
 *    brief "Rewriting in your voice…" shimmer/spinner then swap the variant.
 *  - Manual edits flip the meta to "Edited by you".
 *  - Copy + Send (advances to next unsent); Inbox-zero end state -> onRestart.
 *
 * Real-Claude seams are marked with TODO(claude). The orchestrator wires the
 * actual Anthropic Messages calls; this component never touches the API key.
 * ========================================================================== */

type Channel = "review" | "email" | "dm";
type ToneKey = "base" | "warmer" | "shorter" | "formal" | "alt" | "custom";

interface Message {
  id: string;
  channel: Channel;
  name: string;
  meta: string;
  time: string;
  rating: number;
  body: string;
  variants: {
    base: string;
    warmer: string;
    shorter: string;
    formal: string;
    alt: string;
  };
}

/* ---- sample inbox (coffee roastery — matches the interview story) -------- */
const MESSAGES: Message[] = [
  {
    id: "maya",
    channel: "review",
    name: "Maya R.",
    meta: "Google review · 2h ago",
    time: "2h",
    rating: 5,
    body: "Best oat flat white in the city, full stop. The team remembered my name on day two — who does that anymore? I'm officially obsessed. ☕",
    variants: {
      base: "Maya, this absolutely made our morning — thank you! Remembering regulars is kind of our whole thing, so I'm chuffed it landed. That oat flat white will be waiting for you. Cheers!",
      warmer:
        "Maya!! Okay this just made the whole team grin — thank you so much. Honestly, remembering your name is the easy part when you're that lovely to serve. Your oat flat white's on standby. Can't wait to see you again. Cheers! ☕",
      shorter:
        "Maya, this made our morning — thank you! That oat flat white's always waiting for you. Cheers!",
      formal:
        "Hi Maya, thank you so much for the kind words. We're delighted the oat flat white and the team made an impression, and we look forward to welcoming you back soon.",
      alt: "Honestly Maya, reviews like this are exactly why we do it — thank you. So glad the team made you feel at home. See you for the next one!",
    },
  },
  {
    id: "david",
    channel: "email",
    name: "David T.",
    meta: "Email · Re: Beans arrived stale?",
    time: "4h",
    rating: 0,
    body: "Hey — got my Ethiopia Guji bag yesterday but it smells kind of flat, nothing like the last one I ordered. Bit disappointed for $22 a bag. Did something go wrong?",
    variants: {
      base: "David, that's on us — a $22 bag should sing, and a flat one isn't what we meant to send you. I'm shipping a fresh bag from this week's roast today, no charge, plus a prepaid label if you want to send the other back so I can figure out what happened. Really sorry for the letdown — we'll make it right.",
      warmer:
        "David, I'm genuinely sorry — there's nothing worse than tearing into a bag you were looking forward to and having it fall flat. That's on us, not you. A fresh bag from this week's roast is going out today on me, and I'll include a prepaid label so you can send the dull one back for me to check. Thank you for flagging it — let's get you the cup you actually paid for.",
      shorter:
        "David, that's on us — sorry. A fresh bag from this week's roast ships today, no charge, with a prepaid label for the old one. We'll make it right.",
      formal:
        "Hello David, thank you for letting us know, and please accept our apologies. A replacement bag from this week's roast will ship today at no cost, along with a prepaid return label for the original. We'll investigate once it arrives.",
      alt: "David — sorry about that, definitely not the standard we hold ourselves to. Let me send a fresh bag from today's roast straight away, free, and a return label so I can get to the bottom of the flat one. Appreciate you giving us the chance to fix it.",
    },
  },
  {
    id: "leah",
    channel: "dm",
    name: "@leah.brews",
    meta: "Instagram DM · 6h ago",
    time: "6h",
    rating: 0,
    body: "do you ship to canada? 👀 been eyeing the guji for weeks",
    variants: {
      base: "Hey Leah! We do — Canada shipping's live, usually 4–6 days, flat $12 over the border. The Guji's a stunner right now too, you've got great taste. Want me to throw in a grind recommendation when you order? ☕",
      warmer:
        "Leah! Yes we do ship to Canada — 4–6 days, flat $12, and honestly the Guji's drinking beautifully this week so your timing's perfect. 👀 Give me a shout when you order and I'll dial in a grind rec for you. ☕",
      shorter:
        "Hey Leah! We do — 4–6 days, flat $12 to Canada. The Guji's drinking great right now. ☕",
      formal:
        "Hello Leah, yes — we ship to Canada in approximately 4–6 days for a flat $12. The Guji is an excellent choice; let us know if you'd like a grind recommendation with your order.",
      alt: "Hey Leah — we sure do! Canada's 4–6 days at a flat $12. And good eye, the Guji's one of my favourites on the shelf right now. Happy to suggest a grind when you're ready. ☕",
    },
  },
  {
    id: "tom",
    channel: "review",
    name: "Tom K.",
    meta: "Google review · 1d ago",
    time: "1d",
    rating: 2,
    body: "Grinder setting you recommended was way off for my setup. Burned through half a bag dialing it in. Expected more for the price.",
    variants: {
      base: "Tom, I hear you — burning through a bag chasing a dial-in is genuinely frustrating, and our guidance should've gotten you closer than that. Send me your grinder model and I'll work out a dialed starting point for it, and I'll get a replacement bag out to cover what you lost. We can get this right.",
      warmer:
        "Tom, that's a real frustration and I don't blame you one bit — wasting good coffee dialing in is the worst, and our rec should've landed you closer. Let me make it up to you: send over your grinder model, I'll personally work out a starting point that fits it, and a replacement bag's on me for the one you burned through. We'll get you pulling great shots.",
      shorter:
        "Tom, that's frustrating and our rec should've been closer — sorry. Send your grinder model and I'll dial in a starting point, plus a replacement bag on us.",
      formal:
        "Hello Tom, thank you for the feedback, and our apologies — our recommendation should have been more accurate for your setup. If you share your grinder model, we'll provide a tailored starting point and send a replacement bag for the one affected.",
      alt: "Tom — fair, and I'm sorry. A dial-in shouldn't cost you half a bag, and our guidance missed for your grinder. Tell me the model and I'll get you a proper starting point, with a replacement bag to make up for it.",
    },
  },
];

/* ---- channel chip styling (review / email / DM) ------------------------- */
const CHANNEL_META: Record<Channel, { bg: string; color: string }> = {
  review: { bg: "#2c2516", color: "#dcb45a" },
  email: { bg: "#1f2630", color: "#82b0d8" },
  dm: { bg: "#2a2030", color: "#c089cf" },
};

/* ---- inline SVG icons (paths from the comp) ----------------------------- */
function Star({ on, size = 15 }: { on: boolean; size?: number }): JSX.Element {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill={on ? "currentColor" : "none"}
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M12 3.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 17l-5.2 2.6 1-5.8-4.3-4.1 5.9-.9L12 3.5Z" />
    </svg>
  );
}

function EmailIcon({ size = 14 }: { size?: number }): JSX.Element {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect x={3} y={5} width={18} height={14} rx={2.5} />
      <path d="M4 7l8 5.5L20 7" />
    </svg>
  );
}

function DmIcon({ size = 14 }: { size?: number }): JSX.Element {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M4 5.5h16v10H9l-4 3.5v-3.5H4Z" />
    </svg>
  );
}

function WaveIcon({ size = 15 }: { size?: number }): JSX.Element {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.7}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M3 12h2l1.4-4.4L9 18l2.4-13 2.2 9.6L15 12h6" />
    </svg>
  );
}

function CheckIcon({ size = 15 }: { size?: number }): JSX.Element {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2.2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}

function CopyIcon({ size = 16 }: { size?: number }): JSX.Element {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect x={9} y={9} width={11} height={11} rx={2.5} />
      <path d="M5 15V5.5A1.5 1.5 0 0 1 6.5 4H15" />
    </svg>
  );
}

function SendIcon({ size = 15 }: { size?: number }): JSX.Element {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M5 12h13" />
      <path d="M12 6l6 6-6 6" />
    </svg>
  );
}

function WarmIcon({ size = 14 }: { size?: number }): JSX.Element {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M12 3c2.5 3 4 5.2 4 7.5a4 4 0 1 1-8 0C8 8.2 9.5 6 12 3Z" />
    </svg>
  );
}

function ShortIcon({ size = 14 }: { size?: number }): JSX.Element {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M4 7h16M4 12h10M4 17h7" />
    </svg>
  );
}

function FormalIcon({ size = 14 }: { size?: number }): JSX.Element {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M6 3h9l3 3v15H6Z" />
      <path d="M9 9h6M9 13h6M9 17h4" />
    </svg>
  );
}

function RegenIcon({ size = 14 }: { size?: number }): JSX.Element {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M20 11a8 8 0 1 0-1 5" />
      <path d="M20 4v5h-5" />
    </svg>
  );
}

function channelIcon(channel: Channel, size: number): ReactNode {
  if (channel === "review") return <Star on size={size} />;
  if (channel === "email") return <EmailIcon size={size} />;
  return <DmIcon size={size} />;
}

/* ---- logo mark: rounded clay square + 45° diamond in page bg ------------- */
function LogoMark(): JSX.Element {
  return (
    <div className="flex h-7 w-7 items-center justify-center rounded-[8px] bg-[#c15f3c]">
      <div className="h-[10px] w-[10px] rotate-45 rounded-[2px] bg-[#161310]" />
    </div>
  );
}

/* ---- nudge button descriptor -------------------------------------------- */
interface Nudge {
  label: string;
  tone: ToneKey;
  icon: JSX.Element;
}

const NUDGES: Nudge[] = [
  { label: "Warmer", tone: "warmer", icon: <WarmIcon /> },
  { label: "Shorter", tone: "shorter", icon: <ShortIcon /> },
  { label: "More formal", tone: "formal", icon: <FormalIcon /> },
  { label: "Regenerate", tone: "alt", icon: <RegenIcon /> },
];

const TONE_LABELS: Record<ToneKey, string> = {
  base: "Drafted in your voice",
  warmer: "Warmer",
  shorter: "Shorter",
  formal: "More formal",
  alt: "Regenerated",
  custom: "Edited by you",
};

const EASE = "cubic-bezier(.22,.68,.2,1)";

export interface WorkspaceScreenProps {
  /** Inbox-zero "Start over" — returns the orchestrator to Connect. */
  onRestart: () => void;
}

export default function WorkspaceScreen({
  onRestart,
}: WorkspaceScreenProps): JSX.Element {
  const [selId, setSelId] = useState<string>(MESSAGES[0].id);
  const [tone, setTone] = useState<ToneKey>("base");
  const [draft, setDraft] = useState<string>(MESSAGES[0].variants.base);
  const [rewriting, setRewriting] = useState<boolean>(false);
  const [sent, setSent] = useState<string[]>([]);
  const [copied, setCopied] = useState<boolean>(false);
  const [railOpen, setRailOpen] = useState<boolean>(false);
  const [settingsOpen, setSettingsOpen] = useState<boolean>(false);
  // Refund/return policy is the owner's call, stored on-device. Default: cautious.
  const [refundPolicy, setRefundPolicy] = useState<RefundPolicy>("owner");
  const [profile, setProfile] = useState<VoiceProfile | null>(null);

  useEffect(() => {
    setRefundPolicy(getSettings().refundPolicy);
    setProfile(loadProfile());
  }, []);

  const rewriteTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const copyTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const genId = useRef(0); // guards against out-of-order async draft results

  useEffect(() => {
    return () => {
      if (rewriteTimer.current) clearTimeout(rewriteTimer.current);
      if (copyTimer.current) clearTimeout(copyTimer.current);
    };
  }, []);

  const current = useMemo<Message>(
    () => MESSAGES.find((m) => m.id === selId) ?? MESSAGES[0],
    [selId],
  );

  const allSent = useMemo(
    () => MESSAGES.every((m) => sent.includes(m.id)),
    [sent],
  );

  const select = useCallback(
    (id: string) => {
      const it = MESSAGES.find((m) => m.id === id);
      if (!it) return;
      if (rewriteTimer.current) clearTimeout(rewriteTimer.current);
      setSelId(id);
      setTone("base");
      setCopied(false);
      setRailOpen(false);
      // Snappy: show the showcase draft instantly. With a key, generate the real
      // in-your-voice draft and swap it in when it lands.
      setDraft(it.variants.base);
      if (hasKey()) {
        const token = ++genId.current;
        setRewriting(true);
        draftReply({
          message: { body: it.body, channel: it.channel, rating: it.rating || undefined, name: it.name },
          profile,
          policy: refundPolicy,
        })
          .then((r) => {
            if (genId.current === token) {
              setDraft(r.text);
              setRewriting(false);
            }
          })
          .catch(() => {
            if (genId.current === token) setRewriting(false);
          });
      } else {
        setRewriting(false);
      }
    },
    [profile, refundPolicy],
  );

  /* Tone nudge: shimmer, then swap variant.
     TODO(claude): replace the scripted variant swap with a follow-up rewrite
     Messages call ("warmer" / "shorter" / "more formal"); Regenerate = re-roll.
     The 650ms timer stands in for request latency. */
  const nudge = useCallback(
    (nextTone: ToneKey) => {
      if (rewriting) return;
      const it = MESSAGES.find((m) => m.id === selId) ?? MESSAGES[0];
      let resolved: ToneKey = nextTone;
      if (nextTone === "alt") resolved = tone === "alt" ? "base" : "alt";

      // With a key: a real follow-up rewrite ("warmer"/"shorter"/"more formal");
      // Regenerate ("alt") re-rolls a fresh draft. Both obey the voice + policy.
      if (hasKey()) {
        const token = ++genId.current;
        setRewriting(true);
        const msg = { body: it.body, channel: it.channel, rating: it.rating || undefined, name: it.name };
        const reqNudge: EngineNudge = resolved === "custom" ? "base" : resolved;
        const run =
          nextTone === "alt"
            ? draftReply({ message: msg, profile, policy: refundPolicy, nudge: "alt" })
            : rewriteReply({ draft, nudge: reqNudge, message: msg, profile, policy: refundPolicy });
        run
          .then((r) => {
            if (genId.current === token) {
              setDraft(r.text);
              setTone(resolved);
              setRewriting(false);
            }
          })
          .catch(() => {
            if (genId.current === token) setRewriting(false);
          });
        return;
      }

      // No key — instant showcase variant (with a safe fallback if one's absent).
      setRewriting(true);
      if (rewriteTimer.current) clearTimeout(rewriteTimer.current);
      rewriteTimer.current = setTimeout(() => {
        const variant = resolved === "custom" ? it.variants.base : it.variants[resolved];
        setDraft(variant ?? it.variants.base);
        setTone(resolved);
        setRewriting(false);
      }, 650);
    },
    [rewriting, selId, tone, draft, profile, refundPolicy],
  );

  /* Send: mark current sent, advance to next unsent (else inbox zero). */
  const send = useCallback(() => {
    setSent((prev) => {
      const updated = prev.includes(selId) ? prev : [...prev, selId];
      const next = MESSAGES.find((m) => !updated.includes(m.id));
      if (next) {
        // Defer selection so it reads the freshly-sent set.
        queueMicrotask(() => select(next.id));
      }
      return updated;
    });
  }, [selId, select]);

  const copy = useCallback(() => {
    try {
      if (navigator.clipboard) {
        // Draft text only — never the API key.
        void navigator.clipboard.writeText(draft);
      }
    } catch {
      /* clipboard may be unavailable; non-fatal */
    }
    setCopied(true);
    if (copyTimer.current) clearTimeout(copyTimer.current);
    copyTimer.current = setTimeout(() => setCopied(false), 1500);
  }, [draft]);

  const restart = useCallback(() => {
    // Orchestrator owns navigation back to Connect.
    onRestart();
  }, [onRestart]);

  const onEdit = useCallback((value: string) => {
    setDraft(value);
    setTone("custom");
  }, []);

  const openLabel = allSent ? "all clear" : `${MESSAGES.length - sent.length} waiting`;
  const draftMeta = tone === "base" ? "Drafted in 1.1s" : TONE_LABELS[tone];
  const sendLabel = allSent ? "Sent" : "Send reply";
  const chCurrent = CHANNEL_META[current.channel];

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-[#161310] font-sans text-[#ece7e1]">
      {/* keyframes scoped to this screen */}
      <style>{`
        @keyframes rd-rise-soft { from { transform: translateY(8px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
        @keyframes rd-shimmer { 0% { background-position: -340px 0; } 100% { background-position: 340px 0; } }
        @keyframes rd-spin { to { transform: rotate(360deg); } }
        @media (prefers-reduced-motion: reduce) {
          .rd-anim { animation: none !important; }
          .rd-spin { animation-duration: .001ms !important; }
        }
        .rd-scroll::-webkit-scrollbar { width: 8px; }
        .rd-scroll::-webkit-scrollbar-thumb { background: #2e2820; border-radius: 8px; }
      `}</style>

      {/* ── top bar ───────────────────────────────────────────────────── */}
      <header className="flex h-[62px] flex-none items-center justify-between border-b border-[#262019] px-[22px]">
        <div className="flex items-center gap-[11px]">
          {/* rail toggle (narrow screens only) */}
          <button
            type="button"
            onClick={() => setRailOpen((v) => !v)}
            aria-label={railOpen ? "Hide inbox" : "Show inbox"}
            className="flex h-8 w-8 items-center justify-center rounded-[8px] border border-[#2f291f] bg-[#1f1c17] text-[#9b938c] transition-colors hover:border-[#4a4239] hover:text-[#d6cfc8] md:hidden"
          >
            <svg
              width={16}
              height={16}
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={1.9}
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M4 7h16M4 12h16M4 17h16" />
            </svg>
          </button>
          <LogoMark />
          <span className="font-display text-[18px] font-semibold tracking-[-0.01em] text-[#f5f1ec]">
            ReplyDesk
          </span>
        </div>
        <div className="flex items-center gap-[14px]">
          <div className="flex items-center gap-[7px] rounded-[9px] border border-[#2f291f] bg-[#1f1c17] px-3 py-[6px]">
            <span className="inline-flex h-[15px] w-[15px] text-[#d99a7c]">
              <WaveIcon size={15} />
            </span>
            <span className="text-[12.5px] text-[#c9c1ba]">
              Voice <span className="font-semibold text-[#7fc28e]">on</span>
            </span>
          </div>
          <div className="relative flex items-center gap-[11px]">
            <button
              type="button"
              onClick={() => setSettingsOpen((v) => !v)}
              aria-label="Settings"
              aria-expanded={settingsOpen}
              className="flex h-8 w-8 items-center justify-center rounded-[8px] border border-[#2f291f] bg-[#1f1c17] text-[#9b938c] transition-colors hover:border-[#4a4239] hover:text-[#d6cfc8]"
            >
              <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <circle cx={12} cy={12} r={3} />
                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
              </svg>
            </button>

            {settingsOpen ? (
              <>
                <button
                  type="button"
                  aria-label="Close settings"
                  onClick={() => setSettingsOpen(false)}
                  className="fixed inset-0 z-30 cursor-default"
                />
                <div className="absolute right-0 top-[42px] z-40 w-[320px] rounded-[14px] border border-[#3a332c] bg-[#1e1a16] p-4 text-left shadow-2xl">
                  <div className="mb-1 font-display text-[15px] font-semibold text-[#f5f1ec]">
                    Refunds &amp; returns
                  </div>
                  <p className="mb-3 text-[12.5px] leading-[1.5] text-[#9b938c]">
                    When a client asks for a refund, return, or anything that commits you financially:
                  </p>
                  {(
                    [
                      { v: "owner", t: "I'll handle these myself", d: "Claude flags them and routes them to you. It won't promise anything on your behalf." },
                      { v: "claude", t: "Claude can offer refunds", d: "Claude drafts the remedy in your voice; you only finalize the transaction." },
                    ] as { v: RefundPolicy; t: string; d: string }[]
                  ).map((opt) => {
                    const active = refundPolicy === opt.v;
                    return (
                      <button
                        key={opt.v}
                        type="button"
                        onClick={() => {
                          setRefundPolicy(opt.v);
                          saveSettings({ refundPolicy: opt.v });
                        }}
                        className="mb-2 block w-full cursor-pointer rounded-[11px] border p-[11px_12px] text-left transition-colors"
                        style={{
                          borderColor: active ? "#c15f3c" : "#3a332c",
                          background: active ? "#241a14" : "#181410",
                        }}
                      >
                        <div className="flex items-center gap-2">
                          <span
                            className="flex h-[15px] w-[15px] flex-none items-center justify-center rounded-full border"
                            style={{
                              borderColor: active ? "#d97757" : "#5a5048",
                              background: active ? "#d97757" : "transparent",
                            }}
                          >
                            {active ? <span className="h-[6px] w-[6px] rounded-full bg-[#161310]" /> : null}
                          </span>
                          <span className="text-[13.5px] font-semibold text-[#ece7e1]">{opt.t}</span>
                        </div>
                        <div className="mt-1 pl-[23px] text-[12px] leading-[1.45] text-[#9b938c]">{opt.d}</div>
                      </button>
                    );
                  })}
                </div>
              </>
            ) : null}

            <div className="flex h-[30px] w-[30px] items-center justify-center rounded-full border border-[#4a3a30] bg-[#3a2a22] text-[12.5px] font-semibold text-[#e3a07f]">
              RC
            </div>
          </div>
        </div>
      </header>

      {/* ── body ──────────────────────────────────────────────────────── */}
      <div className="flex min-h-0 flex-1">
        {/* ── inbox rail ────────────────────────────────────────────── */}
        <div
          className={[
            "flex min-h-0 flex-col border-r border-[#262019] bg-[#161310]",
            // ≥ md: static sidebar. < md: slide-over.
            "max-md:absolute max-md:inset-y-[62px] max-md:left-0 max-md:z-20 max-md:w-[300px] max-md:shadow-2xl max-md:transition-transform",
            railOpen ? "max-md:translate-x-0" : "max-md:-translate-x-full",
            "md:w-[336px] md:flex-none",
          ].join(" ")}
        >
          <div className="flex flex-none items-baseline justify-between px-5 pb-3 pt-[18px]">
            <h2 className="m-0 font-display text-[18px] font-semibold text-[#f5f1ec]">
              Inbox
            </h2>
            <span className="text-[12.5px] text-[#857c73]">{openLabel}</span>
          </div>
          <div className="rd-scroll flex min-h-0 flex-1 flex-col gap-[7px] overflow-y-auto px-3 pb-4">
            {MESSAGES.map((m) => {
              const isSel = m.id === selId;
              const isSent = sent.includes(m.id);
              const ch = CHANNEL_META[m.channel];
              return (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => select(m.id)}
                  className="group w-full cursor-pointer rounded-[12px] border bg-transparent p-[12px_13px] text-left transition-colors"
                  style={{
                    borderColor: isSel ? "#5a4636" : "#262019",
                    background: isSel ? "#221c17" : "transparent",
                    opacity: isSent ? 0.55 : 1,
                  }}
                  onMouseEnter={(e) => {
                    if (!isSel)
                      e.currentTarget.style.borderColor = "#473a30";
                  }}
                  onMouseLeave={(e) => {
                    if (!isSel)
                      e.currentTarget.style.borderColor = "#262019";
                  }}
                >
                  <div className="mb-[7px] flex items-center gap-2">
                    <span
                      className="flex h-5 w-5 flex-none items-center justify-center rounded-[6px]"
                      style={{ background: ch.bg, color: ch.color }}
                    >
                      <span className="inline-flex h-3 w-3">
                        {channelIcon(m.channel, 12)}
                      </span>
                    </span>
                    <span className="flex-1 overflow-hidden text-ellipsis whitespace-nowrap text-[13.5px] font-semibold text-[#ece7e1]">
                      {m.name}
                    </span>
                    {isSent ? (
                      <span className="inline-flex h-[15px] w-[15px] text-[#6fb37e]">
                        <CheckIcon size={15} />
                      </span>
                    ) : (
                      <span className="text-[11.5px] text-[#6f675f]">
                        {m.time}
                      </span>
                    )}
                  </div>
                  <div
                    className="overflow-hidden text-ellipsis text-[12.5px] leading-[1.45]"
                    style={{
                      color: isSel ? "#b8b0a8" : "#857c73",
                      display: "-webkit-box",
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: "vertical",
                    }}
                  >
                    {m.body}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* scrim behind the slide-over rail on narrow screens */}
        {railOpen ? (
          <button
            type="button"
            aria-label="Close inbox"
            onClick={() => setRailOpen(false)}
            className="absolute inset-0 z-10 cursor-default bg-black/40 md:hidden"
          />
        ) : null}

        {/* ── reply stage ───────────────────────────────────────────── */}
        <div className="rd-scroll relative min-h-0 flex-1 overflow-y-auto">
          {/* inbox-zero overlay */}
          {allSent ? (
            <div
              className="rd-anim absolute inset-0 z-[5] flex flex-col items-center justify-center bg-[#161310] p-10 text-center"
              style={{ animation: `rd-rise-soft .5s ${EASE} both` }}
            >
              <div className="mb-[22px] flex h-[66px] w-[66px] items-center justify-center rounded-[20px] border border-[#2c4232] bg-[#172218] text-[#7fc28e]">
                <span className="inline-flex h-8 w-8">
                  <CheckIcon size={32} />
                </span>
              </div>
              <h2 className="m-0 mb-3 font-display text-[33px] font-medium tracking-[-0.016em] text-[#f7f3ee]">
                Inbox zero
              </h2>
              <p className="m-0 mb-[6px] max-w-[36ch] text-[15px] leading-[1.6] text-[#9b938c]">
                You replied to everyone in your voice today — {sent.length}{" "}
                drafts, every one sounding like you.
              </p>
              <p className="m-0 mb-7 text-[13px] text-[#6f675f]">
                Claude kept learning from each edit you made.
              </p>
              <button
                type="button"
                onClick={restart}
                className="h-11 cursor-pointer whitespace-nowrap rounded-[11px] border border-[#3a332c] bg-[#211c18] px-[22px] text-[14px] font-semibold text-[#e2dcd5] transition-colors hover:border-[#4a4239] hover:bg-[#2a241f]"
              >
                Start over
              </button>
            </div>
          ) : null}

          <div
            className="mx-auto max-w-[720px] px-[clamp(20px,3vw,40px)] pb-10 pt-[26px]"
            style={{ display: allSent ? "none" : "block" }}
          >
            {/* incoming message */}
            <div
              key={current.id}
              className="rd-anim"
              style={{ animation: `rd-rise-soft .4s ${EASE} both` }}
            >
              <div className="mb-[14px] flex items-center gap-[10px]">
                <span
                  className="flex h-[30px] w-[30px] flex-none items-center justify-center rounded-[9px]"
                  style={{ background: chCurrent.bg, color: chCurrent.color }}
                >
                  <span className="inline-flex h-4 w-4">
                    {channelIcon(current.channel, 16)}
                  </span>
                </span>
                <div className="min-w-0 flex-1">
                  <div className="text-[15px] font-semibold text-[#f5f1ec]">
                    {current.name}
                  </div>
                  <div className="text-[12.5px] text-[#857c73]">
                    {current.meta}
                  </div>
                </div>
                {current.channel === "review" ? (
                  <div className="flex gap-[2px]">
                    {[0, 1, 2, 3, 4].map((i) => (
                      <span
                        key={i}
                        className="inline-flex h-[15px] w-[15px]"
                        style={{
                          color: i < current.rating ? "#dcb45a" : "#3f3a33",
                        }}
                      >
                        <Star on={i < current.rating} size={15} />
                      </span>
                    ))}
                  </div>
                ) : null}
              </div>
              <div className="whitespace-pre-wrap rounded-[14px] rounded-tl-[5px] border border-[#2c261f] bg-[#1d1915] p-[16px_18px] text-[14.5px] leading-[1.6] text-[#d8d2cb]">
                {current.body}
              </div>
            </div>

            {/* refund / return flag — honors the owner's policy (settings).
                Reads BOTH the message and the draft: the risk is often a draft
                that quietly offers a remedy the customer never even asked for. */}
            {involvesCommitment(current.body) || involvesCommitment(draft) ? (
              <div
                className="mt-[14px] flex items-start gap-[10px] rounded-[12px] border px-[14px] py-[11px]"
                style={{ borderColor: "#4a3a30", background: "#241a14" }}
              >
                <span className="mt-[1px] inline-flex h-4 w-4 flex-none text-[#dcb45a]" aria-hidden="true">
                  <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 3 2.5 20.5h19L12 3Z" />
                    <path d="M12 10v4.5" />
                    <path d="M12 17.6h.01" />
                  </svg>
                </span>
                <div className="text-[12.5px] leading-[1.5]">
                  <span className="font-semibold text-[#f0d9a8]">Refund / return flagged. </span>
                  {refundPolicy === "owner" ? (
                    <span className="text-[#c9bfae]">
                      Your policy: you handle these yourself — review this draft and strip anything you don&apos;t want to commit to before sending. Claude won&apos;t promise on your behalf.
                    </span>
                  ) : (
                    <span className="text-[#c9bfae]">
                      Your policy: Claude can offer a remedy in your voice — you finalize the actual transaction.
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={() => setSettingsOpen(true)}
                    className="ml-1 cursor-pointer text-[#e3a07f] underline-offset-2 hover:underline"
                  >
                    Change
                  </button>
                </div>
              </div>
            ) : null}

            {/* connector — Your draft */}
            <div className="m-[20px_2px_14px] flex items-center gap-[10px]">
              <span className="flex h-6 w-6 flex-none items-center justify-center rounded-[7px] bg-[#c15f3c]">
                <div className="h-[9px] w-[9px] rotate-45 rounded-[2px] bg-[#161310]" />
              </span>
              <span className="text-[13px] font-semibold text-[#e8e2db]">
                Your draft
              </span>
              <span className="inline-flex items-center gap-[5px] rounded-[7px] border border-[#3a2f26] bg-[#211c18] px-[9px] py-[3px]">
                <span className="inline-flex h-3 w-3 text-[#d99a7c]">
                  <WaveIcon size={12} />
                </span>
                <span className="text-[11.5px] text-[#cbb6a8]">
                  in your voice
                </span>
              </span>
              <span className="flex-1" />
              <span className="text-[12px] text-[#6f675f]">{draftMeta}</span>
            </div>

            {/* draft card */}
            <div className="overflow-hidden rounded-[14px] border border-[#4a3a30] bg-[#211c18]">
              <div className="relative">
                {rewriting ? (
                  <div className="absolute inset-0 z-[2] flex items-center gap-[11px] bg-[#211c18] p-[18px]">
                    <span
                      className="rd-spin inline-block h-4 w-4 rounded-full border-2 border-[#3a2f26] border-t-[#d97757]"
                      style={{ animation: "rd-spin .7s linear infinite" }}
                    />
                    <span className="text-[13.5px] text-[#9b938c]">
                      Rewriting in your voice…
                    </span>
                  </div>
                ) : null}
                <textarea
                  value={draft}
                  onChange={(e) => onEdit(e.target.value)}
                  spellCheck={false}
                  aria-label="Your draft reply"
                  className="block min-h-[152px] w-full resize-y border-none bg-transparent p-[18px] text-[14.5px] leading-[1.65] text-[#f2ece5] outline-none"
                />
              </div>

              {/* tone nudges */}
              <div className="flex flex-wrap gap-2 px-[14px] pb-[14px]">
                {NUDGES.map((n) => {
                  const active = tone === n.tone && n.tone !== "alt";
                  return (
                    <button
                      key={n.tone}
                      type="button"
                      onClick={() => nudge(n.tone)}
                      disabled={rewriting}
                      className="inline-flex cursor-pointer items-center gap-[6px] rounded-[10px] border px-[13px] py-2 text-[13px] font-medium transition-colors disabled:cursor-default"
                      style={{
                        borderColor: active ? "#7a5238" : "#352c24",
                        background: active ? "#3a2a1f" : "#1f1b16",
                        color: active ? "#f3c9ad" : "#bcb3aa",
                      }}
                      onMouseEnter={(e) => {
                        if (!active && !rewriting) {
                          e.currentTarget.style.background = "#322820";
                          e.currentTarget.style.borderColor = "#4d3e32";
                          e.currentTarget.style.color = "#f0e7df";
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (!active) {
                          e.currentTarget.style.background = "#1f1b16";
                          e.currentTarget.style.borderColor = "#352c24";
                          e.currentTarget.style.color = "#bcb3aa";
                        }
                      }}
                    >
                      <span className="inline-flex h-[14px] w-[14px]">
                        {n.icon}
                      </span>
                      {n.label}
                    </button>
                  );
                })}
              </div>

              {/* action bar */}
              <div className="flex items-center justify-between gap-3 border-t border-[#2c261f] bg-[#1d1915] p-[13px_14px]">
                <span className="flex items-center gap-[7px] text-[12px] text-[#6f675f]">
                  <span className="inline-flex h-[13px] w-[13px] text-[#6fb37e]">
                    <CheckIcon size={13} />
                  </span>
                  {tone === "custom"
                    ? "Edited by you — send when it's right"
                    : "Matches your voice — edit anything before sending"}
                </span>
                <div className="flex items-center gap-[9px]">
                  <button
                    type="button"
                    onClick={copy}
                    aria-label={copied ? "Copied" : "Copy draft"}
                    className="flex h-[38px] w-[38px] flex-none cursor-pointer items-center justify-center rounded-[10px] border border-[#3a332c] bg-transparent text-[#9b938c] transition-colors hover:border-[#4a4239] hover:text-[#d6cfc8]"
                    style={copied ? { color: "#6fb37e", borderColor: "#2c4232" } : undefined}
                  >
                    <span className="inline-flex h-4 w-4">
                      {copied ? <CheckIcon size={16} /> : <CopyIcon size={16} />}
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={send}
                    className="flex h-[38px] cursor-pointer items-center gap-2 rounded-[10px] border-none bg-[#c15f3c] px-[18px] text-[14px] font-semibold text-white transition-[background,transform] duration-150 hover:bg-[#d97757] active:translate-y-[1px]"
                    style={{
                      boxShadow:
                        "0 1px 2px rgba(0,0,0,.4), 0 10px 22px -10px rgba(217,119,87,.6)",
                    }}
                  >
                    {sendLabel}{" "}
                    <span className="inline-flex h-[15px] w-[15px]">
                      <SendIcon size={15} />
                    </span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}