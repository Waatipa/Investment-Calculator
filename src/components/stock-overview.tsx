import { useIsMobile } from "@/hooks/use-mobile";
import { useRef, useState } from "react";
import { ChartSettingsMenu, ChartTypeSwitch } from "@/components/chart-settings";
import { chartColors, useChartSettings } from "@/lib/chart-settings";
import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { LoaderCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { getStockOverview, getOverviewChart, OVERVIEW_RANGES, type OverviewRange, type Candle, type OverviewChart } from "@/lib/stock-overview.functions";

const money = (v: number | null | undefined, cur: string | null) => v == null ? "—" : `${cur === "USD" || !cur ? "$" : cur + " "}${v.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const big = (v: number | null | undefined, cur?: string | null) => {
  if (v == null) return "—";
  const [s, l] = v >= 1e12 ? [1e12, "T"] : v >= 1e9 ? [1e9, "B"] : v >= 1e6 ? [1e6, "M"] : v >= 1e3 ? [1e3, "K"] : [1, ""];
  const n = `${(v / s).toFixed(s === 1 ? 0 : 2)}${l}`;
  return cur === undefined ? n : cur === "USD" || !cur ? `$${n}` : `${cur} ${n}`;
};
const pct = (v: number | null) => v == null ? "" : `${v >= 0 ? "+" : ""}${v.toFixed(2)}%`;
const signed = (v: number | null) => v == null ? "—" : `${v >= 0 ? "+" : ""}${v.toFixed(2)}`;
const day = (t: number | null) => t ? new Date(t).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : "—";
const tone = (v: number | null) => v == null || v === 0 ? "text-muted-foreground" : v > 0 ? "text-success" : "text-destructive";

export function StockOverviewDialog({ symbol, initials, open, onOpenChange, onProceed }: { symbol: string | null; initials?: string | undefined; open: boolean; onOpenChange: (o: boolean) => void; onProceed: () => void }) {
  return <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent data-company={symbol ?? undefined} className={`company-dialog stock-overview company-panel-${(symbol ?? "").toLowerCase()} max-h-[92dvh] w-[calc(100%-1rem)] max-w-6xl overflow-y-auto overflow-x-hidden rounded-lg p-3 sm:p-6`}>
      {symbol && <Overview key={symbol} symbol={symbol} initials={initials} onProceed={onProceed} onBack={() => onOpenChange(false)} />}
    </DialogContent>
  </Dialog>;
}

function Overview({ symbol, initials, onProceed, onBack }: { symbol: string; initials?: string | undefined; onProceed: () => void; onBack: () => void }) {
  const [range, setRange] = useState<OverviewRange>("1d");
  const info = useQuery({ queryKey: ["overview", symbol], queryFn: () => getStockOverview({ data: { symbol } }), refetchInterval: 5000 });
  const chart = useQuery({ queryKey: ["overview-chart", symbol, range], queryFn: () => getOverviewChart({ data: { symbol, range } }), refetchInterval: ["30m", "1h", "1d"].includes(range) ? 15000 : false, placeholderData: keepPreviousData, retry: 1 });
  const d = info.data, cur = d?.currency ?? null, s = d?.stats;
  const sess = d?.marketOpen ? null : d?.postMarket ?? d?.preMarket;
  return <div className="grid gap-4">
    <div className="flex items-start gap-3">
      <span className="company-initials">{initials ?? symbol.slice(0, 2)}</span>
      <div className="min-w-0">
        <DialogTitle className="font-display text-xl sm:text-3xl">{d?.name ?? symbol}</DialogTitle>
        <DialogDescription className="text-xs">{[symbol, d?.exchange, d?.industry ?? d?.sector].filter(Boolean).join(" · ")}</DialogDescription>
      </div>
    </div>
    {info.isLoading ? <p className="flex items-center gap-2 text-sm text-muted-foreground"><LoaderCircle className="h-4 w-4 animate-spin" />Loading live data…</p> : info.isError ? <p role="alert" className="text-sm text-destructive">Live data is unavailable right now.</p> : d && <div>
      <div className="flex flex-wrap items-baseline gap-3"><span className="font-display text-4xl font-semibold tabular-nums sm:text-5xl">{money(d.price, cur)}</span><span className={`text-sm font-medium ${tone(d.change)}`}>{d.change != null && (d.change >= 0 ? "▲" : "▼")} {signed(d.change)} ({pct(d.percent)})</span></div>
      <p className="mt-1 text-xs text-muted-foreground">● {d.marketOpen ? "Live" : "At close"} · {d.time ? new Date(d.time).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit", timeZone: "America/New_York" }) + " ET" : "—"}</p>
      <div className="mt-2 inline-flex flex-wrap gap-2 rounded-full border border-border px-3 py-1 text-xs"><span className="text-muted-foreground">Pre-market</span>{d.preMarket ? <><b>{money(d.preMarket.price, cur)}</b><span className={tone(d.preMarket.change)}>{signed(d.preMarket.change)} ({pct(d.preMarket.percent)})</span></> : "—"}<span className="text-muted-foreground">· After-hours</span>{d.postMarket ? <><b>{money(d.postMarket.price, cur)}</b><span className={tone(d.postMarket.change)}>{signed(d.postMarket.change)} ({pct(d.postMarket.percent)})</span></> : "—"}</div>
      {sess == null ? null : null}
    </div>}
    <div className="grid gap-4 lg:grid-cols-[1.6fr_1fr]">
      <section className="overview-panel">
        <div className="grid grid-cols-5 gap-1 sm:grid-cols-10 rounded-lg border border-border p-1">{OVERVIEW_RANGES.map(r => <button key={r} type="button" onClick={() => setRange(r)} aria-pressed={range === r} className={`rounded-md py-1.5 text-xs font-semibold ${range === r ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}>{r.toUpperCase()}</button>)}</div>
        <div className="mt-3 flex items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2"><ChartTypeSwitch /><ChartSettingsMenu /></div>
          {chart.data && <RangeChange c={chart.data} range={range} />}
        </div>
        {chart.isError ? <p role="alert" className="py-16 text-center text-sm text-destructive">{chart.error instanceof Error ? chart.error.message : "Price history unavailable."}</p> : !chart.data ? <p className="flex justify-center py-24 text-muted-foreground"><LoaderCircle className="h-5 w-5 animate-spin" /></p> : <OverviewChartView c={chart.data} cur={cur} />}
        <p className="mt-2 text-xs text-muted-foreground">Drag across the chart to read the exact date, time and price. Only trading that has already happened is drawn. Source: Yahoo Finance.</p>
      </section>
      <div className="grid content-start gap-4">
        <section className="overview-panel"><h3 className="font-display text-lg font-semibold">Key statistics</h3>
          <dl className="mt-2 grid grid-cols-1 gap-x-4 sm:grid-cols-2">{([["Open", money(s?.open, cur)], ["Previous close", money(s?.previousClose, cur)], ["Day high", money(s?.dayHigh, cur)], ["Day low", money(s?.dayLow, cur)], ["Volume", big(s?.volume)], ["Avg volume (3M)", big(s?.avgVolume)], ["Market cap", big(s?.marketCap, cur === "GBp" ? "GBP" : cur === "ZAc" ? "ZAR" : cur)], ["52-week high", money(s?.high52, cur)], ["52-week low", money(s?.low52, cur)], ["P/E ratio (TTM)", s?.pe != null ? s.pe.toFixed(1) : "—"], ["Dividend yield", s?.dividendYield != null ? `${s.dividendYield.toFixed(2)}%` : "—"], ["Shares outstanding", big(s?.shares)]] as const).map(([k, v]) => <Row key={k} k={k} v={v} />)}</dl>
        </section>
        <section className="overview-panel"><h3 className="font-display text-lg font-semibold">Earnings per share</h3>
          <dl className="mt-2">{d?.eps.history[0] && <Row k={`Last report · quarter ended ${day(d.eps.history[0].date)}`} v={d.eps.history[0].actual != null ? d.eps.history[0].actual.toFixed(2) : "—"} />}
            {d?.eps.history[0]?.estimate != null && <Row k="Analyst estimate" v={<>{d.eps.history[0].estimate.toFixed(2)}{d.eps.history[0].actual != null && <span className={tone(d.eps.history[0].actual - d.eps.history[0].estimate)}> {d.eps.history[0].actual >= d.eps.history[0].estimate ? "Beat" : "Miss"} {signed(d.eps.history[0].actual - d.eps.history[0].estimate)}</span>}</>} />}
            {d?.eps.history[1] && <Row k={`Previous report · quarter ended ${day(d.eps.history[1].date)}`} v={d.eps.history[1].actual != null ? d.eps.history[1].actual.toFixed(2) : "—"} />}
            <Row k="EPS, trailing 12 months" v={d?.eps.trailing != null ? d.eps.trailing.toFixed(2) : "—"} />
            <Row k="Next report" v={day(d?.eps.nextReport ?? null)} /></dl>
          <p className="mt-2 text-xs text-muted-foreground">EPS in the company's reporting currency. Source: Yahoo Finance.</p>
        </section>
        <section className="overview-panel"><h3 className="font-display text-lg font-semibold">About {d?.name ?? symbol}</h3>
          <dl className="mt-2"><Row k="Headquarters" v={d?.profile.headquarters ?? "—"} /><Row k="CEO" v={d?.profile.ceo ?? "—"} /><Row k="Employees" v={d?.profile.employees != null ? `About ${d.profile.employees.toLocaleString("en-US")}` : "—"} />{d?.profile.website && <Row k="Website" v={<a className="underline" href={d.profile.website} target="_blank" rel="noreferrer">{d.profile.website.replace(/^https?:\/\/(www\.)?/, "")}</a>} />}</dl>
        </section>
      </div>
    </div>
    <Button onClick={onProceed} className="h-12 w-full text-base font-semibold">Proceed to calculators</Button>
  </div>;
}

