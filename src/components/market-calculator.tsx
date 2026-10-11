import { Suspense, useEffect, useRef, useState, type FormEvent } from "react";
import { useSuspenseQuery } from "@tanstack/react-query";
import { ArrowUp, ArrowDown, Radio, Calculator, LoaderCircle } from "lucide-react";
import { COMPANIES, formatMarketCap, quotesQuery, type Symbol } from "@/lib/markets";
import { usd } from "@/lib/calc";
import { getInvestmentResult, getPriceOnDate, type MarketQuote } from "@/lib/nvda.functions";
import { longDate } from "@/lib/investment";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";

type Result = Awaited<ReturnType<typeof getInvestmentResult>>;

export function MarketCalculator() {
  const [symbol, setSymbolState] = useState<Symbol>("NVDA");
  const [open, setOpen] = useState(false);
  const setSymbol = (s: Symbol) => { setSymbolState(s); setOpen(true); };
  return <main className="mx-auto max-w-6xl px-6 py-8">
    <div className="text-xs font-medium uppercase tracking-wide text-primary-deep">Magnificent Seven · Investment Time Machine</div>
    <h1 className="mt-2 max-w-3xl font-display text-3xl font-semibold leading-tight md:text-4xl">See What Your Money Would Have Become.</h1>
    <p className="mt-3 max-w-3xl text-sm leading-relaxed text-muted-foreground">Pick a company, enter how much you would have invested, drag through time, and instantly see the profit, ROI, and portfolio value. Historical investment math made simple.</p>
    <Suspense fallback={<CompanyButtons symbol={symbol} setSymbol={setSymbol} />}><LiveCompanies symbol={symbol} setSymbol={setSymbol} /></Suspense>
    <InvestmentForm symbol={symbol} open={open} setOpen={setOpen} />
  </main>;
}

function LiveCompanies({ symbol, setSymbol }: { symbol: Symbol; setSymbol: (s: Symbol) => void }) {
  const { data, isFetching } = useSuspenseQuery(quotesQuery());
  return <><CompanyButtons symbol={symbol} setSymbol={setSymbol} quotes={data} /><div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground"><Radio className={`h-3 w-3 ${isFetching ? "text-primary-deep" : ""}`} />{data.some(q => q.marketOpen) ? "Market open" : "Market closed"} · Checked every second · Yahoo Finance data may be delayed</div></>;
}

const sessionTime = (t: number) => new Date(t).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit", timeZone: "America/New_York" }) + " ET";

function CompanyButtons({ symbol, setSymbol, quotes }: { symbol: Symbol; setSymbol: (s: Symbol) => void; quotes?: MarketQuote[] }) {
  return <div className="mt-6 grid grid-cols-2 gap-x-3 gap-y-5 sm:grid-cols-4 lg:grid-cols-7" aria-label="Companies">{COMPANIES.map(c => {
    const quote = quotes?.find(q => q.symbol === c.symbol);
    const change = quote?.price != null && quote.previousClose != null ? quote.price - quote.previousClose : null;
    const percent = change != null && quote?.previousClose ? change / quote.previousClose * 100 : null;
    return <div key={c.symbol} className="min-w-0">
      <Button className="h-24 w-full flex-col gap-1 px-1 font-display text-base font-semibold" variant={symbol === c.symbol ? "default" : "outline"} aria-pressed={symbol === c.symbol} onClick={() => setSymbol(c.symbol)}>{c.name}<span className="text-[10px] font-normal opacity-70">{c.symbol}</span><span className="mt-1 text-xs font-medium tabular-nums" title="Market capitalization in USD">{quote ? formatMarketCap(quote.marketCap) : "—"}</span><span className="text-[9px] font-normal opacity-70">Market cap · USD</span></Button>
      <div className="px-1 pt-2">
        <div key={quote?.price} className="quote-tick text-sm font-semibold tabular-nums" title={quote?.time ? sessionTime(quote.time) : undefined}>{quote?.price != null ? usd(quote.price) : quotes ? "Unavailable" : "—"}</div>
        <div className={`mt-1 flex min-h-4 items-center gap-0.5 text-[10px] tabular-nums ${change == null || change === 0 ? "text-muted-foreground" : change > 0 ? "text-success" : "text-destructive"}`}>{change != null && percent != null ? <>{change > 0 ? <ArrowUp className="h-3 w-3 shrink-0" /> : change < 0 ? <ArrowDown className="h-3 w-3 shrink-0" /> : null}{Math.abs(change).toFixed(2)} ({percent > 0 ? "+" : ""}{percent.toFixed(2)}%)</> : "—"}</div>
        <SessionPrice label="After-hours" price={quote?.postMarketPrice ?? null} time={quote?.postMarketTime ?? null} />
      </div>
    </div>;
  })}</div>;
}

