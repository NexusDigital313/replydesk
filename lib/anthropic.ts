// Copyright (c) 2026 Jacob Douglas Parmenter. All Rights Reserved.
// Proprietary and Confidential.
//
// Unauthorized reproduction, copying, modification, distribution,
// redistribution, publication, reverse engineering, decompilation, or
// disassembly of this file, in whole or in part, via any medium, is
// strictly prohibited without explicit prior written authorization.

/**
 * Client-side Anthropic engine. The browser talks to api.anthropic.com DIRECTLY
 * with the user's on-device key — no ReplyDesk server is ever in the path
 * (local-first, accountless). When there's no key, everything falls back to the
 * built-in local engine so the app stays fully usable ("Set up later").
 */

import { localReply } from "./localEngine";
import type { BusinessProfile, DraftRequest, Tone } from "./types";
import type { VoiceProfile } from "./voice";
import { buildDraftSystem } from "./voice";
import type { RefundPolicy } from "./settings";

const ENDPOINT = "https://api.anthropic.com/v1/messages";
const ANTHROPIC_VERSION = "2023-06-01";
/** Drafts/interview want quality (it's the whole product). Validate uses the cheap one. */
export const DRAFT_MODEL = "claude-opus-4-8";
export const FAST_MODEL = "claude-haiku-4-5-20251001";

export type Nudge = "base" | "warmer" | "shorter" | "formal" | "alt";

export interface DraftMessage {
  body: string;
  channel?: string;
  rating?: number;
  name?: string;
}

interface ChatMsg {
  role: "user" | "assistant";
  content: string;
}

export class AnthropicError extends Error {
  status?: number;
  constructor(message: string, status?: number) {
    super(message);
    this.name = "AnthropicError";
    this.status = status;
  }
}

export function getApiKey(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem("replydesk.apiKey");
  } catch {
    return null;
  }
}

export function hasKey(): boolean {
  return !!getApiKey();
}

async function call(opts: {
  model: string;
  system?: string;
  messages: ChatMsg[];
  maxTokens: number;
  key?: string;
}): Promise<string> {
  const key = opts.key ?? getApiKey();
  if (!key) throw new AnthropicError("No API key on this device.", 0);

  let res: Response;
  try {
    res = await fetch(ENDPOINT, {
      method: "POST",
      headers: {
        "x-api-key": key,
        "anthropic-version": ANTHROPIC_VERSION,
        "anthropic-dangerous-direct-browser-access": "true",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: opts.model,
        max_tokens: opts.maxTokens,
        ...(opts.system ? { system: opts.system } : {}),
        messages: opts.messages,
      }),
    });
  } catch {
    throw new AnthropicError("Couldn't reach Anthropic — check your connection.", 0);
  }

  if (!res.ok) {
    let msg = `Anthropic request failed (${res.status}).`;
    try {
      const j = (await res.json()) as { error?: { message?: string } };
      if (j?.error?.message) msg = j.error.message;
    } catch {
      /* non-JSON error body */
    }
    throw new AnthropicError(msg, res.status);
  }

  const data = (await res.json()) as { content?: { type: string; text?: string }[] };
  return (data.content ?? [])
    .map((b) => (b.type === "text" ? b.text ?? "" : ""))
    .join("")
    .trim();
}

/** Smallest possible request — confirms the key works. Throws AnthropicError on failure. */
export async function validateKey(key: string): Promise<void> {
  await call({
    key,
    model: FAST_MODEL,
    maxTokens: 1,
    messages: [{ role: "user", content: "ping" }],
  });
}

/* ---- voice interview ---------------------------------------------------- */

export async function interviewTurn(history: ChatMsg[], system: string): Promise<string> {
  return call({ model: DRAFT_MODEL, system, messages: history, maxTokens: 400 });
}

