"use client";

import React, { useEffect, useId, useRef, useState } from "react";

type View = "setup" | "verifying" | "connected" | "error";

export interface ConnectScreenProps {
  /** Called by both "Continue to ReplyDesk" (connected) and "Set up later". */
  onDone: () => void;
  /**
   * Orchestrator-owned key storage seam. Called with the validated key string
   * once verification succeeds, or `null` when the key is removed. The
   * component never persists anything itself.
   */
  onKey?: (key: string | null) => void;
}

const EASE = "cubic-bezier(.22,.68,.2,1)";
const KEY_FORMAT = /^sk-ant-[A-Za-z0-9_\-]{16,}$/;

/* ── Icons (paths lifted verbatim from the reference comp) ───────────── */

function Icon({
  paths,
  size = 24,
  strokeWidth = 1.8,
}: {
  paths: string[];
  size?: number;
  strokeWidth?: number;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {paths.map((d, i) => (
        <path key={i} d={d} />
      ))}
    </svg>
  );
}

const EyeOpenIcon = () => (
  <Icon
    size={18}
    paths={[
      "M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z",
      "M12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6Z",
    ]}
  />
);

const EyeOffIcon = () => (
  <Icon
    size={18}
    paths={[
      "M3 3l18 18",
      "M10.6 10.6a3 3 0 0 0 4.2 4.2",
      "M9.4 5.2A9.6 9.6 0 0 1 12 5c6.5 0 10 7 10 7a17.3 17.3 0 0 1-3.2 4M6.1 6.1A17.3 17.3 0 0 0 2 12s3.5 7 10 7a9.7 9.7 0 0 0 3-.5",
    ]}
  />
);

const AlertIcon = () => (
  <Icon size={26} paths={["M12 3 2.5 20.5h19L12 3Z", "M12 10v4.5", "M12 17.6h.01"]} />
);

const ArrowIcon = () => <Icon size={16} paths={["M5 12h14", "M13 6l6 6-6 6"]} />;

const CheckIcon = ({ size = 27 }: { size?: number }) => (
  <Icon size={size} strokeWidth={2} paths={["M20 6 9 17l-5-5"]} />
);

const ShieldIcon = ({ size = 17 }: { size?: number }) => (
  <Icon
    size={size}
    paths={[
      "M12 3l7 2.5v5.2c0 4.3-2.9 6.9-7 8.3-4.1-1.4-7-4-7-8.3V5.5L12 3Z",
      "m8.8 11.6 2.1 2.1 4.3-4.3",
    ]}
  />
);

const KeyIcon = () => (
  <svg
    width={15}
    height={15}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={1.8}
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <circle cx={8} cy={15} r={3.2} />
    <path d="M10.3 12.7 20 3M16.5 6.5 19 9M13.8 9.2l1.9 1.9" />
  </svg>
);

const ExternalIcon = () => (
  <Icon
    size={13}
    paths={[
      "M14 4.5h5.5V10",
      "M19.5 4.5 11 13",
      "M12 4.5H7A2.5 2.5 0 0 0 4.5 7v10A2.5 2.5 0 0 0 7 19.5h10A2.5 2.5 0 0 0 19.5 17v-5",
    ]}
  />
);

/* ── Component ───────────────────────────────────────────────────────── */

