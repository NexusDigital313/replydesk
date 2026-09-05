// Copyright (c) 2026 Jacob Douglas Parmenter. All Rights Reserved.
// Proprietary and Confidential.
//
// Unauthorized reproduction, copying, modification, distribution,
// redistribution, publication, reverse engineering, decompilation, or
// disassembly of this file, in whole or in part, via any medium, is
// strictly prohibited without explicit prior written authorization.

/**
 * The voice profile — the structured model of how the owner sounds, built from
 * the interview and injected into every draft so replies sound like *them*.
 * Persisted on-device only (local-first).
 */

import type { RefundPolicy } from "./settings";

export interface VoiceProfile {
  /** Tone traits, e.g. ["Warm", "Casual", "Direct"]. */
  tone: string[];
  /** How they handle things going wrong, e.g. ["Takes ownership", "Calm under fire"]. */
  wrongHandling: string[];
  /** Signature phrases / sign-offs, e.g. ["Cheers,", "no worries at all"]. */
  signaturePhrases: string[];
  /** Things to steer clear of, e.g. ["corporate-speak"]. */
  avoid: string[];
  /** "short" | "medium" | "long". */
  length: string;
  /** 0 = very casual … 1 = very formal. */
  formality: number;
  /** The business, for grounding (optional). */
  business?: string;
  /** The raw interview transcript, kept on-device. */
  transcript?: { q: string; a: string }[];
}

const KEY = "replydesk.voiceProfile";

export function loadProfile(): VoiceProfile | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw || raw === "1") return null; // "1" = legacy "done" flag, no structured profile
    return JSON.parse(raw) as VoiceProfile;
  } catch {
    return null;
  }
}

export function saveProfile(p: VoiceProfile): void {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(p));
  } catch {
    /* storage blocked — non-fatal */
  }
}

/**
 * The system prompt for drafting a reply. Encodes the owner's voice AND the
 * refund policy — this is where the "handle these myself" setting becomes real:
 * Claude is instructed to never commit the business to a remedy it didn't approve.
 */
export function buildDraftSystem(
  profile: VoiceProfile | null,
  policy: RefundPolicy,
): string {
  const lines: string[] = [
    "You write replies to customer messages on behalf of a small business owner. Output ONLY the reply text, ready to paste — no preamble, no quotes, no notes.",
    "Sound exactly like the owner. Reference what the customer actually said; never generic or templated.",
  ];

  if (profile) {
    if (profile.business) lines.push(`Business: ${profile.business}.`);
    if (profile.tone?.length) lines.push(`Tone: ${profile.tone.join(", ")}.`);
    if (profile.wrongHandling?.length)
      lines.push(`When something's wrong, they: ${profile.wrongHandling.join(", ")}.`);
    if (profile.signaturePhrases?.length)
      lines.push(`Use their natural phrases/sign-offs where they fit: ${profile.signaturePhrases.join(" · ")}.`);
    if (profile.avoid?.length) lines.push(`Avoid: ${profile.avoid.join(", ")}.`);
    if (profile.length) lines.push(`Length: ${profile.length}.`);
    if (typeof profile.formality === "number")
      lines.push(`Formality: ${profile.formality < 0.4 ? "casual" : profile.formality > 0.66 ? "formal" : "balanced"}.`);
  } else {
    lines.push("Tone: warm, human, and concise.");
  }

  // The policy guard — the owner's call, enforced at the prompt level.
  if (policy === "owner") {
    lines.push(
      "CRITICAL — REFUND/RETURN POLICY: The owner handles all money decisions themselves. " +
        "If the customer wants a refund, return, replacement, discount, compensation, or any remedy that costs the business, DO NOT offer, promise, or imply any of it. " +
        "Acknowledge warmly, take it seriously, and say the owner will personally look into it and follow up. Never commit the business to a cost or a specific remedy.",
    );
  } else {
    lines.push(
      "REFUND/RETURN POLICY: You may offer a reasonable, proportional remedy (e.g. a replacement or refund) in the owner's voice when it's clearly warranted. Keep it measured — the owner finalizes the actual transaction.",
    );
  }

  return lines.join("\n");
}
