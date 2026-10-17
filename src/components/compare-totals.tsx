import { portfolioTotals } from "@/lib/compare-timeline";

export function CompareTotals({ holdings, date, incomplete = false }: { holdings: { invested: number; value: number }[]; date: string; incomplete?: boolean }) {
  const totals = portfolioTotals(holdings);
  const money = (value: number) => value.toLocaleString("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const tone = totals.profit > 0 ? "text-success" : totals.profit < 0 ? "text-destructive" : "text-muted-foreground";
  return <section className="comparison-totals" aria-label="Combined portfolio totals">
    <h3>Combined portfolio <small>{date}</small></h3>
    <dl>
      <div><dt>Total invested</dt><dd>{money(totals.invested)}</dd></div>
      <div><dt>Total portfolio value</dt><dd>{money(totals.value)}</dd></div>
      <div><dt>Total profit / loss</dt><dd className={tone}>{totals.profit > 0 ? "+" : ""}{money(totals.profit)}</dd></div>
      <div><dt>Overall return / loss</dt><dd className={tone}>{totals.returnPct == null ? "—" : `${totals.returnPct > 0 ? "+" : ""}${totals.returnPct.toFixed(2)}%`}</dd></div>
    </dl>
    {incomplete && <p className="compare-note">Totals include only companies with available source prices on this date.</p>}
  </section>;
}