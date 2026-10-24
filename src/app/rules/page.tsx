import type { Metadata } from "next";
import { LegalPage } from "@/components/legal-page";
import { SITE_NAME } from "@/lib/site";

export const metadata: Metadata = { title: "Community rules" };

export default function RulesPage() {
  return (
    <LegalPage title="Community rules">
      <p>{SITE_NAME} works because neighbors share accurate, calm warnings. Please follow these rules when you post.</p>

      <h2>Do</h2>
      <ul>
        <li>Report scams you received or saw yourself.</li>
        <li>Describe what happened plainly: how they contacted you, what they asked for, and any links or company names they used.</li>
        <li>Say &quot;I got this too&quot; only when you really got the same thing.</li>
      </ul>

      <h2>Don&apos;t</h2>
      <ul>
        <li>Name private people, including the scammer&apos;s claimed name, your family, or neighbors.</li>
        <li>Share personal details: phone numbers, emails, addresses, account or card numbers. We hide many automatically, but please check the preview before posting.</li>
        <li>Accuse a real business or person without first-hand facts. Describe what happened, not who you think is behind it.</li>
        <li>Post ads, spam, jokes, or anything hateful, threatening, or harassing.</li>
      </ul>

      <h2>How we keep things safe</h2>
      <p>
        Anyone signed in can report a problem with a post. A post flagged by several neighbors is hidden until we review
        it. We remove posts that break these rules. Accounts with posts removed, or that neighbors repeatedly mark as not
        helpful, are limited: their posts stop showing to others.
      </p>
      <p>
        Labels like &quot;Reported by 3 neighbors&quot; describe what people reported. They are not a verdict that
        something is or isn&apos;t a scam.
      </p>
    </LegalPage>
  );
}
