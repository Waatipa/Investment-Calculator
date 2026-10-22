import { OptionalInvestmentLabel } from "@/components/optional-investment-label";
import { useState, type FormEvent } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ArrowLeft, Calculator, ArrowRight, RefreshCw } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { FINANCIAL_METRICS, calculateMetric, type FinancialMetric } from "@/lib/financial-metrics";
import { quotesQuery } from "@/lib/markets";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CalculatorDateField } from "./calculator-date-field";
import { getFilingFigures, type VerifiedFigure } from "@/lib/sec-facts.functions";
import { getRegionalFigures, ME_FUNDAMENTAL_SYMBOLS, AF_FUNDAMENTAL_SYMBOLS } from "@/lib/yahoo-fundamentals.functions";
import { africaQuotesQuery } from "@/lib/africa";
import { middleEastQuotesQuery } from "@/lib/middle-east";
import { europeQuotesQuery } from "@/lib/europe";
import { getEuropeFilingFigures } from "@/lib/eu-filings.functions";
import { EU_FUNDAMENTAL_SYMBOLS } from "@/lib/yahoo-fundamentals.functions";
import { longDate } from "@/lib/investment";

const figureSource = (f: VerifiedFigure) => f.form === "Yahoo Finance" ? `Yahoo Finance fundamentals · ${f.note ?? ""}` : `SEC ${f.form} filed ${longDate(f.filed)} · period ${f.periodStart ? `${longDate(f.periodStart)} – ` : "as of "}${longDate(f.periodEnd)}${f.note ? ` · ${f.note}` : ""}`;

export function ProCalculatorChoices({ onChoose, hideProfit = false }: { onChoose: (metric: FinancialMetric | "profit") => void; hideProfit?: boolean }) {
  const [group, setGroup] = useState("All");
  const groups = ["Valuation", "Profitability", "Growth & cash", "Balance sheet & income"];
  return <div className="pro-stage">
    <div className="pro-filters" aria-label="Calculator categories">{["All", ...groups].map(g => <Button key={g} variant={group === g ? "default" : "outline"} aria-pressed={group === g} onClick={() => setGroup(g)}>{g === "All" ? "All · 22" : g}</Button>)}</div>
    {!hideProfit && <Button variant="outline" className="pro-profit-choice" onClick={() => onChoose("profit")}><span className="pro-metric-icon"><Calculator /></span><span><strong>Profit calculator</strong><small>Investment date, valuation date, shares or amount → profit and total return</small></span><span className="pro-most-used">MOST USED</span></Button>}
    {groups.filter(g => group === "All" || g === group).map(g => <section key={g} className="pro-metric-section"><div className="pro-section-label"><h3>{g}</h3><span>{FINANCIAL_METRICS.filter(m => m.group === g).length} calculators</span></div><div className="pro-metric-grid">{FINANCIAL_METRICS.filter(m => m.group === g).map(m => <Button key={m.id} variant="outline" className="pro-metric-choice" onClick={() => onChoose(m)}><span className="pro-metric-icon">{m.badge}</span><span><strong>{m.name}</strong><small>{m.formula.replace("EPS = ", "")}</small></span></Button>)}</div></section>)}
    <p className="pro-disclaimer">Educational tools only. Results depend on the data you enter and markets that change. Not investment advice.</p>
  </div>;
}

