export type PageVisit = { href: string; label: string; source: string | null; scroll: number };
export const RETURN_HIGHLIGHT_MS = 1000;

export function previousVisit(visits: readonly PageVisit[], href: string): number {
  for (let i = visits.length - 2; i >= 0; i--) if (visits[i]?.href === href) return i;
  return -1;
}

export function canGoBack(visits: readonly PageVisit[], localDepth: number): boolean {
  return visits.length > 1 || localDepth > 0;
}

export function pageLabel(path: string): string {
  const labels: Record<string, string> = { "/": "Home", "/markets": "US Markets", "/europe": "Europe", "/africa": "Africa", "/middle-east": "Middle East", "/compare": "Compare Stocks", "/about-us": "About Us", "/contact-us": "Contact Us", "/subscribe": "Subscribe", "/ask-investments": "Ask Investments", "/auth": "Sign in", "/ask": "Company filings" };
  return labels[path.replace(/\/$/, "") || "/"] ?? (path.startsWith("/ask/") ? "Filings conversation" : "Investico Academy");
}