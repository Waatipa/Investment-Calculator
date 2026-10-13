import { Suspense, useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { ProCalculatorChoices, FinancialMetricForm } from "@/components/pro-calculator";
import type { FinancialMetric } from "@/lib/financial-metrics";
import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { pageHead, formatMarketCap } from "@/lib/markets";
import { ME_COMPANIES, middleEastQuotesQuery } from "@/lib/middle-east";
import type { RegionalQuote } from "@/lib/nvda.functions";
import { RegionTabs, MarketArtwork, Change, sourceDate, sourceTime } from "@/components/market-calculator";

export const Route = createFileRoute("/middle-east")({
  head: () => pageHead("Middle East Markets", "Live prices and market caps for the largest Middle East companies on Tadawul, ADX and DFM, including Saudi Aramco, IHC and Al Rajhi Bank."),
  loader: async ({ context }) => { await context.queryClient.ensureQueryData(middleEastQuotesQuery()); },
  errorComponent: ({ error }) => <p role="alert" className="p-6">Market prices are unavailable: {error instanceof Error ? error.message : "Please try again."}</p>,
  notFoundComponent: () => <p className="p-6">Page not found.</p>,
  component: MiddleEastPage,
});

function MiddleEastPage() {
  return <main className="market-page">
    <section className="reference-intro">
      <div className="reference-copy"><h1>Middle East Markets</h1>
        <p>The region's largest listed companies on the Saudi Exchange (Tadawul), Abu Dhabi Securities Exchange (ADX) and Dubai Financial Market (DFM).</p></div>
      <MarketArtwork />
    </section>
    <RegionTabs active="MIDDLE EAST" />
    <Suspense fallback={<Cards onOpen={() => {}} />}><LiveCards /></Suspense>
  </main>;
}
function LiveCards() {
  const { data } = useSuspenseQuery(middleEastQuotesQuery());
  const [open, setOpen] = useState<string | null>(null);
  const [metric, setMetric] = useState<FinancialMetric | null>(null);
  const company = ME_COMPANIES.find(c => c.symbol === open);
  const currency = data.find(q => q.symbol === open)?.currency ?? "SAR";
  return <><Cards quotes={data} onOpen={s => { setOpen(s); setMetric(null); }} />
    <Dialog open={!!open} onOpenChange={o => { if (!o) { setOpen(null); setMetric(null); } }}>
      <DialogContent className="company-dialog pro-dialog max-h-[90dvh] w-[calc(100%-1.5rem)] max-w-3xl overflow-y-auto overflow-x-hidden rounded-lg p-4 sm:p-6">
        <DialogHeader className="company-dialog-heading"><div className="pro-heading-row"><span className="company-initials">{company?.initials}</span><div><div className="mb-2 text-xs font-semibold uppercase text-muted-foreground">{company?.name} · {company?.ticker}</div><DialogTitle className="pr-8 font-display text-xl">{metric?.name ?? `${company?.name} pro calculator`}</DialogTitle></div></div><DialogDescription>{metric ? `${company?.name} financial analysis · ${currency}` : "Choose a calculator."}</DialogDescription></DialogHeader>
        {company && (metric ? <FinancialMetricForm key={`${company.symbol}-${metric.id}`} symbol={company.symbol} companyName={company.name} currency={currency} metric={metric} onBack={() => setMetric(null)} onStageChange={() => {}} /> : <ProCalculatorChoices hideProfit onChoose={m => { if (m !== "profit") setMetric(m); }} />)}
      </DialogContent>
    </Dialog><p className="market-footer">Market data provided by Yahoo Finance. Data may be delayed. Prices and market caps in local currency (SAR / AED). Abu Dhabi (ADX) listings are not yet carried by our data provider, so their prices show "—" rather than estimates.</p></>;
}
const money = (v: number, c: string | null) => `${c ?? ""} ${v.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`.trim();
function Cards({ quotes, onOpen }: { quotes?: RegionalQuote[]; onOpen: (symbol: string) => void }) {
  return <div className="company-grid" aria-label="Middle East companies">{ME_COMPANIES.map(c => {
    const q = quotes?.find(x => x.symbol === c.symbol);
    const change = q?.price != null && q.previousClose != null ? q.price - q.previousClose : null;
    const percent = change != null && q?.previousClose ? change / q.previousClose * 100 : null;
    const cap = formatMarketCap(q?.marketCap).replace("$", q?.currency ? `${q.currency} ` : "");
    return <Button key={c.symbol} variant="ghost" type="button" aria-label={`${c.name} calculator`} onClick={() => onOpen(c.symbol)} className="company-card company-panel-me">
      <div className="company-panel"><span className="company-initials">{c.initials}</span><div><div className="company-name">{c.name}</div><div className="company-symbol">{c.ticker}</div></div></div>
      <div className="quote-section"><div className="quote-meta"><span>{q?.marketOpen ? "Live" : "Close"}</span><span>{sourceDate(q?.time)}</span></div><div className="quote-price">{q?.price != null ? money(q.price, q.currency) : "—"}</div><Change change={change} percent={percent} /><div className="quote-time">{sourceTime(q?.time)}</div></div>
      <div className="quote-section off-hours"><div className="quote-meta"><span>Market Cap</span><span>{c.country}</span></div><div className="quote-price">{cap}</div></div>
    </Button>;
  })}</div>;
}
