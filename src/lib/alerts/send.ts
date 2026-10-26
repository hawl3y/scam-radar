import "server-only";
import { Resend } from "resend";
import type { RenderedEmail } from "@/lib/email/layout";
import { ALERTS_FROM_EMAIL, SITE_NAME } from "@/lib/site";
import { createPrefsToken } from "./tokens";

const FROM = `${SITE_NAME} <${ALERTS_FROM_EMAIL}>`;

export function siteUrl(): string {
  const url = process.env.NEXT_PUBLIC_SITE_URL;
  if (!url) throw new Error("Missing NEXT_PUBLIC_SITE_URL. See README.md.");
  return url.replace(/\/$/, "");
}

export function linksFor(userId: string, homeZip: string | null) {
  const token = createPrefsToken(userId);
  const base = siteUrl();
  return {
    siteUrl: base,
    prefsUrl: `${base}/email-preferences?token=${token}`,
    unsubscribeUrl: `${base}/api/unsubscribe?token=${token}`,
    homeZip,
  };
}

let client: Resend | null = null;
function resend(): Resend {
  const key = process.env.RESEND_API_KEY;
  if (!key) throw new Error("Missing RESEND_API_KEY. See README.md.");
  client ??= new Resend(key);
  return client;
}

/** Sends one email with one-click unsubscribe headers. Throws on failure. */
export async function sendAlertEmail(to: string, email: RenderedEmail, unsubscribeUrl: string, idempotencyKey: string) {
  const { error } = await resend().emails.send(
    {
      from: FROM,
      to,
      subject: email.subject,
      html: email.html,
      text: email.text,
      headers: {
        "List-Unsubscribe": `<${unsubscribeUrl}>`,
        "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
      },
    },
    { idempotencyKey },
  );
  if (error) throw new Error(`Resend send failed: ${error.message}`);
}

/** Operational email (e.g. to admins). Throws on failure. */
export async function sendAdminEmail(to: string[], email: RenderedEmail, idempotencyKey: string) {
  const { error } = await resend().emails.send(
    { from: FROM, to, subject: email.subject, html: email.html, text: email.text },
    { idempotencyKey },
  );
  if (error) throw new Error(`Resend send failed: ${error.message}`);
}
