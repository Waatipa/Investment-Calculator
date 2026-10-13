import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import type { VerifiedFigure } from "./sec-facts.functions";
import { EU_FUNDAMENTAL_SYMBOLS, regionalFigures } from "./yahoo-fundamentals.functions";

type Fact = { start?: string; end: string; val: number; accn: string; form: string; filed: string };
type Facts = { facts: Record<string, Record<string, { units: Record<string, Fact[]> }>> };
type Fig = Omit<VerifiedFigure, "key">;

/** European companies that file annual 20-F reports (with XBRL) at SEC EDGAR. */
export const EU_SEC_FILERS: Record<string, { cik: string; tax: "ifrs-full" | "us-gaap"; ccy: string }> = {
  "ASML.AS": { cik: "0000937966", tax: "us-gaap", ccy: "EUR" },
  "SAP.DE": { cik: "0001000184", tax: "ifrs-full", ccy: "EUR" },
  "NOVO-B.CO": { cik: "0000353278", tax: "ifrs-full", ccy: "DKK" },
  "AZN.L": { cik: "0000901832", tax: "ifrs-full", ccy: "USD" },
  "HSBA.L": { cik: "0001089113", tax: "ifrs-full", ccy: "USD" },
};

const CONCEPTS: Record<string, { ifrs: string[]; gaap: string[] }> = {
  revenue: { ifrs: ["Revenue", "RevenueFromContractsWithCustomers"], gaap: ["RevenueFromContractWithCustomerExcludingAssessedTax", "Revenues"] },
  gross: { ifrs: ["GrossProfit"], gaap: ["GrossProfit"] },
  operating: { ifrs: ["ProfitLossFromOperatingActivities"], gaap: ["OperatingIncomeLoss"] },
  income: { ifrs: ["ProfitLossAttributableToOwnersOfParent", "ProfitLoss"], gaap: ["NetIncomeLoss"] },
  cash: { ifrs: ["CashFlowsFromUsedInOperatingActivities"], gaap: ["NetCashProvidedByUsedInOperatingActivities"] },
  capex: { ifrs: ["PurchaseOfPropertyPlantAndEquipmentClassifiedAsInvestingActivities", "PurchaseOfPropertyPlantAndEquipment"], gaap: ["PaymentsToAcquirePropertyPlantAndEquipment"] },
  dividends: { ifrs: ["DividendsPaidClassifiedAsFinancingActivities", "DividendsPaid"], gaap: ["PaymentsOfDividends", "PaymentsOfDividendsCommonStock"] },
  dps: { ifrs: ["DividendsRecognisedAsDistributionsToOwnersPerShare"], gaap: ["CommonStockDividendsPerShareDeclared"] },
  eps: { ifrs: ["DilutedEarningsLossPerShare"], gaap: ["EarningsPerShareDiluted"] },
  shares: { ifrs: ["AdjustedWeightedAverageShares"], gaap: ["WeightedAverageNumberOfDilutedSharesOutstanding"] },
  da: { ifrs: ["DepreciationAndAmortisationExpense", "DepreciationAmortisationAndImpairmentLossReversalOfImpairmentLossRecognisedInProfitOrLoss"], gaap: ["DepreciationDepletionAndAmortization"] },
  interest: { ifrs: ["InterestExpense", "FinanceCosts"], gaap: ["InterestExpense"] },
  assets: { ifrs: ["Assets"], gaap: ["Assets"] },
  equity: { ifrs: ["EquityAttributableToOwnersOfParent", "Equity"], gaap: ["StockholdersEquity"] },
  currentAssets: { ifrs: ["CurrentAssets"], gaap: ["AssetsCurrent"] },
  currentLiabilities: { ifrs: ["CurrentLiabilities"], gaap: ["LiabilitiesCurrent"] },
  debt: { ifrs: ["Borrowings"], gaap: ["LongTermDebt"] },
  cashBal: { ifrs: ["CashAndCashEquivalents"], gaap: ["CashAndCashEquivalentsAtCarryingValue"] },
};

