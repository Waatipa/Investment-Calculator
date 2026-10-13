import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { EU_COMPANIES } from "./europe";
import { AF_COMPANIES } from "./africa";
import { ME_COMPANIES } from "./middle-east";
import { calculateShares, tradingDate, type InvestmentPoint } from "./investment";

const symbols = [...EU_COMPANIES, ...AF_COMPANIES, ...ME_COMPANIES].map(c => c.symbol);
const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine(v => {
  const d = new Date(`${v}T00:00:00Z`);
  return Number.isFinite(d.getTime()) && d.toISOString().slice(0, 10) === v;
}, "Enter a valid date.");
const symbol = z.string().refine(v => symbols.includes(v as typeof symbols[number]), "Unsupported company.");
type Chart = { timestamp?: number[]; meta?: { currency?: string; exchangeTimezoneName?: string; regularMarketPrice?: number; regularMarketTime?: number; regularMarketDayHigh?: number; marketState?: string }; indicators?: { quote?: { close?: (number | null)[]; high?: (number | null)[] }[] } };
const valid = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v) && v > 0;
async function history(symbol: string, start: string, end: string) {
  if (start < "1970-01-01" || start > end) throw new Error("Choose a valid investment period from 1970 onwards.");
  const from = Date.parse(`${start}T00:00:00Z`) / 1000 - 86400;
  const to = Date.parse(`${end}T00:00:00Z`) / 1000 + 2 * 86400;
  let r: Chart | undefined;
  try {
    const response = await fetch(`https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?period1=${from}&period2=${to}&interval=1d`, { headers: { "User-Agent": "Mozilla/5.0", Accept: "application/json" }, signal: AbortSignal.timeout(15000) });
    if (!response.ok) throw new Error("Provider unavailable");
    const body: { chart?: { result?: Chart[] } } = await response.json();
    r = body.chart?.result?.[0];
  } catch { throw new Error("Source prices are unavailable for this company. Try again or choose another company; no estimated prices are used."); }
  const timeZone = r?.meta?.exchangeTimezoneName;
  const rawCurrency = r?.meta?.currency;
  if (!r || !timeZone || !rawCurrency) throw new Error("Verified price history and currency are unavailable for this listing.");
  const divisor = rawCurrency === "ZAc" || rawCurrency === "GBp" || rawCurrency === "GBX" ? 100 : 1;
  const currency = rawCurrency === "ZAc" ? "ZAR" : rawCurrency === "GBp" || rawCurrency === "GBX" ? "GBP" : rawCurrency;
  const today = tradingDate(Date.now(), timeZone);
  if (start > today) throw new Error("The investment date cannot be in the future.");
  const q = r.indicators?.quote?.[0];
  const points: InvestmentPoint[] = (r.timestamp ?? []).flatMap((t, i) => {
    const c = q?.close?.[i], h = q?.high?.[i];
    return valid(c) ? [{ t: t * 1000, c: c / divisor, h: valid(h) ? h / divisor : null }] : [];
  });
  const liveTime = r.meta?.regularMarketTime;
  const livePrice = r.meta?.regularMarketPrice;
  // For today's valuation, use the actual latest regular-session trade, never a simulated tick.
  if (end === today && valid(liveTime) && valid(livePrice) && tradingDate(liveTime * 1000, timeZone) === today) {
    const todayPoint = points.find(p => tradingDate(p.t, timeZone) === today);
    const high = r.meta?.regularMarketDayHigh;
    const live = { t: liveTime * 1000, c: livePrice / divisor, h: valid(high) ? high / divisor : todayPoint?.h ?? null };
    if (todayPoint) Object.assign(todayPoint, live); else points.push(live);
  }
  return { points, currency, timeZone, today, sourceUrl: `https://finance.yahoo.com/quote/${encodeURIComponent(symbol)}/history/` };
}
export const getRegionalPurchasePrice = createServerFn({ method: "GET" })
  .inputValidator(d => z.object({ symbol, date }).parse(d))
  .handler(async ({ data }) => {
    const end = new Date(Date.parse(`${data.date}T00:00:00Z`) + 14 * 86400_000).toISOString().slice(0, 10);
    const h = await history(data.symbol, data.date, end);
    const p = h.points.filter(p => tradingDate(p.t, h.timeZone) >= data.date && tradingDate(p.t, h.timeZone) <= h.today).sort((a, b) => a.t - b.t)[0];
    if (!p) throw new Error("No trading price is available on or shortly after that date.");
    return { price: p.c, date: tradingDate(p.t, h.timeZone), currency: h.currency, sourceUrl: h.sourceUrl };
  });
export const getRegionalInvestmentResult = createServerFn({ method: "GET" })
  .inputValidator(d => z.object({ symbol, startDate: date, endDate: date, shares: z.number().finite().positive().optional(), amount: z.number().finite().positive().optional() }).refine(d => d.shares != null || d.amount != null, "Enter shares or an investment amount.").parse(d))
  .handler(async ({ data }) => {
    const h = await history(data.symbol, data.startDate, data.endDate);
    if (data.endDate > h.today) throw new Error("The valuation date cannot be in the future.");
    const baseline = calculateShares(h.points, data.startDate, data.endDate, 1, h.timeZone);
    const shares = data.amount != null ? data.amount / baseline.purchasePrice : data.shares ?? 0;
    return { ...calculateShares(h.points, data.startDate, data.endDate, shares, h.timeZone), currency: h.currency, timeZone: h.timeZone, sourceUrl: h.sourceUrl, asOf: Math.max(...h.points.filter(p => tradingDate(p.t, h.timeZone) <= data.endDate).map(p => p.t)), usesLatestPrice: data.endDate === h.today };
  });