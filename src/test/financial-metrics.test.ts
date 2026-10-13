import { describe, expect, it } from "vitest";
import { FINANCIAL_METRICS, calculateMetric } from "@/lib/financial-metrics";

describe("Financial metric calculations", () => {
  it("offers the 21 financial metrics plus the separate profit calculator", () => expect(FINANCIAL_METRICS).toHaveLength(21));
  it("calculates EPS with consistent millions and deducts preferred dividends", () => {
    const metric = FINANCIAL_METRICS.find(m => m.id === "eps");
    if (!metric) throw new Error("Missing EPS");
    expect(calculateMetric(metric, { price: "230", income: "112000", preferred: "0", shares: "15000", prior: "6.6" }).value).toBeCloseTo(7.4666667);
    expect(() => calculateMetric(metric, { price: "230", income: "112000", preferred: "0", shares: "0" })).toThrow(/denominator/);
    expect(() => calculateMetric(metric, { price: "230", income: "", preferred: "0", shares: "15000" })).toThrow(/valid/);
  });
  it("rejects non-positive earnings for a meaningful P/E", () => {
    const metric = FINANCIAL_METRICS.find(m => m.id === "pe");
    if (!metric) throw new Error("Missing P/E");
    expect(calculateMetric(metric, { price: "200", eps: "10" }).value).toBe(20);
    expect(() => calculateMetric(metric, { price: "200", eps: "-10" })).toThrow();
  });
  it("converts FCF from millions to USD and validates DCF assumptions", () => {
    const fcf = FINANCIAL_METRICS.find(m => m.id === "fcf");
    const dcf = FINANCIAL_METRICS.find(m => m.id === "dcf");
    if (!fcf || !dcf) throw new Error("Missing metric");
    expect(calculateMetric(fcf, { cash: "200", capex: "50" }).value).toBe(150e6);
    expect(() => calculateMetric(dcf, { fcf: "100", growth: "5", years: "10", discount: "3", terminal: "4", debt: "0", shares: "10" })).toThrow(/discount/);
  });
});