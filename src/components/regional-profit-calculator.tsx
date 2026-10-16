import { useState, type FormEvent } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Link } from "@tanstack/react-router";
import { Calculator, LoaderCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CalculatorDateField } from "./calculator-date-field";
import { getRegionalInvestmentResult, getRegionalPurchasePrice } from "@/lib/regional-investment.functions";
import { longDate } from "@/lib/investment";
import { useDisplayCurrency } from "./display-prefs";

export function RegionalProfitCalculator({ symbol, onBack, onStageChange }: { symbol: string; onBack: () => void; onStageChange: (results: boolean) => void }) {
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [shares, setShares] = useState("10");
  const [amount, setAmount] = useState("");
  const [basis, setBasis] = useState<"shares" | "amount">("shares");
  const purchase = useServerFn(getRegionalPurchasePrice);
  const calculate = useServerFn(getRegionalInvestmentResult);
  const price = useQuery({ queryKey: ["regional-purchase", symbol, startDate], queryFn: () => purchase({ data: { symbol, date: startDate } }), enabled: /^\d{4}-\d{2}-\d{2}$/.test(startDate), retry: false, staleTime: 0 });
  const mutation = useMutation({ mutationFn: calculate, onSuccess: () => onStageChange(true) });
  const result = mutation.data;
  const p = price.data;
  const currency = result?.currency ?? p?.currency;
  const local = (v: number) => `${currency ?? ""} ${v.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  const fx = useDisplayCurrency(currency);
  const money = result ? fx.money : local;
  const displayedShares = basis === "amount" && p ? String(Number(amount) / p.price) : shares;
  const displayedAmount = basis === "shares" ? p && shares ? String(Math.round(Number(shares) * p.price * 100) / 100) : "" : amount;
  const clear = () => { mutation.reset(); onStageChange(false); };
  function submit(e: FormEvent) {
    e.preventDefault();
    mutation.mutate({ data: { symbol, startDate, endDate, ...(basis === "amount" ? { amount: Number(amount) } : { shares: Number(shares) }) } });
  }
  const card = (title: string, profit: number, roi: number, rows: [string, string][]) => <div className="company-result rounded-lg border border-border p-4">
    <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{title}</div>
    <div className={`mt-1 font-display text-2xl font-semibold tabular-nums ${profit >= 0 ? "text-success" : "text-destructive"}`}>{profit >= 0 ? "+" : ""}{money(profit)}</div>
    <div className={`text-sm font-medium ${profit >= 0 ? "text-success" : "text-destructive"}`}>{roi >= 0 ? "+" : ""}{roi.toFixed(2)}% return</div>
    <dl className="mt-3 grid gap-2 border-t border-border pt-3 text-sm">{rows.map(([k, v]) => <div key={k} className="flex justify-between gap-3"><dt className="text-muted-foreground">{k}</dt><dd className="min-w-0 text-right font-medium tabular-nums">{v}</dd></div>)}</dl>
  </div>;
  return <>
    <Button variant="link" className="pro-back" disabled={mutation.isPending} onClick={onBack}>← All calculators</Button>
    {!result ? <form className="grid gap-4 sm:grid-cols-2" onSubmit={submit}>
      <CalculatorDateField id="investment-date" label="Investment date" value={startDate} disabled={mutation.isPending} onChange={v => { setStartDate(v); clear(); }} />
      <CalculatorDateField id="valuation-date" label="Valuation date" value={endDate} min={startDate || undefined} disabled={mutation.isPending} onChange={v => { setEndDate(v); clear(); }} />
      <label className="grid gap-2 text-xs font-medium" htmlFor="investment-shares">Number of shares<Input id="investment-shares" type="number" min="0.000001" step="any" required value={displayedShares} disabled={mutation.isPending} onChange={e => { setShares(e.target.value); setBasis("shares"); clear(); }} className="h-12 text-base" /></label>
      <label className="grid gap-2 text-xs font-medium" htmlFor="investment-amount">Investment amount{currency ? ` (${currency})` : " (trading currency)"}<Input id="investment-amount" type="number" min="0.01" step="any" value={displayedAmount} disabled={mutation.isPending || price.isFetching || !p} placeholder={price.isFetching ? "Loading purchase price…" : "Pick a date first"} onChange={e => { setAmount(e.target.value); setBasis("amount"); clear(); }} className="h-12 text-base" /></label>
      {p && <p className="text-xs text-muted-foreground sm:col-span-2">Buying Stock Price: {money(p.price)} · {longDate(p.date)} · <a href={p.sourceUrl} target="_blank" rel="noopener noreferrer" className="underline">Yahoo Finance historical prices</a>. GBP and ZAR amounts use pounds and rand, not exchange cents.</p>}
      {(price.error || mutation.error) && <p role="alert" className="text-sm text-destructive sm:col-span-2">{mutation.error?.message ?? price.error?.message}</p>}
      <Button type="submit" disabled={mutation.isPending || price.isFetching || !p} className="h-12 text-base font-semibold sm:col-span-2">{mutation.isPending ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Calculator className="h-4 w-4" />}{mutation.isPending ? "Calculating…" : "Calculate Profit"}</Button>
    </form> : <>
      <p className="text-sm text-muted-foreground">{result.shares.toLocaleString("en-US", { maximumFractionDigits: 6 })} shares · {longDate(result.purchaseDate)} to {longDate(result.valuationDate)}</p>
      <div className="grid gap-4 md:grid-cols-2">
        {card(result.usesLatestPrice ? "Profit today" : "Profit at valuation date", result.profit, result.roi, [["Current Stock Price", `${money(result.endPrice)} · ${longDate(result.valuationDate)}`], ["Buying Stock Price", `${money(result.purchasePrice)} · ${longDate(result.purchaseDate)}`], ["Portfolio Value (Investment Date)", money(result.invested)], ["Portfolio Value (To Date)", money(result.value)]])}
        {card("Profit at maximum stock price", result.maxProfit, result.maxRoi, [["Highest Stock Price", `${money(result.maxPrice)} · ${longDate(result.maxDate)}`], ["Buying Stock Price", `${money(result.purchasePrice)} · ${longDate(result.purchaseDate)}`], ["Portfolio Value (Investment Date)", money(result.invested)], ["Portfolio Value (Peak Date)", money(result.maxValue)]])}
      </div>
      <p className="text-xs text-muted-foreground"><a href={result.sourceUrl} target="_blank" rel="noopener noreferrer" className="underline">Source: Yahoo Finance price history</a> · Valuation observation: {new Date(result.asOf).toLocaleString("en-GB", { timeZone: result.timeZone })} ({result.timeZone}). {result.usesLatestPrice ? "Today's valuation uses the latest available regular-session trade; quotes may be delayed." : "Historical valuation uses the last trading close on or before your date."}</p>
      {fx.note && <p className="text-xs text-muted-foreground">{fx.note}</p>}
      <p className="text-xs leading-relaxed text-muted-foreground">Prices in {result.currency}, on the source's split-adjusted share basis. Purchase uses the first trading close on or after your date (latest available trade if today). Dates follow the listing's exchange time zone. Portfolio value is shares × price; profit is portfolio value minus investment cost. The maximum is the highest source daily high in the period, a hypothetical sale. Excludes dividends, currency conversion, taxes and fees. Not financial advice.</p>
      <Button variant="outline" className="h-12 text-base" onClick={clear}>Edit Investment Details</Button>
      <Button asChild className="btn-gold h-12 text-base font-semibold"><Link to="/subscribe">Invest Now</Link></Button>
    </>}
  </>;
}