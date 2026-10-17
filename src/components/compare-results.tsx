import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useQueries } from "@tanstack/react-query";
import { Pause, Play, Trophy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ChartSettingsMenu, ChartTypeSwitch } from "@/components/chart-settings";
import { DEFAULT_CHART, chartColors, useChartSettings } from "@/lib/chart-settings";
import { getStockOverview } from "@/lib/stock-overview.functions";
import type { CompareSeries } from "@/lib/compare.functions";
import { COMPARE_COMPANIES, compareMetrics } from "@/lib/compare";
import { estimatedCapitalization, pointAtDate } from "@/lib/compare-timeline";
import { useIsMobile } from "@/hooks/use-mobile";
import { CompareTotals } from "@/components/compare-totals";

const money = (v: number, digits = 2) => `${v < 0 ? "−" : ""}$${Math.abs(v).toLocaleString("en-US", { minimumFractionDigits: digits, maximumFractionDigits: digits })}`;
const pct = (v: number) => `${v >= 0 ? "+" : ""}${v.toFixed(1)}%`;
const compact = (v: number) => v >= 1e12 ? `$${(v / 1e12).toFixed(2)}T` : v >= 1e9 ? `$${(v / 1e9).toFixed(1)}B` : v >= 1e6 ? `$${(v / 1e6).toFixed(1)}M` : money(v, 0);
const dateText = (d: string) => new Date(`${d}T12:00:00Z`).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
const colors = ["var(--compare-series-1)", "var(--compare-series-2)", "var(--compare-series-3)", "var(--compare-series-4)"];
const tone = (v: number) => v >= 0 ? "text-success" : "text-destructive";
type Row = { s: CompareSeries; c: (typeof COMPARE_COMPANIES)[number]; m: ReturnType<typeof compareMetrics>; color: string; shares: number | null };