export function FinancialMetricForm({ metric, onBack, onStageChange, symbol = "AAPL", companyName = "Apple", currency = "USD" }: { metric: FinancialMetric; onBack: () => void; onStageChange: (result: boolean) => void; symbol?: string; companyName?: string | undefined; currency?: string }) {
  const european = (EU_FUNDAMENTAL_SYMBOLS as readonly string[]).includes(symbol);
  const african = (AF_FUNDAMENTAL_SYMBOLS as readonly string[]).includes(symbol);
  const regional = european || african || (ME_FUNDAMENTAL_SYMBOLS as readonly string[]).includes(symbol);
  const usd = (n: number) => n.toLocaleString("en-US", { style: "currency", currency, minimumFractionDigits: 2, maximumFractionDigits: 2 });
  // AstraZeneca and HSBC report in USD while their London shares trade in pence.
  const reportCcy = symbol === "AZN.L" || symbol === "HSBA.L" ? "USD" : currency;
  const label = (l: string, key = "") => l.replace("USD", key === "price" || key === "cap" ? currency : reportCcy);
  const [inputs, setInputs] = useState<Record<string, string>>({});
  const [period, setPeriod] = useState("Annual");
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [result, setResult] = useState<ReturnType<typeof calculateMetric> | null>(null);
  const [error, setError] = useState("");
  const [source, setSource] = useState("");
  const [loading, setLoading] = useState(false);
  const [verified, setVerified] = useState<Record<string, VerifiedFigure | { live: string }>>({});
  const fetchFigures = useServerFn(getFilingFigures);
  const fetchRegional = useServerFn(getRegionalFigures);
  const fetchEurope = useServerFn(getEuropeFilingFigures);
  const client = useQueryClient();
  const display = (value: number) => metric.unit === "usd" ? usd(value) : `${value.toFixed(2)}${metric.unit === "percent" ? "%" : "×"}`;
  const update = (key: string, value: string) => { setInputs(v => ({ ...v, [key]: value })); setVerified(v => { const n = { ...v }; delete n[key]; return n; }); setSource(""); setResult(null); onStageChange(false); };
  async function autofill() {
    setLoading(true); setError("");
    try {
      const quotes: { symbol: string; price: number | null; marketCap: number | null; time: number | null }[] = european ? await client.fetchQuery(europeQuotesQuery()) : african ? await client.fetchQuery(africaQuotesQuery()) : regional ? await client.fetchQuery(middleEastQuotesQuery()) : await client.fetchQuery(quotesQuery());
      const rawQuote = quotes.find(q => q.symbol === symbol);
      // JSE prices are cents; market caps and statement figures are in rand.
      const apple = rawQuote && african && symbol.endsWith(".JO") ? { ...rawQuote, price: rawQuote.price == null ? null : rawQuote.price / 100 } : rawQuote;
      const next: Record<string, string> = {};
      const tags: Record<string, VerifiedFigure | { live: string }> = {};
      const live = `Yahoo Finance quote · ${apple?.time ? new Date(apple.time).toLocaleString("en-GB", { timeZone: "America/New_York" }) + " ET" : "timestamp unavailable"}`;
      if (metric.fields.some(f => f.key === "price") && apple?.price != null) { next["price"] = String(apple.price); tags["price"] = { live }; }
      if (metric.fields.some(f => f.key === "cap") && apple?.marketCap != null) { next["cap"] = String(apple.marketCap / 1e6); tags["cap"] = { live }; }
      const args = { metric: metric.id, keys: metric.fields.map(f => f.key).filter(k => !(k in next)), period: period === "Quarterly" ? "quarterly" : "annual", marketCapM: apple?.marketCap ? apple.marketCap / 1e6 : null, price: apple?.price ?? null };
      const sec = period === "Custom period" ? null : european ? await fetchEurope({ data: { ...args, symbol: symbol as typeof EU_FUNDAMENTAL_SYMBOLS[number], currency } }) : regional ? await fetchRegional({ data: { ...args, symbol: symbol as typeof ME_FUNDAMENTAL_SYMBOLS[number], currency } }) : await fetchFigures({ data: { ...args, symbol: symbol as "AAPL" } });
      for (const fig of sec?.figures ?? []) { next[fig.key] = String(Number(fig.value.toFixed(6))); tags[fig.key] = fig; }
      if (!Object.keys(next).length) throw new Error(sec?.error ?? `No verified source reports these figures for this period. Enter ${companyName}’s reported figures.`);
      setInputs(v => ({ ...v, ...next })); setVerified(v => ({ ...v, ...tags })); setResult(null); onStageChange(false);
      const missing = metric.fields.filter(f => !(f.key in next)).map(f => f.label);
      setSource(`${sec?.error ? sec.error + " " : ""}${european && sec && "note" in sec ? `${sec.note} Fields tagged with a 20-F filing come from the company’s own report; others are Yahoo Finance summaries.` : regional ? "Figures filled from Yahoo Finance fundamentals (provider summaries of company reports, not the filings themselves)." : "Verified figures filled from SEC EDGAR filings and Yahoo Finance."}${missing.length ? ` Your own assumptions (not reported in filings) — enter manually: ${missing.join(", ")}.` : ""}`);
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
  const prior = result?.values["prior"];
  const growth = eps != null && prior != null && prior > 0 ? (eps - prior) / prior * 100 : null;
  const pe = eps != null && eps > 0 && result ? (result.values["price"] ?? 0) / eps : null;
  const peg = pe != null && growth != null && growth > 0 ? pe / growth : null;
  const checks = result ? [
    { tone: result.value < 0 ? "risk" : "good", label: result.value < 0 ? "WATCH" : "CHECK", text: result.value < 0 ? "The result is negative. Review the underlying figures and business context." : "A positive result alone does not establish whether the stock is fairly valued." },
    ...(growth != null ? [{ tone: growth > 0 ? "good" : "risk", label: growth > 0 ? "GROWTH" : "WATCH", text: `EPS changed ${growth > 0 ? "+" : ""}${growth.toFixed(2)}% versus the prior comparable period.` }] : []),
    ...(peg != null ? [{ tone: peg > 2 ? "risk" : "neutral", label: "PEG", text: `PEG is ${peg.toFixed(2)}. This simple growth comparison is not a verified sector benchmark or a forecast.` }] : []),
    { tone: "neutral", label: "SOURCE", text: Object.keys(verified).length ? `Figures marked with a source come from ${european ? "SEC EDGAR 20-F filings, Yahoo Finance summaries or live quotes (see each tag)" : regional ? "Yahoo Finance fundamentals and quotes" : "SEC EDGAR filings or Yahoo Finance"}; any others are user-entered and unverified.` : "Financial-statement inputs are user-provided, not independently verified. Use matching reporting periods and consistent share bases." },
  ] : [];
  return <div className="pro-stage">
    <Button variant="link" className="pro-back" onClick={() => { if (result) { setResult(null); onStageChange(false); } else onBack(); }}><ArrowLeft />{result ? "Edit inputs" : "All calculators"}</Button>
    {!result ? <>
      <div className="pro-formula"><h3>FORMULA</h3><strong>{metric.formula}</strong><p>Use reported figures from the same period and consistent units.</p></div>
      <p className="pro-source-note">Auto-fill pulls {companyName}’s reported figures from {european ? "its own annual 20-F filings at SEC EDGAR where available, otherwise Yahoo Finance" : regional ? `Yahoo Finance fundamentals (in ${currency})` : "SEC EDGAR"} for the chosen period, or enter them yourself. No sample numbers are pre-filled.</p>
      <Button variant="outline" className="pro-autofill" disabled={loading} onClick={autofill}><RefreshCw className={loading ? "animate-spin" : ""} />{loading ? "Checking source…" : "Auto-fill verified data"}</Button>
      {source && <p role="status" className="pro-source-note">{source}</p>}
      {!regional && <Button asChild variant="link" className="pro-back"><Link to="/ask">Ask AI about {companyName}’s SEC figures<ArrowRight /></Link></Button>}
      <form onSubmit={submit} className="pro-input-grid">
        <label>Reporting period<select value={period} onChange={e => { setPeriod(e.target.value); setVerified({}); setSource(""); }}>{["Annual", "Quarterly", "Custom period"].map(p => <option key={p}>{p}</option>)}</select><small>Use the same period for every figure below.</small></label>
        {metric.fields.map(field => <label key={field.key} htmlFor={`metric-${field.key}`}>{label(field.label, field.key)}{field.optional ? " (optional)" : ""}<Input id={`metric-${field.key}`} type="number" step="any" required={!field.optional} value={inputs[field.key] ?? ""} onChange={e => update(field.key, e.target.value)} placeholder="Enter reported figure" /><SourceTag tag={verified[field.key]} /></label>)}
        {period === "Custom period" && <><CalculatorDateField id="report-start" label="Reporting period start" value={start} onChange={setStart} /><CalculatorDateField id="report-end" label="Reporting period end" value={end} min={start} onChange={setEnd} /></>}
        {error && <p role="alert" className="text-destructive pro-full-width">{error}</p>}
        <Button type="submit" className="pro-full-width pro-submit"><Calculator />Calculate {metric.badge}</Button>
      </form>
    </> : <>
      <div className="pro-result-grid"><div className="pro-result-panel"><h3>{metric.badge} · {period}</h3><div className={`pro-big-number ${result.value < 0 ? "text-destructive" : ""}`}>{display(result.value)}</div>{growth != null && <span className={growth >= 0 ? "text-success" : "text-destructive"}>{growth > 0 ? "+" : ""}{growth.toFixed(2)}% vs prior {usd(prior ?? 0)}</span>}<p>{metric.formula}</p></div><div className="pro-result-panel pro-assessment"><h3>DECISION CONTEXT</h3><div className="pro-verdict">REVIEW</div><p>One metric cannot justify buying or selling. Verify reported figures, valuation, risk and your investment goals.</p></div></div>
      <div className="pro-formula"><h3>WHAT THIS MEANS</h3><p>{metric.name} is {display(result.value)} for the selected period, based on your inputs.{eps != null ? ` Each ${companyName} share earned ${usd(eps)}.${pe != null ? ` At ${usd(result.values["price"] ?? 0)} per share, P/E is ${pe.toFixed(2)}.` : " P/E is not meaningful with non-positive earnings."}${peg != null ? ` PEG is ${peg.toFixed(2)}.` : " PEG requires positive comparable EPS growth."}` : " This is a calculation, not a prediction of future market performance."}</p></div>
      <div className="pro-result-grid">{eps != null && <><div className="pro-result-panel"><h4>EPS: prior vs current</h4><div className="pro-comparison"><span>Prior period</span><strong>{prior != null ? usd(prior) : "Not supplied"}</strong></div>{prior != null && <progress max={Math.max(Math.abs(prior), Math.abs(eps), 1)} value={Math.abs(prior)} aria-label="Prior EPS magnitude" />}<div className="pro-comparison"><span>Current</span><strong>{usd(eps)}</strong></div><progress max={Math.max(Math.abs(prior ?? 0), Math.abs(eps), 1)} value={Math.abs(eps)} aria-label="Current EPS magnitude" /></div><div className="pro-result-panel"><h4>P/E ratio: {pe?.toFixed(2) ?? "Not meaningful"}</h4><p>{pe != null ? "Price paid per dollar of current earnings. Compare against verified peers and growth prospects." : "Positive earnings are required."}</p><h4>PEG ratio: {peg?.toFixed(2) ?? "Not meaningful"}</h4><p>No sector median is supplied by the current data source.</p></div></>}
      <div className="pro-result-panel"><h4>Inputs used</h4><dl>{metric.fields.map(f => <div className="pro-comparison" key={f.key}><dt>{label(f.label, f.key)}</dt><dd>{result.values[f.key]?.toLocaleString("en-US", { maximumFractionDigits: 6 }) ?? "Not supplied"}<SourceTag tag={verified[f.key]} /></dd></div>)}</dl>{period === "Custom period" && <p>{start} to {end}</p>}<p>{source || "User-entered figures · not independently verified"}</p></div></div>
      <h3 className="pro-section-label">RED FLAGS AND CHECKS</h3><div className="pro-checks">{checks.map(c => <div className={`pro-check pro-check-${c.tone}`} key={c.label}><strong>{c.label}</strong><span>{c.text}</span></div>)}</div>
      <div className="pro-formula"><h3>DECISION SCALE</h3><div className="pro-decision-scale"><span>BUY</span><span>WAIT</span><span>HOLD</span><span>SELL</span></div><p>No recommendation assigned. These outcomes require more than a single calculated metric.</p></div>
      <p className="pro-disclaimer">Markets change quickly. Financial inputs must be checked against {companyName}’s filings. Forecasts and growth rates are assumptions, not guarantees. Investico Academy is not an investment advisor. Do your own research and consult a licensed advisor before investing.</p>
      {!regional && <Button asChild variant="outline" className="pro-submit"><Link to="/ask">Ask AI to explain these figures<ArrowRight /></Link></Button>}
      <Button asChild className="pro-submit btn-gold"><Link to="/subscribe"><OptionalInvestmentLabel>Invest Now</OptionalInvestmentLabel><ArrowRight /></Link></Button>
    </>}
  </div>;
}
function SourceTag({ tag }: { tag: VerifiedFigure | { live: string } | undefined }) {
  if (!tag) return null;
  if ("live" in tag) return <small className="pro-figure-source">{tag.live}</small>;
  return <small className="pro-figure-source"><a href={tag.url} target="_blank" rel="noreferrer">{figureSource(tag)}</a> · {tag.concept}</small>;
}
