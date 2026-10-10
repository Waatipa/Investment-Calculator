import { Suspense, useEffect, useRef, useState, type FormEvent } from "react";
import { useSuspenseQuery } from "@tanstack/react-query";
import { ArrowUp, ArrowDown, Radio, Calculator, LoaderCircle } from "lucide-react";
import { COMPANIES, quotesQuery, type Symbol } from "@/lib/markets";
import { usd } from "@/lib/calc";
import { getInvestmentResult, getPriceOnDate, type MarketQuote } from "@/lib/nvda.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";

type Result = Awaited<ReturnType<typeof getInvestmentResult>>;

export function MarketCalculator() {
  const [symbol, setSymbol] = useState<Symbol>("NVDA");
  return <main className="mx-auto max-w-6xl px-6 py-8">
    <div className="text-xs font-medium uppercase tracking-wide text-primary-deep">Magnificent Seven · Investment Time Machine</div>
    <h1 className="mt-2 max-w-3xl font-display text-3xl font-semibold leading-tight md:text-4xl">See What Your Money Would Have Become.</h1>
    <p className="mt-3 max-w-3xl text-sm leading-relaxed text-muted-foreground">Pick a company, enter how much you would have invested, drag through time, and instantly see the profit, ROI, and portfolio value. Historical investment math made simple.</p>
    <Suspense fallback={<CompanyButtons symbol={symbol} setSymbol={setSymbol} />}><LiveCompanies symbol={symbol} setSymbol={setSymbol} /></Suspense>
    <InvestmentForm symbol={symbol} />
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
      <Button className="h-12 w-full flex-col gap-0 px-1 font-display text-base font-semibold" variant={symbol === c.symbol ? "default" : "outline"} aria-pressed={symbol === c.symbol} onClick={() => setSymbol(c.symbol)}>{c.name}<span className="text-[10px] font-normal opacity-70">{c.symbol}</span></Button>
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

function InvestmentForm({ symbol }: { symbol: Symbol }) {
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
  return <section className="mt-7 border-t border-border pt-6" aria-label="Profit calculator">
    <div className="flex flex-wrap items-center gap-x-3 gap-y-4"><h2 className="font-display text-xl font-semibold">Profit calculator</h2><span className="text-sm font-medium text-primary-deep">{company?.name} · {symbol}</span><label className="grid w-full gap-2 text-xs font-medium sm:ml-auto sm:w-60" htmlFor="investment-amount">Investment amount (USD)<Input id="investment-amount" type="number" min="0.01" step="any" value={amount} disabled={busy || priceLoading || purchasePrice == null} placeholder={priceLoading ? "Loading purchase price…" : "Select investment date"} onChange={e => updateAmount(e.target.value)} className="h-11" /></label></div>
    <form className="mt-5 grid items-end gap-4 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_1fr_auto]" onSubmit={calculate}>
      <label className="grid gap-2 text-xs font-medium" htmlFor="investment-date">Investment date<Input id="investment-date" type="date" required value={startDate} disabled={busy} onChange={e => { setStartDate(e.target.value); setResult(null); }} className="h-11" /></label>
      <label className="grid gap-2 text-xs font-medium" htmlFor="valuation-date">Valuation date<Input id="valuation-date" type="date" required min={startDate || undefined} value={endDate} disabled={busy} onChange={e => { revision.current += 1; setEndDate(e.target.value); setResult(null); }} className="h-11" /></label>
      <label className="grid gap-2 text-xs font-medium" htmlFor="investment-shares">Number of shares<Input id="investment-shares" type="number" min="0.000001" step="any" required value={shares} disabled={busy} onChange={e => updateShares(e.target.value)} className="h-11" /></label>
      <Button type="submit" disabled={busy || priceLoading || (entered.current.basis === "amount" && purchasePrice == null)} className="h-11 min-w-40 text-base font-semibold">{busy ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Calculator className="h-4 w-4" />}{busy ? "Calculating…" : "Calculate"}</Button>
    </form>
    {error && <p role="alert" className="mt-3 text-sm text-destructive">{error}</p>}
    <Dialog open={result != null} onOpenChange={open => { if (!open) setResult(null); }}>
      <DialogContent className="max-h-[90dvh] w-[calc(100%-2rem)] overflow-y-auto rounded-lg">
        <DialogHeader><DialogTitle className="font-display text-xl">{company?.name} investment result</DialogTitle><DialogDescription>{result?.shares} {symbol} shares · {result?.purchaseDate} to {result?.valuationDate}</DialogDescription></DialogHeader>
        {result && <><div className="border-y border-border py-5"><div className="text-xs text-muted-foreground">Profit / Loss</div><div className={`mt-1 font-display text-3xl font-semibold tabular-nums ${result.profit >= 0 ? "text-success" : "text-destructive"}`}>{result.profit >= 0 ? "+" : ""}{usd(result.profit)}</div><div className={`mt-1 text-sm font-medium ${result.profit >= 0 ? "text-success" : "text-destructive"}`}>{result.roi >= 0 ? "+" : ""}{result.roi.toFixed(2)}% return</div></div><dl className="grid grid-cols-2 gap-4 text-sm"><div><dt className="text-xs text-muted-foreground">Amount invested</dt><dd className="mt-1 font-semibold">{usd(result.invested)}</dd></div><div><dt className="text-xs text-muted-foreground">Value on valuation date</dt><dd className="mt-1 font-semibold">{usd(result.value)}</dd></div><div><dt className="text-xs text-muted-foreground">Purchase price</dt><dd className="mt-1">{usd(result.purchasePrice)}</dd></div><div><dt className="text-xs text-muted-foreground">Valuation price</dt><dd className="mt-1">{usd(result.endPrice)}</dd></div></dl><p className="text-xs leading-relaxed text-muted-foreground">Yahoo Finance closing prices, split-adjusted; shares are on the current split-adjusted basis. Investment uses the first trading day on or after your date; valuation uses the last trading day on or before your date. Excludes dividends, taxes and fees. Not financial advice.</p></>}
      </DialogContent>
    </Dialog>
  </section>;
}
