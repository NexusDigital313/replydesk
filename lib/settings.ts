// Copyright (c) 2026 Jacob Douglas Parmenter. All Rights Reserved.
// Proprietary and Confidential.
//
// Unauthorized reproduction, copying, modification, distribution,
// redistribution, publication, reverse engineering, decompilation, or
// disassembly of this file, in whole or in part, via any medium, is
// strictly prohibited without explicit prior written authorization.

/**
 * On-device app settings (local-first — never leaves the browser).
 *
 * The owner owns the policy. ReplyDesk ships the lever; it does not decide how a
 * business handles money on their behalf.
 */

/** How Claude is allowed to handle refunds / returns / financial commitments. */
export type RefundPolicy =
  | "owner" // Claude flags it and routes to you; it promises nothing.
  | "claude"; // Claude can draft the remedy in your voice; you finalize the transaction.

export interface Settings {
  refundPolicy: RefundPolicy;
}

const KEY = "replydesk.settings";

// Default to the cautious policy: protect the owner until they opt into automation.
export const DEFAULT_SETTINGS: Settings = { refundPolicy: "owner" };

export function getSettings(): Settings {
  if (typeof window === "undefined") return DEFAULT_SETTINGS;
  try {
    const raw = window.localStorage.getItem(KEY);
    return raw ? { ...DEFAULT_SETTINGS, ...JSON.parse(raw) } : DEFAULT_SETTINGS;
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function saveSettings(patch: Partial<Settings>): Settings {
  const next = { ...getSettings(), ...patch };
  try {
    window.localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    /* storage blocked (private mode) — non-fatal, stays in memory for the session */
  }
  return next;
}
