import { describe, expect, it } from "vitest";
import { createPrefsToken, verifyPrefsToken } from "./tokens";

const KEY = "test-secret";
const USER = "4f72442a-a044-4f24-b8a9-2bcb5428bd69";

describe("prefs tokens", () => {
  it("round-trips a user id", () => {
    expect(verifyPrefsToken(createPrefsToken(USER, KEY), KEY)).toBe(USER);
  });

  it("rejects tampered, foreign, or malformed tokens", () => {
    const token = createPrefsToken(USER, KEY);
    const other = createPrefsToken("00000000-0000-0000-0000-000000000000", KEY);
    expect(verifyPrefsToken(token, "other-secret")).toBeNull();
    expect(verifyPrefsToken(`${other.split(".")[0]}.${token.split(".")[1]}`, KEY)).toBeNull();
    expect(verifyPrefsToken(`${token}x`, KEY)).toBeNull();
    expect(verifyPrefsToken(`${token}.extra`, KEY)).toBeNull();
    expect(verifyPrefsToken("", KEY)).toBeNull();
    expect(verifyPrefsToken(null, KEY)).toBeNull();
  });
});
