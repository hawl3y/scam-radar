import { describe, expect, it } from "vitest";
import { STATE_NAMES, stateCodeFromName, stateName } from "./states";

describe("states", () => {
  it("covers 50 states, DC, and Puerto Rico", () => {
    expect(Object.keys(STATE_NAMES)).toHaveLength(52);
  });

  it("maps FTC full names to codes and back", () => {
    expect(stateCodeFromName("New Jersey")).toBe("NJ");
    expect(stateCodeFromName(" new york ")).toBe("NY");
    expect(stateCodeFromName("")).toBeNull();
    expect(stateCodeFromName("Atlantis")).toBeNull();
    expect(stateName("NJ")).toBe("New Jersey");
  });
});
