import { describe, expect, it } from "vitest";
import { pointAtDate, estimatedCapitalization, portfolioTotals } from "@/lib/compare-timeline";
const points = [{ t: 1, date: "2026-10-15", c: 100, h: 101, l: 99 }, { t: 2, date: "2026-10-19", c: 110, h: 111, l: 109 }];
describe("Synchronized comparison dates", () => {
  it("uses the previous real close across a market holiday", () => { expect(pointAtDate(points, "2026-10-17")?.c).toBe(100); });
  it("does not show future source figures before a listing trades", () => { expect(pointAtDate(points, "2026-10-14")).toBeNull(); });
  it("keeps missing share counts unavailable instead of inventing capitalization", () => { expect(estimatedCapitalization(100, null)).toBeNull(); expect(estimatedCapitalization(100, 20)).toBe(2000); });
  it("sums invested capital across holdings", () => { expect(portfolioTotals([{ invested: 1000, value: 1200 }, { invested: 1000, value: 900 }]).invested).toBe(2000); });
  it("sums source-backed portfolio values", () => { expect(portfolioTotals([{ invested: 1000, value: 1200 }, { invested: 1000, value: 900 }]).value).toBe(2100); });
  it("calculates combined profit rather than summing percentages", () => { expect(portfolioTotals([{ invested: 1000, value: 1200 }, { invested: 1000, value: 900 }]).profit).toBe(100); });
  it("calculates overall percentage return on total invested", () => { expect(portfolioTotals([{ invested: 1000, value: 1200 }, { invested: 1000, value: 900 }]).returnPct).toBe(5); });
  it("shows losses and keeps an unavailable return unknown", () => { expect(portfolioTotals([{ invested: 1000, value: 800 }]).returnPct).toBe(-20); expect(portfolioTotals([]).returnPct).toBeNull(); });
});