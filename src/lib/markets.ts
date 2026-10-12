import { queryOptions } from "@tanstack/react-query";
import { getMarketHistory, getMarketQuotes } from "./nvda.functions";

export const COMPANIES = [
  { symbol: "NVDA", name: "NVIDIA", brand: "var(--brand-nvda)" },
  { symbol: "AAPL", name: "Apple", brand: "var(--brand-aapl)" },
  { symbol: "MSFT", name: "Microsoft", brand: "var(--brand-msft)" },
  { symbol: "AMZN", name: "Amazon", brand: "var(--brand-amzn)" },
  { symbol: "GOOGL", name: "Alphabet", brand: "var(--brand-googl)" },
  { symbol: "META", name: "Meta", brand: "var(--brand-meta)" },
  { symbol: "TSLA", name: "Tesla", brand: "var(--brand-tsla)" },
] as const;
export type Symbol = typeof COMPANIES[number]["symbol"];
export function formatMarketCap(value: number | null | undefined) {
  if (value == null || !Number.isFinite(value) || value <= 0) return "Unavailable";
  const unit = value >= 1e12 ? { scale: 1e12, label: "T" } : value >= 1e9 ? { scale: 1e9, label: "B" } : { scale: 1e6, label: "M" };
  return `$${(value / unit.scale).toFixed(2)} ${unit.label}`;
}
export const TIMELINES = [
  { key: "1d", label: "1 day" }, { key: "5d", label: "5 days" },
  { key: "1mo", label: "1 month" }, { key: "6mo", label: "6 months" },
  { key: "1y", label: "1 year" }, { key: "5y", label: "5 years" },
] as const;
export type Timeline = typeof TIMELINES[number]["key"];
export const marketQuery = (symbol: Symbol = "NVDA", range: Timeline = "5y") => queryOptions({
  queryKey: ["market", symbol, range],
  queryFn: () => getMarketHistory({ data: { symbol, range } }),
   staleTime: 0,
   refetchOnMount: false,
   refetchInterval: 5_000,
});

export const quotesQuery = () => queryOptions({
  queryKey: ["market-quotes"],
  queryFn: () => getMarketQuotes(),
   staleTime: 0,
   refetchOnMount: false,
   refetchInterval: 1_000,
});

export const pageHead = (title: string, description: string) => ({ meta: [
  { title: `${title} — Investico Academy` },
  { name: "description", content: description },
  { property: "og:title", content: `${title} — Investico Academy` },
  { property: "og:description", content: description },
  { property: "og:type", content: "website" },
  { name: "twitter:card", content: "summary_large_image" },
] });