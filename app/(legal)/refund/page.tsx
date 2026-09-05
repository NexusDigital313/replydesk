// Copyright (c) 2026 Jacob Douglas Parmenter. All Rights Reserved.
// Proprietary and Confidential.
//
// Unauthorized reproduction, copying, modification, distribution,
// redistribution, publication, reverse engineering, decompilation, or
// disassembly of this file, in whole or in part, via any medium, is
// strictly prohibited without explicit prior written authorization.

import type { Metadata } from "next";
import { LegalTitle, H2, P, UL, Mail, A } from "../legal-ui";
import { PRODUCT_NAME } from "@/lib/config";

export const metadata: Metadata = {
  title: "Refund & Cancellation Policy — ReplyDesk",
  description:
    "ReplyDesk's 14-day money-back guarantee, cancellation terms, and how to request a refund.",
};

const UPDATED = "June 24, 2026";

export default function RefundPage() {
  return (
    <article>
      <LegalTitle title="Refund & Cancellation Policy" updated={UPDATED} />

      <P>
        {`We want you to be happy with ReplyDesk. This policy explains our refund and cancellation terms for ${PRODUCT_NAME}. Payments and refunds are processed by Lemon Squeezy, our Merchant of Record.`}
      </P>

      <H2>14-day money-back guarantee</H2>
      <P>
        {`If ReplyDesk is not right for you, request a refund within 14 days of your initial purchase and we will refund it in full — no hassle. Refunds are issued to your original payment method through Lemon Squeezy.`}
      </P>

      <H2>Monthly plan</H2>
      <UL>
        <li>{`You can cancel at any time; cancellation stops all future renewals.`}</li>
        <li>
          {`After cancelling, your Pro access continues until the end of the current billing period.`}
        </li>
        <li>
          {`Your first monthly payment is refundable within the 14-day window above. Renewal payments are generally non-refundable, but contact us if something went wrong and we will make it right where we reasonably can.`}
        </li>
      </UL>

      <H2>Annual plan</H2>
      <UL>
        <li>
          {`Your annual purchase is fully refundable within 14 days of the charge.`}
        </li>
        <li>
          {`After the 14-day window, the annual term is non-refundable, but your Pro access remains active until the end of the paid year and you can cancel renewal at any time.`}
        </li>
      </UL>

      <H2>How to request a refund or cancel</H2>
      <P>
        {`Email `}
        <Mail />
        {` with the email address you used at checkout and your Lemon Squeezy order number (it is on your receipt). You can also manage your subscription and request a refund directly through the customer portal link in your Lemon Squeezy receipt email. We aim to process refund requests within 2 business days.`}
      </P>

      <H2>After a refund</H2>
      <P>
        {`When a refund is issued, the associated Pro license is deactivated and Pro features are turned off. If you believe a charge was made in error, please contact us before initiating a chargeback so we can resolve it quickly.`}
      </P>

      <H2>Questions</H2>
      <P>
        {`Reach us any time at `}
        <Mail />
        {` or via the `}
        <A href="/contact">contact page</A>
        {`.`}
      </P>
    </article>
  );
}
