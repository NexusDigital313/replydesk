/**
 * ReplyDesk Pro license — Lemon Squeezy (Merchant of Record).
 *
 * The buyer pays through LS's hosted checkout, gets a license key by email, and
 * pastes it into the app. We validate/activate that key directly against LS's
 * public license API from the browser — no ReplyDesk server in the path, which
 * keeps the whole product local-first.
 */
import { LS, ACCEPTED_PRODUCT_IDS } from "./config";

const API = "https://api.lemonsqueezy.com/v1/licenses";
const STORE_KEY = "replydesk.license";

export interface ProLicense {
  key: string;
  instanceId?: string;
  valid: boolean;
}

export function loadLicense(): ProLicense | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORE_KEY);
    return raw ? (JSON.parse(raw) as ProLicense) : null;
  } catch {
    return null;
  }
}

function save(l: ProLicense) {
  try {
    window.localStorage.setItem(STORE_KEY, JSON.stringify(l));
  } catch {
    /* private mode / storage off */
  }
}

export function isPro(): boolean {
  return !!loadLicense()?.valid;
}

export function clearLicense() {
  try {
    window.localStorage.removeItem(STORE_KEY);
  } catch {
    /* noop */
  }
}

function storeMatches(meta?: { store_id?: number; product_id?: number }): boolean {
  if (!meta) return true;
  if (LS.storeId && String(meta.store_id) !== LS.storeId) return false;
  // A license is valid if it came from either the monthly or annual product.
  if (ACCEPTED_PRODUCT_IDS.length && !ACCEPTED_PRODUCT_IDS.includes(String(meta.product_id)))
    return false;
  return true;
}

async function call(path: "validate" | "activate", body: Record<string, string>) {
  const res = await fetch(`${API}/${path}`, {
    method: "POST",
    headers: { Accept: "application/json", "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return (await res.json()) as {
    valid?: boolean;
    activated?: boolean;
    error?: string | null;
    instance?: { id: string } | null;
    meta?: { store_id?: number; product_id?: number };
  };
}

/** Activate a freshly purchased key on this device and unlock Pro. */
export async function activateLicense(licenseKey: string): Promise<{ ok: boolean; error?: string }> {
  const key = licenseKey.trim();
  if (!key) return { ok: false, error: "Enter your license key." };

  let data;
  try {
    data = await call("activate", { license_key: key, instance_name: "ReplyDesk" });
  } catch {
    return { ok: false, error: "Couldn't reach the license server — check your connection." };
  }

  // Fresh activation succeeded.
  if (data.activated) {
    if (!storeMatches(data.meta)) return { ok: false, error: "That license is for a different product." };
    save({ key, instanceId: data.instance?.id, valid: true });
    return { ok: true };
  }

  // Already activated before (e.g. re-entered on the same device) — fall back to validate.
  const v = await call("validate", { license_key: key }).catch(() => null);
  if (v?.valid && storeMatches(v.meta)) {
    save({ key, valid: true });
    return { ok: true };
  }
  return { ok: false, error: data.error || "That license key isn't valid." };
}

/**
 * Re-check a stored license (call on load to honor expiry/refunds). Fails OPEN on
 * a network error so a paying user is never locked out by a flaky connection.
 */
export async function revalidate(): Promise<boolean> {
  const l = loadLicense();
  if (!l?.key) return false;
  try {
    const v = await call(
      "validate",
      l.instanceId ? { license_key: l.key, instance_id: l.instanceId } : { license_key: l.key },
    );
    const ok = !!v.valid && storeMatches(v.meta);
    save({ ...l, valid: ok });
    return ok;
  } catch {
    return l.valid;
  }
}
