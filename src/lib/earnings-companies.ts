// Editable list of companies shown on /earnings-reactions.
// slug = URL segment, yahoo = quote symbol used for the delayed price panel and earnings dates.
export const EARNINGS_COMPANIES = [
  { ticker: "AAPL", slug: "aapl", yahoo: "AAPL", name: "Apple" },
  { ticker: "MSFT", slug: "msft", yahoo: "MSFT", name: "Microsoft" },
  { ticker: "NVDA", slug: "nvda", yahoo: "NVDA", name: "NVIDIA" },
  { ticker: "AMZN", slug: "amzn", yahoo: "AMZN", name: "Amazon" },
  { ticker: "GOOGL", slug: "googl", yahoo: "GOOGL", name: "Alphabet" },
  { ticker: "META", slug: "meta", yahoo: "META", name: "Meta (Facebook)" },
  { ticker: "TSLA", slug: "tsla", yahoo: "TSLA", name: "Tesla" },
  { ticker: "AVGO", slug: "avgo", yahoo: "AVGO", name: "Broadcom" },
  { ticker: "BRK.B", slug: "brk-b", yahoo: "BRK-B", name: "Berkshire Hathaway" },
  { ticker: "JPM", slug: "jpm", yahoo: "JPM", name: "JPMorgan Chase" },
] as const;
export type EarningsCompany = typeof EARNINGS_COMPANIES[number];
export const findEarningsCompany = (slug: string) => EARNINGS_COMPANIES.find(c => c.slug === slug.toLowerCase());
export const findByTicker = (ticker: string) => EARNINGS_COMPANIES.find(c => c.ticker === ticker.toUpperCase());
