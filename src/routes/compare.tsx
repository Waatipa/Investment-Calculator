import { OptionalInvestmentLabel } from "@/components/optional-investment-label";
import { useEffect, useMemo, useState } from "react";
import { CompareResultsCharts } from "@/components/compare-results";
import { CompareTotals } from "@/components/compare-totals";
import { createFileRoute, Link } from "@tanstack/react-router";
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
import { useNavigationStep } from "@/components/navigation-trail";

export const Route = createFileRoute("/compare")({
  head: () => pageHead("Compare Stocks", "Compare how up to four US, European, African and Middle East stocks performed between two dates using actual historical prices."),
  component: ComparePage,
});

const REGIONS: ("All" | CompareRegion)[] = ["All", "US", "Europe", "Africa", "Middle East"];
const money = (v: number, d = 2) => `${v < 0 ? "-" : ""}$${Math.abs(v).toLocaleString("en-US", { minimumFractionDigits: d, maximumFractionDigits: d })}`;
const pct = (v: number) => `${v >= 0 ? "+" : ""}${v.toFixed(1)}%`;
const tone = (v: number) => v > 0 ? "text-success" : v < 0 ? "text-destructive" : "text-muted-foreground";
const shortDate = (iso: string) => longDate(iso).replace(/(\d+) (\w{3})\w* (\d{4})/, "$1 $2 $3");
const company = (s: string) => COMPARE_COMPANIES.find(c => c.symbol === s) ?? { symbol: s, short: s, name: s, initials: s.slice(0, 2), region: "US" as const };

