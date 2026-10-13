import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

type Fact = { start?: string; end: string; val: number; accn: string; form: string; filed: string };
type Facts = { facts: Record<string, Record<string, { units: Record<string, Fact[]> }>> };
export type VerifiedFigure = { key: string; value: number; concept: string; form: string; filed: string; periodStart: string | null; periodEnd: string; accession: string; url: string; note?: string };
type Mode = "annual" | "quarterly";
type Fig = Omit<VerifiedFigure, "key">;

export const SEC_CIKS = { AAPL: "0000320193", NVDA: "0001045810", MSFT: "0000789019", AMZN: "0001018724", GOOGL: "0001652044", META: "0001326801", TSLA: "0001318605" } as const;
export type SecSymbol = keyof typeof SEC_CIKS;
const caches = new Map<string, { at: number; data: Facts }>();

export async function loadFacts(symbol: SecSymbol = "AAPL"): Promise<Facts> {
  const cik = SEC_CIKS[symbol];
  const cache = caches.get(cik);
  if (cache && Date.now() - cache.at < 3_600_000) return cache.data;
  const res = await fetch(`https://data.sec.gov/api/xbrl/companyfacts/CIK${cik}.json`, { headers: { "User-Agent": "Investico Academy contact@nvestico.academy", Accept: "application/json" } });
  if (!res.ok) throw new Error(`SEC EDGAR responded ${res.status}`);
  const data = (await res.json()) as Facts;
  (data as Facts & { cik?: string }).cik = String(Number(cik));
  caches.set(cik, { at: Date.now(), data });
  return data;
}

const days = (f: Fact) => (f.start ? (Date.parse(f.end) - Date.parse(f.start)) / 86_400_000 : 0);
let currentCik = "320193";
const url = (accn: string) => `https://www.sec.gov/Archives/edgar/data/${currentCik}/${accn.replace(/-/g, "")}/`;
const latestByEnd = (list: Fact[]) => {
  const byEnd = new Map<string, Fact>();
  for (const f of list) { const k = `${f.start ?? ""}|${f.end}`; const p = byEnd.get(k); if (!p || f.filed > p.filed) byEnd.set(k, f); }
  return [...byEnd.values()].sort((a, b) => b.end.localeCompare(a.end) || days(a) - days(b));
};
const toFig = (f: Fact, concept: string, value = f.val, note?: string): Fig => ({ value, concept, form: f.form, filed: f.filed, periodStart: f.start ?? null, periodEnd: f.end, accession: f.accn, url: url(f.accn), ...(note ? { note } : {}) });

const ALIASES: Record<string, string[]> = {
  RevenueFromContractWithCustomerExcludingAssessedTax: ["RevenueFromContractWithCustomerExcludingAssessedTax", "Revenues", "SalesRevenueNet"],
  PaymentsToAcquirePropertyPlantAndEquipment: ["PaymentsToAcquirePropertyPlantAndEquipment", "PaymentsToAcquireProductiveAssets"],
  LongTermDebt: ["LongTermDebt", "LongTermDebtNoncurrent"],
  DepreciationDepletionAndAmortization: ["DepreciationDepletionAndAmortization", "DepreciationAmortizationAndOther", "DepreciationAndAmortization", "DepreciationAmortizationAndAccretionNet"],
  PaymentsOfDividends: ["PaymentsOfDividends", "PaymentsOfDividendsCommonStock"],
  CashAndCashEquivalentsAtCarryingValue: ["CashAndCashEquivalentsAtCarryingValue"],
};

