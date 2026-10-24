import { crowdLabel } from "@/lib/crowd";
import { formatDistance } from "@/lib/format";
import { defang } from "@/lib/redaction";
import { CHANNELS, SCAM_TYPES, type Channel, type ScamType } from "@/lib/scam-types";
import { SITE_NAME } from "@/lib/site";

export type EmailCluster = {
  cluster_id: string;
  scam_type: ScamType;
  report_count: number;
  corroboration_count: number;
  distance_miles: number | null;
  nearest_zip: string | null;
  latest_description: string;
  latest_channel: Channel;
};

export type EmailLinks = { siteUrl: string; prefsUrl: string; homeZip: string | null; source?: "digest" | "instant" };

export type RenderedEmail = { subject: string; html: string; text: string };

const escapeHtml = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");

function alertUrl(cluster: EmailCluster, links: EmailLinks) {
  const params = new URLSearchParams();
  if (links.homeZip) params.set("zip", links.homeZip);
  // Counted as an anonymous "visit from email" (no open tracking).
  if (links.source) params.set("src", links.source);
  const query = params.toString();
  return `${links.siteUrl}/alerts/${cluster.cluster_id}${query ? `?${query}` : ""}`;
}

function excerpt(text: string, max = 280) {
  const defanged = defang(text);
  return defanged.length > max ? `${defanged.slice(0, max - 1).trimEnd()}…` : defanged;
}

function meta(cluster: EmailCluster, homeZip: string | null) {
  const distance = formatDistance(cluster.distance_miles, homeZip !== null && homeZip === cluster.nearest_zip);
  return [CHANNELS[cluster.latest_channel], distance].filter(Boolean).join(" · ");
}

function clusterHtml(cluster: EmailCluster, links: EmailLinks) {
  return `
<div style="border:2px solid #9ca3af;border-radius:8px;padding:16px;margin:0 0 16px">
  <p style="margin:0 0 4px;font-size:20px;font-weight:700">${escapeHtml(SCAM_TYPES[cluster.scam_type].label)}</p>
  <p style="margin:0 0 4px;font-weight:700">${escapeHtml(crowdLabel(cluster.report_count, cluster.corroboration_count))}</p>
  <p style="margin:0 0 8px;color:#4b5563">${escapeHtml(meta(cluster, links.homeZip))}</p>
  <p style="margin:0 0 12px;white-space:pre-wrap">${escapeHtml(excerpt(cluster.latest_description))}</p>
  <a href="${escapeHtml(alertUrl(cluster, links))}" style="display:inline-block;background:#1d4ed8;color:#ffffff;padding:12px 20px;border-radius:6px;font-weight:700;text-decoration:none">See what to do</a>
</div>`;
}

function clusterText(cluster: EmailCluster, links: EmailLinks) {
  return [
    SCAM_TYPES[cluster.scam_type].label,
    crowdLabel(cluster.report_count, cluster.corroboration_count),
    meta(cluster, links.homeZip),
    excerpt(cluster.latest_description),
    `See what to do: ${alertUrl(cluster, links)}`,
  ].join("\n");
}

function layout(intro: string, body: string, links: EmailLinks) {
  return `<!doctype html>
<html lang="en"><body style="margin:0;padding:24px 16px;background:#ffffff;color:#111827;font-family:Arial,Helvetica,sans-serif;font-size:18px;line-height:1.5">
<div style="max-width:560px;margin:0 auto">
  <p style="margin:0 0 16px;font-size:22px;font-weight:700">${escapeHtml(SITE_NAME)}</p>
  <p style="margin:0 0 20px">${escapeHtml(intro)}</p>
  ${body}
  <p style="margin:24px 0 0;color:#4b5563;font-size:15px">We'll never ask you to sign in or share personal details from an email.
  You're getting this because you turned on scam alerts. <a href="${escapeHtml(links.prefsUrl)}" style="color:#1d4ed8">Change or stop these emails</a>.</p>
</div></body></html>`;
}

function textFooter(links: EmailLinks) {
  return `\n\nWe'll never ask you to sign in or share personal details from an email.\nChange or stop these emails: ${links.prefsUrl}`;
}

export function renderInstantEmail(cluster: EmailCluster, baseLinks: EmailLinks): RenderedEmail {
  const links = { ...baseLinks, source: "instant" as const };
  const label = SCAM_TYPES[cluster.scam_type].label;
  const intro = "Several neighbors near you have reported this. Here's what it looks like and what to do.";
  return {
    subject: `Scam alert near you: ${label}`,
    html: layout(intro, clusterHtml(cluster, links), links),
    text: `${intro}\n\n${clusterText(cluster, links)}${textFooter(links)}`,
  };
}

export function renderDigestEmail(clusters: EmailCluster[], totalItems: number, baseLinks: EmailLinks): RenderedEmail {
  const links = { ...baseLinks, source: "digest" as const };
  const count = totalItems === 1 ? "1 scam" : `${totalItems} scams`;
  const intro = `Here's what neighbors reported near you recently: ${count}.`;
  const more =
    totalItems > clusters.length
      ? `<p style="margin:0 0 16px"><a href="${escapeHtml(`${links.siteUrl}/?src=digest`)}" style="color:#1d4ed8">See all ${totalItems} in the app</a></p>`
      : "";
  return {
    subject: `${count} reported near you`,
    html: layout(intro, clusters.map((c) => clusterHtml(c, links)).join("") + more, links),
    text: `${intro}\n\n${clusters.map((c) => clusterText(c, links)).join("\n\n")}${textFooter(links)}`,
  };
}
