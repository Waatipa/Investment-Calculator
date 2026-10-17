import { createFileRoute } from "@tanstack/react-router";
import { MarketCalculator } from "@/components/market-calculator";
import { quotesQuery } from "@/lib/markets";

const TITLE = "Investico Academy | Financial Education & Market Tools";
const DESCRIPTION = "Investico Academy provides free educational resources and historical market calculators to help individuals learn the fundamentals of financial analysis.";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESCRIPTION },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESCRIPTION },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  loader: async ({ context }) => { await context.queryClient.ensureQueryData(quotesQuery()); },
  errorComponent: ({ error }) => <p role="alert" className="p-6">Market prices are unavailable: {error instanceof Error ? error.message : "Please try again."}</p>,
  notFoundComponent: () => <p className="p-6">Market page not found.</p>,
  component: MarketCalculator,
});
