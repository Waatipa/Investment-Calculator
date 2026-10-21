import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { getEarningsQuotes } from "@/lib/earnings.functions";
import type { EarningsCompany } from "@/lib/earnings-companies";
import { DEMO_EVENTS, applyDemo, arrow, clamp, computeScores, demoInitial, foldEvents, label, meaning, sg, toneOf, type CallState, type LiveEvent, type Tone } from "@/lib/earnings-score";

const col = (c: Tone) => `var(--ecr-${c})`;
type FeedItem = { id: string; time: string; text: string; tone: Tone };
type CallRow = { status: string; eps_consensus: number | null; revenue_consensus: number | null; guidance_consensus: number | null; sector_move: number | null };
type EventRow = LiveEvent & { id: string; created_at: string; text: string; summary: string | null };

function Gauge({ min, max, v, c, text }: { min: number; max: number; v: number; c: Tone; text: string }) {
  const R = max - min, pv = ((max - clamp(v, max)) / R) * 100, pz = (max / R) * 100;
  return <div className="gauge"><div className="sc">{[1, .5, 0, -.5, -1].map(x => <span key={x}>{x > 0 ? "+" : x < 0 ? "−" : ""}{Math.abs(x * max)}</span>)}</div>
    <div className="tr">
      <div className="fl" style={{ top: `${Math.min(pv, pz)}%`, height: `${Math.abs(pv - pz)}%`, background: `linear-gradient(${v >= 0 ? "0deg" : "180deg"},${col(c)},transparent)` }} />
      <div className="zero" style={{ top: `${pz}%` }} />
      <div className="dot" style={{ top: `${pv}%`, borderColor: col(c) }} />
      <div className="dl" style={{ top: `${pv}%`, color: col(c) }}>{text}</div>
    </div></div>;
}

