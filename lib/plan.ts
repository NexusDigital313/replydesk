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
  price: "$29",
  period: "/mo",
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
