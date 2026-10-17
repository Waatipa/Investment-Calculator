import type { UsdPoint } from "./compare";

/** Aggregate only holdings with a source-backed value; missing holdings stay excluded. */
export function portfolioTotals(holdings: { invested: number; value: number }[]) {
  const invested = holdings.reduce((sum, h) => sum + h.invested, 0);
  const value = holdings.reduce((sum, h) => sum + h.value, 0);
  const profit = value - invested;
  return { invested, value, profit, returnPct: invested > 0 ? profit / invested * 100 : null };
}

/** Last source observation on or before the shared calendar cursor. Never borrow a future close. */
export function pointAtDate(points: UsdPoint[], date: string): UsdPoint | null {
  let lo = 0, hi = points.length - 1, result: UsdPoint | null = null;
  while (lo <= hi) {
    const mid = Math.floor((lo + hi) / 2), p = points[mid];
    if (!p) break;
    if (p.date <= date) { result = p; lo = mid + 1; } else hi = mid - 1;
  }
  return result;
}

export function estimatedCapitalization(closeUsd: number, currentShares: number | null | undefined) {
  return currentShares != null && currentShares > 0 && closeUsd > 0 ? closeUsd * currentShares : null;
}