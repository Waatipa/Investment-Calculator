import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { EARNINGS_COMPANIES } from "@/lib/earnings-companies";
import { getEarningsQuotes } from "@/lib/earnings.functions";
import og from "@/assets/earnings-reactions-og.jpg.asset.json";

const TITLE = "Earnings Call Reactions — Investico Academy";
const DESC = "Live sentiment gauges for the top 10 US companies' earnings calls: earnings and revenue surprise, guidance, sector and market sentiment.";
const IMG = `https://investicoacademy.lovable.app${og.url}`;

export const Route = createFileRoute("/earnings-reactions/")({
  head: () => ({ meta: [
    { title: TITLE }, { name: "description", content: DESC },
    { property: "og:title", content: TITLE }, { property: "og:description", content: DESC },
    { property: "og:type", content: "website" }, { property: "og:image", content: IMG },
    { name: "twitter:card", content: "summary_large_image" }, { name: "twitter:image", content: IMG },
  ] }),
  component: EarningsList,
});

function EarningsList() {
  const [status, setStatus] = useState<Record<string, string>>({});
  useEffect(() => {
    supabase.from("earnings_calls").select("ticker,status").then(({ data }) => setStatus(Object.fromEntries((data ?? []).map(r => [r.ticker, r.status]))));
    const ch = supabase.channel("ecr-list").on("postgres_changes", { event: "*", schema: "public", table: "earnings_calls" }, p => { const r = p.new as { ticker: string; status: string }; setStatus(s => ({ ...s, [r.ticker]: r.status })); }).subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);
  const q = useQuery({ queryKey: ["earnings-quotes"], queryFn: () => getEarningsQuotes(), staleTime: 60_000 });
  return <div className="ecr"><div className="wrap">
    <header className="box hdr"><h1>Earnings Call Reactions<small>Top 10 US companies by market cap. Open a company to follow its call live.</small></h1></header>
    <section className="co-grid">{EARNINGS_COMPANIES.map(c => {
      const st = status[c.ticker];
      const quote = q.data?.find(r => r.ticker === c.ticker);
      const now = Date.now() / 1000;
      const date = quote?.earningsAt ? new Date(quote.earningsAt * 1000).toLocaleDateString([], { day: "numeric", month: "long", year: "numeric" }) : q.isLoading ? "Loading…" : "To be confirmed";
      const label = st === "live" ? "LIVE NOW" : st === "replay" || (quote?.earningsAt && quote.earningsAt < now) ? "Replay" : "Scheduled";
      return <article key={c.ticker} className="box card">
        <div className="row"><div className="mono" aria-hidden>{c.name[0]}</div>
          <span className={`badge ${st === "live" ? "live" : ""}`}>{st === "live" && <i />}{label}</span></div>
        <div><b style={{ fontSize: 16 }}>{c.name}</b><div className="note">{c.ticker}</div></div>
        <div className="note">Next earnings: <span style={{ color: "var(--ecr-tx)" }}>{date}</span>{quote?.earningsEstimate ? " (estimated)" : ""}</div>
        <Link to="/earnings-reactions/$ticker" params={{ ticker: c.slug }} className="btn" style={{ textAlign: "center" }}>View reactions</Link>
      </article>;
    })}</section>
    <p className="note" style={{ textAlign: "center" }}>Earnings dates come from Yahoo Finance. Sentiment is an analytical signal, not investment advice.</p>
  </div></div>;
}
