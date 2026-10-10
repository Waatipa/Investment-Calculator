import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { calculateShares, latestSessionPrice, tradingDate } from "./investment";

export type NvdaData = {
  points: { t: number; p: number; c: number; o: number | null; h: number | null; l: number | null }[];
  livePrice: number;
  liveTime: number;
  fetchedAt: number;
  openingPrice: number | null;
  previousClose: number | null;
  marketOpen: boolean;
};

export const getMarketHistory = createServerFn({ method: "GET" })
 .inputValidator((input) => z.object({
   symbol: z.enum(["NVDA", "AAPL", "MSFT", "AMZN", "GOOGL", "META", "TSLA"]),
   range: z.enum(["1d", "5d", "1mo", "6mo", "1y", "5y"]),
 }).parse(input))
 .handler(async ({ data }): Promise<NvdaData> => fetchHistory(data));

async function fetchHistory(data: { symbol: string; range: string }): Promise<NvdaData> {
   const interval = data.range === "1d" ? "5m" : data.range === "5d" ? "30m" : "1d";
  const res = await fetch(
    `https://query1.finance.yahoo.com/v8/finance/chart/${data.symbol}?range=${data.range}&interval=${interval}&includeAdjustedClose=true`,
    { headers: { "User-Agent": "Mozilla/5.0", Accept: "application/json" }, signal: AbortSignal.timeout(15000) },
  );
  if (!res.ok) throw new Error(`Market data request failed (${res.status})`);
  const json: any = await res.json();
  const r = json?.chart?.result?.[0];
  if (!r) throw new Error("No market data returned");
  const ts: number[] = r.timestamp ?? [];
  const adj: (number | null)[] = r.indicators?.adjclose?.[0]?.adjclose ?? [];
  const close: (number | null)[] = r.indicators?.quote?.[0]?.close ?? [];
  const points: NvdaData["points"] = [];
  for (let i = 0; i < ts.length; i++) {
    const p = interval === "1d" ? adj[i] : close[i];
    const c = close[i];
    const t = ts[i];
    if (t == null || p == null || c == null || !isFinite(p) || p <= 0) continue;
    const quote = r.indicators?.quote?.[0];
    const valid = (v: unknown): number | null => typeof v === "number" && Number.isFinite(v) && v > 0 ? v : null;
    points.push({ t: t * 1000, p, c, o: valid(quote?.open?.[i]), h: valid(quote?.high?.[i]), l: valid(quote?.low?.[i]) });
  }
  if (!points.length) throw new Error("Price history is currently unavailable. Please try again.");
   const currentPrice = r.meta?.regularMarketPrice;
   const currentTime = r.meta?.regularMarketTime;
   const finalPoint = points[points.length - 1];
   if (interval !== "1d" && finalPoint && typeof currentPrice === "number" && currentPrice > 0 && typeof currentTime === "number" && currentTime * 1000 > finalPoint.t) {
      points.push({ t: currentTime * 1000, p: currentPrice, c: currentPrice, o: null, h: null, l: null });
   }
   const regular = r.meta?.currentTradingPeriod?.regular;
   const openingIndex = ts.findIndex((t) => regular?.start != null && t >= regular.start);
   const opening = r.indicators?.quote?.[0]?.open?.[openingIndex >= 0 ? openingIndex : ts.length - 1];
  return {
    points,
    livePrice: r.meta?.regularMarketPrice ?? points[points.length - 1]?.c ?? 0,
    liveTime: (r.meta?.regularMarketTime ?? 0) * 1000,
    fetchedAt: Date.now(),
     openingPrice: typeof opening === "number" && Number.isFinite(opening) ? opening : null,
     previousClose: r.meta?.chartPreviousClose ?? r.meta?.previousClose ?? null,
     marketOpen: regular?.start != null && Date.now() >= regular.start * 1000 && Date.now() < regular.end * 1000,
  };
}

export type MarketQuote = {
  symbol: string; price: number | null; time: number | null; opening: number | null; previousClose: number | null; marketOpen: boolean;
  preMarketPrice: number | null; preMarketTime: number | null; postMarketPrice: number | null; postMarketTime: number | null;
};

