export function companySearch(search: Record<string, unknown>): { company?: string } {
  return typeof search['company'] === "string" ? { company: search['company'] } : {};
}

export function selectedCompany<T extends { symbol: string; notTrading?: boolean }>(companies: readonly T[], symbol?: string): T | undefined {
  return companies.find(c => c.symbol === symbol && !c.notTrading);
}