import { useState, type FormEvent } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Calculator, ArrowRight, RefreshCw } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { FINANCIAL_METRICS, calculateMetric, type FinancialMetric } from "@/lib/financial-metrics";
import { quotesQuery } from "@/lib/markets";
import { usd } from "@/lib/calc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CalculatorDateField } from "./calculator-date-field";

export function ProCalculatorChoices({ onChoose }: { onChoose: (metric: FinancialMetric | "profit") => void }) {
  const [group, setGroup] = useState("All");
  const groups = ["Valuation", "Profitability", "Growth & cash", "Balance sheet & income"];
  return <div className="pro-stage">
    <div className="pro-filters" aria-label="Calculator categories">{["All", ...groups].map(g => <Button key={g} variant={group === g ? "default" : "outline"} aria-pressed={group === g} onClick={() => setGroup(g)}>{g === "All" ? "All · 22" : g}</Button>)}</div>
    <Button variant="outline" className="pro-profit-choice" onClick={() => onChoose("profit")}><span className="pro-metric-icon"><Calculator /></span><span><strong>Profit calculator</strong><small>Investment date, valuation date, shares or amount → profit and total return</small></span><span className="pro-most-used">MOST USED</span></Button>
    {groups.filter(g => group === "All" || g === group).map(g => <section key={g} className="pro-metric-section"><div className="pro-section-label"><h3>{g}</h3><span>{FINANCIAL_METRICS.filter(m => m.group === g).length} calculators</span></div><div className="pro-metric-grid">{FINANCIAL_METRICS.filter(m => m.group === g).map(m => <Button key={m.id} variant="outline" className="pro-metric-choice" onClick={() => onChoose(m)}><span className="pro-metric-icon">{m.badge}</span><span><strong>{m.name}</strong><small>{m.formula.replace("EPS = ", "")}</small></span></Button>)}</div></section>)}
    <p className="pro-disclaimer">Educational tools only. Results depend on the data you enter and markets that change. Not investment advice.</p>
  </div>;
}

