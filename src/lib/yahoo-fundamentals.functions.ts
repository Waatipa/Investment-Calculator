import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import type { VerifiedFigure } from "./sec-facts.functions";

export const ME_FUNDAMENTAL_SYMBOLS = ["2222.SR", "IHC.AD", "1120.SR", "TAQA.AD", "1211.SR", "ADNOCGAS.AD", "1180.SR", "7010.SR", "FAB.AD", "EMIRATESNBD.AE"] as const;
export const AF_FUNDAMENTAL_SYMBOLS = ["NPN.JO", "FSR.JO", "SBK.JO", "CPI.JO", "GFI.JO", "ATW.CS", "MTN.JO", "DANGCEM.LG"] as const;

type Obs = { asOfDate: string; currencyCode?: string; reportedValue?: { raw?: number } };
type Fig = Omit<VerifiedFigure, "key">;
const TYPES = ["TotalRevenue", "GrossProfit", "OperatingCashFlow", "CapitalExpenditure", "CashDividendsPaid", "DilutedEPS", "NetIncomeCommonStockholders", "DilutedAverageShares", "TotalAssets", "StockholdersEquity", "CurrentLiabilities", "CurrentAssets", "TotalDebt", "CashAndCashEquivalents", "FreeCashFlow", "EBIT", "EBITDA", "OperatingIncome", "InterestExpense", "OrdinarySharesNumber"];

const cache = new Map<string, { data: Record<string, Obs[]>; expires: number }>();
async function loadSeries(symbol: string): Promise<Record<string, Obs[]>> {
  const hit = cache.get(symbol);
  if (hit && hit.expires > Date.now()) return hit.data;
  const types = TYPES.flatMap(t => [`annual${t}`, `quarterly${t}`]).join(",");
  const period1 = Math.floor(Date.now() / 1000) - 6 * 365 * 86400;
  const period2 = Math.floor(Date.now() / 1000) + 86400;
  const res = await fetch(`https://query2.finance.yahoo.com/ws/fundamentals-timeseries/v1/finance/timeseries/${encodeURIComponent(symbol)}?type=${types}&period1=${period1}&period2=${period2}`, { headers: { "User-Agent": "Mozilla/5.0", Accept: "application/json" }, signal: AbortSignal.timeout(15000) });
  if (!res.ok) throw new Error(`Fundamentals request failed (${res.status})`);
  const body: { timeseries?: { result?: Record<string, unknown>[] } } = await res.json();
  const data: Record<string, Obs[]> = {};
  for (const r of body.timeseries?.result ?? []) {
    const type = ((r["meta"] as { type?: string[] } | undefined)?.type ?? [])[0];
    const list = type ? r[type] : null;
    if (type && Array.isArray(list)) data[type] = (list as (Obs | null)[]).filter((o): o is Obs => !!o && typeof o.reportedValue?.raw === "number" && Number.isFinite(o.reportedValue.raw)).sort((a, b) => b.asOfDate.localeCompare(a.asOfDate));
  }
  cache.set(symbol, { data, expires: Date.now() + 3600_000 });
  return data;
}

export const EU_FUNDAMENTAL_SYMBOLS = ["ASML.AS", "MC.PA", "SAP.DE", "NESN.SW", "NOVO-B.CO", "RO.SW", "AZN.L", "HSBA.L"] as const;
export type RegionalArgs = { symbol: string; metric: string; keys: string[]; period: "annual" | "quarterly"; marketCapM?: number | null | undefined; price?: number | null | undefined; currency?: string | null | undefined };

export const getRegionalFigures = createServerFn({ method: "GET" })
  .inputValidator(d => z.object({ symbol: z.enum([...ME_FUNDAMENTAL_SYMBOLS, ...AF_FUNDAMENTAL_SYMBOLS]), metric: z.string().max(20), keys: z.array(z.string().max(20)).max(10), period: z.enum(["annual", "quarterly"]), marketCapM: z.number().positive().nullable().optional(), price: z.number().positive().nullable().optional(), currency: z.string().max(5).nullable().optional() }).parse(d))
  .handler(({ data }) => regionalFigures(data));

