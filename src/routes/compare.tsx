import { useIsMobile } from "@/hooks/use-mobile";
import { useMemo, useRef, useState } from "react";
import { ChartSettingsMenu, ChartTypeSwitch } from "@/components/chart-settings";
import { chartColors, useChartSettings } from "@/lib/chart-settings";
import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Check, ChevronLeft, LoaderCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CalculatorDateField } from "@/components/calculator-date-field";
import { pageHead } from "@/lib/markets";
import { longDate } from "@/lib/investment";
import { COMPARE_COMPANIES, MAX_FREE_COMPARE, compareMetrics, type CompareRegion } from "@/lib/compare";
import { getComparison, type CompareSeries } from "@/lib/compare.functions";

export const Route = createFileRoute("/compare")({
  head: () => pageHead("Compare Stocks", "Compare how up to four US, European, African and Middle East stocks performed between two dates using actual historical prices."),
  component: ComparePage,
});

const REGIONS: ("All" | CompareRegion)[] = ["All", "US", "Europe", "Africa", "Middle East"];
const LINES = ["#2a9fb8", "#1e4f6b", "#75d4e6", "#5b7fa6"];
const money = (v: number, d = 2) => `${v < 0 ? "-" : ""}$${Math.abs(v).toLocaleString("en-US", { minimumFractionDigits: d, maximumFractionDigits: d })}`;
const pct = (v: number) => `${v >= 0 ? "+" : ""}${v.toFixed(1)}%`;
const tone = (v: number) => v > 0 ? "text-success" : v < 0 ? "text-destructive" : "text-muted-foreground";
const shortDate = (iso: string) => longDate(iso).replace(/(\d+) (\w{3})\w* (\d{4})/, "$1 $2 $3");
const company = (s: string) => COMPARE_COMPANIES.find(c => c.symbol === s)!;