export function FinancialMetricForm({ metric, onBack, onStageChange }: { metric: FinancialMetric; onBack: () => void; onStageChange: (result: boolean) => void }) {
  const [inputs, setInputs] = useState<Record<string, string>>({});
  const [period, setPeriod] = useState("Trailing 12 months (TTM)");
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [result, setResult] = useState<ReturnType<typeof calculateMetric> | null>(null);
  const [error, setError] = useState("");
  const [source, setSource] = useState("");
  const [loading, setLoading] = useState(false);
  const client = useQueryClient();
  const display = (value: number) => metric.unit === "usd" ? usd(value) : `${value.toFixed(2)}${metric.unit === "percent" ? "%" : "×"}`;
  const update = (key: string, value: string) => { setInputs(v => ({ ...v, [key]: value })); setSource(""); setResult(null); onStageChange(false); };
  async function autofill() {
    setLoading(true); setError("");
    try {
      const quotes = await client.fetchQuery(quotesQuery());
      const apple = quotes.find(q => q.symbol === "AAPL");
      const next: Record<string, string> = {};
      if (metric.fields.some(f => f.key === "price") && apple?.price != null) next.price = String(apple.price);
      if (metric.fields.some(f => f.key === "cap") && apple?.marketCap != null) next.cap = String(apple.marketCap / 1e6);
      if (!Object.keys(next).length) throw new Error("This data feed does not provide the financial statements required for this metric. Enter Apple’s reported figures.");
      setInputs(v => ({ ...v, ...next }));
      setSource(`Yahoo Finance · ${apple?.time ? new Date(apple.time).toLocaleString("en-GB", { timeZone: "America/New_York" }) + " ET" : "source timestamp unavailable"}. Financial-statement figures must be entered from Apple’s reports.`);
    } catch (e) { setError(e instanceof Error ? e.message : "Live price unavailable. Try again."); }
    finally { setLoading(false); }
  }
  function submit(e: FormEvent) {
    e.preventDefault(); setError("");
    try {
      if (period === "Custom period" && (!start || !end || start > end)) throw new Error("Choose a valid reporting period with its start on or before its end.");
      setResult(calculateMetric(metric, inputs)); onStageChange(true);
    } catch (e) { setError(e instanceof Error ? e.message : "Check your inputs."); }
  }
  const eps = result && metric.id === "eps" ? result.value : null;
  const prior = result?.values.prior;
  const growth = eps != null && prior != null && prior > 0 ? (eps - prior) / prior * 100 : null;
  const pe = eps != null && eps > 0 && result ? result.values.price / eps : null;
  const peg = pe != null && growth != null && growth > 0 ? pe / growth : null;
  const checks = result ? [
    { tone: result.value < 0 ? "risk" : "good", label: result.value < 0 ? "WATCH" : "CHECK", text: result.value < 0 ? "The result is negative. Review the underlying figures and business context." : "A positive result alone does not establish whether the stock is fairly valued." },
    ...(growth != null ? [{ tone: growth > 0 ? "good" : "risk", label: growth > 0 ? "GROWTH" : "WATCH", text: `EPS changed ${growth > 0 ? "+" : ""}${growth.toFixed(2)}% versus the prior comparable period.` }] : []),
    ...(peg != null ? [{ tone: peg > 2 ? "risk" : "neutral", label: "PEG", text: `PEG is ${peg.toFixed(2)}. This simple growth comparison is not a verified sector benchmark or a forecast.` }] : []),
    { tone: "neutral", label: "SOURCE", text: "Financial-statement inputs are user-provided, not independently verified. Use matching reporting periods and consistent share bases." },
  ] : [];
  return <div className="pro-stage">
    <Button variant="link" className="pro-back" onClick={() => { if (result) { setResult(null); onStageChange(false); } else onBack(); }}><ArrowLeft />{result ? "Edit inputs" : "All calculators"}</Button>
    {!result ? <>
      <div className="pro-formula"><h3>FORMULA</h3><strong>{metric.formula}</strong><p>Use reported figures from the same period and consistent units.</p></div>
      <p className="pro-source-note">Enter Apple’s reported figures. No sample financial numbers are pre-filled.</p>
      <Button variant="outline" className="pro-autofill" disabled={loading} onClick={autofill}><RefreshCw className={loading ? "animate-spin" : ""} />{loading ? "Checking source…" : "Auto-fill available live data"}</Button>
      {source && <p role="status" className="pro-source-note">{source}</p>}
      <form onSubmit={submit} className="pro-input-grid">
        <label>Reporting period<select value={period} onChange={e => setPeriod(e.target.value)}>{["Trailing 12 months (TTM)", "Annual", "Quarterly", "Custom period"].map(p => <option key={p}>{p}</option>)}</select><small>Use the same period for every figure below.</small></label>
        {metric.fields.map(field => <label key={field.key} htmlFor={`metric-${field.key}`}>{field.label}{field.optional ? " (optional)" : ""}<Input id={`metric-${field.key}`} type="number" step="any" required={!field.optional} value={inputs[field.key] ?? ""} onChange={e => update(field.key, e.target.value)} placeholder="Enter reported figure" /></label>)}
        {period === "Custom period" && <><CalculatorDateField id="report-start" label="Reporting period start" value={start} onChange={setStart} /><CalculatorDateField id="report-end" label="Reporting period end" value={end} min={start} onChange={setEnd} /></>}
        {error && <p role="alert" className="text-destructive pro-full-width">{error}</p>}
        <Button type="submit" className="pro-full-width pro-submit"><Calculator />Calculate {metric.badge}</Button>
      </form>
    </> : <>
      <div className="pro-result-grid"><div className="pro-result-panel"><h3>{metric.badge} · {period}</h3><div className={`pro-big-number ${result.value < 0 ? "text-destructive" : ""}`}>{display(result.value)}</div>{growth != null && <span className={growth >= 0 ? "text-success" : "text-destructive"}>{growth > 0 ? "+" : ""}{growth.toFixed(2)}% vs prior {usd(prior ?? 0)}</span>}<p>{metric.formula}</p></div><div className="pro-result-panel pro-assessment"><h3>DECISION CONTEXT</h3><div className="pro-verdict">REVIEW</div><p>One metric cannot justify buying or selling. Verify reported figures, valuation, risk and your investment goals.</p></div></div>
      <div className="pro-formula"><h3>WHAT THIS MEANS</h3><p>{metric.name} is {display(result.value)} for the selected period, based on your inputs.{eps != null ? ` Each Apple share earned ${usd(eps)}.${pe != null ? ` At ${usd(result.values.price)} per share, P/E is ${pe.toFixed(2)}.` : " P/E is not meaningful with non-positive earnings."}${peg != null ? ` PEG is ${peg.toFixed(2)}.` : " PEG requires positive comparable EPS growth."}` : " This is a calculation, not a prediction of future market performance."}</p></div>
      <div className="pro-result-grid">{eps != null && <><div className="pro-result-panel"><h4>EPS: prior vs current</h4><div className="pro-comparison"><span>Prior period</span><strong>{prior != null ? usd(prior) : "Not supplied"}</strong></div>{prior != null && <progress max={Math.max(Math.abs(prior), Math.abs(eps), 1)} value={Math.abs(prior)} aria-label="Prior EPS magnitude" />}<div className="pro-comparison"><span>Current</span><strong>{usd(eps)}</strong></div><progress max={Math.max(Math.abs(prior ?? 0), Math.abs(eps), 1)} value={Math.abs(eps)} aria-label="Current EPS magnitude" /></div><div className="pro-result-panel"><h4>P/E ratio: {pe?.toFixed(2) ?? "Not meaningful"}</h4><p>{pe != null ? "Price paid per dollar of current earnings. Compare against verified peers and growth prospects." : "Positive earnings are required."}</p><h4>PEG ratio: {peg?.toFixed(2) ?? "Not meaningful"}</h4><p>No sector median is supplied by the current data source.</p></div></>}
      <div className="pro-result-panel"><h4>Inputs used</h4><dl>{metric.fields.map(f => <div className="pro-comparison" key={f.key}><dt>{f.label}</dt><dd>{result.values[f.key]?.toLocaleString("en-US", { maximumFractionDigits: 6 }) ?? "Not supplied"}</dd></div>)}</dl>{period === "Custom period" && <p>{start} to {end}</p>}<p>{source || "User-entered figures · not independently verified"}</p></div></div>
      <h3 className="pro-section-label">RED FLAGS AND CHECKS</h3><div className="pro-checks">{checks.map(c => <div className={`pro-check pro-check-${c.tone}`} key={c.label}><strong>{c.label}</strong><span>{c.text}</span></div>)}</div>
      <div className="pro-formula"><h3>DECISION SCALE</h3><div className="pro-decision-scale"><span>BUY</span><span>WAIT</span><span>HOLD</span><span>SELL</span></div><p>No recommendation assigned. These outcomes require more than a single calculated metric.</p></div>
      <p className="pro-disclaimer">Markets change quickly. Financial inputs must be checked against Apple’s filings. Forecasts and growth rates are assumptions, not guarantees. Investico Academy is not an investment advisor. Do your own research and consult a licensed advisor before investing.</p>
      <Button asChild className="pro-submit"><Link to="/subscribe">Invest Now<ArrowRight /></Link></Button>
    </>}
  </div>;
}