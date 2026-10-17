import { useState } from "react";
import { useQueries } from "@tanstack/react-query";
import { getFxRate } from "@/lib/fx.functions";
import { FX_CURRENCIES } from "@/lib/display-prefs";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { ProCalculatorChoices, FinancialMetricForm } from "@/components/pro-calculator";
import type { FinancialMetric } from "@/lib/financial-metrics";
import type { RegionalQuote } from "@/lib/nvda.functions";
import { Change, sourceDate, sourceTime } from "@/components/market-calculator";
import { formatMarketCap } from "@/lib/markets";
import { RegionalProfitCalculator } from "./regional-profit-calculator";
import { LocationButton, LocalTimeToggle } from "./display-prefs";
import { usePrefs } from "@/lib/display-prefs";
import { StockOverviewDialog } from "./stock-overview";
import { useNavigationStep } from "./navigation-trail";

export type RegionalCompany = { symbol: string; name: string; ticker: string; country: string; initials: string; currency?: string; notTrading?: boolean };
export function marketCapCurrency(currency: string | null | undefined) {
  return currency === "GBp" || currency === "GBX" ? "GBP" : currency === "ZAc" ? "ZAR" : currency;
}
export function RegionalMarketCards({ companies, quotes, region }: { companies: readonly RegionalCompany[]; quotes: RegionalQuote[]; region: string }) {
  const { localTime: lt } = usePrefs();
  const [open, setOpen] = useState<string | null>(null);
  const [overview, setOverview] = useState<string | null>(null);
  const [metric, setMetric] = useState<FinancialMetric | "profit" | null>(null);
  const [profitResult, setProfitResult] = useState(false);
  const capCurrencies = [...new Set(quotes.map(q => marketCapCurrency(q.currency)).filter((c): c is string => !!c && c !== "USD" && FX_CURRENCIES.includes(c)))];
  const fx = useQueries({ queries: capCurrencies.map(c => ({ queryKey: ["fx", c, "USD"], queryFn: () => getFxRate({ data: { from: c, to: "USD" } }), staleTime: 60_000, retry: false })) });
  const usdRate = (c: string | null | undefined) => { const k = marketCapCurrency(c); if (k === "USD") return 1; const i = capCurrencies.indexOf(k ?? ""); return i >= 0 ? fx[i]?.data?.rate ?? null : null; };
  const capUsd = (s: string) => { const q = quotes.find(x => x.symbol === s); const r = usdRate(q?.currency); return q?.marketCap != null && r != null ? q.marketCap * r : -1; };
  const sorted = [...companies].sort((a, b) => capUsd(b.symbol) - capUsd(a.symbol));
  const company = companies.find(c => c.symbol === open);
  const quote = quotes.find(q => q.symbol === open);
  const currency = quote?.currency === "ZAc" ? "ZAR" : quote?.currency ?? company?.currency ?? (region.includes("Middle East") ? "AED" : "EUR");
  useNavigationStep([companies.find(c => c.symbol === overview)?.name ?? overview ?? "Company", "Overview"], () => setOverview(null), !!overview);
  useNavigationStep([company?.name ?? open ?? "Company", "Overview", "Calculators", ...(metric ? [metric === "profit" ? "Profit calculator" : metric.name] : []), ...(profitResult ? ["Results"] : [])], () => {
    if (profitResult) {
      const edit = document.querySelector<HTMLButtonElement>("[role=dialog] [data-edit-investment]") ?? document.querySelector<HTMLButtonElement>("[role=dialog] .pro-back");
      edit?.click();
    }
    else if (metric) setMetric(null);
    else { setOverview(open); setOpen(null); }
  }, !!open);
  return <>
    <div className="company-grid" aria-label={`${region} companies`}>{sorted.map(c => {
      if (c.notTrading) return <div key={c.symbol} data-company={c.symbol} className="company-card regional-company">
        <div className="company-panel"><span className="company-initials">{c.initials}</span><div><div className="company-name">{c.name}</div><div className="company-symbol">{c.ticker}</div></div></div>
        <div className="quote-section ipo-notice"><span>Public offer open until 27 October</span><span>Shares are not trading yet</span></div>
        <div className="quote-section off-hours regional-country"><span>{c.country}</span></div>
      </div>;
      const q = quotes.find(x => x.symbol === c.symbol);
      const change = q?.price != null && q.previousClose != null ? q.price - q.previousClose : null;
      const percent = change != null && q?.previousClose ? change / q.previousClose * 100 : null;
      const cap = q?.marketCap != null && q.currency ? formatMarketCap(q.marketCap).replace("$", `${marketCapCurrency(q.currency)} `) : "Unavailable";
      return <Button key={c.symbol} variant="ghost" type="button" data-company={c.symbol} aria-label={`${c.name} calculator`} onClick={() => { setOverview(c.symbol); setMetric(null); setProfitResult(false); }} className="company-card regional-company">
        <div className="company-panel"><span className="company-initials">{c.initials}</span><div><div className="company-name">{c.name}</div><div className="company-symbol">{c.ticker}</div><div className="company-market-cap">Market cap · {cap}</div></div></div>
        <div className="quote-section"><div className="quote-meta"><span>{q?.marketOpen ? "Live" : "Close"}</span><span>{sourceDate(q?.time, lt)}</span></div><div className="quote-price">{q?.price != null ? `${q.currency ?? ""} ${q.price.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : "—"}</div><Change change={change} percent={percent} /><div className="quote-time">{sourceTime(q?.time, lt)} <LocalTimeToggle /></div></div>
        <div className="quote-section off-hours regional-country"><span>{c.country}</span></div>
      </Button>;
    })}</div>
    <StockOverviewDialog symbol={overview} initials={companies.find(c => c.symbol === overview)?.initials} open={!!overview} onOpenChange={o => { if (!o) setOverview(null); }} onProceed={() => { setOpen(overview); setOverview(null); }} />
    <Dialog open={!!open} onOpenChange={o => { if (!o) { setOpen(null); setMetric(null); } }}>
      <DialogContent data-company={company?.symbol} className="company-dialog pro-dialog regional-company max-h-[90dvh] w-[calc(100%-1.5rem)] max-w-3xl overflow-y-auto overflow-x-hidden rounded-lg p-4 sm:p-6">
        <DialogHeader className="company-dialog-heading"><div className="pro-heading-row"><span className="company-initials">{company?.initials}</span><div><div className="mb-2 text-xs font-semibold uppercase text-muted-foreground">{company?.name} · {company?.ticker}</div><DialogTitle className="pr-8 font-display text-xl">{metric === "profit" ? `${company?.name} ${profitResult ? "investment result" : "profit calculator"}` : metric?.name ?? `${company?.name} pro calculator`}</DialogTitle></div></div><DialogDescription>{metric === "profit" ? profitResult ? "Source-priced investment returns." : "Enter your dates and shares or amount, then calculate." : metric ? `${company?.name} financial analysis · ${currency}` : "Choose a calculator."}</DialogDescription></DialogHeader>
        {company && metric == null && <div className="location-row"><LocationButton homeCurrency={currency} /></div>}
        {company && (metric === "profit" ? <RegionalProfitCalculator key={company.symbol} symbol={company.symbol} onBack={() => { setMetric(null); setProfitResult(false); }} onStageChange={setProfitResult} /> : metric ? <FinancialMetricForm key={`${company.symbol}-${metric.id}`} symbol={company.symbol} companyName={company.name} currency={currency} metric={metric} onBack={() => { setMetric(null); setProfitResult(false); }} onStageChange={setProfitResult} /> : <ProCalculatorChoices onChoose={m => { setMetric(m); setProfitResult(false); }} />)}
      </DialogContent>
    </Dialog>
  </>;
}