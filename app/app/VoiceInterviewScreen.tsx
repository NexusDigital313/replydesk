"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type KeyboardEvent,
} from "react";
import { extractProfile, hasKey } from "@/lib/anthropic";
import type { VoiceProfile as EngineProfile } from "@/lib/voice";

/* ──────────────────────────────────────────────────────────────────────────
   VoiceInterview — Screen 2 of the ReplyDesk redesign.
   Split layout: chat with Claude (left) + live voice-profile panel (right).
   Scripted 5-question interview that builds a progressively revealed profile.

   The conversation here is SCRIPTED sample data (prototype behaviour). In
   production the interview is a real Claude Messages conversation and the
   profile is the structured voice model persisted on-device and fed into
   every draft prompt. See `requestNextClaudeTurn` for the integration seam.
   ────────────────────────────────────────────────────────────────────────── */

interface VoiceInterviewScreenProps {
  /** Called when the user clicks "See it draft in your voice →".
   *  Receives the derived voice profile so the orchestrator can persist it. */
  onDone: (profile?: unknown) => void;
}

type Role = "claude" | "user";

interface Message {
  role: Role;
  text: string;
}

/** Structured voice model derived from the interview. In production this is
 *  built from the real transcript + Claude's analysis; here it is pre-baked. */
interface VoiceProfile {
  tone: string[];
  pressure: string[];
  phrases: string[];
  avoids: string[];
  length: string;
  /** 0–100, how "formal" on the casual↔formal dial */
  formality: number;
}

const VOICE_PROFILE: VoiceProfile = {
  tone: ["Warm", "Casual", "Direct"],
  pressure: ["Takes ownership", "Calm under fire"],
  phrases: ["Cheers,", "no worries at all", "I hear you"],
  avoids: ["corporate-speak"],
  length: "2–3 warm sentences",
  formality: 34,
};

const GREETING =
  "Hey — I'm Claude. Before I start writing replies for you, I want to learn how you actually sound, so nothing I draft feels like a robot wrote it.\n\nFive quick questions. First one: what kind of business are you running, and who are you replying to all day?";

/** Claude's reply after each user answer (index 0 = reply to answer #1). */
const SCRIPT: readonly string[] = [
  "Got it. When a client's happy — a thanks, a glowing review — how do you reply? Type one the way you really would. Don't tidy it up for me.",
  "Nice. That's already a voice. Now the hard one: something's gone wrong — a complaint, a refund, a one-star. How do you handle it?",
  "Good. Are there words or sign-offs that are just you? Things you always say — or would never be caught saying?",
  "Last one. How long do your replies usually run — a quick line, or a few warm sentences?",
  "That's everything I need. I can hear you now — warm, straight with people, a little dry when it fits. I'll draft every reply in that voice and keep tuning as you edit. Want to see it?",
];

const PROFILE_PCT = [6, 24, 46, 68, 86, 100] as const;

const PLACEHOLDERS = [
  "Tell Claude about your business…",
  "Type a real reply to a happy client…",
  "How do you handle a complaint?…",
  "Your go-to words and sign-offs…",
  "A quick line, or a few sentences?…",
] as const;

const STEP_LABELS = [
  "Question 1 of 5",
  "Question 2 of 5",
  "Question 3 of 5",
  "Question 4 of 5",
  "Question 5 of 5",
  "Done",
] as const;

const TYPING_MS = 950;

/* ── Icons (paths lifted from the reference comp) ──────────────────────────── */

function LogoMark({ size, inner }: { size: number; inner: number }) {
  return (
    <div
      className="flex flex-none items-center justify-center rounded-[9px] bg-[#c15f3c]"
      style={{
        width: size,
        height: size,
        boxShadow:
          "0 1px 2px rgba(0,0,0,.4), 0 12px 28px -10px rgba(217,119,87,.55)",
      }}
    >
      <div
        className="rounded-[2px] bg-[#161310]"
        style={{ width: inner, height: inner, transform: "rotate(45deg)" }}
      />
    </div>
  );
}

function SendIcon() {
  return (
    <svg
      width={19}
      height={19}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M7 13l5-5 5 5" />
      <path d="M12 8v12" />
    </svg>
  );
}

function ArrowIcon() {
  return (
    <svg
      width={17}
      height={17}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M5 12h14" />
      <path d="M13 6l6 6-6 6" />
    </svg>
  );
}

