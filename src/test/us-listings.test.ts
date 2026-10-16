import { describe, expect, it } from "vitest";
import { US_SYMBOLS, isListingObservation, requireListingDate } from "@/lib/us-listings";
import { COMPANIES } from "@/lib/markets";

describe("SpaceX listing identity", () => {
  it("includes SpaceX in the US catalogue and price allowlist", () => {
    expect(COMPANIES.find(c => c.symbol === "SPCX")?.name).toBe("SpaceX");
    expect(US_SYMBOLS).toContain("SPCX");
  });
  it("excludes the previous SPCX security before SpaceX's listing", () => {
    expect(isListingObservation("SPCX", Date.parse("2026-06-11T20:00:00Z"))).toBe(false);
    expect(isListingObservation("SPCX", Date.parse("2026-06-12T13:30:00Z"))).toBe(true);
  });
  it("blocks investment dates before SpaceX began trading", () => {
    expect(() => requireListingDate("SPCX", "2026-06-11")).toThrow("12 June 2026");
    expect(() => requireListingDate("SPCX", "2026-06-12")).not.toThrow();
    expect(() => requireListingDate("AAPL", "2020-01-01")).not.toThrow();
  });
});