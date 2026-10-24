// FBI IC3 public service announcements (RSS: title, link, pubDate).

export type Headline = { source: "ic3"; title: string; url: string; published_at: string };

const ENTITIES: Record<string, string> = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'" };

function decode(text: string): string {
  return text
    .replace(/^<!\[CDATA\[([\s\S]*)\]\]>$/, "$1")
    .replace(/&(#x[0-9a-f]+|#[0-9]+|[a-z]+);/gi, (m, code: string) => {
      if (code[0] === "#") {
        const n = code[1].toLowerCase() === "x" ? parseInt(code.slice(2), 16) : parseInt(code.slice(1), 10);
        return Number.isFinite(n) ? String.fromCodePoint(n) : m;
      }
      return ENTITIES[code.toLowerCase()] ?? m;
    })
    .trim();
}

function tag(item: string, name: string): string | null {
  const match = item.match(new RegExp(`<${name}(?:\\s[^>]*)?>([\\s\\S]*?)</${name}>`, "i"));
  return match ? decode(match[1]) : null;
}

/** Only announcements about scams or fraud aimed at the public (not e.g. software vulnerabilities). */
export function isConsumerRelevant(title: string): boolean {
  return /scam|fraud|impersonat|imposter|impostor|extort|swindl/i.test(title);
}

export function parseIc3Rss(xml: string): Headline[] {
  const items = xml.match(/<item>[\s\S]*?<\/item>/gi) ?? [];
  const headlines: Headline[] = [];
  for (const item of items) {
    const title = tag(item, "title");
    const url = tag(item, "link");
    const pubDate = tag(item, "pubDate");
    const published = pubDate ? new Date(pubDate) : null;
    if (!title || !url || !url.startsWith("https://") || !published || Number.isNaN(published.getTime())) continue;
    if (!isConsumerRelevant(title)) continue;
    headlines.push({ source: "ic3", title: title.slice(0, 500), url, published_at: published.toISOString() });
  }
  return headlines;
}
