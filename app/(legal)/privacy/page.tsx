import type { Metadata } from "next";
import { LegalTitle, H2, P, UL, Mail, A } from "../legal-ui";
import { SELLER_NAME } from "@/lib/config";

export const metadata: Metadata = {
  title: "Privacy Policy — ReplyDesk",
  description:
    "What data ReplyDesk collects, how your Claude API key is handled, and the third parties involved.",
};

const UPDATED = "June 24, 2026";

export default function PrivacyPage() {
  return (
    <article>
      <LegalTitle title="Privacy Policy" updated={UPDATED} />

      <P>
        {`This Privacy Policy explains what information ${SELLER_NAME} ("ReplyDesk", "we", "us") collects when you use ReplyDesk, how we use it, and the choices you have. ReplyDesk is designed to keep your sensitive credentials on your own device wherever possible.`}
      </P>

      <H2>1. Your Anthropic (Claude) API key stays in your browser</H2>
      <P>
        {`ReplyDesk is a "bring your own key" product. The Anthropic API key you connect is stored locally in your browser and is used to make requests to Anthropic so the app can draft replies. We do not sell it, and we do not retain it on a server beyond what is technically necessary to relay a request and return your draft. You can disconnect or remove the key from within the app at any time.`}
      </P>

      <H2>2. Information we collect</H2>
      <UL>
        <li>
          {`Purchase and license information: when you buy a license, our Merchant of Record (Lemon Squeezy) collects your payment details and shares limited order data (such as your email and license status) so we can validate your license.`}
        </li>
        <li>
          {`Content you process: the review or message text you ask ReplyDesk to draft a reply for, plus the business-voice details you provide, are processed to generate a draft. We do not use your content to train models.`}
        </li>
        <li>
          {`Google data (only if you connect it): if you link a Google account to import reviews, we access the review data you authorize, using tokens stored to maintain that connection. You can revoke this access at any time in your Google account settings.`}
        </li>
        <li>
          {`Basic technical data: standard logs and analytics needed to operate and secure the Service (for example, request and error information from our hosting provider).`}
        </li>
      </UL>

      <H2>3. How we use information</H2>
      <P>
        {`We use the information above to provide and maintain the Service, generate your drafts, validate your license, respond to support requests, prevent abuse, and meet legal obligations. We do not sell your personal information.`}
      </P>

      <H2>4. Payments</H2>
      <P>
        {`Payments are handled by Lemon Squeezy as Merchant of Record. We never receive or store your full card details. See Lemon Squeezy's `}
        <A href="https://www.lemonsqueezy.com/privacy">privacy policy</A>
        {` for how they process payment data.`}
      </P>

      <H2>5. Third-party services</H2>
      <P>
        {`To run the Service we rely on: Anthropic (AI model that powers drafting), Google (only if you connect it, to import reviews), Lemon Squeezy (payments and licensing), and our hosting/infrastructure provider. Each processes data under its own privacy policy.`}
      </P>

      <H2>6. Data retention</H2>
      <P>
        {`We keep information only as long as needed for the purposes above or as required by law. License and order records are retained for accounting and support. Content submitted for drafting is not retained beyond what is needed to return your result.`}
      </P>

      <H2>7. Cookies &amp; local storage</H2>
      <P>
        {`ReplyDesk uses your browser's local storage to remember your settings, your connection state, and your license — including your API key, which stays on your device. We use only the cookies necessary to operate the Service.`}
      </P>

      <H2>8. Security</H2>
      <P>
        {`We use reasonable technical and organizational measures to protect information. No method of transmission or storage is completely secure, so we cannot guarantee absolute security; keeping your own API keys and account credentials safe is your responsibility.`}
      </P>

      <H2>9. Your rights</H2>
      <P>
        {`Depending on where you live, you may have the right to access, correct, or delete your personal information, or to object to certain processing. To make a request, email us at `}
        <Mail />
        {`. You can delete most locally stored data yourself by clearing it in the app or your browser.`}
      </P>

      <H2>10. Children</H2>
      <P>
        {`ReplyDesk is intended for business users and is not directed to children under 16. We do not knowingly collect personal information from children.`}
      </P>

      <H2>11. Changes to this policy</H2>
      <P>
        {`We may update this policy from time to time and will revise the "Last updated" date above when we do. Material changes will be reflected on this page.`}
      </P>

      <H2>12. Contact</H2>
      <P>
        {`Questions or privacy requests? Email `}
        <Mail />
        {` or use the `}
        <A href="/contact">contact page</A>
        {`.`}
      </P>
    </article>
  );
}
