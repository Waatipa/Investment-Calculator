import { queryOptions } from "@tanstack/react-query";
import { getAfricaQuotes } from "./nvda.functions";

export const AF_COMPANIES = [
  { symbol: "NPN.JO", name: "Naspers", ticker: "JSE: NPN", country: "South Africa", initials: "NP", currency: "ZAR" },
  { symbol: "FSR.JO", name: "FirstRand", ticker: "JSE: FSR", country: "South Africa", initials: "FR", currency: "ZAR" },
  { symbol: "SBK.JO", name: "Standard Bank", ticker: "JSE: SBK", country: "South Africa", initials: "SB", currency: "ZAR" },
  { symbol: "CPI.JO", name: "Capitec Bank", ticker: "JSE: CPI", country: "South Africa", initials: "CB", currency: "ZAR" },
  { symbol: "GFI.JO", name: "Gold Fields", ticker: "JSE: GFI", country: "South Africa", initials: "GF", currency: "ZAR" },
  { symbol: "ATW.CS", name: "Attijariwafa Bank", ticker: "Casablanca: ATW", country: "Morocco", initials: "AW", currency: "MAD" },
  { symbol: "MTN.JO", name: "MTN Group", ticker: "JSE: MTN", country: "South Africa", initials: "MT", currency: "ZAR" },
  { symbol: "DANGCEM.LG", name: "Dangote Cement", ticker: "NGX: DANGCEM", country: "Nigeria", initials: "DC", currency: "NGN" },
] as const;

export const africaQuotesQuery = () => queryOptions({
  queryKey: ["africa-quotes"], queryFn: () => getAfricaQuotes(),
  staleTime: 0, refetchOnMount: false, refetchInterval: 5_000,
});