function ComparePage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [view, setView] = useState<"chart" | "table">("chart");
  const [selected, setSelected] = useState<string[]>([]);
  const [region, setRegion] = useState<(typeof REGIONS)[number]>("All");
  const [search, setSearch] = useState("");
  const [amount, setAmount] = useState("1000");
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const run = useServerFn(getComparison);
  const mutation = useMutation({ mutationFn: run, onSuccess: () => { setView("chart"); setStep(3); } });
  const amt = Number(amount);
  const toggle = (s: string) => setSelected(v => v.includes(s) ? v.filter(x => x !== s) : v.length >= MAX_FREE_COMPARE ? v : [...v, s]);
  const list = COMPARE_COMPANIES.filter(c => (region === "All" || c.region === region) && `${c.name} ${c.short}`.toLowerCase().includes(search.toLowerCase()));
  const back = () => step === 1 ? router.history.back() : setStep(step === 4 ? 3 : step - 1);
  const edit = () => { mutation.reset(); };
  const sub = step === 1 ? "Pick companies from any region." : step === 2 ? "One amount and one set of dates for every stock." : step === 3 ? `${money(amt, 0)} each · ${shortDate(start)} to ${shortDate(end)}` : `Detailed comparison · ${money(amt, 0)} each`;

  return <main className="market-page compare-page">
    <Button variant="ghost" size="icon" className="compare-back" onClick={back} aria-label="Back"><ChevronLeft /></Button>
    <div className="compare-head"><div><h1>Compare Stocks</h1><p>{sub}</p></div>
      <ol className="compare-steps">{["Select", "Details", "Results"].map((l, i) => { const n = i + 1, cur = Math.min(step, 3); return <li key={l} className={n < cur ? "done" : n === cur ? "current" : ""}><span>{n < cur ? <Check /> : n}</span>{l}</li>; })}</ol></div>

    {step === 1 && <div className="compare-grid">
      <section>
        <Input placeholder="Search companies" value={search} onChange={e => setSearch(e.target.value)} className="compare-search" aria-label="Search companies" />
        <div className="compare-chips">{REGIONS.map(r => <button key={r} type="button" className={r === region ? "active" : ""} onClick={() => setRegion(r)}>{r}</button>)}</div>
        <div className="compare-list">{list.map(c => { const on = selected.includes(c.symbol); return <button key={c.symbol} type="button" className={`compare-item${on ? " on" : ""}`} aria-pressed={on} onClick={() => toggle(c.symbol)} disabled={!on && selected.length >= MAX_FREE_COMPARE}>
          <span className="compare-badge">{c.initials}</span><span className="compare-name"><strong>{c.name}</strong><small>{c.short}</small></span><span className="compare-region">{c.region}</span><span className="compare-check">{on && <Check />}</span></button>; })}</div>
        <div className="compare-count"><span>{selected.length} of {MAX_FREE_COMPARE} selected</span>{selected.length > 0 && <button type="button" onClick={() => setSelected([])}>Clear all</button>}</div>
        <p className="compare-note">Free plan allows up to {MAX_FREE_COMPARE}. More needs Premium.</p>
      </section>
      <aside className="compare-side"><h3>Your selection</h3>{selected.length ? selected.map(s => <div key={s} className="compare-side-row"><span className="compare-badge">{company(s).initials}</span><span>{company(s).name}<small>{company(s).short}</small></span></div>) : <p className="compare-note">No companies selected yet.</p>}</aside>
      <Button className="compare-cta" disabled={!selected.length} onClick={() => setStep(2)}>Next: investment details</Button>
    </div>}

    {step === 2 && <form className="compare-grid" onSubmit={e => { e.preventDefault(); edit(); mutation.mutate({ data: { symbols: selected, start, end } }); }}>
      <section className="compare-fields">
        <label className="compare-field">Amount per company<div><span>$</span><Input type="number" min="1" step="any" required value={amount} onChange={e => { setAmount(e.target.value); edit(); }} aria-label="Amount per company (USD)" /></div></label>
        <CalculatorDateField id="compare-start" label="Investment date" value={start} onChange={v => { setStart(v); edit(); }} />
        <CalculatorDateField id="compare-end" label="Closing date" value={end} min={start || undefined} onChange={v => { setEnd(v); edit(); }} />
      </section>
      <aside className="compare-side compare-capital"><span>Total starting capital</span><strong>{amt > 0 ? money(amt * selected.length, 0) : "—"}</strong><small>{amt > 0 ? money(amt, 0) : "—"} × {selected.length} stocks</small><div>{selected.map(s => <span key={s} className="compare-pill">{company(s).short}</span>)}</div></aside>
      {mutation.error && <p role="alert" className="compare-alert">{mutation.error instanceof Error ? mutation.error.message.replace(/^\[.*?\]\s*/, "") : "Prices are unavailable. Please try again."}</p>}
      <Button type="submit" className="compare-cta" disabled={!(amt > 0) || !start || !end || mutation.isPending}>{mutation.isPending ? <><LoaderCircle className="animate-spin" />Loading prices…</> : "Calculate results"}</Button>
    </form>}

    {step >= 3 && mutation.data && <Results data={mutation.data} amount={amt} view={step === 4 ? "table" : view} setView={v => { setView(v); setStep(v === "table" ? 4 : 3); }} />}
  </main>;
}