const caches = new Map<string, { at: number; data: Facts }>();
async function load(cik: string): Promise<Facts> {
  const hit = caches.get(cik);
  if (hit && Date.now() - hit.at < 3_600_000) return hit.data;
  const res = await fetch(`https://data.sec.gov/api/xbrl/companyfacts/CIK${cik}.json`, { headers: { "User-Agent": "Investico Academy contact@nvestico.academy", Accept: "application/json" }, signal: AbortSignal.timeout(15000) });
  if (!res.ok) throw new Error(`SEC EDGAR responded ${res.status}`);
  const data = (await res.json()) as Facts;
  caches.set(cik, { at: Date.now(), data });
  return data;
}

const days = (f: Fact) => (f.start ? (Date.parse(f.end) - Date.parse(f.start)) / 86_400_000 : 0);
const CUTOFF_MS = 2.5 * 365 * 86_400_000;

function resolver(data: Facts, filer: { cik: string; tax: "ifrs-full" | "us-gaap"; ccy: string }) {
  const link = (accn: string) => `https://www.sec.gov/Archives/edgar/data/${Number(filer.cik)}/${accn.replace(/-/g, "")}/`;
  /** Latest annual 20-F observations for a concept, newest period first, one per period (latest filing wins). */
  const series = (key: string, unit: string, flow: boolean) => {
    const names = filer.tax === "ifrs-full" ? CONCEPTS[key]!.ifrs : CONCEPTS[key]!.gaap;
    for (const name of names) {
      const raw = data.facts[filer.tax]?.[name]?.units[unit] ?? [];
      const list = raw.filter(f => f.form.startsWith("20-F") && (flow ? f.start && days(f) > 350 && days(f) < 380 : !f.start));
      const byEnd = new Map<string, Fact>();
      for (const f of list) { const p = byEnd.get(f.end); if (!p || f.filed > p.filed) byEnd.set(f.end, f); }
      const sorted = [...byEnd.values()].sort((a, b) => b.end.localeCompare(a.end));
      if (sorted[0] && Date.now() - Date.parse(sorted[0].end) < CUTOFF_MS) return { name, sorted };
    }
    return null;
  };
  const get = (key: string, opts: { unit?: string; flow?: boolean; skip?: number; scale?: number } = {}): Fig | null => {
    const { unit = filer.ccy, flow = true, skip = 0, scale = 1e-6 } = opts;
    const s = series(key, unit, flow);
    const f = s?.sorted[skip];
    if (!s || !f) return null;
    return { value: Math.abs(f.val) * (key === "income" || key === "operating" || key === "eps" ? Math.sign(f.val) : 1) * scale, concept: `${filer.tax}:${s.name}`, form: f.form, filed: f.filed, periodStart: f.start ?? null, periodEnd: f.end, accession: f.accn, url: link(f.accn), note: `Annual report (20-F) · reported in ${filer.ccy}` };
  };
  return get;
}

const both = (a: Fig | null, b: Fig | null, f: (x: number, y: number) => number, concept: string, note: string): Fig | null => a && b ? { ...a, value: f(a.value, b.value), concept, note: `${note} · ${a.note}` } : null;

