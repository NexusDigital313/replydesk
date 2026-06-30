import { NextResponse } from "next/server";
import {
  buildSystemPrompt,
  buildUserPrompt,
  localReply,
} from "@/lib/localEngine";
import type { DraftRequest } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  let body: DraftRequest & { apiKey?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { review, rating, tone, author, business, apiKey } = body;
  if (!review?.trim()) {
    return NextResponse.json({ error: "Review text is required" }, { status: 400 });
  }

  const draftReq: DraftRequest = { review, rating, tone, author, business };

  // BYO-key only: the buyer brings their own Claude key (Lemon Squeezy license
  // just unlocks the app, lib/pro.ts). We deliberately do NOT fall back to a
  // server-side ANTHROPIC_API_KEY, so the owner can never be billed for a
  // customer's usage — no key in the request means the free local engine.
  const key = (apiKey || "").trim();
  const canUseClaude = !!key;

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
