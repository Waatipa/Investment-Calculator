import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { COMPARE_SYMBOLS, MAX_FREE_COMPARE, type UsdPoint } from "./compare";
import { tradingDate } from "./investment";
import { isListingObservation, requireListingDate } from "./us-listings";

const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine(v => { const d = new Date(`${v}T00:00:00Z`); return Number.isFinite(d.getTime()) && d.toISOString().slice(0, 10) === v; }, "Enter a valid date.");
const input = z.object({
  symbols: z.array(z.string().refine(v => COMPARE_SYMBOLS.includes(v), "Unsupported company.")).min(1).max(MAX_FREE_COMPARE),
  start: date, end: date,
}).refine(d => d.start < d.end, "The closing date must be after the investment date.").refine(d => d.start >= "1980-01-01", "Choose a date from 1980 onwards.");

type Chart = { timestamp?: number[]; meta?: { currency?: string; exchangeTimezoneName?: string; regularMarketPrice?: number; regularMarketTime?: number; currentTradingPeriod?: { regular?: { start: number; end: number } } }; indicators?: { quote?: { close?: (number | null)[]; high?: (number | null)[]; low?: (number | null)[] }[] } };
const ok = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v) && v > 0;

async function chart(symbol: string, from: number, to: number): Promise<Chart | null> {
  try {
    const r = await fetch(`https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?period1=${from}&period2=${to}&interval=1d&events=split`, { headers: { "User-Agent": "Mozilla/5.0", Accept: "application/json" }, signal: AbortSignal.timeout(15000) });
    if (!r.ok) return null;
    const body: { chart?: { result?: Chart[] } } = await r.json();
    return body.chart?.result?.[0] ?? null;
  } catch { return null; }
}

export type CompareSeries = { symbol: string; currency: string; error?: string; points: UsdPoint[]; fx: string | null; latest: { time: number; open: boolean } | null };

// Daily split-adjusted closes (Yahoo Finance), converted to USD with each day's own historical FX close.
export const getComparison = createServerFn({ method: "GET" })
  .inputValidator(d => input.parse(d))
  .handler(async ({ data }): Promise<CompareSeries[]> => {
    const from = Date.parse(`${data.start}T00:00:00Z`) / 1000 - 86400;
    const to = Date.parse(`${data.end}T00:00:00Z`) / 1000 + 2 * 86400;
    const fxCache = new Map<string, Promise<{ date: string; rate: number }[] | null>>();
    const fxSeries = (cur: string) => {
      if (!fxCache.has(cur)) fxCache.set(cur, chart(`${cur}USD=X`, from - 10 * 86400, to).then(c => {
        if (!c) return null;
        const q = c.indicators?.quote?.[0];
        const s = (c.timestamp ?? []).flatMap((t, i) => ok(q?.close?.[i]) ? [{ date: tradingDate(t * 1000, "UTC"), rate: q!.close![i] as number }] : []);
        return s.length ? s : null;
      }));
      return fxCache.get(cur)!;
    };
    return Promise.all(data.symbols.map(async (symbol): Promise<CompareSeries> => {
      try { requireListingDate(symbol, data.start); }
      catch (error) { return { symbol, currency: "USD", points: [], fx: null, latest: null, error: error instanceof Error ? error.message : "Investment date predates this listing." }; }
      const c = await chart(symbol, from, to);
      const raw = c?.meta?.currency, tz = c?.meta?.exchangeTimezoneName;
      if (!c || !raw || !tz) return { symbol, currency: raw ?? "", points: [], fx: null, latest: null, error: "Historical prices are unavailable from the data provider for this listing." };
      const divisor = raw === "ZAc" || raw === "GBp" || raw === "GBX" ? 100 : 1;
      const currency = raw === "ZAc" ? "ZAR" : divisor === 100 ? "GBP" : raw;
      const today = tradingDate(Date.now(), tz);
      if (data.start > today) return { symbol, currency, points: [], fx: null, latest: null, error: "The investment date is in the future." };
      const q = c.indicators?.quote?.[0];
      let local = (c.timestamp ?? []).flatMap((t, i) => {
        const cl = q?.close?.[i];
        if (!ok(cl) || !isListingObservation(symbol, t * 1000)) return [];
        const h = q?.high?.[i], l = q?.low?.[i];
        return [{ t: t * 1000, date: tradingDate(t * 1000, tz), c: cl / divisor, h: (ok(h) ? Math.max(h, cl) : cl) / divisor, l: (ok(l) ? Math.min(l, cl) : cl) / divisor }];
      }).filter(p => p.date >= data.start && p.date <= data.end);
      // Today's bar: use the source's latest regular-session trade, flagged with its timestamp.
      let latest: CompareSeries["latest"] = null;
      const mt = c.meta?.regularMarketTime, mp = c.meta?.regularMarketPrice;
      if (data.end >= today && ok(mt) && ok(mp) && tradingDate(mt * 1000, tz) === local[local.length - 1]?.date) {
        const last = local[local.length - 1]!;
        last.c = mp / divisor; last.h = Math.max(last.h, last.c); last.l = Math.min(last.l, last.c); last.t = mt * 1000;
        const reg = c.meta?.currentTradingPeriod?.regular;
        latest = { time: mt * 1000, open: !!reg && Date.now() / 1000 >= reg.start && Date.now() / 1000 < reg.end };
      }
      if (!local.length) return { symbol, currency, points: [], fx: null, latest: null, error: "No trading days for this listing between these dates." };
      if (currency === "USD") return { symbol, currency, points: local, fx: null, latest };
      const fx = await fxSeries(currency);
      if (!fx) return { symbol, currency, points: [], fx: null, latest: null, error: `Historical ${currency}→USD exchange rates are unavailable, so no USD result is shown.` };
      let j = 0;
      local = local.flatMap(p => {
        while (j + 1 < fx.length && fx[j + 1]!.date <= p.date) j++;
        const r = fx[j]!;
        if (r.date > p.date && Date.parse(r.date) - Date.parse(p.date) > 5 * 86400_000) return [];
        return [{ ...p, c: p.c * r.rate, h: p.h * r.rate, l: p.l * r.rate }];
      });
      if (!local.length) return { symbol, currency, points: [], fx: null, latest: null, error: `No ${currency}→USD rates match these trading days.` };
      return { symbol, currency, points: local, fx: `${currency}→USD at each trading day's closing rate`, latest };
    }));
  });
