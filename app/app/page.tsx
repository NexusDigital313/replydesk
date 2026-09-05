"use client";
// Copyright (c) 2026 Jacob Douglas Parmenter. All Rights Reserved.
// Proprietary and Confidential.
//
// Unauthorized reproduction, copying, modification, distribution,
// redistribution, publication, reverse engineering, decompilation, or
// disassembly of this file, in whole or in part, via any medium, is
// strictly prohibited without explicit prior written authorization.


import { useEffect, useState } from "react";
import ConnectScreen from "./ConnectScreen";
import VoiceInterviewScreen from "./VoiceInterviewScreen";
import WorkspaceScreen from "./WorkspaceScreen";

type Step = "connect" | "interview" | "workspace";

const LS = {
  connected: "replydesk.connected",
  apiKey: "replydesk.apiKey",
  voiceProfile: "replydesk.voiceProfile",
} as const;

/**
 * ReplyDesk orchestrator — plays the three screens as one local-first flow:
 *   connect → interview → workspace
 *
 * The step, the user's Claude API key, and the derived voice profile all live
 * on-device (localStorage). No ReplyDesk server is ever in the path. Returning
 * users with a saved voice profile land straight in the Workspace.
 */
export default function AppPage() {
  const [step, setStep] = useState<Step>("connect");
  const [hydrated, setHydrated] = useState(false);

  // Resume where the user left off (on-device flags only).
  useEffect(() => {
    try {
      if (localStorage.getItem(LS.voiceProfile)) setStep("workspace");
      else if (localStorage.getItem(LS.connected)) setStep("interview");
    } catch {
      /* private mode / storage blocked — fine, start at connect */
    }
    setHydrated(true);
  }, []);

  const goInterview = () => {
    try {
      localStorage.setItem(LS.connected, "1");
    } catch {}
    setStep("interview");
  };

  const saveKey = (key: string | null) => {
    try {
      if (key) localStorage.setItem(LS.apiKey, key);
      else localStorage.removeItem(LS.apiKey);
    } catch {}
  };

  const goWorkspace = (profile?: unknown) => {
    try {
      localStorage.setItem(
        LS.voiceProfile,
        profile ? JSON.stringify(profile) : "1",
      );
    } catch {}
    setStep("workspace");
  };

  const restart = () => {
    try {
      localStorage.removeItem(LS.voiceProfile);
      localStorage.removeItem(LS.connected);
    } catch {}
    setStep("connect");
  };

  return (
    <div className="min-h-screen bg-[#161310]">
      <style>{`
        @keyframes rd-flowfade { from { opacity: 0; transform: translateY(7px); } to { opacity: 1; transform: translateY(0); } }
        @media (prefers-reduced-motion: reduce) { .rd-flow { animation: none !important; } }
      `}</style>
      {/* Hide until hydrated so we never flash the wrong step. */}
      <div style={{ visibility: hydrated ? "visible" : "hidden" }}>
        <div
          key={step}
          className="rd-flow"
          style={{ animation: "rd-flowfade .5s cubic-bezier(.22,.68,.2,1) both" }}
        >
          {step === "connect" && (
            <ConnectScreen onDone={goInterview} onKey={saveKey} />
          )}
          {step === "interview" && (
            <VoiceInterviewScreen onDone={goWorkspace} />
          )}
          {step === "workspace" && <WorkspaceScreen onRestart={restart} />}
        </div>
      </div>
    </div>
  );
}
