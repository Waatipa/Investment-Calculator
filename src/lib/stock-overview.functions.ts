import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { AF_SYMBOLS, EU_SYMBOLS, ME_SYMBOLS } from "./nvda.functions";
import { US_SYMBOLS, isListingObservation } from "./us-listings";

const SYMBOLS = [...US_SYMBOLS, ...ME_SYMBOLS, ...EU_SYMBOLS, ...AF_SYMBOLS] as string[];
export const OVERVIEW_RANGES = ["30m", "1h", "1d", "5d", "1mo", "3mo", "6mo", "1y", "5y", "max"] as const;
export type OverviewRange = typeof OVERVIEW_RANGES[number];
const sym = z.string().refine(s => SYMBOLS.includes(s), "Unsupported company.");

type Raw = Record<string, unknown>;
const num = (v: unknown) => {
  const x = v && typeof v === "object" && "raw" in v ? (v as { raw: unknown }).raw : v;
  return typeof x === "number" && Number.isFinite(x) ? x : null;
};
const pos = (v: unknown) => { const n = num(v); return n != null && n > 0 ? n : null; };
const str = (v: unknown) => typeof v === "string" && v.trim() ? v.trim() : null;

export type Session = { price: number; change: number; percent: number; time: number | null } | null;
export type StockOverview = {
  symbol: string; name: string; exchange: string | null; sector: string | null; industry: string | null; currency: string | null;
  price: number | null; change: number | null; percent: number | null; time: number | null; marketOpen: boolean;
  preMarket: Session; postMarket: Session;
  stats: { open: number | null; previousClose: number | null; dayHigh: number | null; dayLow: number | null; volume: number | null; avgVolume: number | null; marketCap: number | null; high52: number | null; low52: number | null; pe: number | null; dividendYield: number | null; shares: number | null };
  eps: { history: { date: number; actual: number | null; estimate: number | null }[]; trailing: number | null; nextReport: number | null };
  profile: { headquarters: string | null; ceo: string | null; employees: number | null; website: string | null };
};

export const getStockOverview = createServerFn({ method: "GET" })
  .inputValidator(d => z.object({ symbol: sym }).parse(d))
  .handler(async ({ data }): Promise<StockOverview> => {
    const { fetchCompanyQuotes, fetchYahooJson } = await import("./market-quotes.server");
    const [quotes, summary] = await Promise.all([
      fetchCompanyQuotes(data.symbol).catch(() => [] as Raw[]),
      fetchYahooJson(`https://query2.finance.yahoo.com/v10/finance/quoteSummary/${encodeURIComponent(data.symbol)}?modules=assetProfile,earningsHistory,calendarEvents,summaryDetail`, 3600_000).catch(() => null),
    ]);
    const q: Raw = quotes.find(x => x["symbol"] === data.symbol) ?? {};
    const s = ((summary as { quoteSummary?: { result?: Raw[] } } | null)?.quoteSummary?.result?.[0] ?? {}) as Raw;
    const ap = (s["assetProfile"] ?? {}) as Raw, sd = (s["summaryDetail"] ?? {}) as Raw;
    const price = pos(q["regularMarketPrice"]), prev = pos(q["regularMarketPreviousClose"]);
    const session = (p: unknown, t: unknown): Session => { const v = pos(p); if (v == null || price == null) return null; const tt = pos(t); return { price: v, change: v - price, percent: (v - price) / price * 100, time: tt ? tt * 1000 : null }; };
    const officers = Array.isArray(ap["companyOfficers"]) ? ap["companyOfficers"] as Raw[] : [];
    const ceo = officers.find(o => /chief executive|ceo/i.test(String(o["title"] ?? "")));
    const hq = [str(ap["city"]), str(ap["state"]), str(ap["country"])].filter(Boolean).join(", ") || null;
    const hist = (((s["earningsHistory"] ?? {}) as Raw)["history"] as Raw[] | undefined) ?? [];
    const next = ((((s["calendarEvents"] ?? {}) as Raw)["earnings"] ?? {}) as Raw)["earningsDate"] as unknown[] | undefined;
    const time = pos(q["regularMarketTime"]);
    const divY = num(sd["dividendYield"]) ?? num(q["trailingAnnualDividendYield"]);
    return {
      symbol: data.symbol,
      name: str(q["longName"]) ?? str(q["shortName"]) ?? data.symbol,
      exchange: str(q["fullExchangeName"]), sector: str(ap["sector"]), industry: str(ap["industry"]), currency: str(q["currency"]),
      price, change: price != null && prev != null ? price - prev : null, percent: price != null && prev ? (price - prev) / prev * 100 : null,
      time: time ? time * 1000 : null, marketOpen: q["marketState"] === "REGULAR",
      preMarket: session(q["preMarketPrice"], q["preMarketTime"]), postMarket: session(q["postMarketPrice"], q["postMarketTime"]),
      stats: {
        open: pos(q["regularMarketOpen"]), previousClose: prev, dayHigh: pos(q["regularMarketDayHigh"]), dayLow: pos(q["regularMarketDayLow"]),
        volume: pos(q["regularMarketVolume"]), avgVolume: pos(q["averageDailyVolume3Month"]), marketCap: pos(q["marketCap"]),
        high52: pos(q["fiftyTwoWeekHigh"]), low52: pos(q["fiftyTwoWeekLow"]), pe: pos(q["trailingPE"]),
        dividendYield: divY != null && divY >= 0 ? divY * 100 : null, shares: pos(q["sharesOutstanding"]),
      },
      eps: {
        history: hist.map(h => ({ date: (pos(h["quarter"]) ?? 0) * 1000, actual: num(h["epsActual"]), estimate: num(h["epsEstimate"]) })).filter(h => h.date > 0).sort((a, b) => b.date - a.date).slice(0, 2),
        trailing: num(q["epsTrailingTwelveMonths"]),
        nextReport: next?.length ? (pos(next[0]) ?? 0) * 1000 || null : null,
      },
      profile: { headquarters: hq, ceo: ceo ? str(ceo["name"]) : null, employees: pos(ap["fullTimeEmployees"]), website: str(ap["website"]) },
    };
  });