function BanIcon() {
  return (
    <svg
      width={14}
      height={14}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx={12} cy={12} r={9} />
      <path d="M5.6 5.6l12.8 12.8" />
    </svg>
  );
}

function WaveIcon({ size }: { size: number }) {
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
      <path d="M3 12h2.2l1.6-5 2.4 13 2.5-16 2.4 11 1.5-3H21" />
    </svg>
  );
}

/* ── Keyframes / motion (transform-only, run-once, reduced-motion safe) ─────── */

const KEYFRAMES = `
@keyframes rd-rise-soft { from { transform: translateY(10px); } to { transform: translateY(0); } }
@keyframes rd-bub-in { from { transform: translateY(8px) scale(.98); opacity: 0; } to { transform: translateY(0) scale(1); opacity: 1; } }
@keyframes rd-chip-in { from { transform: translateY(6px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
@keyframes rd-dot { 0%, 60%, 100% { transform: translateY(0); opacity: .45; } 30% { transform: translateY(-4px); opacity: 1; } }
@media (prefers-reduced-motion: reduce) {
  .rd-anim, .rd-anim * { animation-duration: .001ms !important; transition-duration: .001ms !important; }
}
`;

const EASE = "cubic-bezier(.22,.68,.2,1)";

/* ── Component ──────────────────────────────────────────────────────────────── */

