import type { BusinessProfile, DraftRequest, Tone } from "./types";

/* The local engine produces a genuinely usable, on-brand reply with zero
   dependencies — it runs instantly and is the fallback whenever no Anthropic
   API key is configured.

   It does two things to avoid sounding templated:
   1. detects the review's actual THEMES (wait, food, service…), and
   2. gauges the reviewer's EMOTIONAL INTENSITY on a 1–3 spectrum from the text
      itself (not just the star rating), then drafts off intensity-keyed phrase
      pools. A furious 1-star and a mildly-disappointed 2-star read differently;
      two 5-stars with different energy read differently too. */

type Theme = { key: string; label: string; words: string[] };

const THEMES: Theme[] = [
  { key: "wait", label: "the wait", words: ["wait", "waited", "waiting", "slow", "long time", "forever", "took ages", "delay", "delayed", "queue", "line", "late", "minutes", "hour", "hours", "never came", "still waiting"] },
  { key: "food", label: "the food", words: ["food", "meal", "dish", "cold", "undercooked", "overcooked", "portion", "taste", "tasted", "flavor", "flavour", "stale", "fresh", "delicious", "menu", "coffee", "drink"] },
  { key: "service", label: "the service", words: ["service", "server", "waiter", "waitress", "staff", "rude", "friendly", "attentive", "ignored", "helpful", "polite", "manager"] },
  { key: "cleanliness", label: "the cleanliness", words: ["dirty", "clean", "cleanliness", "hygiene", "messy", "spotless", "smell", "smelled", "bathroom", "restroom", "table"] },
  { key: "pricing", label: "the pricing", words: ["price", "pricey", "expensive", "overpriced", "cost", "value", "worth", "cheap", "affordable", "charge", "charged", "bill"] },
  { key: "appointment", label: "your appointment", words: ["appointment", "booking", "reservation", "scheduled", "reschedule", "cancelled", "canceled", "no-show", "double booked"] },
  { key: "team", label: "our team", words: ["doctor", "dentist", "hygienist", "stylist", "technician", "nurse", "reception", "receptionist", "barber", "therapist"] },
  { key: "result", label: "the result", words: ["result", "results", "haircut", "color", "colour", "cut", "outcome", "finish", "quality", "work", "job"] },
  { key: "atmosphere", label: "the atmosphere", words: ["atmosphere", "ambiance", "ambience", "vibe", "music", "loud", "noisy", "cozy", "comfortable", "decor"] },
];

function detectThemes(text: string): Theme[] {
  const t = ` ${text.toLowerCase()} `;
  const hits = THEMES.filter((th) => th.words.some((w) => t.includes(w)));
  return hits.slice(0, 2);
}

