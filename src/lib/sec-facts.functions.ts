import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

type Fact = { start?: string; end: string; val: number; accn: string; fy?: number; fp?: string; form: string; filed: string };
type Facts = { facts: Record<string, Record<string, { units: Record<string, Fact[]> }>> };
export type VerifiedFigure = { key: string; value: number; concept: string; form: string; filed: string; periodStart: string | null; periodEnd: string; accession: string; url: string; note?: string };

const APPLE_CIK = "0000320193";
let cache: { at: number; data: Facts } | null = null;

async function loadFacts(): Promise<Facts> {
  if (cache && Date.now() - cache.at < 3_600_000) return cache.data;
  const res = await fetch(`https://data.sec.gov/api/xbrl/companyfacts/CIK${APPLE_CIK}.json`, { headers: { "User-Agent": "Investico Academy contact@nvestico.academy", Accept: "application/json" } });
  if (!res.ok) throw new Error(`SEC EDGAR responded ${res.status}`);
  const data = (await res.json()) as Facts;
  cache = { at: Date.now(), data };
  return data;
}

const days = (f: Fact) => (f.start ? (Date.parse(f.end) - Date.parse(f.start)) / 86_400_000 : 0);
function series(data: Facts, concept: string, unit: string, taxonomy = "us-gaap") {
  return data.facts[taxonomy]?.[concept]?.units[unit] ?? [];
}
function pick(list: Fact[], mode: "annual" | "quarterly", instant: boolean, skip = 0): Fact | undefined {
  const forms = mode === "annual" ? ["10-K"] : ["10-Q", "10-K"];
  const ok = list.filter(f => forms.includes(f.form) && (instant ? !f.start : mode === "annual" ? days(f) > 350 && days(f) < 380 : days(f) > 80 && days(f) < 100));
  const byEnd = new Map<string, Fact>();
  for (const f of ok) { const prev = byEnd.get(f.end); if (!prev || f.filed > prev.filed) byEnd.set(f.end, f); }
  return [...byEnd.values()].sort((a, b) => b.end.localeCompare(a.end))[skip];
}

// metric field key -> SEC concept; scale converts to the form's units
type Map_ = { concept: string; unit: string; scale: number; instant?: boolean; taxonomy?: string; prior?: boolean; average?: boolean };
const usdM = (concept: string, extra: Partial<Map_> = {}): Map_ => ({ concept, unit: "USD", scale: 1e-6, ...extra });
const COMMON: Record<string, Map_> = {
  revenue: usdM("RevenueFromContractWithCustomerExcludingAssessedTax"),
  profit: usdM("GrossProfit"),
  cash: usdM("NetCashProvidedByUsedInOperatingActivities"),
  capex: usdM("PaymentsToAcquirePropertyPlantAndEquipment"),
  dividends: usdM("PaymentsOfDividends"),
  eps: { concept: "EarningsPerShareDiluted", unit: "USD/shares", scale: 1 },
  prior: { concept: "EarningsPerShareDiluted", unit: "USD/shares", scale: 1, prior: true },
  dividend: { concept: "CommonStockDividendsPerShareDeclared", unit: "USD/shares", scale: 1 },
  assets: usdM("Assets", { instant: true, average: true }),
  equity: usdM("StockholdersEquity", { instant: true, average: true }),
  liabilities: usdM("LiabilitiesCurrent", { instant: true }),
  income: usdM("NetIncomeLoss"),
  shares: { concept: "WeightedAverageNumberOfDilutedSharesOutstanding", unit: "shares", scale: 1e-6 },
};
const OVERRIDES: Record<string, Record<string, Map_>> = {
  operating: { income: usdM("OperatingIncomeLoss") },
  current: { assets: usdM("AssetsCurrent", { instant: true }) },
  de: { equity: usdM("StockholdersEquity", { instant: true }) },
  dcf: { shares: { concept: "EntityCommonStockSharesOutstanding", unit: "shares", scale: 1e-6, instant: true, taxonomy: "dei" } },
};

export const getAppleFilingFigures = createServerFn({ method: "GET" })
  .inputValidator(d => z.object({ metric: z.string().max(20), keys: z.array(z.string().max(20)).max(10), period: z.enum(["annual", "quarterly"]) }).parse(d))
  .handler(async ({ data }) => {
    try {
      const facts = await loadFacts();
      const out: VerifiedFigure[] = [];
      for (const key of data.keys) {
        const map = OVERRIDES[data.metric]?.[key] ?? COMMON[key];
        if (!map) continue;
        const list = series(facts, map.concept, map.unit, map.taxonomy);
        const instant = !!map.instant;
        const mode = instant && map.taxonomy === "dei" ? "quarterly" : data.period;
        const fact = map.taxonomy === "dei" ? [...list].sort((a, b) => b.end.localeCompare(a.end))[0] : pick(list, mode, instant, map.prior ? 1 : 0);
        if (!fact) continue;
        let value = fact.val, note: string | undefined;
        if (map.average) {
          const before = pick(list, data.period, true, 1);
          if (!before) continue;
          value = (fact.val + before.val) / 2;
          note = `Average of filed balances at ${before.end} and ${fact.end}`;
        }
        out.push({ key, value: value * map.scale, concept: `${map.taxonomy ?? "us-gaap"}:${map.concept}`, form: fact.form, filed: fact.filed, periodStart: fact.start ?? null, periodEnd: fact.end, accession: fact.accn, url: `https://www.sec.gov/Archives/edgar/data/320193/${fact.accn.replace(/-/g, "")}/`, ...(note ? { note } : {}) });
      }
      return { figures: out, error: null as string | null };
    } catch (e) {
      console.error("SEC facts failed", e);
      return { figures: [] as VerifiedFigure[], error: "SEC EDGAR filings are unavailable right now. Try again shortly." };
    }
  });
