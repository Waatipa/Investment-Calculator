import { queryOptions } from "@tanstack/react-query";
import { getMiddleEastQuotes } from "./nvda.functions";

export const ME_COMPANIES = [
  { symbol: "2222.SR", name: "Saudi Aramco", ticker: "Tadawul: 2222", country: "Saudi Arabia", initials: "SA" },
  { symbol: "IHC.AD", name: "International Holding Co.", ticker: "ADX: IHC", country: "UAE", initials: "IH" },
  { symbol: "1120.SR", name: "Al Rajhi Bank", ticker: "Tadawul: 1120", country: "Saudi Arabia", initials: "AR" },
  { symbol: "TAQA.AD", name: "TAQA Group", ticker: "ADX: TAQA", country: "UAE", initials: "TQ" },
  { symbol: "1211.SR", name: "Ma'aden", ticker: "Tadawul: 1211", country: "Saudi Arabia", initials: "MA" },
  { symbol: "ADNOCGAS.AD", name: "ADNOC Gas", ticker: "ADX: ADNOCGAS", country: "UAE", initials: "AG" },
  { symbol: "1180.SR", name: "Saudi National Bank", ticker: "Tadawul: 1180", country: "Saudi Arabia", initials: "SN" },
  { symbol: "7010.SR", name: "stc Group", ticker: "Tadawul: 7010", country: "Saudi Arabia", initials: "ST" },
  { symbol: "FAB.AD", name: "First Abu Dhabi Bank", ticker: "ADX: FAB", country: "UAE", initials: "FA" },
  { symbol: "EMIRATESNBD.AE", name: "Emirates NBD", ticker: "DFM: EMIRATESNBD", country: "UAE", initials: "EN" },
  { symbol: "MASQ.AE", name: "Mashreq Bank", ticker: "DFM: MASQ", country: "UAE", initials: "MB" },
] as const;

export const middleEastQuotesQuery = () => queryOptions({
  queryKey: ["middle-east-quotes"],
  queryFn: () => getMiddleEastQuotes(),
  staleTime: 0,
  refetchOnMount: false,
  refetchInterval: 5_000,
});
