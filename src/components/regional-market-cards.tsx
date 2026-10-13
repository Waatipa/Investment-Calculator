import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { ProCalculatorChoices, FinancialMetricForm } from "@/components/pro-calculator";
import type { FinancialMetric } from "@/lib/financial-metrics";
import type { RegionalQuote } from "@/lib/nvda.functions";
import { Change, sourceDate, sourceTime } from "@/components/market-calculator";
import { formatMarketCap } from "@/lib/markets";

export type RegionalCompany = { symbol: string; name: string; ticker: string; country: string; initials: string };
export function marketCapCurrency(currency: string | null | undefined) {
  return currency === "GBp" || currency === "GBX" ? "GBP" : currency === "ZAc" ? "ZAR" : currency;
}
export function RegionalMarketCards({ companies, quotes, region }: { companies: readonly RegionalCompany[]; quotes: RegionalQuote[]; region: string }) {
  const [open, setOpen] = useState<string | null>(null);
  const [metric, setMetric] = useState<FinancialMetric | null>(null);
  const company = companies.find(c => c.symbol === open);
  const quote = quotes.find(q => q.symbol === open);
  const currency = quote?.currency === "ZAc" ? "ZAR" : quote?.currency ?? "USD";
  return <>
    <div className="company-grid" aria-label={`${region} companies`}>{companies.map(c => {
      const q = quotes.find(x => x.symbol === c.symbol);
      const change = q?.price != null && q.previousClose != null ? q.price - q.previousClose : null;
      const percent = change != null && q?.previousClose ? change / q.previousClose * 100 : null;
      const cap = q?.marketCap != null && q.currency ? formatMarketCap(q.marketCap).replace("$", `${marketCapCurrency(q.currency)} `) : "Unavailable";
      return <Button key={c.symbol} variant="ghost" type="button" data-company={c.symbol} aria-label={`${c.name} calculator`} onClick={() => { setOpen(c.symbol); setMetric(null); }} className="company-card regional-company">
        <div className="company-panel"><span className="company-initials">{c.initials}</span><div><div className="company-name">{c.name}</div><div className="company-symbol">{c.ticker}</div><div className="company-market-cap">Market cap · {cap}</div></div></div>
        <div className="quote-section"><div className="quote-meta"><span>{q?.marketOpen ? "Live" : "Close"}</span><span>{sourceDate(q?.time)}</span></div><div className="quote-price">{q?.price != null ? `${q.currency ?? ""} ${q.price.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : "—"}</div><Change change={change} percent={percent} /><div className="quote-time">{sourceTime(q?.time)}</div></div>
        <div className="quote-section off-hours regional-country"><span>{c.country}</span></div>
      </Button>;
    })}</div>
    <Dialog open={!!open} onOpenChange={o => { if (!o) { setOpen(null); setMetric(null); } }}>
      <DialogContent data-company={company?.symbol} className="company-dialog pro-dialog regional-company max-h-[90dvh] w-[calc(100%-1.5rem)] max-w-3xl overflow-y-auto overflow-x-hidden rounded-lg p-4 sm:p-6">
        <DialogHeader className="company-dialog-heading"><div className="pro-heading-row"><span className="company-initials">{company?.initials}</span><div><div className="mb-2 text-xs font-semibold uppercase text-muted-foreground">{company?.name} · {company?.ticker}</div><DialogTitle className="pr-8 font-display text-xl">{metric?.name ?? `${company?.name} pro calculator`}</DialogTitle></div></div><DialogDescription>{metric ? `${company?.name} financial analysis · ${currency}` : "Choose a calculator."}</DialogDescription></DialogHeader>
        {company && (metric ? <FinancialMetricForm key={`${company.symbol}-${metric.id}`} symbol={company.symbol} companyName={company.name} currency={currency} metric={metric} onBack={() => setMetric(null)} onStageChange={() => {}} /> : <ProCalculatorChoices hideProfit onChoose={m => { if (m !== "profit") setMetric(m); }} />)}
      </DialogContent>
    </Dialog>
  </>;
}