import { describe, expect, it } from "vitest";
import { defang } from "./links";

describe("defang", () => {
  it("defangs URLs and bare domains", () => {
    expect(defang("Go to https://usps-redeliver.com/track.php now")).toBe(
      "Go to hxxps://usps-redeliver[.]com/track.php now",
    );
    expect(defang("http://a.b.example.net")).toBe("hxxp://a[.]b[.]example[.]net");
    expect(defang("visit www.paypa1-login.net.")).toBe("visit www[.]paypa1-login[.]net.");
    expect(defang("text said bit.ly/3xYz9")).toBe("text said bit[.]ly/3xYz9");
  });

  it("leaves ordinary text alone", () => {
    const text = "It cost $3.50 at 10 a.m. on Main St. [phone] [email]";
    expect(defang(text)).toBe(text);
  });
});
