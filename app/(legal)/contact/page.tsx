import type { Metadata } from "next";
import { LegalTitle, H2, P, A } from "../legal-ui";
import { SELLER_NAME, SUPPORT_EMAIL } from "@/lib/config";

export const metadata: Metadata = {
  title: "Contact — ReplyDesk",
  description: "How to reach ReplyDesk support, billing, and privacy.",
};

const UPDATED = "June 24, 2026";

export default function ContactPage() {
  return (
    <article>
      <LegalTitle title="Contact us" updated={UPDATED} />

      <P>
        {`Need help, have a question, or want a refund? A real person reads ${SELLER_NAME} support. We aim to reply within 2 business days.`}
      </P>

      <a
        href={`mailto:${SUPPORT_EMAIL}`}
        className="mt-[8px] inline-flex h-[48px] items-center rounded-[11px] bg-[#c15f3c] px-[22px] text-[15px] font-semibold text-white no-underline transition-[background,transform] duration-150 hover:bg-[#d97757] active:translate-y-[1px]"
        style={{
          boxShadow:
            "0 1px 2px rgba(0,0,0,.4), 0 12px 28px -12px rgba(217,119,87,.6)",
        }}
      >
        Email {SUPPORT_EMAIL}
      </a>

      <H2>Support</H2>
      <P>
        {`For setup help, bugs, license activation, or anything about using ReplyDesk, email `}
        <a
          href={`mailto:${SUPPORT_EMAIL}`}
          className="font-medium text-[#d97757] no-underline underline-offset-2 transition-colors hover:text-[#e8956f] hover:underline"
        >
          {SUPPORT_EMAIL}
        </a>
        {`.`}
      </P>

      <H2>Billing &amp; payments</H2>
      <P>
        {`Payments are handled by Lemon Squeezy, our Merchant of Record. Your receipt email includes a customer-portal link to view orders, update payment details, and manage your subscription. For refunds, see our `}
        <A href="/refund">Refund Policy</A>
        {`. You can always email us and we will help.`}
      </P>

      <H2>Privacy requests</H2>
      <P>
        {`To access, correct, or delete your personal information, email us with your request. See our `}
        <A href="/privacy">Privacy Policy</A>
        {` for details.`}
      </P>
    </article>
  );
}
