import { useState } from "react";
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
  const [candles, setCandles] = useState(true);
  const info = useQuery({ queryKey: ["overview", symbol], queryFn: () => getStockOverview({ data: { symbol } }), refetchInterval: 5000 });
  const chart = useQuery({ queryKey: ["overview-chart", symbol, range], queryFn: () => getOverviewChart({ data: { symbol, range } }), refetchInterval: ["30m", "1h", "1d"].includes(range) ? 15000 : false, placeholderData: keepPreviousData, retry: 1 });
  const d = info.data, cur = d?.currency ?? null, s = d?.stats;
  const sess = d?.marketOpen ? null : d?.postMarket ?? d?.preMarket;
  return <div className="grid gap-4">
    <div className="flex items-start gap-3">
      <button type="button" onClick={onBack} aria-label="Back to companies" className="mt-2 text-2xl text-muted-foreground hover:text-foreground">‹</button>
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
        <div className="grid grid-cols-8 gap-1 rounded-lg border border-border p-1">{OVERVIEW_RANGES.map(r => <button key={r} type="button" onClick={() => setRange(r)} aria-pressed={range === r} className={`rounded-md py-1.5 text-xs font-semibold ${range === r ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}>{r.toUpperCase()}</button>)}</div>
        <div className="mt-3 flex items-center justify-between gap-2">
          <div className="inline-flex rounded-lg border border-border p-1">{[["Line", false], ["Candles", true]].map(([l, v]) => <button key={String(l)} type="button" aria-pressed={candles === v} onClick={() => setCandles(v as boolean)} className={`rounded-md px-3 py-1 text-xs font-semibold ${candles === v ? "bg-primary/20 text-primary" : "text-muted-foreground"}`}>{l}</button>)}</div>
          {chart.data && <RangeChange c={chart.data} range={range} />}
        </div>
        {chart.isError ? <p role="alert" className="py-16 text-center text-sm text-destructive">{chart.error instanceof Error ? chart.error.message : "Price history unavailable."}</p> : !chart.data ? <p className="flex justify-center py-24 text-muted-foreground"><LoaderCircle className="h-5 w-5 animate-spin" /></p> : <OverviewChartView c={chart.data} candles={candles} cur={cur} />}
        <p className="mt-2 text-xs text-muted-foreground">{candles ? "Filled candle = closed higher. Hollow = closed lower." : "Line shows closing price."} Bars below show volume. Source: Yahoo Finance.</p>
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

function OverviewChartView({ c, candles, cur }: { c: OverviewChart; candles: boolean; cur: string | null }) {
  const [hover, setHover] = useState<number | null>(null);
  const pts = c.points, W = 1000, H = 440, L = 10, R = 880, T = 30, B = 330, VB = 420;
  const vals = pts.flatMap(p => candles ? [p.h ?? p.c, p.l ?? p.c] : [p.c]); if (c.previousClose) vals.push(c.previousClose);
  const lo = Math.min(...vals), hi = Math.max(...vals), pad = (hi - lo) * .08 || hi * .01, min = lo - pad, max = hi + pad;
  const x = (i: number) => L + (i + .5) / pts.length * (R - L), y = (v: number) => B - (v - min) / (max - min) * (B - T);
  const vmax = Math.max(1, ...pts.map(p => p.v ?? 0)), bw = Math.max(1, (R - L) / pts.length * .6);
  let hiI = 0, loI = 0; pts.forEach((p, i) => { if ((p.h ?? p.c) > (pts[hiI]!.h ?? pts[hiI]!.c)) hiI = i; if ((p.l ?? p.c) < (pts[loI]!.l ?? pts[loI]!.c)) loI = i; });
  const last = pts[pts.length - 1]!, sel: Candle = pts[hover ?? pts.length - 1]!;
  const fmt = (t: number) => new Date(t).toLocaleString("en-US", c.intraday ? (pts[pts.length - 1]!.t - pts[0]!.t > 86400_000 ? { month: "short", day: "numeric", timeZone: c.timeZone } : { hour: "numeric", minute: "2-digit", hour12: false, timeZone: c.timeZone }) : { month: "short", year: "2-digit", timeZone: c.timeZone });
  const line = pts.map((p, i) => `${i ? "L" : "M"}${x(i)},${y(p.c)}`).join(" ");
  return <div>
    <p className="mt-2 flex flex-wrap gap-3 text-xs tabular-nums"><span>O <b>{sel.o?.toFixed(2) ?? "—"}</b></span><span>H <b>{sel.h?.toFixed(2) ?? "—"}</b></span><span>L <b>{sel.l?.toFixed(2) ?? "—"}</b></span><span>C <b>{sel.c.toFixed(2)}</b></span><span>Vol <b>{big(sel.v)}</b></span><span className="text-muted-foreground">{new Date(sel.t).toLocaleString("en-US", { month: "short", day: "numeric", hour: c.intraday ? "numeric" : undefined, minute: c.intraday ? "2-digit" : undefined, timeZone: c.timeZone })}</span></p>
    <svg viewBox={`0 0 ${W} ${H}`} className="mt-1 w-full touch-pan-y" role="img" aria-label={candles ? "Candlestick price chart with volume" : "Line price chart with volume"} onPointerLeave={() => setHover(null)} onPointerMove={e => { const r = e.currentTarget.getBoundingClientRect(); const px = (e.clientX - r.left) / r.width * W; setHover(Math.max(0, Math.min(pts.length - 1, Math.floor((px - L) / (R - L) * pts.length)))); }}>
      {[0, 1, 2, 3, 4].map(i => { const v = min + (max - min) * i / 4; return <g key={i}><line x1={L} x2={R} y1={y(v)} y2={y(v)} stroke="var(--border)" /><text x={R + 10} y={y(v) + 4} fontSize="13" fill="var(--muted-foreground)">{v.toFixed(v < 10 ? 2 : 0)}</text></g>; })}
      {c.previousClose != null && <g><line x1={L} x2={R} y1={y(c.previousClose)} y2={y(c.previousClose)} stroke="var(--muted-foreground)" strokeDasharray="5 5" /><text x={L + 4} y={y(c.previousClose) - 6} fontSize="12" fill="var(--muted-foreground)">{c.intraday ? "Prev close" : "Start"} {c.previousClose.toFixed(2)}</text></g>}
      {pts.map((p, i) => p.v ? <rect key={`v${i}`} x={x(i) - bw / 2} width={bw} y={VB - p.v / vmax * 70} height={p.v / vmax * 70} fill="var(--primary)" opacity=".35" /> : null)}
      {candles ? pts.map((p, i) => { if (p.o == null || p.h == null || p.l == null) return null; const up = p.c >= p.o; return <g key={i}><line x1={x(i)} x2={x(i)} y1={y(p.h)} y2={y(p.l)} stroke="var(--primary)" /><rect x={x(i) - bw / 2} width={bw} y={y(Math.max(p.o, p.c))} height={Math.max(1, Math.abs(y(p.o) - y(p.c)))} fill={up ? "var(--primary)" : "var(--background)"} stroke="var(--primary)" /></g>; })
        : <><path d={`${line} L${x(pts.length - 1)},${B} L${x(0)},${B} Z`} fill="var(--primary)" opacity=".12" /><path d={line} fill="none" stroke="var(--primary)" strokeWidth="2.5" /></>}
      <text x={x(hiI)} y={y(pts[hiI]!.h ?? pts[hiI]!.c) - 8} fontSize="13" fill="var(--foreground)" textAnchor={hiI > pts.length * .8 ? "end" : "start"}>High {(pts[hiI]!.h ?? pts[hiI]!.c).toFixed(2)}</text>
      <text x={x(loI)} y={y(pts[loI]!.l ?? pts[loI]!.c) + 18} fontSize="13" fill="var(--foreground)" textAnchor={loI > pts.length * .8 ? "end" : "start"}>Low {(pts[loI]!.l ?? pts[loI]!.c).toFixed(2)}</text>
      <line x1={x(pts.length - 1)} x2={R} y1={y(last.c)} y2={y(last.c)} stroke="var(--primary)" strokeDasharray="3 3" />
      <rect x={R + 2} y={y(last.c) - 11} width="96" height="22" rx="4" fill="var(--primary)" /><text x={R + 50} y={y(last.c) + 5} fontSize="13" fontWeight="700" textAnchor="middle" fill="var(--primary-foreground)">{last.c.toFixed(2)}</text>
      {hover != null && <line x1={x(hover)} x2={x(hover)} y1={T} y2={VB} stroke="var(--muted-foreground)" strokeDasharray="2 3" />}
      {[0, .25, .5, .75, 1].map((f, i) => { const k = Math.round(f * (pts.length - 1)); return <text key={i} x={x(k)} y={H - 2} fontSize="12" fill="var(--muted-foreground)" textAnchor={i === 0 ? "start" : i === 4 ? "end" : "middle"}>{fmt(pts[k]!.t)}</text>; })}
    </svg>
    <span className="sr-only">{money(last.c, cur)}</span>
  </div>;
}
