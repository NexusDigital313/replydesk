// Copyright (c) 2026 Jacob Douglas Parmenter. All Rights Reserved.
// Proprietary and Confidential.
//
// Unauthorized reproduction, copying, modification, distribution,
// redistribution, publication, reverse engineering, decompilation, or
// disassembly of this file, in whole or in part, via any medium, is
// strictly prohibited without explicit prior written authorization.

/**
 * Lightweight, dependency-free triage. Flags whether an incoming customer
 * message is about a refund / return / financial commitment — the situations
 * where an auto-drafted "in your voice" reply could commit the business to
 * something the owner didn't decide.
 *
 * This is the cheap client-side heuristic that gives the refund-policy setting
 * teeth today. When the real Claude path is wired, classification becomes a
 * model call; this stays as the offline fallback.
 */

const COMMITMENT_PATTERNS: RegExp[] = [
  /\brefund(s|ed|ing)?\b/i,
  /\bmoney[\s-]*back\b/i,
  /\breturn(s|ed|ing)?\b/i,
  /\bcharge[\s-]?back\b/i,
  /\breplace(d|ment|ments)?\b/i,
  /\bre-?do\b/i,
  /\brebuild(ing|s)?\b/i,
  /\bredo\b/i,
  /\bbroken\b/i,
  /\bdefective\b/i,
  /\bfaulty\b/i,
  /\bcancel(led|lation|ling)?\b/i,
  /\breimburs/i,
  /\bcompensat/i,
  /\bdiscount\b/i,
  /\bvoucher\b/i,
  /\bstore credit\b/i,
  /\bwarrant(y|ies)\b/i,
  /\bdispute\b/i,
  /\bnever (arrived|received|came)\b/i,
  // Commitment / remedy *offers* — these catch a draft that promises something
  // costly ("a replacement bag on us") even when the customer never asked.
  /\bno charge\b/i,
  /\bat no cost\b/i,
  /\bno cost\b/i,
  /\bfree of charge\b/i,
  /\bon us\b/i,
  /\bon me\b/i,
  /\bprepaid\b/i,
  /\bcomp(ed|ing)?\b/i,
];

/** True if the customer's message looks like a refund/return/financial-commitment situation. */
export function involvesCommitment(text: string): boolean {
  if (!text) return false;
  return COMMITMENT_PATTERNS.some((re) => re.test(text));
}

/** The phrases that tripped the flag (for showing the owner *why* it was flagged). */
export function commitmentSignals(text: string): string[] {
  if (!text) return [];
  const hits: string[] = [];
  for (const re of COMMITMENT_PATTERNS) {
    const m = text.match(re);
    if (m && !hits.includes(m[0].toLowerCase())) hits.push(m[0].toLowerCase());
  }
  return hits;
}
