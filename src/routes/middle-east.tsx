import { Suspense } from "react";
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
    <Suspense fallback={<Cards />}><LiveCards /></Suspense>
  </main>;
}
function LiveCards() {
  const { data } = useSuspenseQuery(middleEastQuotesQuery());
  return <><Cards quotes={data} /><p className="market-footer">Market data provided by Yahoo Finance. Data may be delayed. Prices in local currency (SAR / AED); market caps in local currency.</p></>;
}
const money = (v: number, c: string | null) => `${c ?? ""} ${v.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`.trim();
function Cards({ quotes }: { quotes?: RegionalQuote[] }) {
  return <div className="company-grid" aria-label="Middle East companies">{ME_COMPANIES.map(c => {
    const q = quotes?.find(x => x.symbol === c.symbol);
    const change = q?.price != null && q.previousClose != null ? q.price - q.previousClose : null;
    const percent = change != null && q?.previousClose ? change / q.previousClose * 100 : null;
    const cap = formatMarketCap(q?.marketCap).replace("$", q?.currency ? `${q.currency} ` : "");
    return <div key={c.symbol} className="company-card company-panel-me">
      <div className="company-panel"><span className="company-initials">{c.initials}</span><div><div className="company-name">{c.name}</div><div className="company-symbol">{c.ticker}</div></div></div>
      <div className="quote-section"><div className="quote-meta"><span>{q?.marketOpen ? "Live" : "Close"}</span><span>{sourceDate(q?.time)}</span></div><div className="quote-price">{q?.price != null ? money(q.price, q.currency) : "—"}</div><Change change={change} percent={percent} /><div className="quote-time">{sourceTime(q?.time)}</div></div>
      <div className="quote-section off-hours"><div className="quote-meta"><span>Market Cap</span><span>{c.country}</span></div><div className="quote-price">{cap}</div></div>
    </div>;
  })}</div>;
}
