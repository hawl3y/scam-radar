import { describe, expect, it } from "vitest";
import { aggregateDnc, bucketByDay, completeDays, daysToFetch, fromState, recordDay, shiftDate } from "./dnc";

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

  it("interleaves area codes newest day first, so one code can't starve the others", () => {
    const days = daysToFetch("2026-10-23", ["845", "201", "551"], [], 2, 1);
    expect(days).toEqual([
      { areaCode: "845", day: "2026-10-22" },
      { areaCode: "201", day: "2026-10-22" },
      { areaCode: "551", day: "2026-10-22" },
      { areaCode: "845", day: "2026-10-21" },
      { areaCode: "201", day: "2026-10-21" },
      { areaCode: "551", day: "2026-10-21" },
    ]);
  });
});


describe("per-state stream helpers", () => {
  const rec = (date: string, state = "New Jersey") => ({ attributes: { "created-date": date, "consumer-state": state } });

  it("reads days and skips malformed dates", () => {
    expect(recordDay(rec("2026-10-21 13:45:12"))).toBe("2026-10-21");
    expect(recordDay(rec("20261235"))).toBeNull();
    expect(recordDay(rec("11/14/2024"))).toBeNull();
  });

  it("keeps only the requested state and drops blank states", () => {
    const records = [rec("2026-10-21 01:00:00"), rec("2026-10-21 01:00:00", "New York"), rec("2026-10-21 01:00:00", "")];
    expect(fromState(records, "New Jersey")).toHaveLength(1);
  });

  it("buckets records by day within the window", () => {
    const byDay = bucketByDay(
      [rec("2026-10-22 09:00:00"), rec("2026-10-21 09:00:00"), rec("2026-10-21 08:00:00"), rec("2026-10-18 09:00:00")],
      "2026-10-20",
      "2026-10-22",
    );
    expect([...byDay.entries()].map(([d, r]) => [d, r.length])).toEqual([
      ["2026-10-22", 1],
      ["2026-10-21", 2],
    ]);
  });

  it("marks a day complete only once something older has been seen", () => {
    // Read down to 10-21: 10-22 and 10-23 are complete, 10-21 might continue on the next page.
    expect(completeDays("2026-10-20", "2026-10-23", "2026-10-21", false)).toEqual(["2026-10-23", "2026-10-22"]);
    expect(completeDays("2026-10-20", "2026-10-23", "2026-10-19", false)).toEqual([
      "2026-10-23", "2026-10-22", "2026-10-21", "2026-10-20",
    ]);
    expect(completeDays("2026-10-20", "2026-10-21", null, true)).toEqual(["2026-10-21", "2026-10-20"]);
    expect(completeDays("2026-10-20", "2026-10-21", null, false)).toEqual([]);
  });
});
