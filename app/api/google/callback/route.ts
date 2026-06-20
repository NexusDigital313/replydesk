import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/* Completes Google OAuth. Pulling reviews live requires the Google Business
   Profile API (mybusiness v4 reviews endpoint), which Google grants per-app
   via an access request — until that's approved, calls return 403. We exchange
   the code to prove the connection works and bounce back with a status; the
   paste / CSV importer is the universal path that works for everyone today. */
export async function GET(req: Request) {
  const origin =
    process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") || new URL(req.url).origin;
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

  if (!clientId || !clientSecret || !code) {
    return NextResponse.redirect(`${origin}/app?google=error`);
  }

  try {
    const res = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: `${origin}/api/google/callback`,
        grant_type: "authorization_code",
      }),
    });
    if (!res.ok) {
      return NextResponse.redirect(`${origin}/app?google=error`);
    }
    // Connection established. Review sync requires GBP API allowlist approval —
    // see README. Signal success; the client opens the import panel.
    return NextResponse.redirect(`${origin}/app?google=connected`);
  } catch {
    return NextResponse.redirect(`${origin}/app?google=error`);
  }
}
