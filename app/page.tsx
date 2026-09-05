// Copyright (c) 2026 Jacob Douglas Parmenter. All Rights Reserved.
// Proprietary and Confidential.
//
// Unauthorized reproduction, copying, modification, distribution,
// redistribution, publication, reverse engineering, decompilation, or
// disassembly of this file, in whole or in part, via any medium, is
// strictly prohibited without explicit prior written authorization.

import { redirect } from "next/navigation";

// The product is the voice-first flow at /app. The bare domain goes straight
// there, so a launch link lands on the real thing — not the old landing.
// (The previous marketing landing is preserved in git history.)
export default function Home() {
  redirect("/app");
}