function SessionPrice({ label, price, time }: { label: string; price?: number | null; time?: number | null }) {
  return <div className="mt-2 border-t border-border pt-2"><div className="text-[10px] text-muted-foreground">{label}</div><div key={price} className="quote-tick text-xs font-medium tabular-nums">{price != null ? usd(price) : "Unavailable"}</div>{time != null && <div className="mt-0.5 text-[9px] leading-relaxed text-muted-foreground">{sessionTime(time)}</div>}</div>;
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
  const entered = useRef({ shares: "10", amount: "", basis: "shares" as "shares" | "amount" });
  const revision = useRef(0);
  const company = COMPANIES.find(c => c.symbol === symbol);
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
  const card = (title: string, profit: number, roi: number, rows: [string, string][]) => <div className="rounded-lg border border-border p-4">
    <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{title}</div>
    <div className={`mt-1 font-display text-2xl font-semibold tabular-nums ${profit >= 0 ? "text-success" : "text-destructive"}`}>{profit >= 0 ? "+" : ""}{usd(profit)}</div>
    <div className={`text-sm font-medium ${profit >= 0 ? "text-success" : "text-destructive"}`}>{roi >= 0 ? "+" : ""}{roi.toFixed(2)}% return</div>
    <dl className="mt-3 grid gap-2 border-t border-border pt-3 text-sm">{rows.map(([k, v]) => <div key={k} className="flex justify-between gap-3"><dt className="text-muted-foreground">{k}</dt><dd className="text-right font-medium tabular-nums">{v}</dd></div>)}</dl>
  </div>;
  return <Dialog open={open} onOpenChange={o => { setOpen(o); if (!o) setResult(null); }}>
      <DialogContent className="max-h-[90dvh] w-[calc(100%-1.5rem)] max-w-3xl overflow-y-auto overflow-x-hidden rounded-lg p-4 sm:p-6">
        <DialogHeader><DialogTitle className="pr-8 font-display text-xl">{company?.name} ({symbol}) {result ? "investment result" : "profit calculator"}</DialogTitle><DialogDescription>{result ? `${result.shares} ${symbol} shares · ${longDate(result.purchaseDate)} to ${longDate(result.valuationDate)}` : "Enter your dates and shares or amount, then calculate."}</DialogDescription></DialogHeader>
        {!result ? <form className="grid gap-4 sm:grid-cols-2" onSubmit={calculate}>
          <label className="grid gap-2 text-xs font-medium" htmlFor="investment-date">Investment date<Input id="investment-date" type="date" required value={startDate} disabled={busy} onChange={e => { setStartDate(e.target.value); setResult(null); }} className="h-12 text-base" /></label>
          <label className="grid gap-2 text-xs font-medium" htmlFor="valuation-date">Valuation date<Input id="valuation-date" type="date" required min={startDate || undefined} value={endDate} disabled={busy} onChange={e => { revision.current += 1; setEndDate(e.target.value); setResult(null); }} className="h-12 text-base" /></label>
          <label className="grid gap-2 text-xs font-medium" htmlFor="investment-shares">Number of shares<Input id="investment-shares" type="number" min="0.000001" step="any" required value={shares} disabled={busy} onChange={e => updateShares(e.target.value)} className="h-12 text-base" /></label>
          <label className="grid gap-2 text-xs font-medium" htmlFor="investment-amount">Investment amount (USD)<Input id="investment-amount" type="number" min="0.01" step="any" value={amount} disabled={busy || priceLoading || purchasePrice == null} placeholder={priceLoading ? "Loading purchase price…" : "Pick a date first"} onChange={e => updateAmount(e.target.value)} className="h-12 text-base" /></label>
          {error && <p role="alert" className="text-sm text-destructive sm:col-span-2">{error}</p>}
          <Button type="submit" disabled={busy || priceLoading || (entered.current.basis === "amount" && purchasePrice == null)} className="h-12 text-base font-semibold sm:col-span-2">{busy ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Calculator className="h-4 w-4" />}{busy ? "Calculating…" : "Calculate Profit"}</Button>
        </form> : <>
          <div className="grid gap-4 md:grid-cols-2">
            {card("Profit today", result.profit, result.roi, [["Valuation price", `${usd(result.endPrice)} · ${longDate(result.valuationDate)}`], ["Portfolio value", usd(result.value)], ["Investment cost", usd(result.invested)]])}
            {card("Profit at maximum stock price", result.maxProfit, result.maxRoi, [["Highest price", usd(result.maxPrice)], ["Date reached", longDate(result.maxDate)], ["Portfolio value", usd(result.maxValue)], ["Investment cost", usd(result.invested)]])}
          </div>
          <p className="text-xs text-muted-foreground">Purchase price {usd(result.purchasePrice)} on {longDate(result.purchaseDate)}. Portfolio value is shares × price; profit is portfolio value minus investment cost.</p>
          <p className="text-xs leading-relaxed text-muted-foreground">Yahoo Finance prices in USD, split-adjusted; shares are on the current split-adjusted basis. Investment uses the first trading day close on or after your date; valuation uses the last trading day close on or before your date. The maximum uses the highest daily traded price in that period (hypothetical sale). Excludes dividends, taxes and fees. Not financial advice.</p>
          <Button variant="outline" className="h-12 text-base" onClick={() => setResult(null)}>Edit Investment Details</Button>
        </>}
      </DialogContent>
    </Dialog>;
}