export function CompareResultsCharts({ data, amount, tabs, disclosure, actions }: { data: CompareSeries[]; amount: number; tabs: ReactNode; disclosure: ReactNode; actions: ReactNode }) {
  const sources = useQueries({ queries: data.map(s => ({ queryKey: ["overview", s.symbol], queryFn: () => getStockOverview({ data: { symbol: s.symbol } }), refetchInterval: 15000, staleTime: 5000, retry: 1 })) });
  const rows: Row[] = data.flatMap((s, i) => {
    const c = COMPARE_COMPANIES.find(c => c.symbol === s.symbol);
    return c && s.points.length ? [{ s, c, m: compareMetrics(s.points, amount), color: colors[i % colors.length] ?? "var(--primary)", shares: sources[i]?.data?.stats.shares ?? null }] : [];
  });
  const dates = useMemo(() => [...new Set(data.flatMap(s => s.points.map(p => p.date)))].sort(), [data]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [playing, setPlaying] = useState(false);
  const idx = cursor == null ? dates.length - 1 : Math.max(0, dates.indexOf(cursor));
  const date = dates[idx] ?? "";
  const choose = (i: number) => { setPlaying(false); setCursor(dates[i] ?? null); };
  useEffect(() => {
    if (!playing) return;
    const timer = window.setInterval(() => setCursor(current => {
      const next = current == null ? 0 : dates.indexOf(current) + 1;
      if (next >= dates.length) { setPlaying(false); return dates[dates.length - 1] ?? null; }
      return dates[next] ?? null;
    }), 70);
    return () => window.clearInterval(timer);
  }, [playing, dates]);
  const snap = rows.flatMap(r => { const p = pointAtDate(r.s.points, date); if (!p) return []; const value = r.m.shares * p.c; return [{ r, p, value, profit: value - amount, ret: (value / amount - 1) * 100 }]; });
  const ranked = [...snap].sort((a, b) => b.value - a.value);
  const largest = Math.max(1, ...snap.map(x => estimatedCapitalization(x.p.c, x.r.shares) ?? 0));
  if (!dates.length) return <div>{tabs}{disclosure}</div>;
  return <div className="comparison-results">
    <div className="comparison-main">
      <section className="comparison-investment">{tabs}<div className="comparison-inner">
        <div className="comparison-chart-heading"><div><h2>Investment value over time</h2><p>What {money(amount, 0)} in each company became, day by day</p></div><div className="comparison-tools"><ChartTypeSwitch only={["line", "area"]} /><ChartSettingsMenu /></div></div>
        <div className="comparison-companies">{rows.map(r => <div key={r.s.symbol}><SeriesMark color={r.color} /><p><strong>{r.c.short}</strong> {r.c.name}<small>{r.c.region} · {r.s.currency}</small></p></div>)}</div>
        <ComparisonPlot rows={rows} dates={dates} date={date} onPick={choose} />
        <div className="comparison-date"><strong>{dateText(date)} <small>Day {idx + 1} of {dates.length}</small></strong><Button variant="outline" size="sm" onClick={() => { if (!playing) setCursor(dates[0] ?? null); setPlaying(v => !v); }}>{playing ? <Pause /> : <Play />}{playing ? "Pause" : "Replay"}</Button></div>
        <input type="range" className="compare-scrub" min="0" max={dates.length - 1} value={idx} onChange={e => choose(Number(e.target.value))} aria-label="Drag to choose a date" aria-valuetext={dateText(date)} />
        <div className="comparison-endpoints"><span>{dateText(dates[0] ?? date)}</span><span>{dateText(dates[dates.length - 1] ?? date)}</span></div>
        <div className="comparison-mobile-values">{snap.map(x => <div key={x.r.s.symbol}><span><SeriesMark color={x.r.color} />{x.r.c.short}</span><strong>{money(x.value, 0)}</strong><small className={tone(x.ret)}>{pct(x.ret)}</small></div>)}</div>
        <CompareTotals holdings={snap.map(x => ({ invested: amount, value: x.value }))} date={dateText(date)} incomplete={snap.length < data.length} />
      </div></section>
      <section className="comparison-market-cap"><h2>Market cap comparison</h2><p className="comparison-sub">Estimated size at the selected date · logarithmic scale</p>
        <ComparisonPlot rows={rows.filter(r => r.shares != null)} dates={dates} date={date} onPick={choose} capitalization />
        {sources.some(s => s.isPending) && <p className="compare-note">Loading source share counts…</p>}
        {rows.some(r => r.shares == null) && <p className="compare-note">Market-cap estimates unavailable for {rows.filter(r => r.shares == null).map(r => r.c.short).join(", ")}: the provider has no share count.</p>}
        <div className="compare-table-wrap"><table className="comparison-cap-table"><thead><tr><th>Company</th><th>At start ({dateText(dates[0] ?? date)})</th><th>On {dateText(date)}</th><th className="comparison-desktop-column">Change in window</th><th className="comparison-desktop-column">Size vs largest</th></tr></thead><tbody>{snap.map(x => { const first = x.r.s.points[0]; const startCap = first ? estimatedCapitalization(first.c, x.r.shares) : null; const cap = estimatedCapitalization(x.p.c, x.r.shares); return <tr key={x.r.s.symbol}><th><SeriesMark color={x.r.color} />{x.r.c.short}</th><td>{startCap == null ? "—" : compact(startCap)}</td><td>{cap == null ? "—" : compact(cap)}</td><td className={`comparison-desktop-column ${tone(x.ret)}`}>{pct(x.ret)}</td><td className="comparison-desktop-column">{cap == null ? "—" : `${(cap / largest * 100).toFixed(1)}%`}</td></tr>; })}</tbody></table></div>
      </section>
    </div>
    <aside className="comparison-race"><div className="comparison-race-heading"><h2>Portfolio race</h2><strong>{dateText(date)}</strong></div><p className="comparison-sub">{money(amount, 0)} placed in each company on {dateText(dates[0] ?? date)}. Ranked by portfolio value.</p>
      {ranked[0] && <div className="comparison-leader"><Trophy /><span>{ranked[0].r.c.short} leads{ranked[1] ? `, ${money(ranked[0].value - ranked[1].value, 0)} ahead of ${ranked[1].r.c.short}` : ""}</span></div>}
      <div className="comparison-racers">{ranked.map((x, n) => <article key={x.r.s.symbol}>
        <div className="comparison-racer-heading"><span className="comparison-place">{["1st", "2nd", "3rd", "4th"][n]}</span><SeriesMark color={x.r.color} /><strong>{x.r.c.short}</strong><span className={`comparison-return ${tone(x.ret)}`}>{x.ret >= 0 ? "▲" : "▼"} {pct(x.ret)}</span></div><p>{x.r.c.name} ({x.r.c.region})</p>
        <dl><div><dt>Invested</dt><dd>{money(amount)}</dd></div><div><dt>Portfolio value</dt><dd>{money(x.value)}</dd></div><div><dt>Profit / loss</dt><dd className={tone(x.profit)}>{x.profit >= 0 ? "+" : ""}{money(x.profit)}</dd></div></dl>
        <progress max={Math.max(amount, ...ranked.map(r => r.value))} value={x.value} />
        <small>Close <b>{money(x.p.c)}</b> · Peak <b>{money(x.r.m.peakValue, 0)}</b> on {dateText(new Date(x.r.m.peakT).toISOString().slice(0, 10))}</small>
      </article>)}</div>{actions}<p className="comparison-optional">Optional. Take your time and decide only when you are ready.</p>
    </aside>
    <div className="comparison-disclosure">{disclosure}<p className="compare-note">Market cap is an estimate: split-adjusted USD price × the provider's current outstanding shares, held constant across this chart. It is not a historical reported market cap; issuance, buybacks and share-count changes are not tracked. Quotes may be delayed; missing figures are not estimated.</p></div>
  </div>;
}

function SeriesMark({ color }: { color: string }) { return <svg className="comparison-series-mark" viewBox="0 0 24 12" aria-hidden="true"><path d="M0 6h24" stroke={color} strokeWidth="2" strokeDasharray="4 2" /><circle cx="12" cy="6" r="3" fill={color} /></svg>; }

function ComparisonPlot({ rows, dates, date, onPick, capitalization = false }: { rows: Row[]; dates: string[]; date: string; onPick: (i: number) => void; capitalization?: boolean }) {
  const settings = useChartSettings(), mobile = useIsMobile(), dragging = useRef(false);
  const custom = chartColors(settings);
  const defaults = settings === DEFAULT_CHART;
  const bg = defaults ? "var(--compare-plot)" : custom.bg, fg = defaults ? "var(--foreground)" : custom.fg, muted = defaults ? "var(--muted-foreground)" : custom.muted, grid = defaults ? "var(--border)" : custom.grid;
  const W = 720, H = capitalization ? (mobile ? 470 : 310) : (mobile ? 590 : 420), L = settings.priceLabels ? (mobile ? 87 : 66) : 12, R = W - 16, bottom = H - 62;
  const t0 = Date.parse(dates[0] ?? ""), t1 = Date.parse(dates[dates.length - 1] ?? "");
  const val = (r: Row, price: number) => price * (capitalization ? r.shares ?? 0 : r.m.shares);
  const values = rows.flatMap(r => r.s.points.map(p => val(r, p.c))).filter(v => v > 0);
  if (!values.length) return <div className="comparison-chart-empty">No source-backed market-cap series available.</div>;
  const log = capitalization || settings.log;
  const low = Math.min(...values) * .85, high = Math.max(...values) * 1.12;
  const f = (v: number) => log ? Math.log(Math.max(v, .0001)) : v;
  const x = (d: string) => L + (Date.parse(d) - t0) / Math.max(86400000, t1 - t0) * (R - L);
  const y = (v: number) => 18 + (1 - (f(v) - f(low)) / (f(high) - f(low))) * (bottom - 18);
  const picks = rows.flatMap(r => { const p = pointAtDate(r.s.points, date); return p ? [{ r, p, v: val(r, p.c) }] : []; });
  const pick = (e: React.PointerEvent<SVGSVGElement>) => { const rect = e.currentTarget.getBoundingClientRect(); const target = t0 + ((e.clientX - rect.left) / rect.width * W - L) / (R - L) * (t1 - t0); let best = 0; for (let i = 1; i < dates.length; i++) if (Math.abs(Date.parse(dates[i] ?? "") - target) < Math.abs(Date.parse(dates[best] ?? "") - target)) best = i; onPick(best); };
  const textSize = mobile ? 23 : 15;
  const labelW = mobile ? 400 : 275, labelX = Math.max(L + 6, Math.min(R - labelW, x(date) - labelW - 8)), labelY = bottom - (picks.length + 2) * textSize * 1.3;
  return <svg className="comparison-plot touch-pan-y" viewBox={`0 0 ${W} ${H}`} style={{ background: bg }} role="img" aria-label={capitalization ? "Estimated market capitalization comparison" : "Investment value over time"}
    onPointerDown={e => { if (!settings.crosshair) return; dragging.current = true; e.currentTarget.setPointerCapture(e.pointerId); pick(e); }} onPointerMove={e => { if (settings.crosshair && (dragging.current || e.pointerType === "mouse")) pick(e); }} onPointerUp={() => { dragging.current = false; }} onPointerCancel={() => { dragging.current = false; }}>
    {Array.from({ length: 5 }, (_, i) => { const v = log ? Math.exp(f(low) + (f(high) - f(low)) * i / 4) : low + (high - low) * i / 4; return <g key={i}>{settings.gridH && <line x1={L} x2={R} y1={y(v)} y2={y(v)} stroke={grid} />}{settings.priceLabels && <text x={L - 8} y={y(v) + 5} textAnchor="end" fill={muted} fontSize={textSize}>{capitalization ? compact(v) : money(v, 0)}</text>}</g>; })}
    {Array.from({ length: mobile ? 4 : 7 }, (_, i) => { const total = mobile ? 3 : 6, t = t0 + (t1 - t0) * i / total; const xx = L + (R - L) * i / total; return <g key={i}>{settings.gridV && <line x1={xx} x2={xx} y1="18" y2={bottom} stroke={grid} />}<text x={xx} y={bottom + 26} textAnchor={i === 0 ? "start" : i === total ? "end" : "middle"} fill={muted} fontSize={textSize}>{new Date(t).toLocaleDateString("en-GB", { month: "short", year: "2-digit", timeZone: "UTC" })}</text></g>; })}
    {rows.map(r => { const points = r.s.points, stride = Math.max(1, Math.floor(points.length / 650)); const path = points.filter((_, i) => i % stride === 0 || i === points.length - 1).map((p, i) => `${i ? "L" : "M"}${x(p.date)},${y(val(r, p.c))}`).join(" "); const last = points[points.length - 1]; if (!last) return null; const color = settings.trend !== DEFAULT_CHART.trend ? settings.trend : r.color; return <g key={r.s.symbol}>{settings.type === "area" && <path d={`${path} L${x(last.date)},${bottom} L${L},${bottom} Z`} fill={color} opacity=".1" />}<path d={path} fill="none" stroke={color} strokeWidth={settings.thickness} />{!capitalization && <circle cx={x(new Date(r.m.peakT).toISOString().slice(0, 10))} cy={y(r.m.peakValue)} r="6" fill="none" stroke={color} strokeWidth="2" />}</g>; })}
    {settings.crosshair && <g pointerEvents="none"><line x1={x(date)} x2={x(date)} y1="18" y2={bottom} stroke={muted} strokeDasharray="4 5" />{picks.map(({ r, v }) => <circle key={r.s.symbol} cx={x(date)} cy={y(v)} r="5" fill={r.color} stroke={bg} strokeWidth="2" />)}
      <g className="comparison-pointer" fontSize={textSize} fontFamily="var(--font-sans)"><text x={labelX} y={labelY} fill="var(--gold)" fontWeight="700">{dateText(date)}</text><text x={labelX} y={labelY + textSize * 1.3} fill={muted}>Stock</text><text x={labelX + labelW * .65} y={labelY + textSize * 1.3} fill={muted} textAnchor="end">{capitalization ? "Market cap" : "Portfolio"}</text><text x={labelX + labelW} y={labelY + textSize * 1.3} fill={muted} textAnchor="end">Close</text>{picks.map(({ r, p, v }, i) => <g key={r.s.symbol}><text x={labelX} y={labelY + (i + 2) * textSize * 1.3} fill={r.color}>{r.c.short}</text><text x={labelX + labelW * .65} y={labelY + (i + 2) * textSize * 1.3} fill={fg} textAnchor="end">{capitalization ? compact(v) : money(v, 0)}</text><text x={labelX + labelW} y={labelY + (i + 2) * textSize * 1.3} fill="var(--primary)" textAnchor="end">{money(p.c)}</text></g>)}</g></g>}
    <text x={L} y={H - 7} fill={muted} fontSize={textSize}>Invested {dateText(dates[0] ?? date)}</text>
  </svg>;
}