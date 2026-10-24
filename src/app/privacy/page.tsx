import type { Metadata } from "next";
import { LegalPage, SupportLink } from "@/components/legal-page";
import { SITE_NAME } from "@/lib/site";

export const metadata: Metadata = { title: "Privacy policy" };

export default function PrivacyPage() {
  return (
    <LegalPage title="Privacy policy">
      <p>
        {SITE_NAME} collects as little as it can. We don&apos;t show ads, we don&apos;t sell or rent your data, and we
        don&apos;t use tracking or advertising cookies.
      </p>

      <h2>What we store</h2>
      <ul>
        <li><strong>Your email address</strong>, to sign you in and send alerts you asked for.</li>
        <li><strong>Your zip code, distance, and email settings.</strong> We store the center of your zip code, never your address.</li>
        <li><strong>Reports you post.</strong> Phone numbers, emails, names, addresses, and account numbers are hidden before a report is saved, and you can edit it before posting. We never store the original text. A report&apos;s location is the center of the zip code you enter.</li>
        <li><strong>Your &quot;I got this too&quot; answers, helpful ratings, and problem reports</strong> (notes are hidden the same way as reports).</li>
        <li><strong>Which alerts we emailed you</strong>, so we don&apos;t send duplicates, and when you last viewed the feed.</li>
        <li><strong>A scrambled (hashed) version of your IP address or account ID</strong> to limit how often actions can be repeated. These records are deleted within about a day.</li>
      </ul>

      <h2>What we don&apos;t store</h2>
      <ul>
        <li>Text you paste into &quot;Check.&quot; It&apos;s compared with reports and then discarded.</li>
        <li>Your exact location or street address.</li>
      </ul>

      <h2>What others can see</h2>
      <p>
        Other people see your reports with personal details hidden, the general area (zip code) they came from, and
        counts like &quot;Reported by 3 neighbors.&quot; We never show who posted a report, rated it, or said &quot;I got
        this too.&quot;
      </p>

      <h2>Services we use</h2>
      <ul>
        <li><strong>Supabase</strong> stores our database and handles sign-in.</li>
        <li><strong>Vercel</strong> hosts the app.</li>
        <li><strong>Resend</strong> sends our emails.</li>
      </ul>
      <p>They process data only to run these services for us.</p>

      <h2>Cookies and browser storage</h2>
      <p>
        We use cookies only to keep you signed in. If you&apos;re not signed in, your browser remembers when you last
        viewed the feed so we can label new reports. That stays on your device.
      </p>

      <h2>Your choices</h2>
      <ul>
        <li>Change or stop alert emails in Settings or from the link in any alert email.</li>
        <li>Delete your account in Settings. This permanently deletes your account, settings, reports, and other activity.</li>
        <li>For any other request about your data, email <SupportLink />.</li>
      </ul>
    </LegalPage>
  );
}
