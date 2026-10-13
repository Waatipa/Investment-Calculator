import { queryOptions } from "@tanstack/react-query";
import { getEuropeQuotes } from "./nvda.functions";

export const EU_COMPANIES = [
  { symbol: "ASML.AS", name: "ASML Holding", ticker: "Euronext Amsterdam: ASML", country: "Netherlands", initials: "AS" },
  { symbol: "MC.PA", name: "LVMH", ticker: "Euronext Paris: MC", country: "France", initials: "LV" },
  { symbol: "SAP.DE", name: "SAP", ticker: "XETRA: SAP", country: "Germany", initials: "SP" },
  { symbol: "NESN.SW", name: "Nestlé", ticker: "SIX: NESN", country: "Switzerland", initials: "NE" },
  { symbol: "NOVO-B.CO", name: "Novo Nordisk", ticker: "Nasdaq Copenhagen: NOVO-B", country: "Denmark", initials: "NO" },
  { symbol: "RO.SW", name: "Roche", ticker: "SIX: RO", country: "Switzerland", initials: "RO" },
  { symbol: "AZN.L", name: "AstraZeneca", ticker: "LSE: AZN", country: "United Kingdom", initials: "AZ" },
  { symbol: "HSBA.L", name: "HSBC Holdings", ticker: "LSE: HSBA", country: "United Kingdom", initials: "HS" },
] as const;

export const europeQuotesQuery = () => queryOptions({
  queryKey: ["europe-quotes"],
  queryFn: () => getEuropeQuotes(),
  staleTime: 0,
  refetchOnMount: false,
  refetchInterval: 5_000,
});
