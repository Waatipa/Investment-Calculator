import { companySearch } from "@/lib/company-selection";
import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { pageHead } from "@/lib/markets";
import { EU_COMPANIES, europeQuotesQuery } from "@/lib/europe";
import { RegionTabs, MarketArtwork } from "@/components/market-calculator";
import { RegionalMarketCards } from "@/components/regional-market-cards";

export const Route = createFileRoute("/europe")({
  validateSearch: companySearch,
  head: () => pageHead("Europe Markets", "The continent's largest listed companies on Euronext Amsterdam and Paris, XETRA, SIX Swiss Exchange, Nasdaq Copenhagen and the London Stock Exchange."),
  loader: async ({ context }) => { await context.queryClient.ensureQueryData(europeQuotesQuery()); },
  errorComponent: ({ error }) => <p role="alert" className="p-6">Market prices are unavailable: {error instanceof Error ? error.message : "Please try again."}</p>,
  component: RegionPage,
});
function RegionPage() {
  const { company } = Route.useSearch();
  const navigate = Route.useNavigate();
  const dismiss = () => { if (company) void navigate({ search: {}, replace: true }); };
  const { data } = useSuspenseQuery(europeQuotesQuery());
  return <main className="market-page">
    <section className="reference-intro"><div className="reference-copy"><h1>Europe Markets</h1><p>The continent's largest listed companies on Euronext Amsterdam and Paris, XETRA, SIX Swiss Exchange, Nasdaq Copenhagen and the London Stock Exchange.</p></div><MarketArtwork /></section>
    <RegionTabs active="EUROPE" />
    <RegionalMarketCards onOverviewDismiss={dismiss} initialCompany={company} companies={EU_COMPANIES} quotes={data} region="Europe Markets" />
    <p className="market-footer">Market data provided by Yahoo Finance. Data may be delayed. Prices in local currency. Market caps in currency units (GBP for London listings); London share prices in pence (GBp).</p>
  </main>;
}