function firstName(author?: string): string {
  const a = (author || "").trim();
  if (!a) return "";
  return a.split(/\s+/)[0].replace(/[^a-zA-Z'-]/g, "");
}

const pick = (arr: string[], seed: number) => arr[seed % arr.length];

// stable-ish variation seed from the review text so regenerate-with-same-input
// is deterministic but different reviews read differently
function seedOf(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) % 100000;
  return h;
}

/* ---- emotional intensity ---- */

type Band = "positive" | "mixed" | "negative";
type Intensity = 1 | 2 | 3; // 1 = measured, 2 = clear, 3 = strong/charged
type Emotion = { band: Band; intensity: Intensity };

const STRONG_NEG = ["worst", "terrible", "awful", "horrible", "horrendous", "disgusting", "unacceptable", "furious", "appalled", "appalling", "never again", "never coming back", "ripped off", "rip-off", "scam", "filthy", "insulting", "humiliating", "disaster", "disgrace", "avoid", "fuming", "livid", "outrageous"];
const STRONG_POS = ["amazing", "incredible", "best", "perfect", "phenomenal", "outstanding", "exceptional", "obsessed", "blown away", "blew me away", "fantastic", "wonderful", "loved", "favorite", "favourite", "highly recommend", "cannot recommend", "can't recommend", "impeccable", "flawless", "hidden gem", "gem", "10/10", "five stars", "5 stars"];
const MILD = ["okay", "okayish", " ok ", "fine", "decent", "alright", "average", "a bit", "somewhat", "could be better", "not bad", "meh", "nothing special", "mediocre"];
const INTENSIFIERS = ["so ", "very ", "really ", "absolutely ", "extremely ", "incredibly ", "truly ", "genuinely ", "completely ", "totally ", "beyond "];

function countHits(t: string, words: string[]): number {
  return words.reduce((n, w) => (t.includes(w) ? n + 1 : n), 0);
}

function gauge(text: string, rating: number): Emotion {
  const raw = text || "";
  const t = ` ${raw.toLowerCase()} `;
  const band: Band = rating >= 4 ? "positive" : rating === 3 ? "mixed" : "negative";

  const exclaim = (raw.match(/!/g) || []).length;
  const caps = (raw.match(/\b[A-Z]{3,}\b/g) || []).length; // SHOUTING words
  const strongNeg = countHits(t, STRONG_NEG);
  const strongPos = countHits(t, STRONG_POS);
  const mild = countHits(t, MILD);
  const intens = countHits(t, INTENSIFIERS);
  const strong = band === "negative" ? strongNeg : band === "positive" ? strongPos : strongNeg + strongPos;

  // base charge from how extreme the star rating itself is
  let score = 0;
  if (band === "negative") score += rating === 1 ? 2 : 1;
  else if (band === "positive") score += rating === 5 ? 2 : 1;
  else score += 1;

  // amplify from the text
  score += Math.min(strong, 3);
  if (exclaim >= 2) score += 1;
  if (caps >= 1) score += 1;
  if (intens >= 2) score += 1;
  if (mild >= 1) score -= 1;

  let intensity: Intensity = score >= 5 ? 3 : score >= 3 ? 2 : 1;
  // explicitly hedged language with no strong signals stays measured
  if (mild >= 1 && strong === 0 && exclaim === 0 && caps === 0) intensity = 1;

  return { band, intensity };
}

/* ---- intensity-keyed phrase pools ---- */

const OPENERS: Record<Band, Record<Intensity, string[]>> = {
  positive: {
    1: [
      "thanks for the kind review — we're really glad you enjoyed your visit.",
      "we appreciate you taking a moment to leave us {rating} stars.",
      "thank you for the thoughtful feedback — glad it was a good one.",
    ],
    2: [
      "thank you so much for the {rating}-star review — it genuinely means a lot to us.",
      "we really appreciate the kind words, and we're so glad you had a great time.",
      "thanks for taking the time to share this — reviews like yours make our week.",
    ],
    3: [
      "wow — thank you for this! Reading it put a real smile on the whole team's faces.",
      "this absolutely made our day — thank you for such a generous review!",
      "we can't thank you enough — you've completely made our week!",
    ],
  },
  mixed: {
    1: [
      "thanks for the honest, balanced feedback — we appreciate you sharing it.",
      "thank you for taking the time to review us; the candor is helpful.",
    ],
    2: [
      "thank you for the fair and honest review — there's a lot here we can act on.",
      "we appreciate you laying out both what worked and what didn't.",
    ],
    3: [
      "thank you for such a detailed, honest review — we're taking all of it to heart.",
      "we really appreciate you being this candid with us — it genuinely helps us improve.",
    ],
  },
  negative: {
    1: [
      "thanks for the feedback, and we're sorry your visit didn't fully measure up.",
      "we appreciate you flagging this, and we're sorry it wasn't better.",
      "thank you for letting us know — sorry we didn't quite hit the mark.",
    ],
    2: [
      "thank you for letting us know, and we're genuinely sorry your experience fell short.",
      "we're sorry to hear this — that's not the experience we want anyone to have.",
      "we sincerely apologize that we didn't get this right for you.",
    ],
    3: [
      "we owe you a real apology — what you've described is not acceptable, and we take it seriously.",
      "we're truly sorry. This is well below the standard we hold ourselves to, and we don't take that lightly.",
      "thank you for telling us, even though we clearly let you down badly — we're sorry, full stop.",
    ],
  },
};

const CLOSES: Record<Band, Record<Intensity, string[]>> = {
  positive: {
    1: [" Hope to see you again before long.", " We'd love to welcome you back.", " Thanks again for stopping by."],
    2: [" We can't wait to have you back!", " Come see us again soon — we'll have everything ready for you."],
    3: [" We genuinely can't wait to welcome you back!", " Thank you again — you've made our day, and we'll be ready to do it all over again!"],
  },
  mixed: {
    1: [" We appreciate the nudge, and we're on it.", " Thanks again — feedback like this is how we get better."],
    2: [" We'd welcome the chance to do better next time{contactTail}.", " We're already looking at the rough edges you pointed out{contactTail}."],
    3: [" We'd love another chance to show you we've taken this on board{contactTail}.", " We're acting on every point you raised{contactTail}."],
  },
  negative: {
    1: [" If you're open to it, reach out{contactTail} and we'll make it right.", " We'd like to put this right{contactTail}."],
    2: [" We'd really like to make this right — please reach out{contactTail} so we can follow up personally.", " Please give us a chance to fix this{contactTail}."],
    3: [" Please contact us{contactTail} — we want to make this right personally, and as quickly as we can.", " We'd like to make this right directly{contactTail}; please reach out so we can put it right."],
  },
};

function bodyFor(band: Band, intensity: Intensity, list: string, name: string): string {
  const tail = name ? `, ${name}` : "";
  if (band === "positive") {
    if (intensity >= 3) return ` Hearing that ${list} stood out means the world to us${tail}.`;
    if (intensity === 2) return ` We're so glad ${list} hit the mark${tail}.`;
    return ` It's great to hear ${list} worked well for you.`;
  }
  if (band === "mixed") {
    if (intensity >= 3) return ` Your points about ${list} really land, and we're acting on them.`;
    if (intensity === 2) return ` We hear you on ${list}, and we're already looking at how to tighten that up.`;
    return ` Your note about ${list} is fair, and we'll take a look.`;
  }
  // negative — the opener already apologizes, so acknowledge specifically here
  // instead of repeating "sorry" (avoids the double-apology that reads templated)
  if (intensity >= 3) return ` What you described about ${list} is unacceptable, and we're addressing it directly and immediately with the team.`;
  if (intensity === 2) return ` What you experienced with ${list} isn't right, and we're looking into it with the team.`;
  return ` The trouble with ${list} isn't the experience we want you to have, and we're taking a look.`;
}

export function localReply(req: DraftRequest): string {
  const { review, rating, tone, business } = req;
  const name = firstName(req.author);
  const themes = detectThemes(review);
  const seed = seedOf(review + tone + rating);
  const { band, intensity } = gauge(review, rating);

  const contact = business.contact?.trim();
  const contactTail = contact ? ` at ${contact}` : "";

  const greeting = name
    ? `Hi ${name},`
    : band === "positive"
      ? "Hi there,"
      : "Hello,";

  // ---- opener (intensity-keyed, with tone overrides) ----
  let opener = pick(OPENERS[band][intensity], seed).replace("{rating}", String(rating));
  if (band === "positive" && tone === "grateful")
    opener = "we can't thank you enough for this — reviews like yours are exactly why we do what we do.";
  if (band === "negative" && tone === "apologetic")
    opener = intensity >= 3
      ? "we are sincerely sorry — this is not who we are, and we take full responsibility for getting it so wrong."
      : "we owe you an apology — this isn't the standard we hold ourselves to, and we're sorry.";

  // ---- acknowledge specifics ----
  let body = "";
  if (themes.length) {
    const labels = themes.map((t) => t.label);
    const list = labels.length === 2 ? `${labels[0]} and ${labels[1]}` : labels[0];
    body = bodyFor(band, intensity, list, name);
  } else if (band === "negative") {
    body = intensity >= 3
      ? " We want to understand exactly what went wrong so it never happens again."
      : " We'd genuinely like to understand what happened so we can put it right.";
  }

  // ---- close / action ----
  let action = pick(CLOSES[band][intensity], seed + 1).replace("{contactTail}", contactTail);

  let sentence = `${greeting} ${capitalize(opener)}${body}${action}`;

  // ---- tone post-processing ----
  if (tone === "concise") {
    const shortClose = band === "positive"
      ? intensity >= 3 ? " Thank you — can't wait to have you back!" : " Thanks again!"
      : contact ? ` Please reach us at ${contact} so we can make it right.` : " Please reach out so we can make it right.";
    sentence = `${greeting} ${capitalize(opener)}${themes.length ? body : ""}${shortClose}`;
  }

  if (tone === "professional") {
    // owner's brand voice wins on style: keep it polished, not bubbly
    sentence = sentence.replace(/^Hi there,/, "Hello,").replace(/wow — /i, "").replace(/!/g, ".");
  }

  const sig = business.signature?.trim();
  return sig ? `${sentence}\n\n${sig}` : sentence;
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/* ---- sentiment, used by the dashboard ---- */
export type Sentiment = "positive" | "neutral" | "negative";

export function sentimentOf(rating: number): Sentiment {
  if (rating >= 4) return "positive";
  if (rating === 3) return "neutral";
  return "negative";
}

/* A short human description of the reviewer's emotional register, used to steer
   Claude (and available to the UI). */
function describeEmotion(review: string, rating: number): string {
  const { band, intensity } = gauge(review, rating);
  const map: Record<Band, Record<Intensity, string>> = {
    positive: { 1: "quietly pleased", 2: "clearly happy", 3: "delighted and effusive" },
    mixed: { 1: "balanced and measured", 2: "fairly critical but constructive", 3: "passionate and conflicted" },
    negative: { 1: "mildly disappointed", 2: "clearly let down", 3: "angry and upset" },
  };
  return map[band][intensity];
}

/* Build the system + user prompt the API route hands to Claude, kept here so
   the local and Claude paths stay conceptually aligned. */
export function buildSystemPrompt(business: BusinessProfile, tone: Tone): string {
  const toneLine: Record<Tone, string> = {
    professional: "polished, neutral, and professional",
    warm: "warm, friendly, and personable",
    apologetic: "sincerely apologetic — own the miss and make it right",
    grateful: "grateful and appreciative",
    concise: "concise and to the point (2–3 sentences max)",
  };
  return [
    `You write public replies to customer reviews on behalf of "${business.name || "the business"}"${business.type ? `, a ${business.type.toLowerCase()}` : ""}.`,
    `Voice: ${toneLine[tone]}.`,
    `Rules:`,
    `- Reply directly to the reviewer. No preamble, no "Here is a reply" — output ONLY the reply text, ready to paste.`,
    `- Reference the specific things the reviewer mentioned; never sound generic or templated.`,
    `- Gauge how emotionally charged the reviewer is from their wording, punctuation and intensity, and mirror it PROPORTIONALLY: match genuine enthusiasm with real energy; meet a serious complaint with proportional seriousness, ownership and urgency — never a cheerful or breezy tone on a serious complaint.`,
    `- Vary your opening line. Never start with a stock phrase like "Thank you for your review/feedback"; open with something specific to what THIS reviewer actually said.`,
    `- For negative reviews: acknowledge the specific issue, apologize without excuses, and offer to make it right${business.contact ? ` (point them to ${business.contact})` : ""}.`,
    `- For positive reviews: be specific about what they praised and invite them back.`,
    `- Keep it natural and human. 2–5 sentences unless tone is concise.`,
    business.signature ? `- End with this signature on its own line: "${business.signature}".` : `- Do not invent a signature.`,
  ].join("\n");
}

export function buildUserPrompt(review: string, rating: number, author?: string): string {
  return [
    `New ${rating}-star review${author ? ` from ${author}` : ""}:`,
    `"""`,
    review.trim(),
    `"""`,
    `The reviewer comes across as ${describeEmotion(review, rating)} — mirror that emotional register in your reply.`,
    `Write the reply.`,
  ].join("\n");
}