function Results({ data, amount, view, setView }: { data: CompareSeries[]; amount: number; view: "chart" | "table"; setView: (v: "chart" | "table") => void }) {
  const rows = useMemo(() => data.map((s, i) => ({ s, i, c: company(s.symbol), m: s.points.length ? compareMetrics(s.points, amount) : null })), [data, amount]);
  const ok = rows.filter(r => r.m);
  const ranked = [...ok].sort((a, b) => b.m!.returnPct - a.m!.returnPct);
  const missing = rows.filter(r => !r.m);
  const latest = data.find(s => s.latest)?.latest;
  const fx = data.some(s => s.fx);
  const disclosure = <>
    {missing.map(r => <p key={r.s.symbol} className="compare-alert">{r.c.name}: {r.s.error ?? "Unavailable."}</p>)}
    <p className="compare-note">Actual daily prices from Yahoo Finance, adjusted for stock splits; dividends, fees and taxes excluded.{fx ? " Non-USD listings are converted at each trading day's historical USD exchange rate." : ""} Market holidays are skipped: the buy and sell prices are from the first and last actual trading days in the period.{latest ? ` The final value uses the latest available ${latest.open ? "trade (may be delayed up to 15–20 minutes, not real-time)" : "closing price"} as of ${new Date(latest.time).toLocaleString("en-US", { timeZone: "America/New_York", dateStyle: "medium", timeStyle: "short" })} ET.` : ""}</p></>;
  const actions = <div className="compare-actions">{view === "chart" && <Button className="compare-cta" onClick={() => setView("table")}>View detailed table</Button>}<Button asChild className="compare-cta btn-gold"><Link to="/subscribe">Invest now</Link></Button></div>;
  const tabs = <div className="compare-tabs" role="tablist">{(["chart", "table"] as const).map(v => <button key={v} type="button" role="tab" aria-selected={view === v} className={view === v ? "active" : ""} onClick={() => setView(v)}>{v === "chart" ? "Chart" : "Table"}</button>)}</div>;

  if (view === "chart") return <ChartView ok={ok.map(r => ({ i: r.i, s: r.s, c: r.c, m: r.m! }))} amount={amount} tabs={tabs} disclosure={disclosure} actions={actions} />;

  const line = (label: string, f: (m: NonNullable<typeof ok[number]["m"]>) => React.ReactNode, cls = "", best = false) => <tr className={best ? "best" : ""}><th scope="row">{label}</th>{ok.map(r => <td key={r.s.symbol} className={cls}>{f(r.m!)}</td>)}</tr>;
  const top = ranked[0];
  return <div className="compare-grid">
    <section>{tabs}<div className="compare-table-wrap"><table className="compare-table"><thead><tr><th />{ok.map(r => <th key={r.s.symbol} scope="col">{r.c.short}<small>{r.c.name}</small></th>)}</tr></thead><tbody>
      {line("Shares bought", m => m.shares.toFixed(2))}
      {line("Buy price", m => <span title={longDate(m.buyDate)}>{money(m.buyPrice)}</span>)}
      {line("Sell price (close)", m => <span title={longDate(m.sellDate)}>{money(m.sellPrice)}</span>)}
      {line("Value at sale", m => <strong>{money(m.value, 0)}</strong>)}
      {ok.length > 0 && <tr><th scope="row">Net profit</th>{ok.map(r => <td key={r.s.symbol} className={tone(r.m!.profit)}>{money(r.m!.profit, 0)}</td>)}</tr>}
      {ok.length > 0 && <tr><th scope="row">Return</th>{ok.map(r => <td key={r.s.symbol} className={tone(r.m!.returnPct)}><strong>{pct(r.m!.returnPct)}</strong></td>)}</tr>}
      {line("Best buy price (period low)", m => <span title={longDate(m.bestBuyDate)}>{money(m.bestBuy)}</span>, "", true)}
      {line("Best sell price (peak)", m => <span title={longDate(m.bestSellDate)}>{money(m.bestSell)}</span>, "", true)}
      {line("Best-case value", m => <strong>{money(m.bestValue, 0)}</strong>, "", true)}
      {line("Best-case return", m => <strong>{pct(m.bestReturnPct)}</strong>, "", true)}
    </tbody></table></div>
      <p className="compare-note">Buy {ok[0] ? longDate(ok[0].m!.buyDate) : ""} · Sell {ok[0] ? longDate(ok[0].m!.sellDate) : ""} (first and last trading days; hover a price for its date). Best case = buying at the period low and selling at the later peak. All values in USD.</p>{disclosure}</section>
    <aside className="compare-side compare-capital">{top && <><span>Top performer</span><strong>{top.c.name}</strong><span className={tone(top.m!.returnPct)}>{pct(top.m!.returnPct)}</span></>}</aside>
    {actions}
  </div>;
}

