import { describe, expect, it } from "vitest";
import { marketSession } from "@/lib/market-session";

const at = (s: string) => Date.parse(s);
describe("Eastern-time session replacements", () => {
  it("changes at 8 PM and 4 AM ET including daylight saving", () => {
    expect(marketSession(at("2026-10-13T00:00:00Z")).label).toBe("Pre-market");
    expect(marketSession(at("2026-10-12T23:59:59Z")).label).toBe("After-hours");
    expect(marketSession(at("2026-12-15T01:00:00Z")).label).toBe("Pre-market");
    expect(marketSession(at("2026-10-13T13:30:00Z")).label).toBe("After-hours");
  });
  it("uses today's sourced pre-market quote against the most recent regular close", () => {
    const now = at("2026-10-13T08:01:00Z");
    const quote = { price: 100, previousClose: 95, time: at("2026-10-12T20:00:00Z"), preMarketPrice: 102, preMarketTime: at("2026-10-13T08:00:00Z") };
    expect(marketSession(now, quote)).toMatchObject({ price: 102, change: 2, percent: 2 });
    expect(marketSession(now, { ...quote, preMarketPrice: 98 })).toMatchObject({ change: -2, percent: -2 });
    expect(marketSession(now, { ...quote, preMarketPrice: 100 })).toMatchObject({ change: 0, percent: 0 });
    expect(marketSession(now, { ...quote, preMarketTime: at("2026-10-12T08:00:00Z") }).price).toBeNull();
    expect(marketSession(at("2026-10-13T07:59:59Z"), quote).price).toBeNull();
    expect(marketSession(at("2026-10-17T08:01:00Z"), quote).price).toBeNull();
  });
});