export async function regionalFigures(data: RegionalArgs) {
  {
    try {
      const s = await loadSeries(data.symbol);
      const url = `https://finance.yahoo.com/quote/${encodeURIComponent(data.symbol)}/financials/`;
      const M = 1e-6;
      const pick = (t: string, skip = 0, mode: "annual" | "quarterly" = data.period, k = M, transform = (v: number) => v): Fig | null => {
        const o = s[`${mode}${t}`]?.[skip];
         const raw = o?.reportedValue?.raw;
         if (!o || raw == null || !Number.isFinite(raw) || (data.currency && o.currencyCode !== data.currency)) return null;
         return { value: transform(raw) * k, concept: `Yahoo Finance: ${mode}${t}`, form: "Yahoo Finance", filed: o.asOfDate, periodStart: null, periodEnd: o.asOfDate, accession: "", url, note: `${mode === "annual" ? "Fiscal year" : "Quarter"} ending ${o.asOfDate} · ${o.currencyCode ?? "local currency"}`, currency: o.currencyCode ?? null } as Fig;
      };
      const both = (a: Fig | null, b: Fig | null, f: (x: number, y: number) => number, concept: string, note: string): Fig | null => a && b ? { ...a, value: f(a.value, b.value), concept, note: `${note} · ${a.note}` } : null;
      const abs = (v: number) => Math.abs(v);
      const eps = () => pick("DilutedEPS", 0, data.period, 1);
      const priorEps = () => pick("DilutedEPS", data.period === "annual" ? 1 : 4, data.period, 1);
      const avg = (t: string) => both(pick(t), pick(t, 1), (a, b) => (a + b) / 2, `Yahoo Finance: ${t}`, "Average of the latest two balances");
      const netDebt = () => both(pick("TotalDebt"), pick("CashAndCashEquivalents"), (a, b) => a - b, "TotalDebt − CashAndCashEquivalents", "Net debt = total debt − cash");
      const sameCcy = (f: Fig | null) => f && (!data.currency || (f as Fig & { currency?: string | null }).currency === data.currency) ? f : null;
      const common: Record<string, () => Fig | null> = {
        revenue: () => pick("TotalRevenue"),
        profit: () => pick("GrossProfit"),
        cash: () => pick("OperatingCashFlow"),
        capex: () => pick("CapitalExpenditure", 0, data.period, M, abs),
        dividends: () => pick("CashDividendsPaid", 0, data.period, M, abs),
        eps, prior: priorEps,
        income: () => pick("NetIncomeCommonStockholders"),
        shares: () => pick("DilutedAverageShares"),
        assets: () => avg("TotalAssets"),
        equity: () => avg("StockholdersEquity"),
        liabilities: () => pick("CurrentLiabilities"),
        debt: () => pick("TotalDebt"),
        fcf: () => pick("FreeCashFlow"),
        ebit: () => pick("EBIT"),
        ebitda: () => pick("EBITDA"),
        growth: () => both(eps(), priorEps(), (a, b) => (a - b) / b * 100, "DilutedEPS", "EPS growth vs the prior comparable period"),
        book: () => both(pick("StockholdersEquity", 0, data.period, 1), pick("OrdinarySharesNumber", 0, data.period, 1), (a, b) => a / b, "StockholdersEquity ÷ OrdinarySharesNumber", "Book value per share"),
        pe: () => { const e = sameCcy(eps()); return e && data.price && e.value > 0 ? { ...e, value: data.price / e.value, concept: "Live price ÷ DilutedEPS", note: `Live Yahoo Finance price ÷ diluted EPS · ${e.note}` } : null; },
        ev: () => { const d = sameCcy(netDebt()); return d && data.marketCapM ? { ...d, value: data.marketCapM + d.value, note: `Enterprise value = live market cap + net debt · ${d.note}` } : null; },
        end: () => pick("TotalRevenue", 0, "annual"),
        start: () => pick("TotalRevenue", 3, "annual"),
        years: () => { const a = pick("TotalRevenue", 0, "annual"), b = pick("TotalRevenue", 3, "annual"); return a && b ? { ...a, value: 3, concept: "Fiscal years between revenues", note: "Three fiscal years between starting and ending revenue" } : null; },
      };
      const overrides: Record<string, Record<string, () => Fig | null>> = {
        operating: { income: () => pick("OperatingIncome") },
        current: { assets: () => pick("CurrentAssets") },
        de: { equity: () => pick("StockholdersEquity") },
        dcf: { years: () => null, growth: () => null, shares: () => pick("OrdinarySharesNumber"), debt: netDebt, fcf: () => pick("FreeCashFlow", 0, "annual") },
        interest: { interest: () => pick("InterestExpense", 0, data.period, M, abs) },
      };
      const out: VerifiedFigure[] = [];
      for (const key of data.keys) {
        const fig = (overrides[data.metric]?.[key] ?? common[key])?.();
        if (fig && Number.isFinite(fig.value)) out.push({ key, ...fig });
      }
      return { figures: out, error: null as string | null };
    } catch (e) {
      console.error("Yahoo fundamentals failed", e);
      return { figures: [] as VerifiedFigure[], error: "Company figures are unavailable right now. Try again shortly." };
    }
  }
}
