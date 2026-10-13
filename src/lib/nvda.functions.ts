import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { calculateShares, tradingDate } from "./investment";

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
  postMarketPrice: number | null; postMarketTime: number | null;
  marketCap: number | null; preMarketPrice: number | null; preMarketTime: number | null;
};

export const getMarketQuotes = createServerFn({ method: "GET" }).handler(async (): Promise<MarketQuote[]> => {
  const symbols = ["NVDA", "AAPL", "MSFT", "AMZN", "GOOGL", "META", "TSLA"] as const;
  const { fetchCompanyQuotes } = await import("./market-quotes.server");
  const quotes = await fetchCompanyQuotes().catch(() => []);
  const positive = (value: unknown) => typeof value === "number" && Number.isFinite(value) && value > 0 ? value : null;
  return symbols.map(symbol => {
    const quote = quotes.find(q => q['symbol'] === symbol);
    const usdQuote = quote?.['currency'] === "USD" ? quote : undefined;
    const time = positive(usdQuote?.['regularMarketTime']);
    const preTime = positive(usdQuote?.['preMarketTime']);
    const postTime = positive(usdQuote?.['postMarketTime']);
    return { symbol, postMarketPrice: postTime != null ? positive(usdQuote?.['postMarketPrice']) : null, postMarketTime: postTime == null ? null : postTime * 1000, price: positive(usdQuote?.['regularMarketPrice']), time: time == null ? null : time * 1000, opening: positive(usdQuote?.['regularMarketOpen']), previousClose: positive(usdQuote?.['regularMarketPreviousClose']), marketOpen: usdQuote?.['marketState'] === "REGULAR", marketCap: positive(usdQuote?.['marketCap']), preMarketPrice: preTime != null ? positive(usdQuote?.['preMarketPrice']) : null, preMarketTime: preTime == null ? null : preTime * 1000 };
  });
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
    const highs: (number | null)[] = r?.indicators?.quote?.[0]?.high ?? [];
    const points = timestamps.flatMap((t, i) => {
      const c = closes[i];
      return c != null && Number.isFinite(c) && c > 0 ? [{ t: t * 1000, c, h: highs[i] ?? null }] : [];
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

export type RegionalQuote = MarketQuote & { currency: string | null };
const ME_SYMBOLS = ["2222.SR", "IHC.AD", "1120.SR", "TAQA.AD", "1211.SR", "ADNOCGAS.AD", "1180.SR", "7010.SR", "FAB.AD", "EMIRATESNBD.AE"] as const;
const EU_SYMBOLS = ["ASML.AS", "MC.PA", "SAP.DE", "NESN.SW", "NOVO-B.CO", "RO.SW", "AZN.L", "HSBA.L"] as const;
const AF_SYMBOLS = ["NPN.JO", "FSR.JO", "SBK.JO", "CPI.JO", "GFI.JO", "ATW.CS", "MTN.JO", "DANGCEM.LG"] as const;
const regionalQuotes = async (symbols: readonly string[]): Promise<RegionalQuote[]> => {
  const { fetchCompanyQuotes } = await import("./market-quotes.server");
  const quotes = await fetchCompanyQuotes(symbols.join(",")).catch(() => []);
  const positive = (value: unknown) => typeof value === "number" && Number.isFinite(value) && value > 0 ? value : null;
  return symbols.map(symbol => {
    const q = quotes.find(x => x['symbol'] === symbol);
    const time = positive(q?.['regularMarketTime']);
    return { symbol, currency: typeof q?.['currency'] === "string" ? q['currency'] as string : null, price: positive(q?.['regularMarketPrice']), time: time == null ? null : time * 1000, opening: positive(q?.['regularMarketOpen']), previousClose: positive(q?.['regularMarketPreviousClose']), marketOpen: q?.['marketState'] === "REGULAR", marketCap: positive(q?.['marketCap']), postMarketPrice: null, postMarketTime: null, preMarketPrice: null, preMarketTime: null };
  });
};
export const getMiddleEastQuotes = createServerFn({ method: "GET" }).handler(() => regionalQuotes(ME_SYMBOLS));
export const getEuropeQuotes = createServerFn({ method: "GET" }).handler(() => regionalQuotes(EU_SYMBOLS));
export const getAfricaQuotes = createServerFn({ method: "GET" }).handler(() => regionalQuotes(AF_SYMBOLS));
