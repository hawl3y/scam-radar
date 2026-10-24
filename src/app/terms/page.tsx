import type { Metadata } from "next";
import Link from "next/link";
import { LegalPage } from "@/components/legal-page";
import { SITE_NAME } from "@/lib/site";

export const metadata: Metadata = { title: "Terms of use" };

export default function TermsPage() {
  return (
    <LegalPage title="Terms of use">
      <p>
        By using {SITE_NAME} you agree to these terms. If you don&apos;t agree, please don&apos;t use the app.
      </p>

      <h2>What this app is</h2>
      <p>
        {SITE_NAME} is a free community tool where neighbors share scams they&apos;ve received. Reports come from
        users and are not checked or verified by us. We&apos;re not affiliated with the Better Business Bureau, the FTC,
        any bank, or law enforcement.
      </p>

      <h2>Not advice</h2>
      <p>
        Information here is general and may be wrong or incomplete. It isn&apos;t legal, financial, or security advice.
        &quot;Check&quot; results can miss scams and can match messages that are legitimate. If you think you&apos;ve
        been scammed, contact your bank and local police, and report it at ReportFraud.ftc.gov.
      </p>

      <h2>Your account</h2>
      <ul>
        <li>You must be at least 18 to create an account.</li>
        <li>Keep your email account secure; it&apos;s how you sign in.</li>
        <li>You can delete your account anytime in Settings.</li>
      </ul>

      <h2>What you post</h2>
      <ul>
        <li>You&apos;re responsible for what you post. It must follow the <Link href="/rules" className="underline">community rules</Link>.</li>
        <li>You let us show, store, and share your posts (after personal details are hidden) so neighbors can see them, including in alert emails.</li>
        <li>We may hide or remove any post and limit or close any account, for any reason, including rule violations.</li>
      </ul>

      <h2>No warranty</h2>
      <p>
        The app is provided &quot;as is,&quot; without warranties of any kind. To the extent the law allows, we&apos;re
        not liable for losses from using it or relying on it, including missed or mistaken alerts.
      </p>

      <h2>Changes</h2>
      <p>We may update these terms. If changes are significant, we&apos;ll note it in the app.</p>
    </LegalPage>
  );
}
