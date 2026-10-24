import { describe, expect, it } from "vitest";
import { isConsumerRelevant, parseIc3Rss } from "./ic3";

// Shape of https://www.ic3.gov/PSA/RSS (2026-10-23), plus an entity case.
const FEED = `<?xml version="1.0" encoding="utf-8"?><rss version="2.0"><channel><title>IC3.gov News</title><link>https://www.ic3.gov/</link>
<item><title>Critical Vulnerability Alert: PHP Core</title><link>https://www.ic3.gov/PSA/2026/PSA261023</link><pubDate>Fri, 23 Oct 2026 13:30:00 -04:00</pubDate><guid isPermaLink="false">261023</guid></item>
<item><title>Scammers Exploit 2026 U.S. Midterm Election to Perpetrate Multiple Fraud Schemes</title><link>https://www.ic3.gov/PSA/2026/PSA261015-3</link><pubDate>Thu, 15 Oct 2026 09:00:00 -04:00</pubDate><guid isPermaLink="false">261015-3</guid></item>
<item><title>Tech Support &amp; Government Impersonation Scams Target Seniors</title><link>https://www.ic3.gov/PSA/2026/PSA261001</link><pubDate>Thu, 01 Oct 2026 09:00:00 -04:00</pubDate></item>
<item><title>Fraud with a bad link</title><link>http://example.com</link><pubDate>Thu, 01 Oct 2026 09:00:00 -04:00</pubDate></item>
</channel></rss>`;

describe("parseIc3Rss", () => {
  it("keeps consumer scam announcements with https links", () => {
    expect(parseIc3Rss(FEED)).toEqual([
      {
        source: "ic3",
        title: "Scammers Exploit 2026 U.S. Midterm Election to Perpetrate Multiple Fraud Schemes",
        url: "https://www.ic3.gov/PSA/2026/PSA261015-3",
        published_at: "2026-10-15T13:00:00.000Z",
      },
      {
        source: "ic3",
        title: "Tech Support & Government Impersonation Scams Target Seniors",
        url: "https://www.ic3.gov/PSA/2026/PSA261001",
        published_at: "2026-10-01T13:00:00.000Z",
      },
    ]);
  });

  it("filters out non-consumer announcements", () => {
    expect(isConsumerRelevant("Critical Vulnerability Alert: PHP Core")).toBe(false);
    expect(isConsumerRelevant("Cyber Threat Actors Use a Variety of Techniques to Target Election and Campaign Officials")).toBe(false);
    expect(isConsumerRelevant("FBI Warns of Grandparent Scams")).toBe(true);
  });

  it("tolerates junk", () => {
    expect(parseIc3Rss("not xml")).toEqual([]);
  });
});
