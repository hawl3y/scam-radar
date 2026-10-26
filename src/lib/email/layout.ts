// Shared look for every ByeBell email: brand header, clear heading, short
// grouped sections with generous spacing, at most one primary button, and a
// small footer. Table-based and inline-styled so it holds up in Gmail, Outlook,
// and Apple Mail, and fits a phone screen. Each piece also has a plain-text form.
import { SITE_NAME } from "@/lib/site";

export type RenderedEmail = { subject: string; html: string; text: string };
export type EmailBlock = { html: string; text: string };
export type EmailButton = { label: string; url: string };

export const COLORS = {
  accent: "#1d4ed8",
  text: "#111827",
  muted: "#4b5563",
  border: "#e5e7eb",
  page: "#f3f4f6",
} as const;

const FONT = "Arial,Helvetica,sans-serif";

export const escapeHtml = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");

export function link(label: string, url: string): string {
  return `<a href="${escapeHtml(url)}" style="color:${COLORS.accent};font-weight:700">${escapeHtml(label)}</a>`;
}

/** A paragraph. `html` is trusted markup (escape inputs first); `text` is its plain form. */
export function paragraph(text: string, html = escapeHtml(text), opts: { muted?: boolean } = {}): EmailBlock {
  const color = opts.muted ? `color:${COLORS.muted};` : "";
  return { html: `<p style="margin:0 0 16px;${color}">${html}</p>`, text };
}

/** A short heading over a group of blocks. */
export function group(heading: string, blocks: EmailBlock[]): EmailBlock {
  return {
    html: `<h2 style="margin:32px 0 8px;font-size:14px;line-height:1.4;font-weight:700;letter-spacing:0.06em;text-transform:uppercase;color:${COLORS.muted}">${escapeHtml(heading)}</h2>${blocks.map((b) => b.html).join("")}`,
    text: [heading.toUpperCase(), ...blocks.map((b) => b.text)].join("\n"),
  };
}

/** One label and value per line. */
export function rows(items: [label: string, value: string | number][]): EmailBlock {
  const cell = `padding:12px 0;border-bottom:1px solid ${COLORS.border};vertical-align:top`;
  return {
    html: `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;margin:0 0 8px">${items
      .map(
        ([label, value]) =>
          `<tr><td style="${cell}">${escapeHtml(label)}</td><td align="right" style="${cell};padding-left:16px;font-weight:700;white-space:nowrap">${escapeHtml(String(value))}</td></tr>`,
      )
      .join("")}</table>`,
    text: items.map(([label, value]) => `${label}: ${value}`).join("\n"),
  };
}

/** A bordered card, e.g. one scam in an alert. */
export function card(blocks: EmailBlock[]): EmailBlock {
  return {
    html: `<div style="border:1px solid ${COLORS.border};border-radius:10px;padding:16px 18px;margin:0 0 16px">${blocks.map((b) => b.html).join("")}</div>`,
    text: blocks.map((b) => b.text).join("\n"),
  };
}

function buttonHtml({ label, url }: EmailButton) {
  return `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:28px 0 4px"><tr><td style="border-radius:8px;background:${COLORS.accent}"><a href="${escapeHtml(url)}" style="display:inline-block;padding:14px 28px;border-radius:8px;font-family:${FONT};font-size:18px;font-weight:700;color:#ffffff;text-decoration:none">${escapeHtml(label)}</a></td></tr></table>`;
}

export type EmailContent = {
  subject: string;
  heading: string;
  blocks: EmailBlock[];
  /** The one primary action, if any. */
  button?: EmailButton;
  /** Small print under the card. */
  footer: EmailBlock[];
};

export function renderEmail(siteUrl: string, { subject, heading, blocks, button, footer }: EmailContent): RenderedEmail {
  const html = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light"><title>${escapeHtml(subject)}</title></head>
<body style="margin:0;padding:0;background:${COLORS.page}">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${COLORS.page}"><tr><td align="center" style="padding:24px 12px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px"><tr><td style="background:#ffffff;border-radius:12px;padding:28px 24px;font-family:${FONT};font-size:18px;line-height:1.5;color:${COLORS.text}">
  <a href="${escapeHtml(siteUrl)}" style="color:${COLORS.accent};font-size:22px;font-weight:700;text-decoration:none"><img src="${escapeHtml(`${siteUrl}/icon-192.png`)}" width="32" height="32" alt="" style="border:0;border-radius:7px;vertical-align:middle;margin-right:8px">${escapeHtml(SITE_NAME)}</a>
  <h1 style="margin:24px 0 16px;font-size:26px;line-height:1.25;font-weight:700">${escapeHtml(heading)}</h1>
  ${blocks.map((b) => b.html).join("\n  ")}
  ${button ? buttonHtml(button) : ""}
</td></tr>
<tr><td style="padding:20px 24px 0;font-family:${FONT};font-size:14px;line-height:1.6;color:${COLORS.muted}">
  ${footer.map((b) => b.html).join("\n  ")}
</td></tr></table>
</td></tr></table>
</body></html>`;

  const text = [
    heading,
    ...blocks.map((b) => b.text),
    button ? `${button.label}: ${button.url}` : null,
    footer.length > 0 ? `--\n${footer.map((b) => b.text).join("\n\n")}` : null,
  ]
    .filter(Boolean)
    .join("\n\n");

  return { subject, html, text };
}