function ComparePage() {
  const [step, setStep] = useState(1);
  const [view, setView] = useState<"chart" | "table">("chart");
  const [selected, setSelected] = useState<string[]>([]);
  const [region, setRegion] = useState<(typeof REGIONS)[number]>("All");
  const [search, setSearch] = useState("");
  const [amount, setAmount] = useState("1000");
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const run = useServerFn(getComparison);
  const mutation = useMutation({ mutationFn: run, onSuccess: () => { setStep(current => current <= 2 ? 3 : current); } });
  useEffect(() => {
    if (step < 3 || !mutation.data?.some(s => s.latest?.open)) return;
    const timer = window.setInterval(() => { if (document.visibilityState === "visible" && !mutation.isPending) mutation.mutate({ data: { symbols: selected, start, end } }); }, 15000);
    return () => window.clearInterval(timer);
  }, [step, mutation.data, mutation.isPending, selected, start, end]);
  const amt = Number(amount);
  const toggle = (s: string) => setSelected(v => v.includes(s) ? v.filter(x => x !== s) : v.length >= MAX_FREE_COMPARE ? v : [...v, s]);
  const list = COMPARE_COMPANIES.filter(c => (region === "All" || c.region === region) && `${c.name} ${c.short}`.toLowerCase().includes(search.toLowerCase()));
  useNavigationStep(step > 1 ? ["Select companies", "Investment details", ...(step >= 3 ? ["Results"] : []), ...(step === 4 ? ["Detailed table"] : [])] : [], () => { if (step === 4) setView("chart"); setStep(step === 4 ? 3 : step - 1); });
  const edit = () => { mutation.reset(); };
  const sub = step === 1 ? "Pick companies from any region." : step === 2 ? "One amount and one set of dates for every stock." : step === 3 ? `${money(amt, 0)} each · ${shortDate(start)} to ${shortDate(end)}` : `Detailed comparison · ${money(amt, 0)} each`;

  return <main className={`market-page compare-page${step >= 3 ? " compare-results-page" : ""}`}>
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
      <Button className="compare-cta" disabled={!selected.length} onClick={() => { setView("chart"); setStep(2); }}>Next: investment details</Button>
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
  const ranked = [...ok].sort((a, b) => (b.m?.returnPct ?? 0) - (a.m?.returnPct ?? 0));
  const missing = rows.filter(r => !r.m);
  const latest = data.find(s => s.latest)?.latest;
  const fx = data.some(s => s.fx);
  const disclosure = <>
    {missing.map(r => <p key={r.s.symbol} className="compare-alert">{r.c.name}: {r.s.error ?? "Unavailable."}</p>)}
    <p className="compare-note">Actual daily prices from Yahoo Finance, adjusted for stock splits; dividends, fees and taxes excluded.{fx ? " Non-USD listings are converted at each trading day's historical USD exchange rate." : ""} Market holidays are skipped: the buy and sell prices are from the first and last actual trading days in the period.{latest ? ` The final value uses the latest available ${latest.open ? "trade (may be delayed up to 15–20 minutes, not real-time)" : "closing price"} as of ${new Date(latest.time).toLocaleString("en-US", { timeZone: "America/New_York", dateStyle: "medium", timeStyle: "short" })} ET.` : ""}</p></>;
  const actions = <div className="compare-actions">{view === "chart" && <Button className="compare-cta" onClick={() => setView("table")}>View detailed table</Button>}<Button asChild className="compare-cta btn-gold"><Link to="/subscribe"><OptionalInvestmentLabel>Invest now</OptionalInvestmentLabel></Link></Button></div>;
  const tabs = <div className="compare-tabs" role="tablist">{(["chart", "table"] as const).map(v => <button key={v} type="button" role="tab" aria-selected={view === v} className={view === v ? "active" : ""} onClick={() => setView(v)}>{v === "chart" ? "Chart" : "Table"}</button>)}</div>;

  if (view === "chart") return <CompareResultsCharts data={data} amount={amount} tabs={tabs} disclosure={disclosure} actions={actions} />;

  const line = (label: string, f: (m: NonNullable<typeof ok[number]["m"]>) => React.ReactNode, cls = "", best = false) => <tr className={best ? "best" : ""}><th scope="row">{label}</th>{ok.map(r => <td key={r.s.symbol} className={cls}>{r.m && f(r.m)}</td>)}</tr>;
  const top = ranked[0];
  return <div className="compare-grid">
    <section>{tabs}<div className="compare-table-wrap"><table className="compare-table"><thead><tr><th />{ok.map(r => <th key={r.s.symbol} scope="col">{r.c.short}<small>{r.c.name}</small></th>)}</tr></thead><tbody>
      {line("Shares bought", m => m.shares.toFixed(2))}
      {line("Buy price", m => <span title={longDate(m.buyDate)}>{money(m.buyPrice)}</span>)}
      {line("Sell price (close)", m => <span title={longDate(m.sellDate)}>{money(m.sellPrice)}</span>)}
      {line("Value at sale", m => <strong>{money(m.value, 0)}</strong>)}
      {ok.length > 0 && <tr><th scope="row">Net profit</th>{ok.map(r => <td key={r.s.symbol} className={tone((r.m?.profit ?? 0))}>{money((r.m?.profit ?? 0), 0)}</td>)}</tr>}
      {ok.length > 0 && <tr><th scope="row">Return</th>{ok.map(r => <td key={r.s.symbol} className={tone((r.m?.returnPct ?? 0))}><strong>{pct((r.m?.returnPct ?? 0))}</strong></td>)}</tr>}
      {line("Best buy price (period low)", m => <span title={longDate(m.bestBuyDate)}>{money(m.bestBuy)}</span>, "", true)}
      {line("Best sell price (peak)", m => <span title={longDate(m.bestSellDate)}>{money(m.bestSell)}</span>, "", true)}
      {line("Best-case value", m => <strong>{money(m.bestValue, 0)}</strong>, "", true)}
      {line("Best-case return", m => <strong>{pct(m.bestReturnPct)}</strong>, "", true)}
    </tbody></table></div>
      <CompareTotals holdings={ok.flatMap(r => r.m ? [{ invested: amount, value: r.m.value }] : [])} date="At the end of your selected period" incomplete={missing.length > 0} />
      <p className="compare-note">Buy {ok[0] ? longDate(ok[0].m?.buyDate ?? "") : ""} · Sell {ok[0] ? longDate(ok[0].m?.sellDate ?? "") : ""} (first and last trading days; hover a price for its date). Best case = buying at the period low and selling at the later peak. All values in USD.</p>{disclosure}</section>
    <aside className="compare-side compare-capital">{top && <><span>Top performer</span><strong>{top.c.name}</strong><span className={tone((top.m?.returnPct ?? 0))}>{pct((top.m?.returnPct ?? 0))}</span></>}</aside>
    {actions}
  </div>;
}