export const getEuropeFilingFigures = createServerFn({ method: "GET" })
  .inputValidator(d => z.object({ symbol: z.enum(EU_FUNDAMENTAL_SYMBOLS), metric: z.string().max(20), keys: z.array(z.string().max(20)).max(10), period: z.enum(["annual", "quarterly"]), marketCapM: z.number().positive().nullable().optional(), price: z.number().positive().nullable().optional(), currency: z.string().max(5).nullable().optional() }).parse(d))
  .handler(async ({ data }) => {
    const filer = EU_SEC_FILERS[data.symbol];
    const out: VerifiedFigure[] = [];
    let note: string;
    if (!filer) note = "This company does not file reports with SEC EDGAR; figures come from Yahoo Finance summaries of its reports.";
    else if (data.period === "quarterly") note = "European companies file only annual reports (20-F) with SEC EDGAR; quarterly figures come from Yahoo Finance summaries.";
    else {
      note = `Annual figures come from ${data.symbol.split(".")[0]}’s 20-F filings at SEC EDGAR${filer.ccy !== data.currency ? ` (reported in ${filer.ccy}, while the share trades in ${data.currency}; price-based ratios are left for you to enter)` : ""}.`;
      try {
        const get = resolver(await load(filer.cik), filer);
        const sameCcy = filer.ccy === data.currency || (filer.ccy === "GBP" && data.currency === "GBp");
        const eps = () => get("eps", { unit: `${filer.ccy}/shares`, scale: 1 });
        const priorEps = () => get("eps", { unit: `${filer.ccy}/shares`, scale: 1, skip: 1 });
        const avg = (k: string) => both(get(k, { flow: false }), get(k, { flow: false, skip: 1 }), (a, b) => (a + b) / 2, `${filer.tax}:${k}`, "Average of the latest two filed balances");
        const netDebt = () => both(get("debt", { flow: false }), get("cashBal", { flow: false }), (a, b) => a - b, "Borrowings − CashAndCashEquivalents", "Net debt = borrowings − cash");
        const fcf = () => both(get("cash"), get("capex"), (a, b) => a - b, "Operating cash flow − capital expenditure", "Free cash flow = operating cash flow − capex");
        const gross = () => get("gross");
        const common: Record<string, () => Fig | null> = {
          revenue: () => get("revenue"), profit: gross, cash: () => get("cash"), capex: () => get("capex"), dividends: () => get("dividends"),
          dividend: () => get("dps", { unit: `${filer.ccy}/shares`, scale: 1 }),
          eps, prior: priorEps, income: () => get("income"), shares: () => get("shares", { unit: "shares" }),
          assets: () => avg("assets"), equity: () => avg("equity"), liabilities: () => get("currentLiabilities", { flow: false }),
          debt: () => get("debt", { flow: false }), fcf, ebit: () => get("operating"),
          ebitda: () => both(get("operating"), get("da"), (a, b) => a + b, "Operating profit + depreciation & amortisation", "EBITDA = operating profit + D&A"),
          growth: () => both(eps(), priorEps(), (a, b) => (a - b) / b * 100, "Diluted EPS", "EPS growth vs the prior fiscal year"),
          pe: () => { const e = eps(); return sameCcy && e && data.price && e.value > 0 ? { ...e, value: data.price / e.value, concept: "Live price ÷ diluted EPS", note: `Live Yahoo Finance price ÷ filed diluted EPS · ${e.note}` } : null; },
          ev: () => { const d = netDebt(); return sameCcy && d && data.marketCapM ? { ...d, value: data.marketCapM + d.value, note: `Enterprise value = live market cap + net debt · ${d.note}` } : null; },
          end: () => get("revenue"), start: () => get("revenue", { skip: 3 }),
          years: () => { const a = get("revenue"), b = get("revenue", { skip: 3 }); return a && b ? { ...a, value: 3, concept: "Fiscal years between filed revenues", note: "Three fiscal years between the starting and ending 20-F revenue" } : null; },
        };
        const overrides: Record<string, Record<string, () => Fig | null>> = {
          operating: { income: () => get("operating") },
          current: { assets: () => get("currentAssets", { flow: false }) },
          de: { equity: () => get("equity", { flow: false }) },
          dcf: { years: () => null, growth: () => null, debt: netDebt },
          interest: { interest: () => get("interest") },
        };
        for (const key of data.keys) {
          const fig = (overrides[data.metric]?.[key] ?? common[key])?.();
          if (fig && Number.isFinite(fig.value)) out.push({ key, ...fig });
        }
      } catch (e) { console.error("EU SEC filings failed", e); }
    }
    // Fill remaining fields from Yahoo summaries only where the reported currency matches the calculator's.
    const missing = data.keys.filter(k => !out.some(f => f.key === k));
    let error: string | null = null;
    if (missing.length && (!filer || data.period === "quarterly" || filer.ccy === data.currency)) {
      const y = await regionalFigures({ ...data, keys: missing });
      out.push(...y.figures);
      error = out.length ? null : y.error;
    }
    return { figures: out, error, note };
  });
