import { companySearch } from "@/lib/company-selection";
import { createFileRoute } from "@tanstack/react-router";
import { MarketCalculator } from "@/components/market-calculator";
import { quotesQuery, pageHead } from "@/lib/markets";

export const Route = createFileRoute("/markets")({
  validateSearch: companySearch,
   head: () => pageHead("Markets", "Explore sourced stock prices and historical investment calculators for SpaceX, Apple, Microsoft, NVIDIA, Amazon, Alphabet, Meta, and Tesla."),
  loader: async ({ context }) => { await context.queryClient.ensureQueryData(quotesQuery()); },
  errorComponent: ({ error }) => <p role="alert" className="p-6">Market prices are unavailable: {error instanceof Error ? error.message : "Please try again."}</p>,
  notFoundComponent: () => <p className="p-6">Market page not found.</p>,
   component: MarketsPage,
});

function MarketsPage() {
  const { company } = Route.useSearch();
  return <MarketCalculator initialCompany={company} />;
}