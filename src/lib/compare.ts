// Browser-safe company catalogue and pure comparison maths for the Compare Stocks journey.
import { COMPANIES } from "./markets";
import { EU_COMPANIES } from "./europe";
import { AF_COMPANIES } from "./africa";
import { ME_COMPANIES } from "./middle-east";

export type CompareRegion = "US" | "Europe" | "Africa" | "Middle East";
export type CompareCompany = { symbol: string; name: string; short: string; initials: string; region: CompareRegion };
const shortOf = (s: string) => s.replace(/\.[A-Z]+$/, "").replace(/-B$/, "");
export const COMPARE_COMPANIES: CompareCompany[] = [
  ...COMPANIES.map(c => ({ symbol: c.symbol, name: c.name, short: c.symbol, initials: c.symbol.slice(0, 2), region: "US" as const })),
  ...EU_COMPANIES.map(c => ({ symbol: c.symbol, name: c.name, short: shortOf(c.symbol), initials: c.initials, region: "Europe" as const })),
  ...AF_COMPANIES.map(c => ({ symbol: c.symbol, name: c.name, short: shortOf(c.symbol), initials: c.initials, region: "Africa" as const })),
  ...ME_COMPANIES.map(c => ({ symbol: c.symbol, name: c.name, short: shortOf(c.symbol), initials: c.initials, region: "Middle East" as const })),
];
export const COMPARE_SYMBOLS = COMPARE_COMPANIES.map(c => c.symbol);
export const MAX_FREE_COMPARE = 4;

/** One daily observation already converted to USD. */
export type UsdPoint = { t: number; date: string; c: number; h: number; l: number };

export function compareMetrics(points: UsdPoint[], amount: number) {
  if (!(amount > 0)) throw new Error("Enter an amount greater than zero.");
  const first = points[0], last = points[points.length - 1];
  if (!first || !last) throw new Error("No trading prices between these dates.");
  const shares = amount / first.c;
  const value = shares * last.c;
  const profit = value - amount;
  // Best case: buy at the period's lowest traded price, sell at the highest price on or after that day.
  let low = first;
  for (const p of points) if (p.l < low.l) low = p;
  let peak = low;
  for (const p of points) if (p.t >= low.t && p.h > peak.h) peak = p;
  const bestBuy = low.l, bestSell = Math.max(peak.h, low.l);
  const bestValue = amount / bestBuy * bestSell;
  // Hypothetical peak of the actual holding (bought on the investment date).
  let holdPeak = first;
  for (const p of points) if (p.h > holdPeak.h) holdPeak = p;
  return {
    shares, buyPrice: first.c, buyDate: first.date, sellPrice: last.c, sellDate: last.date, value, profit, returnPct: profit / amount * 100,
    bestBuy, bestBuyDate: low.date, bestSell, bestSellDate: peak.date, bestValue, bestReturnPct: (bestValue - amount) / amount * 100,
    peakValue: shares * holdPeak.h, peakT: holdPeak.t,
  };
}