export function makeResolver(data: Facts, mode: Mode) {
  currentCik = (data as Facts & { cik?: string }).cik ?? "320193";
  const raw = (concept: string, unit: string, tax: string) => data.facts[tax]?.[concept]?.units[unit] ?? [];
  const series = (concept: string, unit = "USD", tax = "us-gaap") => {
    const names = tax === "us-gaap" ? ALIASES[concept] ?? [concept] : [concept];
    let best: Fact[] = [];
    let bestEnd = "";
    for (const n of names) { const l = raw(n, unit, tax).filter(f => ["10-K", "10-Q"].includes(f.form)); const end = l.reduce((m, f) => (f.end > m ? f.end : m), ""); if (end > bestEnd) { best = l; bestEnd = end; } }
    return best;
  };
  /** Duration figure (income / cash-flow). Quarterly cash-flow items are filed year-to-date, so the quarter is derived as YTD minus the prior YTD. */
  function flow(concept: string, unit = "USD", skip = 0, additive = true): Fig | null {
    const list = series(concept, unit).filter(f => f.start && ["10-K", "10-Q"].includes(f.form));
    if (mode === "annual") {
      const f = latestByEnd(list.filter(x => x.form === "10-K" && days(x) > 350 && days(x) < 380))[skip];
      return f ? toFig(f, `us-gaap:${concept}`) : null;
    }
    const quarters = latestByEnd(list.filter(x => days(x) > 80 && days(x) < 100));
    const latestEnd = latestByEnd(list)[0]?.end;
    const direct = quarters.find(q => q.end === latestEnd);
    if (direct && skip === 0) return toFig(direct, `us-gaap:${concept}`);
    if (skip > 0) { const ref = quarters[0]; const ago = ref && quarters.find(q => { const d = (Date.parse(ref.end) - Date.parse(q.end)) / 86_400_000; return d > 355 && d < 375; }); return ago ? toFig(ago, `us-gaap:${concept}`, ago.val, "Same quarter one year earlier") : null; }
    if (!additive) return quarters[0] ? toFig(quarters[0], `us-gaap:${concept}`) : null;
    const ytd = latestByEnd(list.filter(x => x.end === latestEnd))[0];
    if (!ytd) return null;
    const before = latestByEnd(list.filter(x => x.start === ytd.start && x.end < ytd.end))[0];
    if (!before) return toFig(ytd, `us-gaap:${concept}`);
    return { ...toFig(ytd, `us-gaap:${concept}`, ytd.val - before.val, `Quarter derived: year-to-date to ${ytd.end} minus year-to-date to ${before.end}`), periodStart: before.end };
  }
  function instant(concept: string, unit = "USD", tax = "us-gaap", skip = 0): Fig | null {
    const forms = mode === "annual" && tax !== "dei" ? ["10-K"] : ["10-K", "10-Q"];
    const f = latestByEnd(series(concept, unit, tax).filter(x => !x.start && forms.includes(x.form)))[skip];
    return f ? toFig(f, `${tax}:${concept}`) : null;
  }
  return { flow, instant };
}

const combine = (parts: (Fig | null)[], value: (v: number[]) => number, concept: string, note: string): Fig | null => {
  if (parts.some(p => !p)) return null;
  const ps = parts as Fig[];
  const main = ps[0]!;
  return { ...main, value: value(ps.map(p => p.value)), concept, note };
};
const scale = (f: Fig | null, k: number): Fig | null => (f ? { ...f, value: f.value * k } : null);