export default function ConnectScreen({ onDone, onKey }: ConnectScreenProps) {
  const [view, setView] = useState<View>("setup");
  const [apiKey, setApiKey] = useState("");
  const [showKey, setShowKey] = useState(false);
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [entered, setEntered] = useState(false);
  const [keyFocused, setKeyFocused] = useState(false);

  const errorId = useId();
  const verifyTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Entrance animations run once on mount, then disable so re-renders /
  // state-driven view swaps don't replay them.
  useEffect(() => {
    const t = setTimeout(() => setEntered(true), 1300);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    return () => {
      if (verifyTimer.current) clearTimeout(verifyTimer.current);
    };
  }, []);

  const trimmedKey = apiKey.trim();
  const last4 = trimmedKey.length >= 4 ? trimmedKey.slice(-4) : "";
  const maskedKey = "sk-ant-" + "•".repeat(16) + last4;

  const validKeyFormat = (v: string) => KEY_FORMAT.test((v || "").trim());

  const handleConnect = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validKeyFormat(apiKey)) {
      setFieldError(
        "That doesn’t look like an Anthropic key — they start with “sk-ant-”.",
      );
      return;
    }
    setFieldError(null);
    setView("verifying");

    // SEAM (real Claude integration): the orchestrator should replace this
    // simulated delay with the actual test Messages call:
    //   POST https://api.anthropic.com/v1/messages
    //   headers: x-api-key, anthropic-version: 2023-06-01,
    //            anthropic-dangerous-direct-browser-access: true
    //   body: { model: <cheap>, max_tokens: 1, messages: [...] }
    //   2xx -> connected ; 401/403/4xx -> error.
    // Browser -> Anthropic directly. Never proxy or log the key.
    if (verifyTimer.current) clearTimeout(verifyTimer.current);
    verifyTimer.current = setTimeout(() => {
      // Prototype: simulate a successful verification.
      setView("connected");
      onKey?.(trimmedKey);
    }, 1600);
  };

  const handleSkip = () => onDone();
  const handleContinue = () => onDone();

  const handleUseDifferent = () => {
    setView("setup");
    setFieldError(null);
  };

  const handleRemove = () => {
    setView("setup");
    setApiKey("");
    setFieldError(null);
    onKey?.(null);
  };

  const handleTryAgain = () => {
    setView("setup");
    setFieldError(null);
  };

  /* Entrance animation strings (transform-only, easing per spec) */
  const animHeader = entered ? "none" : `rise-soft .7s ${EASE} both`;
  const animForm = entered ? "none" : `rise-in .85s ${EASE} .05s both`;
  const animFooter = entered ? "none" : `rise-soft .7s ${EASE} .1s both`;
  const animCard = entered ? "none" : `rise-in 1s ${EASE} .15s both`;
  const animTag = entered ? "none" : `rise-soft .9s ${EASE} .25s both`;

  const keyBorder = fieldError ? "#9e4a3f" : keyFocused ? "#d97757" : "#3a332c";

  return (
    <div className="grid min-h-screen w-full grid-cols-1 bg-[#161310] lg:grid-cols-2">
      {/* scoped keyframes — keep entrances/spinner self-contained */}
      <style>{`
        @keyframes rd-rise-in { from { transform: translateY(18px); } to { transform: translateY(0); } }
        @keyframes rd-rise-soft { from { transform: translateY(10px); } to { transform: translateY(0); } }
        @keyframes rd-spin { to { transform: rotate(360deg); } }
        @media (prefers-reduced-motion: reduce) {
          .rd-connect [style*="animation"] { animation: none !important; }
          .rd-connect .rd-spinner { animation-duration: .8s !important; }
        }
      `}</style>

      <div className="rd-connect contents" />

      {/* ── Setup / state side ─────────────────────────────── */}
      <div className="flex min-h-screen flex-col px-[clamp(28px,5vw,72px)] py-10">
        {/* Header */}
        <header
          className="flex items-center gap-[11px]"
          style={{ animation: animHeader.replace("rise-soft", "rd-rise-soft") }}
        >
          <div
            className="flex h-[30px] w-[30px] items-center justify-center rounded-[9px] bg-[#c15f3c]"
            style={{
              boxShadow:
                "0 1px 2px rgba(0,0,0,.4), 0 12px 28px -10px rgba(217,119,87,.55)",
            }}
          >
            <div className="h-[11px] w-[11px] rotate-45 rounded-[2px] bg-[#161310]" />
          </div>
          <span className="font-display text-[19px] font-semibold tracking-[-.01em] text-[#f5f1ec]">
            ReplyDesk
          </span>
        </header>

        {/* Center column */}
        <div className="flex flex-1 items-center justify-center">
          <div
            className="w-full max-w-[412px]"
            style={{ animation: animForm.replace("rise-in", "rd-rise-in") }}
          >
            {/* ░░ SETUP ░░ */}
            {view === "setup" && (
              <div>
                <h1 className="font-display m-0 mb-[10px] text-[34px] font-medium leading-[1.12] tracking-[-.018em] text-[#f7f3ee]">
                  Bring your own Claude key
                </h1>
                <p className="m-0 mb-[26px] text-[15px] leading-[1.55] text-[#9b938c]">
                  Paste your Anthropic API key to switch on AI drafts. It&apos;s
                  stored only on this device and sent straight to Anthropic —
                  ReplyDesk has no server and never sees it.
                </p>

                <form
                  onSubmit={handleConnect}
                  noValidate
                  className="flex flex-col gap-[14px]"
                >
                  <label className="flex flex-col gap-[7px]">
                    <div className="flex items-baseline justify-between">
                      <span className="text-[13px] font-medium text-[#c9c1ba]">
                        Anthropic API key
                      </span>
                      <a
                        href="https://console.anthropic.com/settings/keys"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-[4px] text-[12.5px] font-medium text-[#db9a7b] no-underline hover:underline"
                      >
                        Get a key{" "}
                        <span className="inline-flex h-[13px] w-[13px]">
                          <ExternalIcon />
                        </span>
                      </a>
                    </div>
                    <div className="relative flex items-center">
                      <input
                        type={showKey ? "text" : "password"}
                        value={apiKey}
                        onChange={(e) => {
                          setApiKey(e.target.value);
                          setFieldError(null);
                        }}
                        onFocus={() => setKeyFocused(true)}
                        onBlur={() => setKeyFocused(false)}
                        placeholder="sk-ant-api03-…"
                        autoComplete="off"
                        spellCheck={false}
                        aria-invalid={fieldError ? true : undefined}
                        aria-describedby={fieldError ? errorId : undefined}
                        className="h-[48px] w-full rounded-[11px] bg-[#211c18] pl-[14px] pr-[46px] font-mono text-[14px] tracking-[.01em] text-[#f0ebe5] outline-none transition-[border-color,box-shadow] duration-150"
                        style={{
                          border: `1px solid ${keyBorder}`,
                          boxShadow: keyFocused
                            ? "0 0 0 3px rgba(217,119,87,.25)"
                            : "none",
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => setShowKey((s) => !s)}
                        aria-label={showKey ? "Hide key" : "Show key"}
                        aria-pressed={showKey}
                        className="absolute right-[6px] flex h-[36px] w-[36px] items-center justify-center rounded-[8px] border-none bg-transparent text-[#857c73] transition-[color,background] duration-150 hover:bg-[#2a241f] hover:text-[#d6cfc8]"
                      >
                        {showKey ? <EyeOpenIcon /> : <EyeOffIcon />}
                      </button>
                    </div>
                    {fieldError && (
                      <span
                        id={errorId}
                        className="mt-[1px] text-[12.5px] text-[#e08a82]"
                      >
                        {fieldError}
                      </span>
                    )}
                  </label>

                  {/* Security strip */}
                  <div className="flex items-start gap-[9px] rounded-[11px] border border-[#2a2a22] bg-[#1b1a17] px-[13px] py-[11px]">
                    <span className="mt-[1px] inline-flex h-[17px] w-[17px] flex-none text-[#7fae8b]">
                      <ShieldIcon size={17} />
                    </span>
                    <span className="text-[12.5px] leading-[1.5] text-[#9b938c]">
                      Stored on this device only. Requests go{" "}
                      <span className="text-[#c9c1ba]">
                        browser&nbsp;→&nbsp;Anthropic
                      </span>{" "}
                      — never through us.
                    </span>
                  </div>

                  <button
                    type="submit"
                    className="mt-[2px] h-[48px] rounded-[11px] border-none bg-[#c15f3c] text-[15px] font-semibold text-white transition-[background,transform,box-shadow] duration-150 hover:bg-[#d97757] active:translate-y-[1px]"
                    style={{
                      boxShadow:
                        "0 1px 2px rgba(0,0,0,.4), 0 12px 28px -12px rgba(217,119,87,.6)",
                    }}
                  >
                    Connect
                  </button>
                </form>

                {/* Set up later */}
                <div className="mt-[24px] flex flex-col items-center gap-[8px] border-t border-[#262019] pt-[20px]">
                  <button
                    type="button"
                    onClick={handleSkip}
                    className="inline-flex items-center gap-[7px] border-none bg-transparent text-[14.5px] font-semibold text-[#e2dcd5] transition-colors duration-150 hover:text-white"
                  >
                    Set up later
                    <span className="inline-flex h-[16px] w-[16px] text-[#db9a7b]">
                      <ArrowIcon />
                    </span>
                  </button>
                  <span className="text-center text-[12.5px] text-[#6f675f]">
                    ReplyDesk works without it — you just won&apos;t get AI
                    drafts until you connect.
                  </span>
                </div>
              </div>
            )}

            {/* ░░ VERIFYING ░░ */}
            {view === "verifying" && (
              <div
                className="flex flex-col items-center text-center"
                style={{ animation: `rd-rise-soft .55s ${EASE} both` }}
              >
                <div
                  className="rd-spinner mb-[24px] h-[44px] w-[44px] rounded-full"
                  style={{
                    border: "3px solid #2f2820",
                    borderTopColor: "#d97757",
                    animation: "rd-spin .7s linear infinite",
                  }}
                />
                <h1 className="font-display m-0 mb-[10px] text-[30px] font-medium leading-[1.12] tracking-[-.014em] text-[#f7f3ee]">
                  Checking your key
                </h1>
                <p className="m-0 max-w-[32ch] text-[15px] leading-[1.55] text-[#9b938c]">
                  Sending one test request straight to Anthropic to make sure it
                  works.
                </p>
              </div>
            )}

            {/* ░░ CONNECTED ░░ */}
            {view === "connected" && (
              <div style={{ animation: `rd-rise-soft .55s ${EASE} both` }}>
                <div className="mb-[22px] flex h-[56px] w-[56px] items-center justify-center rounded-[16px] border border-[#2c4232] bg-[#172218] text-[#7fc28e]">
                  <span className="inline-flex h-[27px] w-[27px]">
                    <CheckIcon size={27} />
                  </span>
                </div>
                <h1 className="font-display m-0 mb-[10px] text-[33px] font-medium leading-[1.12] tracking-[-.016em] text-[#f7f3ee]">
                  You&apos;re connected
                </h1>
                <p className="m-0 mb-[22px] text-[15px] leading-[1.55] text-[#9b938c]">
                  AI drafts are on. Your key is saved on this device only.
                </p>

                <div className="mb-[24px] flex items-center justify-between gap-[12px] rounded-[11px] border border-[#3a332c] bg-[#211c18] px-[15px] py-[13px]">
                  <span className="overflow-hidden text-ellipsis whitespace-nowrap font-mono text-[13.5px] text-[#c9c1ba]">
                    {maskedKey}
                  </span>
                  <span className="inline-flex flex-none items-center gap-[6px] text-[12px] font-medium text-[#7fc28e]">
                    <span className="h-[7px] w-[7px] rounded-full bg-[#5fae72]" />
                    Active
                  </span>
                </div>

                <div className="flex flex-col gap-[12px]">
                  <button
                    type="button"
                    onClick={handleContinue}
                    className="h-[48px] rounded-[11px] border-none bg-[#c15f3c] text-[15px] font-semibold text-white transition-[background,transform] duration-150 hover:bg-[#d97757] active:translate-y-[1px]"
                    style={{
                      boxShadow:
                        "0 1px 2px rgba(0,0,0,.4), 0 12px 28px -12px rgba(217,119,87,.6)",
                    }}
                  >
                    Continue to ReplyDesk
                  </button>
                  <div className="flex justify-center gap-[18px]">
                    <button
                      type="button"
                      onClick={handleUseDifferent}
                      className="border-none bg-transparent text-[14px] font-medium text-[#db9a7b] transition-colors duration-150 hover:text-[#e8b69b]"
                    >
                      Replace key
                    </button>
                    <button
                      type="button"
                      onClick={handleRemove}
                      className="border-none bg-transparent text-[14px] font-medium text-[#857c73] transition-colors duration-150 hover:text-[#e08a82]"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* ░░ ERROR ░░ */}
            {view === "error" && (
              <div style={{ animation: `rd-rise-soft .55s ${EASE} both` }}>
                <div className="mb-[22px] flex h-[56px] w-[56px] items-center justify-center rounded-[16px] border border-[#4a2421] bg-[#2a1715] text-[#e58c83]">
                  <span className="inline-flex h-[26px] w-[26px]">
                    <AlertIcon />
                  </span>
                </div>
                <h1 className="font-display m-0 mb-[10px] text-[33px] font-medium leading-[1.12] tracking-[-.016em] text-[#f7f3ee]">
                  That key didn&apos;t work
                </h1>
                <p className="m-0 mb-[24px] text-[15px] leading-[1.55] text-[#9b938c]">
                  Anthropic rejected it. Check it was copied in full, hasn&apos;t
                  been revoked, and that your account has available credit.
                </p>

                <div className="flex flex-col gap-[12px]">
                  <button
                    type="button"
                    onClick={handleTryAgain}
                    className="h-[48px] rounded-[11px] border-none bg-[#c15f3c] text-[15px] font-semibold text-white transition-[background,transform] duration-150 hover:bg-[#d97757] active:translate-y-[1px]"
                    style={{
                      boxShadow:
                        "0 1px 2px rgba(0,0,0,.4), 0 12px 28px -12px rgba(217,119,87,.6)",
                    }}
                  >
                    Try a different key
                  </button>
                  <button
                    type="button"
                    onClick={handleSkip}
                    className="h-[40px] border-none bg-transparent text-[14px] font-medium text-[#db9a7b] transition-colors duration-150 hover:text-[#e8b69b]"
                  >
                    Set up later
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <footer
          className="flex gap-[20px] text-[12.5px] text-[#6f675f]"
          style={{ animation: animFooter.replace("rise-soft", "rd-rise-soft") }}
        >
          <span>© 2026 ReplyDesk</span>
          <a
            href="#"
            className="text-[#6f675f] no-underline transition-colors hover:text-[#9b938c]"
          >
            Privacy
          </a>
          <a
            href="#"
            className="text-[#6f675f] no-underline transition-colors hover:text-[#9b938c]"
          >
            Terms
          </a>
        </footer>
      </div>

      {/* ── Brand / privacy side (hidden on narrow screens) ─── */}
      <div className="relative hidden flex-col justify-between overflow-hidden bg-[#7e3a22] p-[clamp(40px,4vw,64px)] lg:flex">
        <div
          className="pointer-events-none absolute right-[-14%] top-[-22%] aspect-square w-[62%] rounded-full"
          style={{
            background:
              "radial-gradient(circle at 30% 30%, rgba(217,119,87,.85), rgba(217,119,87,0) 70%)",
          }}
        />
        <div
          className="pointer-events-none absolute bottom-[-26%] left-[-18%] aspect-square w-[58%] rounded-full"
          style={{
            background:
              "radial-gradient(circle at 50% 50%, rgba(0,0,0,.5), rgba(0,0,0,0) 70%)",
          }}
        />

        {/* Tilted device card */}
        <div
          className="relative flex flex-1 items-center justify-center"
          style={{ perspective: "1400px" }}
        >
          <div
            className="group w-[min(348px,84%)] rounded-[20px] border border-[#312a23] bg-[#1e1a16] p-[24px] transition-transform duration-[600ms] hover:[transform:rotateY(0deg)_rotateX(0deg)]"
            style={{
              boxShadow:
                "0 2px 4px rgba(0,0,0,.4), 0 30px 60px -22px rgba(0,0,0,.6), 0 60px 100px -40px rgba(0,0,0,.55)",
              transform: "rotateY(-9deg) rotateX(4deg)",
              transitionTimingFunction: EASE,
              animation: animCard.replace("rise-in", "rd-rise-in"),
            }}
          >
            <div className="mb-[18px] flex items-center justify-between">
              <div className="flex items-center gap-[9px]">
                <div className="flex h-[24px] w-[24px] items-center justify-center rounded-[7px] border border-[#33473b] bg-[#22302a] text-[#7fc28e]">
                  <span className="inline-flex h-[13px] w-[13px]">
                    <ShieldIcon size={13} />
                  </span>
                </div>
                <span className="font-display text-[14px] font-semibold text-[#ece7e1]">
                  On this device
                </span>
              </div>
              <span className="inline-flex items-center gap-[6px] text-[11.5px] text-[#8fbf9a]">
                <span className="h-[7px] w-[7px] rounded-full bg-[#5fae72]" />
                local
              </span>
            </div>

            <div className="mb-[16px] flex items-center gap-[10px] rounded-[10px] border border-[#2a241d] bg-[#15120f] px-[13px] py-[11px]">
              <span className="inline-flex h-[15px] w-[15px] flex-none text-[#9b938c]">
                <KeyIcon />
              </span>
              <span className="font-mono text-[12.5px] tracking-[.02em] text-[#9b938c]">
                sk-ant-••••••••••••3f9a
              </span>
            </div>

            <div className="flex items-center justify-between text-[12px] text-[#857c73]">
              <span className="text-[#c9b8ad]">Your browser</span>
              <span
                className="mx-[10px] h-px flex-1"
                style={{
                  background: "linear-gradient(90deg,#3a312a,#6e4332)",
                }}
              />
              <span className="font-semibold text-[#e3a07f]">Anthropic</span>
            </div>
            <div className="mt-[12px] border-t border-[#2a241d] pt-[12px] text-[12px] text-[#6f675f]">
              ReplyDesk has no server in the path.
            </div>
          </div>
        </div>

        {/* Tagline */}
        <div
          className="relative"
          style={{ animation: animTag.replace("rise-soft", "rd-rise-soft") }}
        >
          <p
            className="font-display m-0 max-w-[32ch] text-[clamp(24px,2.4vw,32px)] font-normal leading-[1.22] tracking-[-.012em] text-[#fbf3ee]"
            style={{ textWrap: "balance" }}
          >
            Your key, your machine. ReplyDesk talks to Claude straight from your
            browser — we never see it.
          </p>
        </div>
      </div>
    </div>
  );
}