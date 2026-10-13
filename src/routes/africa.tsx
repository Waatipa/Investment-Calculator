import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { pageHead } from "@/lib/markets";
import { AF_COMPANIES, africaQuotesQuery } from "@/lib/africa";
import { RegionTabs, MarketArtwork } from "@/components/market-calculator";
import { RegionalMarketCards } from "@/components/regional-market-cards";

export const Route = createFileRoute("/africa")({
  head: () => pageHead("Africa Markets", "Explore eight leading African publicly traded companies, source-reported prices, market capitalization and company-specific financial calculators."),
  loader: async ({ context }) => { await context.queryClient.ensureQueryData(africaQuotesQuery()); },
  errorComponent: ({ error }) => <p role="alert" className="p-6">Market prices are unavailable: {error instanceof Error ? error.message : "Please try again."}</p>,
  component: AfricaPage,
});
function AfricaPage() {
  const { data } = useSuspenseQuery(africaQuotesQuery());
  return <main className="market-page">
    <section className="reference-intro"><div className="reference-copy"><h1>Africa Markets</h1><p>Eight leading African listed companies across technology, banking, mining and telecommunications. A large-cap selection, not a live continent-wide ranking.</p></div><MarketArtwork /></section>
    <RegionTabs active="AFRICA" />
    <RegionalMarketCards companies={AF_COMPANIES} quotes={data} region="African" />
    <p className="market-footer">Market data provided by Yahoo Finance; may be delayed. JSE share prices in South African cents (ZAc), market caps in rand (ZAR). Calculators use labeled provider summaries in the reporting currency. Attijariwafa Bank and Dangote Cement are not covered by this feed: prices and market caps are unavailable; their calculators accept user-entered figures. Quote timestamps shown in ET.</p>
  </main>;
}