export type Candle = { t: number; o: number | null; h: number | null; l: number | null; c: number; v: number | null };
export type OverviewChart = { points: Candle[]; previousClose: number | null; timeZone: string; intraday: boolean; session?: { start: number; end: number } | null };

const RANGE: Record<OverviewRange, { range: string; interval: string; minutes?: number }> = {
  "30m": { range: "1d", interval: "1m", minutes: 30 }, "1h": { range: "1d", interval: "1m", minutes: 60 },
  "1d": { range: "1d", interval: "5m" }, "5d": { range: "5d", interval: "15m" }, "1mo": { range: "1mo", interval: "1d" },
  "3mo": { range: "3mo", interval: "1d" }, "6mo": { range: "6mo", interval: "1d" }, "1y": { range: "1y", interval: "1d" }, "5y": { range: "5y", interval: "1wk" }, "max": { range: "max", interval: "1mo" },
};

export const getOverviewChart = createServerFn({ method: "GET" })
  .inputValidator(d => z.object({ symbol: sym, range: z.enum(OVERVIEW_RANGES) }).parse(d))
  .handler(async ({ data }): Promise<OverviewChart> => {
    const cfg = RANGE[data.range];
    const r = await fetch(`https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(data.symbol)}?range=${cfg.range}&interval=${cfg.interval}&includePrePost=false`, { headers: { "User-Agent": "Mozilla/5.0", Accept: "application/json" }, signal: AbortSignal.timeout(12000) });
    if (!r.ok) throw new Error("Price history is unavailable from the data provider.");
    const body = await r.json() as { chart?: { result?: { timestamp?: number[]; meta?: Raw; indicators?: { quote?: { open?: (number | null)[]; high?: (number | null)[]; low?: (number | null)[]; close?: (number | null)[]; volume?: (number | null)[] }[] } }[] } };
    const res = body.chart?.result?.[0];
    const qq = res?.indicators?.quote?.[0];
    let points: Candle[] = (res?.timestamp ?? []).flatMap((t, i) => {
      const c = pos(qq?.close?.[i]); if (c == null || !isListingObservation(data.symbol, t * 1000)) return [];
      return [{ t: t * 1000, c, o: pos(qq?.open?.[i]), h: pos(qq?.high?.[i]), l: pos(qq?.low?.[i]), v: num(qq?.volume?.[i]) }];
    });
    if (cfg.minutes && points.length) { const end = points[points.length - 1]!.t; points = points.filter(p => p.t > end - cfg.minutes! * 60_000); }
    if (!points.length) throw new Error("No trading data for this period yet.");
    const meta = res?.meta ?? {};
    const intraday = ["30m", "1h", "1d", "5d"].includes(data.range);
    const previousClose = intraday && data.range !== "5d" ? pos(meta["chartPreviousClose"]) ?? pos(meta["previousClose"]) : points[0]!.c;
    // Regular session bounds let the chart leave the unfinished part of today's session empty.
    const reg = (meta["currentTradingPeriod"] as { regular?: { start?: number; end?: number } } | undefined)?.regular;
    const last = points[points.length - 1]!.t;
    const session = data.range === "1d" && reg?.start && reg?.end && last >= reg.start * 1000 && last <= reg.end * 1000 ? { start: reg.start * 1000, end: reg.end * 1000 } : null;
    return { points, previousClose, timeZone: str(meta["exchangeTimezoneName"]) ?? "America/New_York", intraday, session };
  });