export function EarningsDashboard({ company }: { company: EarningsCompany }) {
  const [call, setCall] = useState<CallRow | null>(null);
  const [events, setEvents] = useState<EventRow[]>([]);
  const [loaded, setLoaded] = useState(false);
  const live = call?.status === "live" && events.length > 0;
  const demo = loaded && !live;

  // Live source: initial read + Realtime push.
  useEffect(() => {
    let alive = true;
    (async () => {
      const [{ data: c }, { data: e }] = await Promise.all([
        supabase.from("earnings_calls").select("status,eps_consensus,revenue_consensus,guidance_consensus,sector_move").eq("ticker", company.ticker).maybeSingle(),
        supabase.from("call_events").select("*").eq("ticker", company.ticker).order("created_at", { ascending: false }).limit(200),
      ]);
      if (!alive) return;
      setCall(c); setEvents(((e ?? []) as EventRow[]).reverse()); setLoaded(true);
    })();
    const ch = supabase.channel(`ecr-${company.ticker}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "call_events", filter: `ticker=eq.${company.ticker}` }, p => setEvents(es => [...es, p.new as EventRow]))
      .on("postgres_changes", { event: "*", schema: "public", table: "earnings_calls", filter: `ticker=eq.${company.ticker}` }, p => setCall(p.new as CallRow))
      .subscribe();
    return () => { alive = false; supabase.removeChannel(ch); };
  }, [company.ticker]);

  // Demo feed (same as reference): one event every 3.5s.
  const [run, setRun] = useState(true);
  const [demoState, setDemoState] = useState<CallState>(demoInitial);
  const [demoFeed, setDemoFeed] = useState<FeedItem[]>([]);
  const idx = useRef(0);
  useEffect(() => {
    if (!demo || !run) return;
    const tick = () => {
      if (idx.current >= DEMO_EVENTS.length) { idx.current = 0; setDemoState(demoInitial()); }
      const [t, c, e] = DEMO_EVENTS[idx.current++]!;
      setDemoState(d => applyDemo(idx.current === 1 ? demoInitial() : d, e));
      setDemoFeed(f => [{ id: `${Date.now()}`, time: new Date().toLocaleTimeString(), text: t, tone: c }, ...f].slice(0, 5));
    };
    tick(); const id = setInterval(tick, 3500); return () => clearInterval(id);
  }, [demo, run]);

  const state = useMemo<CallState>(() => demo ? demoState : foldEvents(call ?? { eps_consensus: null, revenue_consensus: null, guidance_consensus: null, sector_move: null }, events), [demo, demoState, call, events]);
  const feed: FeedItem[] = demo ? demoFeed : events.slice(-5).reverse().map(e => ({ id: e.id, time: new Date(e.created_at).toLocaleTimeString(), text: e.summary || e.text, tone: toneOf(e.tone) }));
  const { rows, overall } = computeScores(state);
  const [L, oc] = label(overall);

  const [hist, setHist] = useState<number[]>([]);
  useEffect(() => { setHist(h => [...h, overall].slice(-40)); }, [overall, feed[0]?.id]);
  const pts = hist.map((h, i) => `${(i / Math.max(hist.length - 1, 1)) * 100},${((100 - h) / 200) * 40}`).join(" ");

  const [clock, setClock] = useState("");
  useEffect(() => { const f = () => setClock("Last updated " + new Date().toLocaleString([], { month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit", second: "2-digit" })); f(); const id = setInterval(f, 1000); return () => clearInterval(id); }, []);

  const badge = live ? (run ? "LIVE CALL" : "PAUSED") : demo ? (run ? "LIVE CALL" : "PAUSED") : call?.status === "replay" ? "REPLAY" : "SCHEDULED";
  const badgeOn = (live || demo) && run;
  const badgeText = demo && !run ? "PAUSED" : demo ? (call?.status === "replay" ? "REPLAY" : "SCHEDULED") : badge;

  return <div className="ecr"><div className="wrap">
    <header className="box hdr">
      <h1>{company.name} ({company.ticker}) · Earnings Call Reactions<small>Real-time read on what is driving the move and how the market is reacting.</small></h1>
      <div className="right">
        <span className={`ecr-live ${live && run ? "" : "off"}`}><i /><span>{live ? badge : badgeText}</span></span>
        {demo && <span className="demo-tag">Demo data</span>}
        {(demo || live) && <button type="button" className="btn" onClick={() => setRun(r => !r)}>{run ? "Pause demo" : "Resume demo"}</button>}
        <span className="clock">{clock}</span>
      </div>
    </header>

    <section className="box ticker">
      <div><div className="row"><b>Call feed</b><small className="note">{demo ? "Demo data — simulated call. Connect a live source in settings." : "Live transcript, analysed sentence by sentence."}</small></div>
        <ul className="feed">{feed.map(f => <li key={f.id} className={f.tone}><span className="t">{f.time}</span>{f.text}</li>)}</ul></div>
      <div><b>Overall score over time</b>
        <svg viewBox="0 0 100 40" width="100%" height="110" preserveAspectRatio="none" aria-label="Overall score sparkline"><line x1="0" x2="100" y1="20" y2="20" stroke="#35465c" strokeWidth=".3" /><polyline fill="none" stroke={col(oc)} strokeWidth="1" vectorEffect="non-scaling-stroke" points={pts} /></svg>
        <small className="note">{hist.length ? `Low ${sg(Math.min(...hist))} · High ${sg(Math.max(...hist))}` : ""}</small></div>
    </section>

    <section className="cards">
      {rows.map(r => { const v = r.v ?? 0; return <div className="box card" key={r.f.k}>
        <div className="ch"><b>{r.f.n}</b><small>{r.f.s}</small></div>
        <Gauge min={r.f.min} max={r.f.max} v={v} c={r.tone} text={r.v == null ? "—" : sg(v) + r.f.u.trim()} />
        <div className="big" style={{ color: col(r.tone) }}>{r.v == null ? "—" : sg(v) + r.f.u}</div>
        <p className="cap">{r.f.cap(state)}<br /><span style={{ color: "var(--ecr-n)" }}>{r.f.t}</span></p>
        <div className="pill" style={{ color: col(r.tone) }}>{arrow(r.tone)} {r.tone === "g" ? "BULLISH" : r.tone === "r" ? "BEARISH" : "NEUTRAL"}</div>
        <p className="desc">{r.tone === "r" ? r.f.r : r.f.b}</p>
      </div>; })}
      <div className="box card">
        <div className="ch"><b>Overall Sentiment</b><small>Weighted score</small></div>
        <Gauge min={-100} max={100} v={overall} c={oc} text={sg(overall)} />
        <div className="big" style={{ color: col(oc) }}>{sg(overall)}</div>
        <p className="cap">Combined score (−100 to +100)</p>
        <div className="pill" style={{ color: col(oc) }}>{arrow(oc)} {L}</div>
        <p className="desc">Weighted sum of all five factors. Weights total 100%.</p>
      </div>
    </section>

    <section className="box">
      <div className="row"><div><b style={{ fontSize: 18 }}>How the overall sentiment is calculated</b>
        <p className="cap" style={{ textAlign: "left", minHeight: 0 }}>Each factor is converted to a score from −100 to +100, multiplied by its weight (weights total 100%), and added up.</p></div>
        <div className="box row" style={{ minWidth: 230 }}><div><small className="note">Overall sentiment</small><div style={{ fontWeight: 700, color: col(oc) }}>{arrow(oc)} {L}</div></div><div className="score" style={{ color: col(oc) }}>{sg(overall)}</div></div></div>
      <div className="calc" style={{ marginTop: 12 }}>{rows.map(r => <div className="mini" key={r.f.k}>
        <b style={{ fontSize: 13 }}>{r.f.n}</b>
        <div style={{ fontWeight: 700, color: col(r.tone) }}>{r.v == null ? "—" : sg(r.v) + r.f.u}</div>
        <small className="note">Score {sg(r.score)} · Weight {r.f.w}%</small>
        <div className="bar"><i style={{ background: col(r.tone), left: `${r.score >= 0 ? 50 : 50 + r.score / 2}%`, width: `${Math.abs(r.score) / 2}%` }} /></div>
        <small className="note">Contribution</small>
        <div style={{ fontWeight: 700, color: col(r.tone) }}>{sg(r.contribution)}</div>
      </div>)}</div>
      <div className="row" style={{ marginTop: 12 }}><small className="note">Check: {rows.map(r => sg(r.contribution)).join(" ")} = {sg(overall)}</small></div>
    </section>

    <section className="box row" style={{ alignItems: "flex-start" }}>
      <div style={{ flex: 1, minWidth: 260 }}><b>What this means</b><p style={{ color: "var(--ecr-mut)", marginTop: 6 }}>{meaning(overall, rows)}</p></div>
      <div className="legend"><span><i style={{ background: "var(--ecr-g)" }} />Bullish</span><span><i style={{ background: "var(--ecr-r)" }} />Bearish</span><span><i style={{ background: "var(--ecr-n)" }} />Neutral</span></div>
    </section>

    <DelayedPrice company={company} />

    <div className="row"><Link to="/earnings-reactions" className="btn">← All companies</Link><Link to="/earnings-reactions/settings" className="btn">Live source settings</Link></div>
    <p className="note" style={{ textAlign: "center" }}>Sentiment is an analytical signal, not investment advice.</p>
  </div></div>;
}

// Stock price loads after the sentiment, as a separate small panel.
function DelayedPrice({ company }: { company: EarningsCompany }) {
  const [ready, setReady] = useState(false);
  useEffect(() => { const id = setTimeout(() => setReady(true), 5000); return () => clearTimeout(id); }, []);
  const q = useQuery({ queryKey: ["earnings-quotes"], queryFn: () => getEarningsQuotes(), enabled: ready, refetchInterval: 30_000 });
  const row = q.data?.find(r => r.ticker === company.ticker);
  return <section className="box row">
    <div><b>Stock price</b><div className="note">Delayed panel — loads after the sentiment reading.</div></div>
    {!ready || q.isLoading ? <span className="note">Loading price…</span> : row?.price == null ? <span className="note">Price unavailable from source</span> :
      <div style={{ textAlign: "right" }}><div style={{ fontWeight: 700, fontSize: 20 }}>${row.price.toFixed(2)} <span className={row.change == null ? "n" : row.change >= 0 ? "g" : "r"} style={{ fontSize: 14 }}>{row.change == null ? "" : `${sg(row.change)}%`}</span></div>
        {row.time && <div className="note">Source time {new Date(row.time * 1000).toLocaleString()}</div>}</div>}
  </section>;
}