export const getMarketQuotes = createServerFn({ method: "GET" }).handler(async (): Promise<MarketQuote[]> => {
  const symbols = ["NVDA", "AAPL", "MSFT", "AMZN", "GOOGL", "META", "TSLA"] as const;
  return Promise.all(symbols.map(async (symbol): Promise<MarketQuote> => {
    try {
      const response = await fetch(`https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?range=5d&interval=5m&includePrePost=true`, { headers: { "User-Agent": "Mozilla/5.0", Accept: "application/json" }, signal: AbortSignal.timeout(15000) });
      if (!response.ok) throw new Error("Quotes unavailable");
      const json: any = await response.json();
      const r = json?.chart?.result?.[0];
      if (!r) throw new Error("Quotes unavailable");
      const meta = r.meta;
      const timestamps: number[] = r.timestamp ?? [];
      const closes: (number | null)[] = r.indicators?.quote?.[0]?.close ?? [];
      const periods = (session: "pre" | "post") => {
        const observed = meta.tradingPeriods?.[session]?.flat() ?? [];
        return observed.length ? observed : meta.currentTradingPeriod?.[session] ? [meta.currentTradingPeriod[session]] : [];
      };
      const pre = latestSessionPrice(timestamps, closes, periods("pre"));
      const post = latestSessionPrice(timestamps, closes, periods("post"));
      const regular = meta.currentTradingPeriod?.regular;
      const openIndex = timestamps.findIndex(t => t >= regular?.start && t < regular?.end);
      const opening = openIndex >= 0 ? r.indicators?.quote?.[0]?.open?.[openIndex] : null;
      return { symbol, price: meta.regularMarketPrice ?? null, time: meta.regularMarketTime ? meta.regularMarketTime * 1000 : null, opening: opening ?? null, previousClose: meta.previousClose ?? meta.chartPreviousClose ?? null, marketOpen: regular?.start != null && Date.now() >= regular.start * 1000 && Date.now() < regular.end * 1000, preMarketPrice: pre?.price ?? null, preMarketTime: pre?.time ?? null, postMarketPrice: post?.price ?? null, postMarketTime: post?.time ?? null };
    } catch {
      return { symbol, price: null, time: null, opening: null, previousClose: null, marketOpen: false, preMarketPrice: null, preMarketTime: null, postMarketPrice: null, postMarketTime: null };
    }
  }));
});

const dateInput = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine(value => {
  const parsed = new Date(value + "T00:00:00Z");
  return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}, "Enter a valid date.");

export const getInvestmentResult = createServerFn({ method: "GET" })
  .inputValidator(input => z.object({ symbol: z.enum(["NVDA", "AAPL", "MSFT", "AMZN", "GOOGL", "META", "TSLA"]), startDate: dateInput, endDate: dateInput, shares: z.number().finite().positive() }).parse(input))
  .handler(async ({ data }) => {
    if (data.startDate > data.endDate) throw new Error("The valuation date must be on or after the investment date.");
    if (data.endDate > tradingDate(Date.now())) throw new Error("Choose a valuation date no later than today.");
    if (data.startDate < "1970-01-01") throw new Error("Choose an investment date from 1970 onwards.");
    const period1 = Math.floor(Date.parse(data.startDate + "T00:00:00Z") / 1000);
    const period2 = Math.floor(Date.parse(data.endDate + "T00:00:00Z") / 1000) + 86400;
    const response = await fetch(`https://query1.finance.yahoo.com/v8/finance/chart/${data.symbol}?period1=${period1}&period2=${period2}&interval=1d`, { headers: { "User-Agent": "Mozilla/5.0", Accept: "application/json" }, signal: AbortSignal.timeout(15000) });
    if (!response.ok) throw new Error("Historical prices are unavailable for these dates. Please try another period.");
    const json: any = await response.json();
    const r = json?.chart?.result?.[0];
    const timestamps: number[] = r?.timestamp ?? [];
    const closes: (number | null)[] = r?.indicators?.quote?.[0]?.close ?? [];
    const points = timestamps.flatMap((t, i) => {
      const c = closes[i];
      return c != null && Number.isFinite(c) && c > 0 ? [{ t: t * 1000, c }] : [];
    });
    return calculateShares(points, data.startDate, data.endDate, data.shares);
  });

export const getPriceOnDate = createServerFn({ method: "GET" })
  .inputValidator(input => z.object({ symbol: z.enum(["NVDA", "AAPL", "MSFT", "AMZN", "GOOGL", "META", "TSLA"]), date: dateInput }).parse(input))
  .handler(async ({ data }): Promise<number | null> => {
    const period1 = Math.floor(Date.parse(data.date + "T00:00:00Z") / 1000);
    const period2 = period1 + 86400 * 10;
    const response = await fetch(`https://query1.finance.yahoo.com/v8/finance/chart/${data.symbol}?period1=${period1}&period2=${period2}&interval=1d`, { headers: { "User-Agent": "Mozilla/5.0", Accept: "application/json" }, signal: AbortSignal.timeout(15000) });
    if (!response.ok) throw new Error("Historical prices are unavailable for this date. Please try another date.");
    const json: any = await response.json();
    const r = json?.chart?.result?.[0];
    const timestamps: number[] = r?.timestamp ?? [];
    const closes: (number | null)[] = r?.indicators?.quote?.[0]?.close ?? [];
    const eligible = timestamps.flatMap((t, i) => {
      const c = closes[i];
      return c != null && Number.isFinite(c) && c > 0 && tradingDate(t * 1000) >= data.date ? [c] : [];
    });
    return eligible.length ? eligible[0] ?? null : null;
  });
