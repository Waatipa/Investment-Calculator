// Pure scoring maths for Earnings Call Reactions (unchanged from the reference dashboard).
export type Pair = { a: number | null; e: number | null };
export type CallState = { eps: Pair; rev: Pair; guid: { g: number | null; e: number | null }; sector: number | null; sent: number };
export type Tone = "g" | "r" | "n";

export const sg = (v: number) => (v > 0 ? "+" : v < 0 ? "−" : "") + Math.abs(v).toFixed(1);
export const clamp = (v: number, a = 100) => Math.max(-a, Math.min(a, v));
const pct = (p: Pair) => (p.a == null || p.e == null || p.e === 0 ? null : ((p.a - p.e) / Math.abs(p.e)) * 100);

export type Factor = { k: "eps" | "rev" | "guid" | "sector" | "sent"; n: string; s: string; min: number; max: number; fs: number; w: number; u: string; v: (d: CallState) => number | null; cap: (d: CallState) => string; t: string; b: string; r: string };
const m = (v: number | null, f: (x: number) => string) => (v == null ? "awaiting" : f(v));

export const FACTORS: Factor[] = [
  { k: "eps", n: "Earnings Surprise", s: "EPS vs. consensus", min: -20, max: 20, fs: 20, w: 30, u: "%", v: d => pct(d.eps), cap: d => `Actual ${m(d.eps.a, x => "$" + x.toFixed(2))} vs expected ${m(d.eps.e, x => "$" + x.toFixed(2))}`, t: "Surprise vs. expected", b: "Higher EPS than expected signals stronger profitability and demand.", r: "Lower EPS than expected signals weaker profitability." },
  { k: "rev", n: "Revenue Surprise", s: "Revenue vs. consensus", min: -20, max: 20, fs: 10, w: 20, u: "%", v: d => pct(d.rev), cap: d => `Actual ${m(d.rev.a, x => "$" + x.toFixed(1) + "B")} vs expected ${m(d.rev.e, x => "$" + x.toFixed(1) + "B")}`, t: "Surprise vs. expected", b: "Higher revenue than expected indicates stronger business momentum.", r: "Lower revenue than expected points to slowing demand." },
  { k: "guid", n: "Forward Guidance", s: "Next-quarter revenue outlook", min: -15, max: 15, fs: 15, w: 20, u: " pts", v: d => (d.guid.g == null || d.guid.e == null ? null : d.guid.g - d.guid.e), cap: d => `Guided ${m(d.guid.g, x => sg(x) + "%")} vs Street ${m(d.guid.e, x => sg(x) + "%")}`, t: "Gap vs. expected guidance (percentage points)", b: "Guidance above expectations signals accelerating growth.", r: "Weaker guidance can signal slower growth ahead." },
  { k: "sector", n: "Sector Weakness", s: "Sector move vs. market", min: -10, max: 10, fs: 10, w: 15, u: "%", v: d => d.sector, cap: d => `Sector ${m(d.sector, x => sg(x) + "%")} vs market 0.0%`, t: "Sector vs. market", b: "A strong sector lifts buying interest.", r: "A weak sector can increase selling pressure." },
  { k: "sent", n: "Market Sentiment", s: "News & social sentiment", min: -100, max: 100, fs: 100, w: 15, u: "", v: d => d.sent, cap: () => "Score from −100 to +100", t: "Sentiment score", b: "Positive sentiment can amplify upside moves.", r: "Negative sentiment can amplify downside moves." },
];

export function label(s: number): [string, Tone] {
  return s >= 40 ? ["STRONG BULLISH", "g"] : s >= 10 ? ["BULLISH", "g"] : s > -10 ? ["NEUTRAL", "n"] : s > -40 ? ["BEARISH", "r"] : ["STRONG BEARISH", "r"];
}
export const arrow = (c: Tone) => (c === "g" ? "↗" : c === "r" ? "↘" : "→");

