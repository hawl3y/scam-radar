import { describe, expect, it } from "vitest";
import { renderDigestEmail, renderInstantEmail, type EmailCluster } from "./emails";

const cluster: EmailCluster = {
  cluster_id: "4f72442a-a044-4f24-b8a9-2bcb5428bd69",
  scam_type: "delivery",
  report_count: 2,
  corroboration_count: 1,
  distance_miles: 2.4,
  nearest_zip: "10960",
  latest_description: 'USPS: package on hold <script>alert("x")</script> pay at https://usps-fee.com now',
  latest_channel: "text",
};
const links = { siteUrl: "https://scam-radar.example", prefsUrl: "https://scam-radar.example/email-preferences?token=t", homeZip: "10989" };

describe("renderInstantEmail", () => {
  const email = renderInstantEmail(cluster, links);

  it("describes the crowd, not a verdict", () => {
    expect(email.subject).toBe("Scam alert near you: Package delivery");
    expect(email.text).toContain("Reported by 2 neighbors · 1 got this too");
    expect(email.text).not.toMatch(/confirmed/i);
  });

  it("escapes report text and defangs links", () => {
    expect(email.html).not.toContain("<script>");
    expect(email.html).toContain("&lt;script&gt;");
    expect(email.html).toContain("hxxps://usps-fee[.]com");
    expect(email.html).not.toContain("https://usps-fee.com");
  });

  it("links to the alert and preferences, never to sign-in", () => {
    expect(email.html).toContain(`https://scam-radar.example/alerts/${cluster.cluster_id}?zip=10989`);
    expect(email.text).toContain(links.prefsUrl);
    expect(email.html).not.toMatch(/\/login/);
    expect(email.text).toContain("2.4 mi away");
  });
});

describe("renderDigestEmail", () => {
  it("lists clusters and links to the rest", () => {
    const email = renderDigestEmail([cluster], 4, links);
    expect(email.subject).toBe("4 scams reported near you");
    expect(email.html).toContain("See all 4 in the app");
    expect(renderDigestEmail([cluster], 1, links).subject).toBe("1 scam reported near you");
  });
});