/** Derive a structured voice profile from the interview transcript (Claude → JSON). */
export async function extractProfile(
  transcript: { q: string; a: string }[],
): Promise<VoiceProfile> {
  const system =
    "You analyze a short interview and output ONLY a JSON object describing the person's customer-reply voice. " +
    'Schema: {"tone":string[],"wrongHandling":string[],"signaturePhrases":string[],"avoid":string[],"length":"short"|"medium"|"long","formality":number,"business":string}. ' +
    "formality is 0 (very casual) to 1 (very formal). No prose, no code fences — JSON only.";
  const user = transcript.map((t, i) => `Q${i + 1}: ${t.q}\nA${i + 1}: ${t.a}`).join("\n\n");
  const raw = await call({
    model: DRAFT_MODEL,
    system,
    maxTokens: 600,
    messages: [{ role: "user", content: user }],
  });
  const json = raw.slice(raw.indexOf("{"), raw.lastIndexOf("}") + 1);
  const parsed = JSON.parse(json) as Partial<VoiceProfile>;
  return {
    tone: parsed.tone ?? [],
    wrongHandling: parsed.wrongHandling ?? [],
    signaturePhrases: parsed.signaturePhrases ?? [],
    avoid: parsed.avoid ?? [],
    length: parsed.length ?? "medium",
    formality: typeof parsed.formality === "number" ? parsed.formality : 0.4,
    business: parsed.business,
    transcript,
  };
}

/* ---- drafting ----------------------------------------------------------- */

const NUDGE_HINT: Record<Nudge, string> = {
  base: "",
  warmer: "Make it warmer and more personal.",
  shorter: "Keep it short — 2–3 sentences, same substance.",
  formal: "Make it a touch more formal and professional.",
  alt: "Give a fresh alternative phrasing — same intent, different wording.",
};

function userPromptFor(message: DraftMessage, nudge: Nudge): string {
  const head = [
    `Incoming ${message.channel ?? "message"}`,
    message.name ? ` from ${message.name}` : "",
    message.rating ? ` (${message.rating}/5 stars)` : "",
    ":",
  ].join("");
  return [head, '"""', message.body.trim(), '"""', NUDGE_HINT[nudge], "Write the reply."]
    .filter(Boolean)
    .join("\n");
}

/** Map the redesign's nudge to the local engine's Tone for the no-key fallback. */
function nudgeToTone(nudge: Nudge): Tone {
  switch (nudge) {
    case "formal":
      return "professional";
    case "shorter":
      return "concise";
    default:
      return "warm";
  }
}

function localBusiness(profile: VoiceProfile | null): BusinessProfile {
  return {
    name: profile?.business ?? "",
    type: "",
    tone: "warm",
    signature: profile?.signaturePhrases?.[0] ?? "",
    contact: "",
  };
}

function localDraft(message: DraftMessage, profile: VoiceProfile | null, nudge: Nudge): string {
  const req: DraftRequest = {
    review: message.body,
    rating: message.rating ?? 5,
    tone: nudgeToTone(nudge),
    author: message.name,
    business: localBusiness(profile),
  };
  return localReply(req);
}

export interface DraftResult {
  text: string;
  source: "claude" | "local";
  warning?: string;
}

/** Generate a reply. Uses Claude (with key) or the local engine (without). */
export async function draftReply(opts: {
  message: DraftMessage;
  profile: VoiceProfile | null;
  policy: RefundPolicy;
  nudge?: Nudge;
}): Promise<DraftResult> {
  const nudge = opts.nudge ?? "base";
  if (hasKey()) {
    try {
      const text = await call({
        model: DRAFT_MODEL,
        system: buildDraftSystem(opts.profile, opts.policy),
        maxTokens: 700,
        messages: [{ role: "user", content: userPromptFor(opts.message, nudge) }],
      });
      if (text) return { text, source: "claude" };
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Claude unavailable";
      return { text: localDraft(opts.message, opts.profile, nudge), source: "local", warning: msg };
    }
  }
  return { text: localDraft(opts.message, opts.profile, nudge), source: "local" };
}

/** Rewrite an existing draft per a tone nudge (Claude); local engine re-rolls without a key. */
export async function rewriteReply(opts: {
  draft: string;
  nudge: Nudge;
  message: DraftMessage;
  profile: VoiceProfile | null;
  policy: RefundPolicy;
}): Promise<DraftResult> {
  if (hasKey()) {
    try {
      const user = [
        NUDGE_HINT[opts.nudge] || "Rewrite this reply.",
        "Keep it in the owner's voice and obey the refund policy above.",
        "",
        "Current reply:",
        '"""',
        opts.draft,
        '"""',
      ].join("\n");
      const text = await call({
        model: DRAFT_MODEL,
        system: buildDraftSystem(opts.profile, opts.policy),
        maxTokens: 700,
        messages: [{ role: "user", content: user }],
      });
      if (text) return { text, source: "claude" };
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Claude unavailable";
      return { text: localDraft(opts.message, opts.profile, opts.nudge), source: "local", warning: msg };
    }
  }
  return { text: localDraft(opts.message, opts.profile, opts.nudge), source: "local" };
}
