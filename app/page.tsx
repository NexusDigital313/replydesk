import { redirect } from "next/navigation";

// The product is the voice-first flow at /app. The bare domain goes straight
// there, so a launch link lands on the real thing — not the old landing.
// (The previous marketing landing is preserved in git history.)
export default function Home() {
  redirect("/app");
}