export default function VoiceInterviewScreen({
  onDone,
}: VoiceInterviewScreenProps) {
  const [messages, setMessages] = useState<Message[]>([
    { role: "claude", text: GREETING },
  ]);
  const [draft, setDraft] = useState("");
  const [answered, setAnswered] = useState(0);
  const [typing, setTyping] = useState(false);
  const [done, setDone] = useState(false);
  const [finishing, setFinishing] = useState(false);

  const chatRef = useRef<HTMLDivElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Auto-scroll transcript to newest on every render that adds content.
  useLayoutEffect(() => {
    const el = chatRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, typing, done]);

  // Auto-size the composer textarea to its content (max 140px).
  useLayoutEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 140)}px`;
  }, [draft]);

  // Clean up the pending typing timer on unmount.
  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  /* ── Integration seam ──────────────────────────────────────────────────────
     In production, replace this scripted lookup with a real Claude Messages
     call: send the running transcript and stream back Claude's next question /
     closing read. Keep the ~950ms typing indicator while the request is
     in-flight. The derived `VoiceProfile` should come from Claude's structured
     analysis of the transcript rather than the pre-baked constant above. */
  const requestNextClaudeTurn = useCallback((answeredCount: number): string => {
    // TODO(real-claude): swap for live Anthropic Messages request.
    return SCRIPT[answeredCount - 1] ?? "";
  }, []);

  const send = useCallback(() => {
    const text = draft.trim();
    if (!text || typing || done) return;

    const nextAnswered = answered + 1;
    setMessages((prev) => [...prev, { role: "user", text }]);
    setDraft("");
    setTyping(true);

    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      const line = requestNextClaudeTurn(nextAnswered);
      const isLast = nextAnswered >= 5;
      setMessages((prev) => [...prev, { role: "claude", text: line }]);
      setAnswered(nextAnswered);
      setTyping(false);
      setDone(isLast);
    }, TYPING_MS);
  }, [draft, typing, done, answered, requestNextClaudeTurn]);

  const onKey = useCallback(
    (e: KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        send();
      }
    },
    [send],
  );

  const onFinish = useCallback(() => {
    if (finishing) return;
    const answers = messages.filter((m) => m.role === "user").map((m) => m.text);
    const questions = [
      "What kind of business do you run, and who are you replying to?",
      "How do you reply to a happy client?",
      "How do you handle a complaint / refund / one-star?",
      "What words or sign-offs are unmistakably you?",
      "How long do your replies usually run?",
    ];
    const transcript = questions.map((q, i) => ({ q, a: answers[i] ?? "" }));

    // The interview mapped into the engine's voice-profile shape — works with no
    // key and reflects the user's own answers.
    const base: EngineProfile = {
      tone: VOICE_PROFILE.tone,
      wrongHandling: VOICE_PROFILE.pressure,
      signaturePhrases: VOICE_PROFILE.phrases,
      avoid: VOICE_PROFILE.avoids,
      length: VOICE_PROFILE.length,
      formality: VOICE_PROFILE.formality / 100,
      business: answers[0] || undefined,
      transcript,
    };

    // With a key, derive a genuinely personalized profile from the real answers.
    if (hasKey()) {
      setFinishing(true);
      extractProfile(transcript)
        .then((p) => onDone({ ...p, transcript }))
        .catch(() => onDone(base))
        .finally(() => setFinishing(false));
      return;
    }
    onDone(base);
  }, [finishing, messages, onDone]);

  /* ── Derived view state ────────────────────────────────────────────────────── */
  const a = answered;
  const pct = PROFILE_PCT[Math.min(a, 5)];
  const canSend = draft.trim().length > 0 && !typing;
  const placeholder = PLACEHOLDERS[Math.min(a, 4)];
  const stepLabel = STEP_LABELS[Math.min(a, 5)];
  const notDone = !done;

  const showEmpty = a < 1;
  const showTone = a >= 2;
  const showPressure = a >= 3;
  const showPhrases = a >= 4;
  const showLength = a >= 5;

  return (
    <div className="rd-anim grid min-h-screen w-full bg-[#161310] text-[#ece7e1] [grid-template-columns:1fr] lg:[grid-template-columns:1fr_0.82fr]">
      <style>{KEYFRAMES}</style>

      {/* ── Conversation column ─────────────────────────────────────────────── */}
      <div className="flex max-h-screen min-h-0 flex-col px-6 pb-[26px] pt-8 [padding-left:clamp(24px,4vw,56px)] [padding-right:clamp(24px,4vw,56px)]">
        {/* header */}
        <header
          className="mb-5 flex flex-none items-center justify-between gap-[11px]"
          style={{ animation: `rd-rise-soft .7s ${EASE} both` }}
        >
          <div className="flex items-center gap-[11px]">
            <LogoMark size={30} inner={11} />
            <span className="font-display text-[19px] font-semibold tracking-[-.01em] text-[#f5f1ec]">
              ReplyDesk
            </span>
          </div>
          <span className="text-[12.5px] tracking-[.02em] text-[#6f675f]">
            Teaching Claude your voice
          </span>
        </header>

        {/* scrollable transcript */}
        <div
          ref={chatRef}
          className="flex min-h-0 flex-1 flex-col overflow-y-auto px-1 pb-1 pt-1.5 [scrollbar-color:#2e2820_transparent]"
        >
          <div className="mx-auto w-full max-w-[600px]">
            {messages.map((m, i) => {
              const claude = m.role === "claude";
              return (
                <div
                  key={i}
                  className={`mb-4 flex items-end gap-2.5 ${
                    claude ? "justify-start" : "justify-end"
                  }`}
                  style={{ animation: `rd-bub-in .4s ${EASE} both` }}
                >
                  {claude && (
                    <div className="mb-0.5 flex h-7 w-7 flex-none items-center justify-center rounded-lg bg-[#c15f3c]">
                      <div
                        className="h-2.5 w-2.5 rounded-[2px] bg-[#161310]"
                        style={{ transform: "rotate(45deg)" }}
                      />
                    </div>
                  )}
                  <div
                    className={
                      claude
                        ? "max-w-[80%] whitespace-pre-wrap rounded-[15px] rounded-bl-[5px] border border-[#2f291f] bg-[#211c18] px-[15px] py-3 text-[14.5px] leading-[1.55] text-[#e8e2db]"
                        : "max-w-[80%] whitespace-pre-wrap rounded-[15px] rounded-br-[5px] bg-[#c15f3c] px-[15px] py-3 text-[14.5px] leading-[1.55] text-white"
                    }
                  >
                    {m.text}
                  </div>
                </div>
              );
            })}

            {typing && (
              <div className="mb-4 flex items-end justify-start gap-2.5">
                <div className="mb-0.5 flex h-7 w-7 flex-none items-center justify-center rounded-lg bg-[#c15f3c]">
                  <div
                    className="h-2.5 w-2.5 rounded-[2px] bg-[#161310]"
                    style={{ transform: "rotate(45deg)" }}
                  />
                </div>
                <div className="flex gap-[5px] rounded-[14px] rounded-bl-[5px] border border-[#2f291f] bg-[#211c18] px-4 py-3.5">
                  {[0, 0.18, 0.36].map((delay) => (
                    <span
                      key={delay}
                      className="h-1.5 w-1.5 rounded-full bg-[#9b8e80]"
                      style={{
                        animation: `rd-dot 1.1s ease-in-out ${delay}s infinite`,
                      }}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* composer / done */}
        <div className="mx-auto mt-3.5 w-full max-w-[600px] flex-none">
          {notDone && (
            <>
              <div className="flex items-end gap-2.5 rounded-2xl border border-[#3a332c] bg-[#211c18] py-2 pl-4 pr-2 transition-[border-color,box-shadow] duration-150 focus-within:border-[#d97757] focus-within:shadow-[0_0_0_3px_rgba(217,119,87,.18)]">
                <textarea
                  ref={textareaRef}
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  onKeyDown={onKey}
                  rows={1}
                  placeholder={placeholder}
                  disabled={typing}
                  spellCheck={false}
                  className="max-h-[140px] flex-1 resize-none border-none bg-transparent py-2 text-[15px] leading-[1.5] text-[#f0ebe5] outline-none placeholder:text-[#6f655c] disabled:cursor-not-allowed"
                />
                <button
                  type="button"
                  onClick={send}
                  aria-label="Send"
                  disabled={!canSend}
                  className={`flex h-[38px] w-[38px] flex-none items-center justify-center rounded-[11px] text-white transition-[background-color,transform] duration-150 active:translate-y-px ${
                    canSend
                      ? "cursor-pointer bg-[#c15f3c] hover:bg-[#d97757]"
                      : "cursor-default bg-[#3a332c]"
                  }`}
                >
                  <SendIcon />
                </button>
              </div>
              <div className="mt-[9px] flex items-center justify-between px-1">
                <span className="text-[12px] text-[#6f675f]">{stepLabel}</span>
                <span className="text-[12px] text-[#6f675f]">
                  Press <span className="text-[#9b938c]">Enter</span> to send
                </span>
              </div>
            </>
          )}

          {done && (
            <button
              type="button"
              onClick={onFinish}
              disabled={finishing}
              className="flex h-[50px] w-full items-center justify-center gap-[9px] rounded-[13px] bg-[#c15f3c] text-[15px] font-semibold text-white transition-[background-color,transform] duration-150 hover:bg-[#d97757] active:translate-y-px disabled:opacity-80"
              style={{
                boxShadow:
                  "0 1px 2px rgba(0,0,0,.4), 0 14px 30px -12px rgba(217,119,87,.65)",
                animation: `rd-rise-soft .5s ${EASE} both`,
              }}
            >
              {finishing ? "Reading your voice…" : "See it draft in your voice"}
              {finishing ? null : (
                <span className="inline-flex h-[17px] w-[17px]">
                  <ArrowIcon />
                </span>
              )}
            </button>
          )}
        </div>
      </div>

      {/* ── Voice profile column (hidden < lg) ──────────────────────────────── */}
      <div className="relative hidden max-h-screen flex-col overflow-hidden border-l border-[#2a221b] bg-[#1a1611] px-7 py-8 lg:flex [padding-left:clamp(28px,2.4vw,44px)] [padding-right:clamp(28px,2.4vw,44px)]">
        {/* ambient clay glow */}
        <div
          className="pointer-events-none absolute -right-[22%] -top-[24%] aspect-square w-[64%] rounded-full"
          style={{
            background:
              "radial-gradient(circle at 40% 40%, rgba(193,95,60,.22), rgba(193,95,60,0) 70%)",
          }}
        />

        <div className="relative mb-1.5 flex flex-none items-center gap-[9px]">
          <span className="inline-flex h-[22px] w-[22px] text-[#d99a7c]">
            <WaveIcon size={22} />
          </span>
          <span className="font-display text-[17px] font-semibold text-[#f5f1ec]">
            Your voice
          </span>
        </div>
        <p className="relative mb-5 mt-0 flex-none text-[13px] leading-[1.5] text-[#857c73]">
          What Claude's learning as you speak. This is what every draft will sound
          like.
        </p>

        {/* confidence meter */}
        <div className="relative mb-6 flex-none">
          <div className="mb-2 flex items-baseline justify-between">
            <span className="text-[12px] uppercase tracking-[.06em] text-[#857c73]">
              Profile match
            </span>
            <span className="font-display text-[19px] font-semibold text-[#e3a07f]">
              {pct}%
            </span>
          </div>
          <div className="h-[7px] overflow-hidden rounded-md bg-[#262019]">
            <div
              className="h-full rounded-md"
              style={{
                width: `${pct}%`,
                background: "linear-gradient(90deg,#9e4a2c,#d97757)",
                transition: `width .8s ${EASE}`,
              }}
            />
          </div>
        </div>

        {/* revealed traits */}
        <div className="relative flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto pr-0.5">
          {showTone && (
            <div style={{ animation: `rd-chip-in .5s ${EASE} both` }}>
              <div className="mb-2.5 text-[11.5px] uppercase tracking-[.06em] text-[#857c73]">
                Tone
              </div>
              <div className="flex flex-wrap gap-2">
                {VOICE_PROFILE.tone.map((t) => (
                  <span
                    key={t}
                    className="rounded-[9px] border border-[#3d3025] bg-[#2a211b] px-3 py-1.5 text-[13px] text-[#ecdfd5]"
                  >
                    {t}
                  </span>
                ))}
              </div>
            </div>
          )}

          {showPressure && (
            <div style={{ animation: `rd-chip-in .5s ${EASE} both` }}>
              <div className="mb-2.5 text-[11.5px] uppercase tracking-[.06em] text-[#857c73]">
                When something's wrong
              </div>
              <div className="flex flex-wrap gap-2">
                {VOICE_PROFILE.pressure.map((t) => (
                  <span
                    key={t}
                    className="rounded-[9px] border border-[#36402f] bg-[#22241f] px-3 py-1.5 text-[13px] text-[#cfe0cf]"
                  >
                    {t}
                  </span>
                ))}
              </div>
            </div>
          )}

          {showPhrases && (
            <div style={{ animation: `rd-chip-in .5s ${EASE} both` }}>
              <div className="mb-2.5 text-[11.5px] uppercase tracking-[.06em] text-[#857c73]">
                Signature phrases
              </div>
              <div className="mb-3 flex flex-wrap gap-2">
                {VOICE_PROFILE.phrases.map((t) => (
                  <span
                    key={t}
                    className="rounded-[9px] border border-dashed border-[#4a3b30] bg-[#211c18] px-3 py-1.5 text-[13px] italic text-[#e8d8cb]"
                  >
                    &ldquo;{t}&rdquo;
                  </span>
                ))}
              </div>
              <div className="flex items-center gap-2 text-[12.5px] text-[#857c73]">
                <span className="inline-flex h-3.5 w-3.5 text-[#a86b5a]">
                  <BanIcon />
                </span>
                <span>
                  Steers clear of{" "}
                  <span className="text-[#c9a99a]">
                    {VOICE_PROFILE.avoids[0]}
                  </span>
                </span>
              </div>
            </div>
          )}

          {showLength && (
            <div style={{ animation: `rd-chip-in .5s ${EASE} both` }}>
              <div className="mb-2.5 text-[11.5px] uppercase tracking-[.06em] text-[#857c73]">
                Length &amp; formality
              </div>
              <div className="mb-4 flex items-center gap-2.5">
                <span className="rounded-[9px] border border-[#3d3025] bg-[#2a211b] px-3 py-1.5 text-[13px] text-[#ecdfd5]">
                  {VOICE_PROFILE.length}
                </span>
              </div>
              <div className="mb-[7px] flex justify-between text-[12px] text-[#857c73]">
                <span>Casual</span>
                <span>Formal</span>
              </div>
              <div className="relative h-1.5 rounded-md bg-[#262019]">
                <div
                  className="absolute bottom-0 left-0 top-0 rounded-md bg-[#6e4332]"
                  style={{ width: `${VOICE_PROFILE.formality}%` }}
                />
                <div
                  className="absolute top-1/2 h-[15px] w-[15px] rounded-full border-2 border-[#1a1611] bg-[#e3a07f]"
                  style={{
                    left: `${VOICE_PROFILE.formality}%`,
                    transform: "translate(-50%,-50%)",
                    boxShadow: "0 1px 4px rgba(0,0,0,.5)",
                  }}
                />
              </div>
            </div>
          )}

          {showEmpty && (
            <div className="flex flex-1 flex-col items-center justify-center px-5 py-[30px] text-center text-[#5f5851]">
              <span className="mb-3 inline-flex h-[30px] w-[30px] text-[#3f3a33]">
                <WaveIcon size={30} />
              </span>
              <span className="max-w-[24ch] text-[13px] leading-[1.5]">
                Answer Claude's first question and your voice starts taking shape
                here.
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