function Row({ k, v }: { k: string; v: React.ReactNode }) {
  return <div className="flex items-start justify-between gap-3 border-b border-border py-2 text-sm"><dt className="text-muted-foreground">{k}</dt><dd className="text-right font-semibold tabular-nums">{v}</dd></div>;
}
function RangeChange({ c, range }: { c: OverviewChart; range: OverviewRange }) {
  const last = c.points[c.points.length - 1]!.c, base = c.previousClose ?? c.points[0]!.c;
  const p = (last - base) / base * 100;
  return <span className="text-xs text-muted-foreground">{range.toUpperCase()} change <b className={tone(p)}>{pct(p)}</b></span>;
}

function OverviewChartView({ c, cur }: { c: OverviewChart; cur: string | null }) {
  const st = useChartSettings(), col = chartColors(st);
  const [hover, setHover] = useState<number | null>(null);
  const drag = useRef(false);
  const k = useIsMobile() ? 2.3 : 1.3;
  const pts = c.points, W = 1000, H = Math.round(k > 2 ? 820 : 500), L = 10, R = st.priceLabels ? W - Math.round(115 * k) : 990, T = 30 * k, B = H - (st.volume ? 110 : 40) * k, VB = H - 20 * k;
  const ohlc = st.type === "candle" || st.type === "bar";
  const vals = pts.flatMap(p => ohlc ? [p.h ?? p.c, p.l ?? p.c] : [p.c]); if (c.previousClose) vals.push(c.previousClose);
  const lo = Math.min(...vals), hi = Math.max(...vals), pad = (hi - lo) * .08 || hi * .01;
  const min = Math.max(st.log ? lo * .5 : -Infinity, lo - pad), max = hi + pad;
  const f = (v: number) => st.log ? Math.log(Math.max(v, 1e-9)) : v;
  const y = (v: number) => B - (f(v) - f(min)) / (f(max) - f(min)) * (B - T);
  // Today's unfinished session: position by time across the whole session, so the future stays empty.
  const ses = c.session;
  const x = ses ? (i: number) => L + (pts[i]!.t - ses.start) / (ses.end - ses.start) * (R - L) : (i: number) => L + (i + .5) / pts.length * (R - L);
  const slots = ses ? Math.max(pts.length, (ses.end - ses.start) / 300_000) : pts.length;
  const slot = (R - L) / slots, bw = Math.max(.6, Math.min(st.thickness, slot * (1 - st.spacing)));
  const vmax = Math.max(1, ...pts.map(p => p.v ?? 0));
  let hiI = 0, loI = 0; pts.forEach((p, i) => { if ((p.h ?? p.c) > (pts[hiI]!.h ?? pts[hiI]!.c)) hiI = i; if ((p.l ?? p.c) < (pts[loI]!.l ?? pts[loI]!.c)) loI = i; });
  const last = pts[pts.length - 1]!, sel: Candle = pts[hover ?? pts.length - 1]!;
  const fmt = (t: number) => new Date(t).toLocaleString("en-US", c.intraday ? (pts[pts.length - 1]!.t - pts[0]!.t > 86400_000 ? { month: "short", day: "numeric", timeZone: c.timeZone } : { hour: "numeric", minute: "2-digit", hour12: false, timeZone: c.timeZone }) : { month: "short", year: "2-digit", timeZone: c.timeZone });
  const full = (t: number) => new Date(t).toLocaleString("en-US", { day: "numeric", month: "short", year: "numeric", hour: c.intraday ? "numeric" : undefined, minute: c.intraday ? "2-digit" : undefined, timeZone: c.timeZone });
  const line = pts.map((p, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(p.c).toFixed(1)}`).join(" ");
  const pick = (e: React.PointerEvent<SVGSVGElement>) => {
    const r = e.currentTarget.getBoundingClientRect(); const px = (e.clientX - r.left) / r.width * W;
    let best = 0; for (let i = 1; i < pts.length; i++) if (Math.abs(x(i) - px) < Math.abs(x(best) - px)) best = i;
    setHover(best);
  };
  const ticks = [0, 1, 2, 3, 4].map(i => st.log ? Math.exp(f(min) + (f(max) - f(min)) * i / 4) : min + (max - min) * i / 4);
  const xTicks = ses ? [0, .25, .5, .75, 1].map(q => ses.start + q * (ses.end - ses.start)) : [0, .25, .5, .75, 1].map(q => pts[Math.round(q * (pts.length - 1))]!.t);
  const xt = (t: number) => ses ? L + (t - ses.start) / (ses.end - ses.start) * (R - L) : x(Math.round(pts.findIndex(p => p.t === t)));
  return <div className="chart-surface" style={{ background: col.bg, color: col.fg }}>
    <p className="flex flex-wrap gap-3 text-xs tabular-nums"><span>O <b>{sel.o?.toFixed(2) ?? "—"}</b></span><span>H <b>{sel.h?.toFixed(2) ?? "—"}</b></span><span>L <b>{sel.l?.toFixed(2) ?? "—"}</b></span><span>C <b>{sel.c.toFixed(2)}</b></span><span>Vol <b>{big(sel.v)}</b></span><span style={{ color: col.muted }}>{full(sel.t)}</span></p>
    <svg viewBox={`0 0 ${W} ${H}`} className="mt-1 w-full touch-pan-y select-none" role="img" aria-label={`${st.type} price chart`}
      onPointerDown={e => { if (!st.crosshair) return; drag.current = true; e.currentTarget.setPointerCapture(e.pointerId); pick(e); }}
      onPointerMove={e => { if (st.crosshair && (drag.current || e.pointerType === "mouse")) pick(e); }}
      onPointerUp={() => { drag.current = false; }} onPointerLeave={() => { if (!drag.current) setHover(null); }}>
      {ticks.map((v, i) => <g key={i}>{st.gridH && <line x1={L} x2={R} y1={y(v)} y2={y(v)} stroke={col.grid} />}{st.priceLabels && <text x={R + 10} y={y(v) + 4 * k} fontSize={13 * k} fill={col.muted}>{v.toFixed(v < 10 ? 2 : 0)}</text>}</g>)}
      {st.gridV && xTicks.map((t, i) => <line key={i} x1={xt(t)} x2={xt(t)} y1={T} y2={VB} stroke={col.grid} />)}
      {c.previousClose != null && <g><line x1={L} x2={R} y1={y(c.previousClose)} y2={y(c.previousClose)} stroke={col.muted} strokeDasharray="5 5" /><text x={L + 4} y={y(c.previousClose) - 6} fontSize={12 * k} fill={col.muted}>{c.intraday ? "Prev close" : "Start"} {c.previousClose.toFixed(2)}</text></g>}
      {st.volume && pts.map((p, i) => p.v ? <rect key={`v${i}`} x={x(i) - bw / 2} width={bw} y={VB - p.v / vmax * 70 * k} height={p.v / vmax * 70 * k} fill={st.trend} opacity=".35" /> : null)}
      {st.type === "candle" ? pts.map((p, i) => { if (p.o == null || p.h == null || p.l == null) return null; const up = p.c >= p.o; return <g key={i}><line x1={x(i)} x2={x(i)} y1={y(p.h)} y2={y(p.l)} stroke={up ? st.bullWick : st.bearWick} strokeWidth="1" /><rect x={x(i) - bw / 2} width={bw} y={y(Math.max(p.o, p.c))} height={Math.max(1, Math.abs(y(p.o) - y(p.c)))} fill={up ? st.bullBody : st.bearBody} stroke={up ? st.bullBorder : st.bearBorder} strokeWidth=".8" /></g>; })
        : st.type === "bar" ? pts.map((p, i) => { if (p.o == null || p.h == null || p.l == null) return null; const up = p.c >= p.o, k = up ? st.bullBorder : st.bearBorder, w = Math.max(1.5, bw); return <g key={i} stroke={k} strokeWidth="1.2"><line x1={x(i)} x2={x(i)} y1={y(p.h)} y2={y(p.l)} /><line x1={x(i) - w} x2={x(i)} y1={y(p.o)} y2={y(p.o)} /><line x1={x(i)} x2={x(i) + w} y1={y(p.c)} y2={y(p.c)} /></g>; })
        : <>{st.type === "area" && <path d={`${line} L${x(pts.length - 1)},${B} L${x(0)},${B} Z`} fill={st.trend} opacity=".18" />}<path d={line} fill="none" stroke={st.trend} strokeWidth="2" /></>}
      <text x={x(hiI)} y={y(pts[hiI]!.h ?? pts[hiI]!.c) - 8} fontSize={13 * k} fill={col.fg} textAnchor={x(hiI) > R * .8 ? "end" : "start"}>High {(pts[hiI]!.h ?? pts[hiI]!.c).toFixed(2)}</text>
      <text x={x(loI)} y={y(pts[loI]!.l ?? pts[loI]!.c) + 18} fontSize={13 * k} fill={col.fg} textAnchor={x(loI) > R * .8 ? "end" : "start"}>Low {(pts[loI]!.l ?? pts[loI]!.c).toFixed(2)}</text>
      <line x1={x(pts.length - 1)} x2={R} y1={y(last.c)} y2={y(last.c)} stroke={st.trend} strokeDasharray="3 3" />
      {ses && <circle cx={x(pts.length - 1)} cy={y(last.c)} r="4" fill={st.trend} className="market-endpoint" />}
      {st.priceLabels && <><rect x={R + 2} y={y(last.c) - 11 * k} width={96 * k} height={22 * k} rx="4" fill={st.trend} /><text x={R + 2 + 48 * k} y={y(last.c) + 5 * k} fontSize={13 * k} fontWeight="700" textAnchor="middle" fill="#ffffff">{last.c.toFixed(2)}</text></>}
      {hover != null && <g><line x1={x(hover)} x2={x(hover)} y1={T} y2={VB} stroke={col.fg} strokeDasharray="2 3" opacity=".7" /><line x1={L} x2={R} y1={y(sel.c)} y2={y(sel.c)} stroke={col.fg} strokeDasharray="2 3" opacity=".5" /><circle cx={x(hover)} cy={y(sel.c)} r="4" fill={st.trend} stroke={col.bg} strokeWidth="1.5" />
        {st.priceLabels && <><rect x={R + 2} y={y(sel.c) - 11 * k} width={96 * k} height={22 * k} rx="4" fill={col.fg} /><text x={R + 2 + 48 * k} y={y(sel.c) + 5 * k} fontSize={13 * k} fontWeight="700" textAnchor="middle" fill={col.bg}>{sel.c.toFixed(2)}</text></>}</g>}
      {xTicks.map((t, i) => <text key={i} x={xt(t)} y={H - 4} fontSize={12 * k} fill={col.muted} textAnchor={i === 0 ? "start" : i === 4 ? "end" : "middle"}>{fmt(t)}</text>)}
    </svg>
    <span className="sr-only">{money(last.c, cur)}</span>
  </div>;
}
