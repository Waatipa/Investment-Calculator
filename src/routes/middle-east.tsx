import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { pageHead } from "@/lib/markets";
import { ME_COMPANIES, middleEastQuotesQuery } from "@/lib/middle-east";
import { RegionTabs, MarketArtwork } from "@/components/market-calculator";
import { RegionalMarketCards } from "@/components/regional-market-cards";

export const Route = createFileRoute("/middle-east")({
  head: () => pageHead("Middle East Markets", "The region's largest listed companies on the Saudi Exchange (Tadawul), Abu Dhabi Securities Exchange (ADX) and Dubai Financial Market (DFM)."),
  loader: async ({ context }) => { await context.queryClient.ensureQueryData(middleEastQuotesQuery()); },
  errorComponent: ({ error }) => <p role="alert" className="p-6">Market prices are unavailable: {error instanceof Error ? error.message : "Please try again."}</p>,
  component: RegionPage,
});
function RegionPage() {
  const { data } = useSuspenseQuery(middleEastQuotesQuery());
  return <main className="market-page">
    <section className="reference-intro"><div className="reference-copy"><h1>Middle East Markets</h1><p>The region's largest listed companies on the Saudi Exchange (Tadawul), Abu Dhabi Securities Exchange (ADX) and Dubai Financial Market (DFM).</p></div><MarketArtwork /></section>
    <RegionTabs active="MIDDLE EAST" />
    <RegionalMarketCards companies={ME_COMPANIES} quotes={data} region="Middle East Markets" />
    <p className="market-footer">Market data provided by Yahoo Finance. Data may be delayed. Prices and market caps in local currency (SAR / AED). ADX listings are not carried by our provider; unavailable values are never estimated.</p>
  </main>;
}
