import { createFileRoute, notFound } from "@tanstack/react-router";
import { findEarningsCompany } from "@/lib/earnings-companies";
import { EarningsDashboard } from "@/components/earnings-dashboard";
import og from "@/assets/earnings-reactions-og.jpg.asset.json";

const IMG = `https://investicoacademy.lovable.app${og.url}`;

export const Route = createFileRoute("/earnings-reactions/$ticker")({
  loader: ({ params }) => { const c = findEarningsCompany(params.ticker); if (!c) throw notFound(); return { company: c }; },
  head: ({ params, loaderData }) => {
    const c = loaderData?.company;
    const title = c ? `${c.name} (${c.ticker}) Earnings Call Reactions — Investico Academy` : "Earnings Call Reactions — Investico Academy";
    const desc = c ? `Follow ${c.name}'s earnings call live: earnings surprise, revenue, guidance and sentiment gauges update with every statement.` : "Live earnings call sentiment.";
    const url = `https://investicoacademy.lovable.app/earnings-reactions/${params.ticker}`;
    return {
      meta: [{ title }, { name: "description", content: desc }, { property: "og:title", content: title }, { property: "og:description", content: desc }, { property: "og:type", content: "article" }, { property: "og:url", content: url }, { property: "og:image", content: IMG }, { name: "twitter:card", content: "summary_large_image" }, { name: "twitter:image", content: IMG }],
      links: [{ rel: "canonical", href: url }],
    };
  },
  notFoundComponent: () => <p className="p-6">That company isn't in Earnings Call Reactions.</p>,
  component: TickerPage,
});

function TickerPage() {
  const { company } = Route.useLoaderData();
  return <EarningsDashboard key={company.ticker} company={company} />;
}
