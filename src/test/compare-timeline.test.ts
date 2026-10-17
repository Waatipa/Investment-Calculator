import { describe, expect, it } from "vitest";
import { pointAtDate, estimatedCapitalization } from "@/lib/compare-timeline";
const points = [{ t: 1, date: "2026-10-15", c: 100, h: 101, l: 99 }, { t: 2, date: "2026-10-19", c: 110, h: 111, l: 109 }];
describe("Synchronized comparison dates", () => {
  it("uses the previous real close across a market holiday", () => { expect(pointAtDate(points, "2026-10-17")?.c).toBe(100); });
  it("does not show future source figures before a listing trades", () => { expect(pointAtDate(points, "2026-10-14")).toBeNull(); });
  it("keeps missing share counts unavailable instead of inventing capitalization", () => { expect(estimatedCapitalization(100, null)).toBeNull(); expect(estimatedCapitalization(100, 20)).toBe(2000); });
});