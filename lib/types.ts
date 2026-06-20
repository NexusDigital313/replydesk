export type Tone =
  | "professional"
  | "warm"
  | "apologetic"
  | "grateful"
  | "concise";

export const TONES: { value: Tone; label: string; hint: string }[] = [
  { value: "professional", label: "Professional", hint: "Polished and neutral" },
  { value: "warm", label: "Warm", hint: "Friendly and personable" },
  { value: "apologetic", label: "Apologetic", hint: "Owns the miss, makes it right" },
  { value: "grateful", label: "Grateful", hint: "Leans into the thanks" },
  { value: "concise", label: "Concise", hint: "Short and to the point" },
];

export interface BusinessProfile {
  name: string;
  type: string; // e.g. "Restaurant", "Dental clinic", "Salon"
  tone: Tone;
  signature: string; // e.g. "— The team at Luigi's"
  contact: string; // email / phone used in make-it-right lines (optional)
}

export interface DraftRequest {
  review: string;
  rating: number; // 1-5
  tone: Tone;
  author?: string;
  business: BusinessProfile;
}

export interface ReviewItem {
  id: string;
  text: string;
  rating: number;
  author: string;
  reply: string;
  tone: Tone;
  source: "claude" | "local";
  createdAt: number;
}

export const EMPTY_PROFILE: BusinessProfile = {
  name: "",
  type: "",
  tone: "warm",
  signature: "",
  contact: "",
};

export type Plan = "free" | "pro";

export interface LicensePayload {
  plan: "pro";
  iat: number;
  exp: number;
  customer?: string;
  sub?: string;
}
