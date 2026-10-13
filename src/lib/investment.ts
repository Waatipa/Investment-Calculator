export type InvestmentPoint = { t: number; c: number; h?: number | null };
export const tradingDate = (t: number, timeZone = "America/New_York") => new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(t));
// Display an ISO trading date as "11 January 2022".
export const longDate = (iso: string) => /^\d{4}-\d{2}-\d{2}$/.test(iso)
  ? new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(`${iso}T12:00:00Z`))
  : iso;

export function calculateShares(points: InvestmentPoint[], startDate: string, endDate: string, shares: number, timeZone = "America/New_York") {
  if (!Number.isFinite(shares) || shares <= 0) throw new Error("Enter a number of shares greater than zero.");
  if (startDate > endDate) throw new Error("The valuation date must be on or after the investment date.");
  const eligible = points.filter(p => tradingDate(p.t, timeZone) >= startDate && tradingDate(p.t, timeZone) <= endDate && Number.isFinite(p.c) && p.c > 0).sort((a, b) => a.t - b.t);
  const first = eligible[0];
  const last = eligible[eligible.length - 1];
  if (!first || !last) throw new Error("No trading prices are available between these dates. Choose a period containing a trading day.");
  const invested = shares * first.c;
  const value = shares * last.c;
  const profit = value - invested;
  // Highest actual traded price (daily high, falling back to close when the source omits a high).
  let peak = { price: first.c, t: first.t };
  for (const p of eligible) {
    const price = p.h != null && Number.isFinite(p.h) && p.h > 0 ? Math.max(p.h, p.c) : p.c;
    if (price > peak.price) peak = { price, t: p.t };
  }
  const maxValue = shares * peak.price;
  const maxProfit = maxValue - invested;
  return { shares, invested, value, profit, roi: profit / invested * 100, purchasePrice: first.c, endPrice: last.c, purchaseDate: tradingDate(first.t, timeZone), valuationDate: tradingDate(last.t, timeZone),
    maxPrice: peak.price, maxDate: tradingDate(peak.t, timeZone), maxValue, maxProfit, maxRoi: maxProfit / invested * 100 };
}

export function latestSessionPrice(timestamps: number[], closes: (number | null)[], periods: { start: number; end: number }[]) {
  let latest: { price: number; time: number } | null = null;
  for (let i = 0; i < timestamps.length; i++) {
    const t = timestamps[i];
    const price = closes[i];
    if (t == null || price == null || !Number.isFinite(price) || price <= 0 || !periods.some(p => t >= p.start && t < p.end)) continue;
    if (!latest || t * 1000 > latest.time) latest = { price, time: t * 1000 };
  }
  return latest;
}
