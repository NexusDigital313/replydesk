import { NextResponse } from "next/server";
import {
  buildSystemPrompt,
  buildUserPrompt,
  localReply,
} from "@/lib/localEngine";
import { verifyLicense } from "@/lib/license";
import { isRevoked } from "@/lib/kv";
import type { DraftRequest } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  let body: DraftRequest & { apiKey?: string; license?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { review, rating, tone, author, business, apiKey, license } = body;
  if (!review?.trim()) {
    return NextResponse.json({ error: "Review text is required" }, { status: 400 });
  }

  const draftReq: DraftRequest = { review, rating, tone, author, business };

  // Entitlement: when LICENSE_SECRET is set the paywall is live and Claude is
  // a Pro capability. Without it (self-host / dev), everyone is Pro.
  const secret = process.env.LICENSE_SECRET;
  let isPro = !secret;
  if (secret && license) {
    const decoded = verifyLicense(license, secret);
    isPro = !!decoded;
    // Instant revocation: a cancelled subscription is flagged in KV by the Stripe
    // webhook, so we cut Claude off even while the signed token is still valid.
    if (isPro && decoded?.sub && (await isRevoked(decoded.sub))) isPro = false;
  }

  const key = (apiKey || process.env.ANTHROPIC_API_KEY || "").trim();
  const canUseClaude = isPro && !!key;

  if (!canUseClaude) {
    return NextResponse.json({ reply: localReply(draftReq), source: "local" });
  }

  try {
    const { default: Anthropic } = await import("@anthropic-ai/sdk");
    const client = new Anthropic({ apiKey: key });

    const resp = await client.messages.create({
      model: "claude-opus-4-8",
      max_tokens: 1024,
      system: buildSystemPrompt(business, tone),
      messages: [
        { role: "user", content: buildUserPrompt(review, rating, author) },
      ],
    });

    const text = resp.content
      .map((b) => (b.type === "text" ? b.text : ""))
      .join("")
      .trim();

    if (!text) throw new Error("Empty response from model");
    return NextResponse.json({ reply: text, source: "claude" });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({
      reply: localReply(draftReq),
      source: "local",
      warning: `Claude unavailable (${message}) — used the local engine.`,
    });
  }
}
