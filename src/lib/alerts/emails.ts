import { crowdLabel } from "@/lib/crowd";
import { card, escapeHtml, link, paragraph, renderEmail, type EmailBlock, type RenderedEmail } from "@/lib/email/layout";
import { formatDistance } from "@/lib/format";
import { defang } from "@/lib/redaction";
import { CHANNELS, scamTypeInfo, type Channel, type StoredScamType } from "@/lib/scam-types";
import { SITE_NAME } from "@/lib/site";

export type EmailCluster = {
  cluster_id: string;
  scam_type: StoredScamType;
  report_count: number;
  corroboration_count: number;
  distance_miles: number | null;
  nearest_zip: string | null;
  latest_description: string;
  latest_channel: Channel;
};

export type EmailLinks = { siteUrl: string; prefsUrl: string; homeZip: string | null; source?: "digest" | "instant" };

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

/** One scam: what it is, who reported it, and what it said. `withLink` adds a "See what to do" link. */
function clusterCard(cluster: EmailCluster, links: EmailLinks, withLink: boolean): EmailBlock {
  const label = scamTypeInfo(cluster.scam_type).label;
  const crowd = crowdLabel(cluster.report_count, cluster.corroboration_count);
  const blocks: EmailBlock[] = [
    { html: `<p style="margin:0 0 4px;font-size:20px;line-height:1.3;font-weight:700">${escapeHtml(label)}</p>`, text: label },
    { html: `<p style="margin:0 0 4px;font-weight:700">${escapeHtml(crowd)}</p>`, text: crowd },
    paragraph(meta(cluster, links.homeZip), undefined, { muted: true }),
    { html: `<p style="margin:0 0 12px;white-space:pre-wrap">${escapeHtml(excerpt(cluster.latest_description))}</p>`, text: excerpt(cluster.latest_description) },
  ];
  if (withLink) {
    const url = alertUrl(cluster, links);
    blocks.push({ html: `<p style="margin:0">${link("See what to do →", url)}</p>`, text: `See what to do: ${url}` });
  }
  return card(blocks);
}

function alertFooter(links: EmailLinks, extra: EmailBlock[] = []): EmailBlock[] {
  return [
    ...extra,
    paragraph("We'll never ask you to sign in or share personal details from an email."),
    paragraph(
      `You're getting this because you turned on scam alerts. Change or stop these emails: ${links.prefsUrl}`,
      `You're getting this because you turned on scam alerts. ${link("Change or stop these emails", links.prefsUrl)}.`,
    ),
  ];
}

const flyerInvite = (siteUrl: string): EmailBlock =>
  paragraph(
    `Know a neighbor who'd want this? Print a ${SITE_NAME} flyer for your building, library, or community board: ${siteUrl}/flyer`,
    `Know a neighbor who'd want this? ${link(`Print a ${SITE_NAME} flyer`, `${siteUrl}/flyer`)} for your building, library, or community board.`,
  );

export function renderInstantEmail(cluster: EmailCluster, baseLinks: EmailLinks): RenderedEmail {
  const links = { ...baseLinks, source: "instant" as const };
  const label = scamTypeInfo(cluster.scam_type).label;
  return renderEmail(links.siteUrl, {
    subject: `Scam alert near you: ${label}`,
    heading: "Scam alert near you",
    blocks: [
      paragraph("Several neighbors near you have reported this. Here's what it looks like and what to do."),
      clusterCard(cluster, links, false),
    ],
    button: { label: "See what to do", url: alertUrl(cluster, links) },
    footer: alertFooter(links),
  });
}

export function renderDigestEmail(clusters: EmailCluster[], totalItems: number, baseLinks: EmailLinks): RenderedEmail {
  const links = { ...baseLinks, source: "digest" as const };
  const count = totalItems === 1 ? "1 scam" : `${totalItems} scams`;
  const more = totalItems > clusters.length ? `See all ${totalItems} in the app` : `Open ${SITE_NAME}`;
  return renderEmail(links.siteUrl, {
    subject: `${count} reported near you`,
    heading: `${count} reported near you`,
    blocks: [
      paragraph("Here's what neighbors reported near you recently."),
      ...clusters.map((c) => clusterCard(c, links, true)),
    ],
    button: { label: more, url: `${links.siteUrl}/?src=digest` },
    footer: alertFooter(links, [flyerInvite(links.siteUrl)]),
  });
}