type Row = { i: number; s: CompareSeries; c: ReturnType<typeof company>; m: ReturnType<typeof compareMetrics> };
const at = (r: Row, t: number) => { const p = r.s.points; let k = 0; for (let j = 0; j < p.length; j++) { if (p[j]!.t <= t) k = j; else break; } return p[k]!; };

function ChartView({ ok, amount, tabs, disclosure, actions }: { ok: Row[]; amount: number; tabs: React.ReactNode; disclosure: React.ReactNode; actions: React.ReactNode }) {
  const times = useMemo(() => [...new Set(ok.flatMap(r => r.s.points.map(p => p.t)))].sort((a, b) => a - b), [ok]);
  const [k, setK] = useState<number | null>(null);
  const idx = k ?? times.length - 1, t = times[idx] ?? 0;
  const snap = ok.map(r => { const p = at(r, t); const value = r.m.shares * p.c; return { r, p, value, profit: value - amount, ret: (value - amount) / amount * 100 }; });
  const ranked = [...snap].sort((a, b) => b.ret - a.ret);
  return <div className="compare-grid">
    <section>{tabs}<div className="compare-chart-box"><div className="flex flex-wrap items-center justify-between gap-2"><p>Investment value over time</p><div className="flex flex-wrap items-center gap-2"><ChartTypeSwitch only={["line", "area"]} /><ChartSettingsMenu /></div></div>
      <ValueChart rows={ok} amount={amount} times={times} idx={idx} onPick={setK} />
      {times.length > 1 && <input type="range" className="compare-scrub" min={0} max={times.length - 1} value={idx} onChange={e => setK(Number(e.target.value))} aria-label="Drag to choose a date" aria-valuetext={shortDate(new Date(t).toISOString().slice(0, 10))} />}
      <p className="compare-at"><b>{new Date(t).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" })}</b>{k != null && <button type="button" onClick={() => setK(null)}>Back to latest</button>}</p>
      <div className="compare-snap">{snap.map(x => <div key={x.r.s.symbol}><span><i style={{ background: LINES[x.r.i] }} />{x.r.c.short}</span><small>Price {money(x.p.c)}</small><strong>{money(x.value, 0)}</strong><small className={tone(x.profit)}>{money(x.profit, 0)} · {pct(x.ret)}</small></div>)}</div>
      <p className="compare-note">Drag the slider or the chart to see each stock's daily price, value, profit and return. Rings mark each stock's hypothetical peak.</p></div>{disclosure}</section>
    <aside className="compare-rank">{ranked.map((x, n) => <div key={x.r.s.symbol}><small>{["1st", "2nd", "3rd", "4th"][n]}</small><strong>{x.r.c.short}</strong><span className={tone(x.ret)}>{pct(x.ret)}</span></div>)}</aside>
    {actions}
  </div>;
}

function ValueChart({ rows, amount, times, idx, onPick }: { rows: Row[]; amount: number; times: number[]; idx: number; onPick: (k: number) => void }) {
  const st = useChartSettings(), col = chartColors(st);
  const drag = useRef(false);
  const k = useIsMobile() ? 2 : 1.3;
  const W = 600, H = k > 1.5 ? 420 : 300, L = st.priceLabels ? 46 * k : 8, B = 34 * k;
  const all = rows.flatMap(r => r.s.points.map(p => ({ t: p.t, v: r.m.shares * p.c, h: r.m.shares * p.h })));
  if (!all.length) return <p className="compare-note">No chart data available.</p>;
  const t0 = times[0]!, t1 = times[times.length - 1]!;
  const v1 = Math.max(amount, ...all.map(p => p.h)) * 1.05, v0 = Math.max(st.log ? 1 : 0, Math.min(amount, ...all.map(p => p.v)) * 0.9);
  const f = (v: number) => st.log ? Math.log(Math.max(v, 1e-9)) : v;
  const x = (t: number) => L + (t1 === t0 ? 0 : (t - t0) / (t1 - t0)) * (W - L - 8);
  const y = (v: number) => 8 + (1 - (f(v) - f(v0)) / (f(v1) - f(v0))) * (H - B - 8);
  const ticks = Array.from({ length: 5 }, (_, k) => st.log ? Math.exp(f(v0) + (f(v1) - f(v0)) * k / 4) : v0 + (v1 - v0) * k / 4);
  const years = Array.from({ length: 5 }, (_, k) => t0 + (t1 - t0) * k / 4);
  const fmt = (v: number) => v >= 1000 ? `$${(v / 1000).toFixed(1)}k` : `$${v.toFixed(0)}`;
  const t = times[idx]!;
  const pick = (e: React.PointerEvent<SVGSVGElement>) => { const r = e.currentTarget.getBoundingClientRect(); const tt = t0 + ((e.clientX - r.left) / r.width * W - L) / (W - L - 8) * (t1 - t0); let b = 0; for (let j = 1; j < times.length; j++) if (Math.abs(times[j]! - tt) < Math.abs(times[b]! - tt)) b = j; onPick(b); };
  return <svg viewBox={`0 0 ${W} ${H}`} className="compare-svg touch-pan-y select-none" style={{ background: col.bg, borderRadius: 8, fontSize: 10 * k }} role="img" aria-label="Investment value over time"
    onPointerDown={e => { if (!st.crosshair) return; drag.current = true; e.currentTarget.setPointerCapture(e.pointerId); pick(e); }} onPointerMove={e => { if (st.crosshair && drag.current) pick(e); }} onPointerUp={() => { drag.current = false; }}>
    {ticks.map(v => <g key={v}>{st.gridH && <line x1={L} x2={W - 8} y1={y(v)} y2={y(v)} stroke={col.grid} />}{st.priceLabels && <text x={L - 6} y={y(v) + 4 * k} textAnchor="end" style={{ fill: col.muted }}>{fmt(v)}</text>}</g>)}
    {st.gridV && years.map(tt => <line key={tt} x1={x(tt)} x2={x(tt)} y1={8} y2={H - B} stroke={col.grid} />)}
    {years.slice(1).map((tt, k) => <text key={tt} x={x(tt)} y={H - B + 14 * k} textAnchor={k === 3 ? "end" : "middle"} style={{ fill: col.muted }}>{new Date(tt).toLocaleDateString("en-GB", { month: "short", year: "2-digit" })}</text>)}
    <text x={L} y={H - 4} textAnchor="start" style={{ fill: col.fg, fontWeight: 600 }}>Invested {new Date(t0).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" })}</text>
    {rows.map(r => { const pts = r.s.points; const step = Math.max(1, Math.floor(pts.length / 300)); const d = pts.filter((_, k) => k % step === 0 || k === pts.length - 1).map((p, k) => `${k ? "L" : "M"}${x(p.t).toFixed(1)},${y(r.m.shares * p.c).toFixed(1)}`).join(""); const last = pts[pts.length - 1]!; const color = rows.length === 1 ? st.trend : LINES[r.i];
      return <g key={r.s.symbol} style={{ color }}>{st.type === "area" && <path d={`${d}L${x(last.t).toFixed(1)},${H - B}L${x(pts[0]!.t).toFixed(1)},${H - B}Z`} fill="currentColor" opacity=".12" />}<path d={d} fill="none" stroke="currentColor" strokeWidth="2" /><circle cx={x(r.m.peakT)} cy={y(r.m.peakValue)} r="6" fill="none" stroke="currentColor" strokeWidth="1.5" /><circle cx={x(last.t)} cy={y(r.m.value)} r="3.5" fill="currentColor" /><circle cx={x(t)} cy={y(r.m.shares * at(r, t).c)} r="4.5" fill="currentColor" stroke={col.bg} strokeWidth="1.5" /></g>; })}
    <line x1={x(t)} x2={x(t)} y1={8} y2={H - B} stroke={col.fg} strokeDasharray="3 3" opacity=".6" />
  </svg>;
}
