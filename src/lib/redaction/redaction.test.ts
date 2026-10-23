import { describe, expect, it } from "vitest";
import { redact } from "./index";

const r = (s: string) => redact(s).text;

describe("redact: contact details", () => {
  it("redacts emails", () => {
    expect(r("Reply to jane.doe+1@gmail.com now")).toBe("Reply to [email] now");
  });

  it("redacts US phone formats", () => {
    for (const phone of ["(555) 123-4567", "555-123-4567", "555.123.4567", "5551234567", "+1 555 123 4567", "1-555-123-4567"]) {
      expect(r(`Call ${phone} today`)).toBe("Call [phone] today");
    }
  });

  it("redacts international numbers", () => {
    expect(r("WhatsApp me at +44 7911 123456")).toBe("WhatsApp me at [phone]");
  });
});

describe("redact: financial and ID numbers", () => {
  it("redacts card numbers that pass the Luhn check", () => {
    expect(r("Card 4111 1111 1111 1111 was charged")).toBe("Card [card number] was charged");
    expect(r("Card 4111-1111-1111-1111")).toBe("Card [card number]");
  });

  it("redacts SSNs", () => {
    expect(r("Confirm your SSN 123-45-6789")).toBe("Confirm your SSN [SSN]");
  });

  it("redacts account numbers after keywords, including last-4", () => {
    expect(r("Your account ending in 4821 is locked")).toBe("Your account ending in [account number] is locked");
    expect(r("Routing number: 021000021")).toBe("Routing number: [account number]");
    expect(r("Order #8812")).toBe("Order #[account number]");
  });

  it("redacts masked numbers and long digit runs", () => {
    expect(r("Charge on ****1234")).toBe("Charge on [account number]");
    expect(r("Reference 99887766554")).toBe("Reference [account number]");
    expect(r("ID 99887766554 needed")).toBe("ID [account number] needed");
  });

  it("redacts verification codes", () => {
    expect(r("They asked for my verification code 482913")).toBe("They asked for my verification code [code]");
    expect(r("Your code is 5521")).toBe("Your code is [code]");
  });
});

describe("redact: addresses", () => {
  it("redacts street addresses", () => {
    expect(r("Came to 123 Main St yesterday")).toBe("Came to [address] yesterday");
    expect(r("Ship to 45 N. Oak Hill Road, Apt 2B please")).toBe("Ship to [address] please");
    expect(r("at 9 5th Ave")).toBe("at [address]");
  });

  it("redacts PO boxes", () => {
    expect(r("Mail it to PO Box 1234")).toBe("Mail it to [address]");
  });
});

describe("redact: names", () => {
  it("redacts names in common phrasings", () => {
    expect(r("He said my name is John Smith")).toBe("He said my name is [name]");
    expect(r("This is Officer Dave Miller from the sheriff")).toBe("This is Officer [name] from the sheriff");
    expect(r("Grandma, it's me, my grandson Michael is in jail")).toBe("Grandma, it's me, my grandson [name] is in jail");
    expect(r("Hi Linda, your package is waiting")).toBe("Hi [name], your package is waiting");
    expect(r("Ask for Mr. Patel")).toBe("Ask for Mr. [name]");
    expect(r("Your refund is ready.\nThanks,\nKevin")).toBe("Your refund is ready.\nThanks,\n[name]");
  });

  it("leaves greetings and brands that aren't names", () => {
    expect(r("Dear Customer, your account is on hold")).toBe("Dear Customer, your account is on hold");
    expect(r("Hi there, this is Amazon Support")).toBe("Hi there, this is Amazon Support");
    expect(r("Dear Valued Member")).toBe("Dear Valued Member");
  });
});

describe("redact: things to keep", () => {
  it("keeps links and domains, including digits inside them", () => {
    expect(r("Pay at https://usps-redeliver.com/track?id=5551234567 now")).toBe(
      "Pay at https://usps-redeliver.com/track?id=5551234567 now",
    );
    expect(r("Go to bit.ly/3xYz9 or www.paypa1-login.net.")).toBe("Go to bit.ly/3xYz9 or www.paypa1-login.net.");
  });

  it("keeps prices, dates, times, zips, and short codes", () => {
    const text = "They wanted $500 in gift cards by 10/23/2026 at 3:30pm. I live in 02139. Text came from 72345.";
    expect(r(text)).toBe(text);
  });

  it("keeps plain descriptions untouched", () => {
    const text = "A man knocked on my door saying he was from the water company and needed to check the pipes.";
    expect(redact(text)).toEqual({ text, found: {} });
  });
});

describe("redact: summary counts", () => {
  it("counts what was found", () => {
    const { found } = redact("Call 555-123-4567 or 555-987-6543, email a@b.co, my name is Jo Lee");
    expect(found).toEqual({ phone: 2, email: 1, name: 1 });
  });

  it("is idempotent", () => {
    const once = r("Call 555-123-4567, my name is John Smith, 12 Elm St");
    expect(r(once)).toBe(once);
  });
});
