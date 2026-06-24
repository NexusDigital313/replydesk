import type { ReactNode } from "react";
import { SUPPORT_EMAIL } from "@/lib/config";

/**
 * Shared presentational primitives for the legal pages (/terms, /privacy,
 * /refund, /contact). Kept here so every policy page shares one consistent,
 * on-brand dark style instead of repeating Tailwind strings per page.
 *
 * Paragraph text is passed as JS strings ({"…"}) on purpose: it keeps
 * apostrophes/quotes out of raw JSX so the Next build's lint pass never trips
 * on unescaped entities.
 */

export function LegalTitle({
  title,
  updated,
}: {
  title: string;
  updated: string;
}) {
  return (
    <header className="mb-[28px]">
      <h1 className="font-display m-0 text-[clamp(28px,5vw,34px)] font-medium leading-[1.1] tracking-[-.018em] text-[#f7f3ee]">
        {title}
      </h1>
      <p className="m-0 mt-[10px] text-[13px] text-[#6f675f]">
        Last updated {updated}
      </p>
    </header>
  );
}

export function H2({ children }: { children: ReactNode }) {
  return (
    <h2 className="font-display mb-[10px] mt-[34px] text-[18px] font-medium tracking-[-.01em] text-[#f7f3ee]">
      {children}
    </h2>
  );
}

export function P({ children }: { children: ReactNode }) {
  return (
    <p className="my-[12px] text-[14.5px] leading-[1.72] text-[#bcb3aa]">
      {children}
    </p>
  );
}

export function UL({ children }: { children: ReactNode }) {
  return (
    <ul className="my-[12px] flex list-disc flex-col gap-[8px] pl-[22px] text-[14.5px] leading-[1.62] text-[#bcb3aa] marker:text-[#7e6f5f]">
      {children}
    </ul>
  );
}

export function Mail({ children }: { children?: ReactNode }) {
  return (
    <a
      href={`mailto:${SUPPORT_EMAIL}`}
      className="font-medium text-[#d97757] no-underline underline-offset-2 transition-colors hover:text-[#e8956f] hover:underline"
    >
      {children ?? SUPPORT_EMAIL}
    </a>
  );
}

export function A({ href, children }: { href: string; children: ReactNode }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="font-medium text-[#d97757] no-underline underline-offset-2 transition-colors hover:text-[#e8956f] hover:underline"
    >
      {children}
    </a>
  );
}
