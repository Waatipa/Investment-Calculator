import { Suspense, useEffect, useRef, useState, type FormEvent } from "react";
import { useSuspenseQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { Triangle, Calculator, LoaderCircle } from "lucide-react";
import { COMPANIES, quotesQuery, type Symbol } from "@/lib/markets";
import { usd } from "@/lib/calc";
import { getInvestmentResult, getPriceOnDate, type MarketQuote } from "@/lib/nvda.functions";
import { longDate } from "@/lib/investment";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { ProCalculatorChoices, FinancialMetricForm } from "@/components/pro-calculator";
import { CalculatorDateField } from "@/components/calculator-date-field";
import type { FinancialMetric } from "@/lib/financial-metrics";

type Result = Awaited<ReturnType<typeof getInvestmentResult>>;

export function MarketCalculator() {
  const [symbol, setSymbolState] = useState<Symbol>("NVDA");
  const [open, setOpen] = useState(false);
  const setSymbol = (s: Symbol) => { setSymbolState(s); setOpen(true); };
  return <main className="market-page">
    <section className="reference-intro">
      <div className="reference-copy"><h1>How? When? How Much?<br />Should I Start Investing?</h1>
      <p>Get a free course at Investico Academy to sharpen your skill in choosing the best companies to invest in. Use our <Button variant="link" className="inline-link" onClick={() => setOpen(true)}>investment calculator</Button> to work out your target profit based on the historical returns of the stock you have chosen.</p>
      <p>Need help? <Button variant="link" className="inline-link" asChild><Link to="/contact-us">Email us</Link></Button> and we will guide you step by step to build a portfolio and make your first investment.</p>
      <div className="intro-actions"><Button>Start Free Course</Button><Button onClick={() => setOpen(true)}>Calculate</Button><Button>Invest Now</Button></div>
      </div><MarketArtwork />
    </section>
    <div className="region-tabs" aria-label="Market regions">{["US", "EUROPE", "AFRICA", "ASIA", "AUSTRALIA", "MIDDLE EAST"].map(region => <Button key={region} variant="outline" className={region === "US" ? "region-active" : ""} aria-pressed={region === "US"}>{region}</Button>)}</div>
    <Suspense fallback={<CompanyButtons symbol={symbol} setSymbol={setSymbol} />}><LiveCompanies symbol={symbol} setSymbol={setSymbol} /></Suspense>
    <InvestmentForm symbol={symbol} open={open} setOpen={setOpen} />
  </main>;
}

function MarketArtwork() {
  const dots = Array.from({length: 48}, (_, row) => Array.from({length: 45}, (_, col) => {
    const x = col * 7 + 85, y = row * 6 + 65;
    const land = ((x-172)**2/7500+(y-130)**2/2500<1 && x+y<345) || ((x-225)**2/2200+(y-250)**2/5200<1) || ((x-330)**2/6700+(y-145)**2/1800<1) || ((x-345)**2/1600+(y-325)**2/700<1);
    return land ? <circle key={`${row}-${col}`} cx={x} cy={y} r="1.2" /> : null;
  }));
  return <svg className="market-artwork" viewBox="0 0 500 450" aria-hidden="true"><circle cx="290" cy="225" r="205" /><circle cx="290" cy="225" r="175" /><g className="map-dots">{dots}</g><g className="art-candles">{[0,1,2,3,4,5,6].map((n)=><g key={n}><path d={`M${220+n*30} ${355-n*n*5}v${70+n*10}`} /><rect x={213+n*30} y={375-n*n*5} width="14" height={30+n*7} rx="1" /></g>)}</g></svg>;
}
function LiveCompanies({ symbol, setSymbol }: { symbol: Symbol; setSymbol: (s: Symbol) => void }) {
  const { data } = useSuspenseQuery(quotesQuery());
  return <><CompanyButtons symbol={symbol} setSymbol={setSymbol} quotes={data} /><p className="market-footer">Market data provided by Yahoo Finance. Data may be delayed. Prices in USD.</p></>;
}
const sourceDate = (t: number | null | undefined) => t ? new Date(t).toLocaleDateString("en-US", {month:"short",day:"numeric",timeZone:"America/New_York"}) : "—";
const sourceTime = (t: number | null | undefined) => t ? new Date(t).toLocaleTimeString("en-US", {hour:"numeric",minute:"2-digit",timeZone:"America/New_York"}) + " ET" : "—";
function Change({ change, percent, className }: { change: number | null; percent: number | null; className?: string }) {
  const tone = change == null || change === 0 ? "text-muted-foreground" : change > 0 ? "text-success" : "text-destructive";
  return <div className={`quote-change ${tone} ${className ?? ""}`}>{change != null && percent != null ? <>{change !== 0 && <Triangle className={change < 0 ? "rotate-180" : ""} />}{change > 0 ? "+" : change < 0 ? "−" : ""}{Math.abs(change).toFixed(2)} ({percent > 0 ? "+" : percent < 0 ? "−" : ""}{Math.abs(percent).toFixed(2)}%)</> : "—"}</div>;
}
const initials: Record<Symbol,string> = {NVDA:"NV", AAPL:"AA", MSFT:"MS", AMZN:"AM", GOOGL:"GO", META:"ME", TSLA:"TS"};
function CompanyButtons({ symbol, setSymbol, quotes }: { symbol: Symbol; setSymbol: (s: Symbol) => void; quotes?: MarketQuote[] }) {
  return <div className="company-grid" aria-label="Companies">{COMPANIES.map(c => {
    const quote = quotes?.find(q => q.symbol === c.symbol);
    const change = quote?.price != null && quote.previousClose != null ? quote.price - quote.previousClose : null;
    const percent = change != null && quote?.previousClose ? change / quote.previousClose * 100 : null;
    const post = quote?.postMarketPrice ?? null;
    const postChange = post != null && quote?.price != null ? post - quote.price : null;
    const postPercent = postChange != null && quote?.price ? postChange / quote.price * 100 : null;
    return <Button key={c.symbol} variant="ghost" type="button" aria-label={`${c.name} (${c.symbol}) calculator`} aria-pressed={symbol === c.symbol} onClick={() => setSymbol(c.symbol)} className={`company-card company-panel-${c.symbol.toLowerCase()}`}>
      <div className="company-panel"><span className="company-initials">{initials[c.symbol]}</span><div><div className="company-name">{c.name}</div><div className="company-symbol">{c.symbol}</div></div></div>
      <div className="quote-section"><div className="quote-meta"><span>{quote?.marketOpen ? "Live" : "Close"}</span><span>{sourceDate(quote?.time)}</span></div><div className="quote-price">{quote?.price != null ? usd(quote.price) : "—"}</div><Change change={change} percent={percent} /><div className="quote-time">{sourceTime(quote?.time)}</div></div>
      <div className="quote-section off-hours"><div className="quote-meta"><span>Off-Hours</span><span>{sourceDate(quote?.postMarketTime)}</span></div><div className="quote-price">{post != null ? usd(post) : "—"}</div><Change change={postChange} percent={postPercent} /><div className="quote-time">{sourceTime(quote?.postMarketTime)}</div></div>
    </Button>;
  })}</div>;
}

function InvestmentForm({ symbol, open, setOpen }: { symbol: Symbol; open: boolean; setOpen: (o: boolean) => void }) {
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [shares, setShares] = useState("10");
  const [amount, setAmount] = useState("");
  const [purchasePrice, setPurchasePrice] = useState<number | null>(null);
  const [result, setResult] = useState<Result | null>(null);
  const [busy, setBusy] = useState(false);
  const [priceLoading, setPriceLoading] = useState(false);
  const [error, setError] = useState("");
  const [metric, setMetric] = useState<FinancialMetric | "profit" | null>(null);
  const [metricResult, setMetricResult] = useState(false);
  const entered = useRef({ shares: "10", amount: "", basis: "shares" as "shares" | "amount" });
  const revision = useRef(0);
  const company = COMPANIES.find(c => c.symbol === symbol);
  useEffect(() => { setMetric(null); setMetricResult(false); }, [symbol, open]);
  useEffect(() => { revision.current += 1; setResult(null); setError(""); setPurchasePrice(null); }, [symbol, startDate]);
  useEffect(() => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(startDate)) { setPriceLoading(false); return; }
    let cancelled = false;
    setPriceLoading(true);
    getPriceOnDate({ data: { symbol, date: startDate } })
      .then(price => {
        if (cancelled) return;
        setPurchasePrice(price);
        if (price == null) { setError("No purchase price is available for this investment date."); return; }
        if (entered.current.basis === "amount") {
          const a = Number(entered.current.amount);
          if (Number.isFinite(a) && a > 0) {
            const next = (a / price).toString();
            entered.current.shares = next; setShares(next);
          }
        } else {
          const q = Number(entered.current.shares);
          if (Number.isFinite(q) && q > 0) {
            const next = (Math.round(q * price * 100) / 100).toString();
            entered.current.amount = next; setAmount(next);
          }
        }
      })
      .catch(() => { if (!cancelled) { setPurchasePrice(null); setError("Purchase price unavailable. Please try another date."); } })
      .finally(() => { if (!cancelled) setPriceLoading(false); });
    return () => { cancelled = true; };
  }, [symbol, startDate]);
  function updateShares(v: string) {
    revision.current += 1;
    entered.current.shares = v; entered.current.basis = "shares";
    setShares(v); setResult(null);
    const q = Number(v);
    const next = purchasePrice != null && Number.isFinite(q) && q > 0 ? (Math.round(q * purchasePrice * 100) / 100).toString() : "";
    entered.current.amount = next; setAmount(next);
  }
  function updateAmount(v: string) {
    revision.current += 1;
    entered.current.amount = v; entered.current.basis = "amount";
    setAmount(v); setResult(null);
    const a = Number(v);
    const next = purchasePrice != null && Number.isFinite(a) && a > 0 ? (a / purchasePrice).toString() : "";
    entered.current.shares = next; setShares(next);
  }
  async function calculate(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setBusy(true);
    const submittedRevision = revision.current;
    try { const next = await getInvestmentResult({ data: { symbol, startDate, endDate, shares: Number(shares) } }); if (submittedRevision === revision.current) setResult(next); }
    catch (err) { if (submittedRevision === revision.current) setError(err instanceof Error ? err.message : "Prices are unavailable. Please try again."); }
    finally { setBusy(false); }
  }
  const card = (title: string, profit: number, roi: number, rows: [string, string][]) => <div className="company-result rounded-lg border border-border p-4">
    <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{title}</div>
    <div className={`mt-1 font-display text-2xl font-semibold tabular-nums ${profit >= 0 ? "text-success" : "text-destructive"}`}>{profit >= 0 ? "+" : ""}{usd(profit)}</div>
    <div className={`text-sm font-medium ${profit >= 0 ? "text-success" : "text-destructive"}`}>{roi >= 0 ? "+" : ""}{roi.toFixed(2)}% return</div>
    <dl className="mt-3 grid gap-2 border-t border-border pt-3 text-sm">{rows.map(([k, v]) => <div key={k} className="flex justify-between gap-3"><dt className="text-muted-foreground">{k}</dt><dd className="text-right font-medium tabular-nums">{v}</dd></div>)}</dl>
  </div>;
  return <Dialog open={open} onOpenChange={o => { setOpen(o); if (!o) setResult(null); }}>
      <DialogContent className={`company-dialog ${symbol === "AAPL" ? "pro-dialog" : ""} company-panel-${symbol.toLowerCase()} max-h-[90dvh] w-[calc(100%-1.5rem)] max-w-3xl overflow-y-auto overflow-x-hidden rounded-lg p-4 sm:p-6`}>
        <DialogHeader className="company-dialog-heading"><div className="pro-heading-row">{symbol === "AAPL" && <span className="company-initials">AA</span>}<div><div className="mb-2 text-xs font-semibold uppercase text-muted-foreground">{company?.name} · {symbol}{symbol === "AAPL" ? ` · ${metric && metric !== "profit" ? (metricResult ? "RESULT" : metric.group.toUpperCase()) : "NASDAQ"}` : ""}</div><DialogTitle className="pr-8 font-display text-xl">{symbol === "AAPL" && metric !== "profit" ? metric?.name ?? "Apple (AAPL) pro calculator" : `${company?.name} (${symbol}) ${result ? "investment result" : "profit calculator"}`}</DialogTitle></div></div><DialogDescription>{symbol === "AAPL" && metric == null ? "Choose a calculator." : result ? `${result.shares} ${symbol} shares · ${longDate(result.purchaseDate)} to ${longDate(result.valuationDate)}` : metric && metric !== "profit" ? "Apple financial analysis" : "Enter your dates and shares or amount, then calculate."}</DialogDescription></DialogHeader>
        {symbol === "AAPL" && metric == null ? <ProCalculatorChoices onChoose={setMetric} /> : symbol === "AAPL" && metric && metric !== "profit" ? <FinancialMetricForm key={metric.id} metric={metric} onBack={() => setMetric(null)} onStageChange={setMetricResult} /> : <>
        {symbol === "AAPL" && <Button variant="link" className="pro-back" onClick={() => { setMetric(null); setResult(null); }}>← All calculators</Button>}
        {!result ? <form className="grid gap-4 sm:grid-cols-2" onSubmit={calculate}>
          <CalculatorDateField id="investment-date" label="Investment date" value={startDate} disabled={busy} onChange={v => { revision.current += 1; setStartDate(v); setResult(null); }} />
          <CalculatorDateField id="valuation-date" label="Valuation date" value={endDate} min={startDate || undefined} disabled={busy} onChange={v => { revision.current += 1; setEndDate(v); setResult(null); }} />
          <label className="grid gap-2 text-xs font-medium" htmlFor="investment-shares">Number of shares<Input id="investment-shares" type="number" min="0.000001" step="any" required value={shares} disabled={busy} onChange={e => updateShares(e.target.value)} className="h-12 text-base" /></label>
          <label className="grid gap-2 text-xs font-medium" htmlFor="investment-amount">Investment amount (USD)<Input id="investment-amount" type="number" min="0.01" step="any" value={amount} disabled={busy || priceLoading || purchasePrice == null} placeholder={priceLoading ? "Loading purchase price…" : "Pick a date first"} onChange={e => updateAmount(e.target.value)} className="h-12 text-base" /></label>
          {error && <p role="alert" className="text-sm text-destructive sm:col-span-2">{error}</p>}
          <Button type="submit" disabled={busy || priceLoading || (entered.current.basis === "amount" && purchasePrice == null)} className="h-12 text-base font-semibold sm:col-span-2">{busy ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Calculator className="h-4 w-4" />}{busy ? "Calculating…" : "Calculate Profit"}</Button>
        </form> : <>
          <div className="grid gap-4 md:grid-cols-2">
            {card("Profit today", result.profit, result.roi, [["Current Stock Price", `${usd(result.endPrice)} · ${longDate(result.valuationDate)}`], ["Buying Stock Price", `${usd(result.purchasePrice)} · ${longDate(result.purchaseDate)}`], ["Portfolio Value (Investment Date)", usd(result.invested)], ["Portfolio Value (To Date)", usd(result.value)]])}
            {card("Profit at maximum stock price", result.maxProfit, result.maxRoi, [["Highest Stock Price", `${usd(result.maxPrice)} · ${longDate(result.maxDate)}`], ["Buying Stock Price", `${usd(result.purchasePrice)} · ${longDate(result.purchaseDate)}`], ["Portfolio Value (Investment Date)", usd(result.invested)], ["Portfolio Value (Peak Date)", usd(result.maxValue)]])}
          </div>
          <p className="text-xs text-muted-foreground">Portfolio value is shares × price on each date; profit is the later portfolio value minus the portfolio value at the investment date.</p>
          <p className="text-xs leading-relaxed text-muted-foreground">Yahoo Finance prices in USD, split-adjusted; shares are on the current split-adjusted basis. Investment uses the first trading day close on or after your date; valuation uses the last trading day close on or before your date. The maximum uses the highest daily traded price in that period (hypothetical sale). Excludes dividends, taxes and fees. Not financial advice.</p>
          <Button variant="outline" className="h-12 text-base" onClick={() => setResult(null)}>Edit Investment Details</Button>
          <Button asChild className="h-12 text-base font-semibold"><Link to="/subscribe">{symbol === "AAPL" ? "Invest Now" : `Invest in ${company?.name} Now`}</Link></Button>
        </>}
        </>}
      </DialogContent>
    </Dialog>;
}
