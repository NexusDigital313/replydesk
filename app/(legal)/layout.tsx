import Link from "next/link";
import type { ReactNode } from "react";
import { SELLER_NAME, SUPPORT_EMAIL } from "@/lib/config";

/**
 * Chrome shared by every legal page. Mirrors the dark product surface at /app
 * (clay accent, Fraunces display, bone-on-near-black) so the policy pages read
 * as part of the same product, not a bolted-on afterthought. The footer carries
 * the seller identity, the cross-links, the support address, and the
 * third-party trademark disclaimer the Merchant-of-Record review expects.
 */

const NAV = [
  { href: "/terms", label: "Terms" },
  { href: "/privacy", label: "Privacy" },
  { href: "/refund", label: "Refunds" },
  { href: "/contact", label: "Contact" },
];

export default function LegalLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-[#14110e] font-sans text-[#bcb3aa] antialiased">
      <header className="mx-auto flex max-w-[760px] items-center justify-between px-[24px] pb-[8px] pt-[40px]">
        <Link
          href="/app"
          className="group inline-flex items-center gap-[8px] text-[13px] font-medium text-[#9b938c] no-underline transition-colors hover:text-[#f7f3ee]"
        >
          <span className="inline-block transition-transform group-hover:-translate-x-[2px]">
            &larr;
          </span>
          Back to ReplyDesk
        </Link>
        <Link
          href="/app"
          className="font-display text-[15px] font-medium tracking-[-.01em] text-[#f7f3ee] no-underline"
        >
          ReplyDesk
        </Link>
      </header>

      <main className="mx-auto max-w-[760px] px-[24px] py-[28px]">
        {children}
      </main>

      <footer className="mx-auto max-w-[760px] px-[24px] pb-[56px] pt-[24px]">
        <div className="flex flex-wrap items-center gap-x-[18px] gap-y-[8px] border-t border-[#2a241e] pt-[24px] text-[12.5px] text-[#6f675f]">
          <span>&copy; 2026 {SELLER_NAME}</span>
          {NAV.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="text-[#6f675f] no-underline transition-colors hover:text-[#9b938c]"
            >
              {l.label}
            </Link>
          ))}
          <a
            href={`mailto:${SUPPORT_EMAIL}`}
            className="text-[#6f675f] no-underline transition-colors hover:text-[#9b938c]"
          >
            {SUPPORT_EMAIL}
          </a>
        </div>
        <p className="mt-[14px] max-w-[640px] text-[11.5px] leading-[1.55] text-[#5b544c]">
          ReplyDesk is an independent product and is not affiliated with,
          endorsed by, or sponsored by Anthropic or Google. &ldquo;Claude&rdquo;
          is a trademark of Anthropic, PBC; &ldquo;Google&rdquo; is a trademark
          of Google LLC. Each remains the property of its respective owner.
        </p>
      </footer>
    </div>
  );
}
