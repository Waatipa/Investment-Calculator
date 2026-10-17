import type { UsdPoint } from "./compare";

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