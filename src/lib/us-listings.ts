// Browser-safe ticker identity shared by every US market-data path.
export const US_SYMBOLS = ["NVDA", "AAPL", "MSFT", "AMZN", "GOOGL", "META", "TSLA", "SPCX"] as const;
export const SPACEX_LISTING_DATE = "2026-06-12";
export function listingDate(symbol: string): string | undefined {
  return symbol === "SPCX" ? SPACEX_LISTING_DATE : undefined;
}
export function isListingObservation(symbol: string, timestamp: number): boolean {
  const first = listingDate(symbol);
  return !first || timestamp >= Date.parse(`${first}T00:00:00Z`);
}
export function requireListingDate(symbol: string, date: string): void {
  const first = listingDate(symbol);
  if (first && date < first) throw new Error("SpaceX trading history starts on 12 June 2026. Choose an investment date on or after that date.");
}