export type FactorResult = { f: Factor; v: number | null; score: number; contribution: number; tone: Tone };
export function computeScores(d: CallState) {
  const rows: FactorResult[] = FACTORS.map(f => {
    const v = f.v(d);
    const score = v == null ? 0 : clamp((v / f.fs) * 100);
    const tone: Tone = score >= 10 ? "g" : score <= -10 ? "r" : "n";
    return { f, v, score, contribution: (score * f.w) / 100, tone };
  });
  const overall = rows.reduce((t, r) => t + r.contribution, 0);
  return { rows, overall };
}

export function meaning(overall: number, rows: FactorResult[]) {
  const [L] = label(overall);
  const pos = rows.filter(r => r.tone === "g").map(r => r.f.n.toLowerCase());
  const neg = rows.filter(r => r.tone === "r").map(r => r.f.n.toLowerCase());
  return `Overall sentiment is ${L.toLowerCase()} (${sg(overall)}). ` + (pos.length ? `Supported by ${pos.join(", ")}. ` : "") + (neg.length ? `Weighed down by ${neg.join(", ")}. ` : "") +
    (Math.abs(overall) < 25 ? "Signals are mixed, so expect higher volatility as the call develops." : overall > 0 ? "Momentum favours buyers while these factors hold." : "Caution is warranted while these factors persist.");
}

// Demo feed — identical to the reference dashboard.
export const demoInitial = (): CallState => ({ eps: { a: 8, e: 7 }, rev: { a: 32.4, e: 30 }, guid: { g: -2, e: 5 }, sector: -4.8, sent: -32 });
export const DEMO_EVENTS: [string, Tone, { guid?: number; sector?: number; sent?: number }][] = [
  ["CEO: record quarter, EPS $8.00 beats by 14%.", "n", {}],
  ["CEO: demand strong across every segment.", "g", { sent: 10 }],
  ["CFO: next-quarter revenue guide −2%, below Street +5%.", "r", { guid: -2, sent: -6 }],
  ["Analyst asks why guidance is soft.", "r", { sent: -8 }],
  ["CFO: cost actions will add margin tailwind.", "g", { sent: 8 }],
  ["CFO raises guide to +1% on pipeline strength.", "g", { guid: 1, sent: 12 }],
  ["Peer warning hits the sector.", "r", { sector: -6.1, sent: -5 }],
];
export function applyDemo(d: CallState, e: { guid?: number; sector?: number; sent?: number }): CallState {
  return { ...d, guid: e.guid !== undefined ? { ...d.guid, g: e.guid } : d.guid, sector: e.sector !== undefined ? e.sector : d.sector, sent: e.sent ? clamp(d.sent + e.sent) : d.sent };
}

// Live: fold extracted call events (oldest first) on top of stored consensus.
export type LiveEvent = { tone: number | null; eps_actual: number | null; eps_consensus: number | null; revenue_actual: number | null; revenue_consensus: number | null; guidance: number | null; guidance_consensus: number | null };
export function foldEvents(base: { eps_consensus: number | null; revenue_consensus: number | null; guidance_consensus: number | null; sector_move: number | null }, events: LiveEvent[]): CallState {
  const d: CallState = { eps: { a: null, e: base.eps_consensus }, rev: { a: null, e: base.revenue_consensus }, guid: { g: null, e: base.guidance_consensus }, sector: base.sector_move, sent: 0 };
  for (const ev of events) {
    if (ev.eps_actual != null) d.eps.a = ev.eps_actual;
    if (d.eps.e == null && ev.eps_consensus != null) d.eps.e = ev.eps_consensus;
    if (ev.revenue_actual != null) d.rev.a = ev.revenue_actual;
    if (d.rev.e == null && ev.revenue_consensus != null) d.rev.e = ev.revenue_consensus;
    if (ev.guidance != null) d.guid.g = ev.guidance;
    if (d.guid.e == null && ev.guidance_consensus != null) d.guid.e = ev.guidance_consensus;
    if (ev.tone != null) d.sent = clamp(d.sent * 0.7 + ev.tone * 0.3); // smoothed tone
  }
  return d;
}
export const toneOf = (t: number | null): Tone => (t == null ? "n" : t >= 10 ? "g" : t <= -10 ? "r" : "n");
