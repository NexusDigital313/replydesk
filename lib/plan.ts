// Copyright (c) 2026 Jacob Douglas Parmenter. All Rights Reserved.
// Proprietary and Confidential.
//
// Unauthorized reproduction, copying, modification, distribution,
// redistribution, publication, reverse engineering, decompilation, or
// disassembly of this file, in whole or in part, via any medium, is
// strictly prohibited without explicit prior written authorization.

import type { Plan } from "./types";

export interface Limits {
  draftsPerMonth: number;
  historyMax: number;
  bulkImport: boolean;
  claude: boolean;
}

export const PLAN_LIMITS: Record<Plan, Limits> = {
  free: { draftsPerMonth: 15, historyMax: 30, bulkImport: false, claude: false },
  pro: {
    draftsPerMonth: Number.POSITIVE_INFINITY,
    historyMax: Number.POSITIVE_INFINITY,
    bulkImport: true,
    claude: true,
  },
};

export const PRO = {
  // Two ways to buy: monthly to start cheap, annual to save (2 months free).
  monthlyPrice: "$19",
  monthlyPeriod: "/mo",
  price: "$149",
  period: "/yr",
  annualSavings: "Save $79 · 2 months free",
  features: [
    "Unlimited replies",
    "Claude-powered drafting (best quality)",
    "Bulk import — reply to a backlog in minutes",
    "Unlimited saved history",
    "Priority email support",
  ],
};

export const FREE = {
  price: "$0",
  period: "",
  features: [
    "15 replies / month",
    "Built-in local reply engine",
    "Sentiment dashboard",
    "Up to 30 saved replies",
  ],
};

/** Whether the paywall / plan-gating UI is active. Default ON; set
 *  NEXT_PUBLIC_PAYWALL=0 to give everyone Pro (e.g. internal / promo). */
export const PAYWALL_ENABLED =
  process.env.NEXT_PUBLIC_PAYWALL !== "0";

export function monthKey(d = new Date()): string {
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}