export const getFilingFigures = createServerFn({ method: "GET" })
  .inputValidator(d => z.object({ symbol: z.enum(["AAPL", "NVDA", "MSFT", "AMZN", "GOOGL", "META", "TSLA"]).default("AAPL"), metric: z.string().max(20), keys: z.array(z.string().max(20)).max(10), period: z.enum(["annual", "quarterly"]), marketCapM: z.number().positive().nullable().optional(), price: z.number().positive().nullable().optional() }).parse(d))
  .handler(async ({ data }) => {
    try {
      const facts = await loadFacts(data.symbol);
      const { flow, instant } = makeResolver(facts, data.period);
      const annual = makeResolver(facts, "annual");
      const M = 1e-6;
      const cp = () => { const d = instant("LongTermDebt"), c = instant("CommercialPaper"); return c && d && c.periodEnd === d.periodEnd ? c : null; };
      const totalDebt = () => { const d = instant("LongTermDebt"), c = cp(); return d ? { ...d, value: (d.value + (c?.value ?? 0)) * M, note: c ? "Total debt = long-term debt + commercial paper" : "Total debt = reported long-term debt" } : null; };
      const netDebt = () => { const t = totalDebt(), c = instant("CashAndCashEquivalentsAtCarryingValue"); return t && c ? { ...t, value: t.value - c.value * M, concept: "Total debt − CashAndCashEquivalents", note: "Net debt = total debt − cash and cash equivalents" } : null; };
      const fcf = () => combine([flow("NetCashProvidedByUsedInOperatingActivities"), flow("PaymentsToAcquirePropertyPlantAndEquipment")], ([a, b]) => (a! - b!) * M, "OperatingCashFlow − PaymentsToAcquirePP&E", "Free cash flow = operating cash flow − capital expenditure");
      const eps = () => flow("EarningsPerShareDiluted", "USD/shares", 0, false);
      const priorEps = () => flow("EarningsPerShareDiluted", "USD/shares", data.period === "annual" ? 1 : 4, false);
      const average = (concept: string) => combine([instant(concept), instant(concept, "USD", "us-gaap", data.period === "annual" ? 1 : 1)], ([a, b]) => (a! + b!) / 2 * M, `us-gaap:${concept}`, "Average of the latest two filed balances");
      const noPreferred = (): Fig | null => { const n = flow("NetIncomeLoss"); return n ? { ...n, value: 0, concept: "No preferred stock reported", note: "Apple's filings report no preferred stock or preferred dividends" } : null; };
      const sharesOut = () => scale(instant("EntityCommonStockSharesOutstanding", "shares", "dei"), M);

      const common: Record<string, () => Fig | null> = {
        revenue: () => scale(flow("RevenueFromContractWithCustomerExcludingAssessedTax"), M),
        profit: () => scale(flow("GrossProfit"), M) ?? combine([flow("RevenueFromContractWithCustomerExcludingAssessedTax"), flow("CostOfRevenue")], ([a, b]) => (a! - b!) * M, "Revenue − us-gaap:CostOfRevenue", "Gross profit = revenue − cost of revenue"),
        cash: () => scale(flow("NetCashProvidedByUsedInOperatingActivities"), M),
        capex: () => scale(flow("PaymentsToAcquirePropertyPlantAndEquipment"), M),
        dividends: () => scale(flow("PaymentsOfDividends"), M),
        dividend: () => flow("CommonStockDividendsPerShareDeclared", "USD/shares"),
        eps, prior: priorEps,
        income: () => scale(flow("NetIncomeLoss"), M),
        shares: () => scale(flow("WeightedAverageNumberOfDilutedSharesOutstanding", "shares", 0, false), M),
        preferred: noPreferred,
        assets: () => average("Assets"),
        equity: () => average("StockholdersEquity"),
        liabilities: () => scale(instant("LiabilitiesCurrent"), M),
        debt: totalDebt,
        fcf,
        ebit: () => scale(flow("OperatingIncomeLoss"), M),
        ebitda: () => combine([flow("OperatingIncomeLoss"), flow("DepreciationDepletionAndAmortization")], ([a, b]) => (a! + b!) * M, "OperatingIncomeLoss + DepreciationDepletionAndAmortization", "EBITDA = operating income + depreciation and amortization"),
        growth: () => combine([eps(), priorEps()], ([a, b]) => (a! - b!) / b! * 100, "us-gaap:EarningsPerShareDiluted", "EPS growth vs the prior comparable filed period"),
        book: () => combine([instant("StockholdersEquity"), instant("EntityCommonStockSharesOutstanding", "shares", "dei")], ([a, b]) => a! / b!, "StockholdersEquity ÷ dei:EntityCommonStockSharesOutstanding", "Book value per share = shareholders’ equity ÷ shares outstanding"),
        pe: () => { const e = eps(); return e && data.price && e.value > 0 ? { ...e, value: data.price / e.value, concept: "Live price ÷ us-gaap:EarningsPerShareDiluted", note: "Live Yahoo Finance price ÷ filed diluted EPS" } : null; },
        ev: () => { const d = netDebt(); return d && data.marketCapM ? { ...d, value: data.marketCapM + d.value, note: "Enterprise value = live market cap + filed net debt" } : null; },
        end: () => scale(annual.flow("RevenueFromContractWithCustomerExcludingAssessedTax"), M),
        start: () => scale(annual.flow("RevenueFromContractWithCustomerExcludingAssessedTax", "USD", 3), M),
        years: () => { const a = annual.flow("RevenueFromContractWithCustomerExcludingAssessedTax"); return a ? { ...a, value: 3, concept: "Fiscal years between filed revenues", note: "Three fiscal years between the starting and ending 10-K revenue" } : null; },
      };
      const overrides: Record<string, Record<string, () => Fig | null>> = {
        operating: { income: () => scale(flow("OperatingIncomeLoss"), M) },
        current: { assets: () => scale(instant("AssetsCurrent"), M) },
        de: { equity: () => scale(instant("StockholdersEquity"), M) },
        dcf: { years: () => null, shares: sharesOut, debt: netDebt, fcf: () => makeAnnualFcf() },
        interest: { interest: () => { const i = flow("InterestExpense"), o = flow("OperatingIncomeLoss"); return i && o && i.periodEnd === o.periodEnd ? scale(i, M) : null; } },
      };
      const makeAnnualFcf = () => combine([annual.flow("NetCashProvidedByUsedInOperatingActivities"), annual.flow("PaymentsToAcquirePropertyPlantAndEquipment")], ([a, b]) => (a! - b!) * M, "OperatingCashFlow − PaymentsToAcquirePP&E", "Annual free cash flow from the latest 10-K");

      const out: VerifiedFigure[] = [];
      for (const key of data.keys) {
        const get = overrides[data.metric]?.[key] ?? (data.metric === "dcf" && key === "growth" ? undefined : common[key]);
        const fig = get?.();
        if (fig && Number.isFinite(fig.value)) out.push({ key, ...fig });
      }
      return { figures: out, error: null as string | null };
    } catch (e) {
      console.error("SEC facts failed", e);
      return { figures: [] as VerifiedFigure[], error: "SEC EDGAR filings are unavailable right now. Try again shortly." };
    }
  });

export const getAppleFilingFigures = getFilingFigures;
