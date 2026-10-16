// Browser-safe, persisted chart appearance shared by every calculator chart (Investico blue by default).
import { useSyncExternalStore } from "react";

export type ChartType = "candle" | "line" | "area" | "bar";
export type ChartSettings = {
  type: ChartType;
  bg: "white" | "dark" | "custom"; bgCustom: string;
  text: "black" | "white" | "custom"; textCustom: string;
  bullBody: string; bullBorder: string; bullWick: string;
  bearBody: string; bearBorder: string; bearWick: string;
  trend: string;
  gridH: boolean; gridV: boolean;
  priceLabels: boolean; log: boolean; volume: boolean;
  thickness: number; spacing: number; crosshair: boolean;
};

export const INVESTICO_BLUE = "#2a9fb8";
export const DEFAULT_CHART: ChartSettings = {
  type: "candle", bg: "white", bgCustom: "#f4fbfd", text: "black", textCustom: "#16324a",
  bullBody: "#75d4e6", bullBorder: INVESTICO_BLUE, bullWick: INVESTICO_BLUE,
  bearBody: "#1e4f6b", bearBorder: "#1e4f6b", bearWick: "#1e4f6b",
  trend: INVESTICO_BLUE, gridH: true, gridV: false, priceLabels: true, log: false, volume: true,
  thickness: 3, spacing: 0.4, crosshair: true,
};

const KEY = "investico-chart-settings";
let state: ChartSettings = DEFAULT_CHART;
let loaded = false;
const subs = new Set<() => void>();
function load() {
  if (loaded || typeof window === "undefined") return;
  loaded = true;
  try { const raw = localStorage.getItem(KEY); if (raw) state = { ...DEFAULT_CHART, ...JSON.parse(raw) }; } catch { /* ignore */ }
}
export function setChart(patch: Partial<ChartSettings>) {
  load(); state = { ...state, ...patch };
  try { localStorage.setItem(KEY, JSON.stringify(state)); } catch { /* ignore */ }
  subs.forEach(f => f());
}
export const resetChart = () => setChart(DEFAULT_CHART);
export function useChartSettings() {
  return useSyncExternalStore(f => { subs.add(f); return () => subs.delete(f); }, () => { load(); return state; }, () => DEFAULT_CHART);
}

const lum = (hex: string) => {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex); if (!m) return 1;
  const n = parseInt(m[1]!, 16); const c = [n >> 16, (n >> 8) & 255, n & 255].map(v => { v /= 255; return v <= .03928 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4; });
  return .2126 * c[0]! + .7152 * c[1]! + .0722 * c[2]!;
};
const contrast = (a: string, b: string) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x! + .05) / (y! + .05); };

/** Resolved colours; text flips to black/white when the chosen colour would be unreadable on the background. */
export function chartColors(s: ChartSettings) {
  const bg = s.bg === "dark" ? "#0f1e2e" : s.bg === "white" ? "#ffffff" : s.bgCustom;
  let fg = s.text === "white" ? "#ffffff" : s.text === "black" ? "#16202b" : s.textCustom;
  if (contrast(fg, bg) < 3) fg = lum(bg) > .4 ? "#16202b" : "#ffffff";
  const grid = lum(bg) > .4 ? "rgba(22,32,43,.12)" : "rgba(255,255,255,.14)";
  return { bg, fg, grid, muted: lum(bg) > .4 ? "rgba(22,32,43,.62)" : "rgba(255,255,255,.7)" };
}
