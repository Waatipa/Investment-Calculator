import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { FX_CURRENCIES } from "./display-prefs";

const cur = z.string().refine(v => FX_CURRENCIES.includes(v), "Unsupported currency.");
const cache = new Map<string, { rate: number; time: number; expires: number }>();

// Live exchange rate from Yahoo Finance currency pairs; never estimated.
export const getFxRate = createServerFn({ method: "GET" })
  .inputValidator(d => z.object({ from: cur, to: cur }).parse(d))
  .handler(async ({ data }) => {
    if (data.from === data.to) return { rate: 1, time: Date.now() };
    const key = `${data.from}${data.to}`;
    const hit = cache.get(key);
    if (hit && hit.expires > Date.now()) return { rate: hit.rate, time: hit.time };
    try {
      const r = await fetch(`https://query1.finance.yahoo.com/v8/finance/chart/${key}=X?range=1d&interval=1d`, { headers: { "User-Agent": "Mozilla/5.0", Accept: "application/json" }, signal: AbortSignal.timeout(10000) });
      const body: { chart?: { result?: { meta?: { regularMarketPrice?: number; regularMarketTime?: number } }[] } } = await r.json();
      const m = body.chart?.result?.[0]?.meta;
      if (!r.ok || !m?.regularMarketPrice || !(m.regularMarketPrice > 0)) throw new Error();
      const out = { rate: m.regularMarketPrice, time: (m.regularMarketTime ?? Date.now() / 1000) * 1000 };
      cache.set(key, { ...out, expires: Date.now() + 60_000 });
      return out;
    } catch { throw new Error(`Live ${data.from}→${data.to} exchange rate is unavailable; showing ${data.from}.`); }
  });
