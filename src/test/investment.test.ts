import { describe, expect, it } from "vitest";
import { calculateShares, latestSessionPrice, longDate } from "@/lib/investment";
const points = [{ t: Date.parse("2025-01-03T21:00Z"), c: 100 }, { t: Date.parse("2025-01-06T21:00Z"), c: 120 }, { t: Date.parse("2025-01-07T21:00Z"), c: 90 }];
describe("Date and shares calculator", () => {
  it("calculates profit and uses actual trading days for weekends", () => {
    expect(calculateShares(points, "2025-01-02", "2025-01-05", 10)).toMatchObject({ invested: 1000, value: 1000, purchaseDate: "2025-01-03", valuationDate: "2025-01-03" });
    expect(calculateShares(points, "2025-01-03", "2025-01-06", 10)).toMatchObject({ profit: 200, roi: 20 });
  });
  it("supports losses and fractional shares", () => { expect(calculateShares(points, "2025-01-03", "2025-01-07", 0.5)).toMatchObject({ profit: -5, roi: -10 }); });
  it("uses exchange-local trading dates rather than US dates for regional stocks", () => {
    const regional = [{ t: Date.parse("2025-01-06T01:00Z"), c: 10, h: 12 }, { t: Date.parse("2025-01-07T01:00Z"), c: 15, h: 16 }];
    expect(calculateShares(regional, "2025-01-06", "2025-01-07", 10, "Asia/Dubai")).toMatchObject({ purchaseDate: "2025-01-06", valuationDate: "2025-01-07", profit: 50, maxProfit: 60 });
  });
  it("shows trading dates as day, full month and year", () => {
    expect(longDate("2022-01-11")).toBe("11 January 2022");
    expect(longDate("2026-10-08")).toBe("8 October 2026");
  });
  it("rejects invalid shares, reversed dates and dates without observations", () => {
    expect(() => calculateShares(points, "2025-01-03", "2025-01-07", 0)).toThrow();
    expect(() => calculateShares(points, "2025-01-07", "2025-01-03", 10)).toThrow();
    expect(() => calculateShares(points, "2025-01-04", "2025-01-05", 10)).toThrow();
  });
  it("extracts only source observations inside extended sessions", () => {
    expect(latestSessionPrice([1, 2, 3, 4, 5], [10, null, 12, 15, 99], [{ start: 1, end: 4 }])).toEqual({ price: 12, time: 3000 });
    expect(latestSessionPrice([1], [null], [{ start: 1, end: 4 }])).toBeNull();
  });
});
