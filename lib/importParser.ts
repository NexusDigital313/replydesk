// Copyright (c) 2026 Jacob Douglas Parmenter. All Rights Reserved.
// Proprietary and Confidential.
//
// Unauthorized reproduction, copying, modification, distribution,
// redistribution, publication, reverse engineering, decompilation, or
// disassembly of this file, in whole or in part, via any medium, is
// strictly prohibited without explicit prior written authorization.

export interface ParsedReview {
  author: string;
  rating: number;
  text: string;
}

/* Best-effort parser for pasted reviews. Handles:
   - CSV with a header row containing rating / review|text / author|name
   - Free-form blocks separated by blank lines, e.g.
       Dana M. — ★★☆☆☆
       Waited 40 minutes and the food was cold.
   It always returns something usable; it never throws. */

export function parseReviews(input: string): ParsedReview[] {
  const text = input.trim();
  if (!text) return [];
  if (looksLikeCsv(text)) {
    const rows = parseCsv(text);
    if (rows.length) return rows;
  }
  return parseBlocks(text);
}

function looksLikeCsv(text: string): boolean {
  const first = text.split(/\r?\n/)[0].toLowerCase();
  return (
    first.includes(",") &&
    /(review|text|comment)/.test(first) &&
    /(rating|stars?|score)/.test(first)
  );
}

function splitCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = "";
  let q = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (q) {
      if (c === '"' && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else if (c === '"') {
        q = false;
      } else cur += c;
    } else if (c === '"') q = true;
    else if (c === ",") {
      out.push(cur);
      cur = "";
    } else cur += c;
  }
  out.push(cur);
  return out.map((s) => s.trim());
}

function parseCsv(text: string): ParsedReview[] {
  const lines = text.split(/\r?\n/).filter((l) => l.trim());
  if (lines.length < 2) return [];
  const header = splitCsvLine(lines[0]).map((h) => h.toLowerCase());
  const idx = (re: RegExp) => header.findIndex((h) => re.test(h));
  const rI = idx(/rating|stars?|score/);
  const tI = idx(/review|text|comment/);
  const aI = idx(/author|name|reviewer|customer/);
  if (tI === -1) return [];
  const out: ParsedReview[] = [];
  for (let i = 1; i < lines.length; i++) {
    const cells = splitCsvLine(lines[i]);
    const txt = (cells[tI] || "").trim();
    if (!txt) continue;
    out.push({
      author: aI > -1 ? (cells[aI] || "").trim() : "",
      rating: rI > -1 ? clampRating(cells[rI]) : 5,
      text: txt,
    });
  }
  return out;
}

function parseBlocks(text: string): ParsedReview[] {
  const blocks = text.split(/\n\s*\n/).map((b) => b.trim()).filter(Boolean);
  return blocks.map((block) => {
    const lines = block.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
    const rating = detectRating(block);
    // If the first line is short and the block has more than one line, treat
    // it as a header (name / stars) and the rest as the review body.
    let author = "";
    let body = block;
    if (lines.length > 1 && lines[0].length <= 60 && /[★☆\d]/.test(lines[0])) {
      author = lines[0]
        .replace(/[★☆]+/g, "")
        .replace(/\b[0-5](\.\d)?\s*(stars?|\/\s*5)?/gi, "")
        .replace(/[-–—:|]+/g, " ")
        .trim();
      body = lines.slice(1).join(" ");
    } else {
      body = lines.join(" ");
    }
    return { author, rating, text: body };
  });
}

function detectRating(block: string): number {
  const stars = (block.match(/★/g) || []).length;
  if (stars >= 1 && stars <= 5) return stars;
  const m =
    block.match(/\b([0-5](?:\.\d)?)\s*(?:\/\s*5|stars?|star\b)/i) ||
    block.match(/\b(?:rating|score)[:\s]+([0-5](?:\.\d)?)/i);
  if (m) return clampRating(m[1]);
  return 5;
}

function clampRating(v: string | number): number {
  const n = Math.round(Number(String(v).replace(/[^\d.]/g, "")));
  if (!Number.isFinite(n)) return 5;
  return Math.min(5, Math.max(1, n));
}
