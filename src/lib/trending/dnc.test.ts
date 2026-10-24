import { describe, expect, it } from "vitest";
import { aggregateDnc, daysToFetch, shiftDate } from "./dnc";

describe("aggregateDnc", () => {
  const records = [
    { attributes: { subject: "Computer  & technical support", "recorded-message-or-robocall": "Y", "company-phone-number": "8005551234", "consumer-city": "Nyack" } },
    { attributes: { subject: "Computer & technical support", "recorded-message-or-robocall": "Y", "company-phone-number": "8005550000" } },
    { attributes: { subject: "Computer & technical support", "recorded-message-or-robocall": "N" } },
    { attributes: { subject: "", "recorded-message-or-robocall": "" } },
  ];

  it("counts by normalized subject and robocall flag", () => {
    expect(aggregateDnc(records)).toEqual([
      { subject: "Computer & technical support", robocall: true, complaints: 2 },
      { subject: "Computer & technical support", robocall: false, complaints: 1 },
      { subject: "No Subject Provided", robocall: false, complaints: 1 },
    ]);
  });

  it("never carries phone numbers or cities forward", () => {
    const json = JSON.stringify(aggregateDnc(records));
    expect(json).not.toMatch(/800555|Nyack|phone|city/i);
  });
});

describe("daysToFetch", () => {
  it("shifts calendar dates across months", () => {
    expect(shiftDate("2026-11-01", 1)).toBe("2026-10-31");
  });

  it("fetches missing days and always refreshes the last two", () => {
    const ingested = [
      { area_code: "845", day: "2026-10-22" },
      { area_code: "845", day: "2026-10-21" },
      { area_code: "845", day: "2026-10-20" },
    ];
    const days = daysToFetch("2026-10-23", ["845"], ingested, 4, 2).map((d) => d.day);
    // Window: 10-22, 10-21 (refresh), 10-20 (have), 10-19 (missing).
    expect(days).toEqual(["2026-10-22", "2026-10-21", "2026-10-19"]);
  });

  it("handles several area codes independently", () => {
    const days = daysToFetch("2026-10-23", ["845", "914"], [], 2, 1);
    expect(days).toEqual([
      { areaCode: "845", day: "2026-10-22" },
      { areaCode: "845", day: "2026-10-21" },
      { areaCode: "914", day: "2026-10-22" },
      { areaCode: "914", day: "2026-10-21" },
    ]);
  });
});
