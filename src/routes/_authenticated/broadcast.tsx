import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { EARNINGS_COMPANIES } from "@/lib/earnings-companies";

export const Route = createFileRoute("/_authenticated/broadcast")({
  head: () => ({ meta: [
    { title: "Broadcast an Earnings Call — Investico Academy" }, { name: "description", content: "Send a live earnings call webcast to Earnings Call Reactions." },
    { property: "og:title", content: "Broadcast an Earnings Call" }, { property: "og:description", content: "Owner tool for live earnings call sentiment." },
    { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }, { name: "robots", content: "noindex" },
  ] }),
  component: Broadcast,
});

const CHUNK_MS = 10_000;

// Rough estimate rates, in credits, for the on-screen counter. Labeled as an estimate on the page.
const CREDITS_PER_AUDIO_MIN = 0.02;
const CREDITS_PER_1K_TOKENS = 0.002;

type Usage = { audioSeconds?: number; inputTokens?: number; outputTokens?: number };
type Stats = { chunks: number; audioSeconds: number; inputTokens: number; outputTokens: number; analyses: number };
const zeroStats: Stats = { chunks: 0, audioSeconds: 0, inputTokens: 0, outputTokens: 0, analyses: 0 };
const estimateCredits = (s: Stats) => (s.audioSeconds / 60) * CREDITS_PER_AUDIO_MIN + ((s.inputTokens + s.outputTokens) / 1000) * CREDITS_PER_1K_TOKENS;

async function send(fields: Record<string, string | Blob>) {
  const { data } = await supabase.auth.getSession();
  const form = new FormData();
  for (const [k, v] of Object.entries(fields)) form.append(k, v);
  const r = await fetch("/api/earnings-broadcast", { method: "POST", headers: { Authorization: `Bearer ${data.session?.access_token ?? ""}` }, body: form });
  const body = await r.json().catch(() => ({})) as { error?: string; text?: string; consensus?: { eps: number | null; revenue: number | null }; usage?: Usage; events?: number; summary?: string };
  if (!r.ok) throw Object.assign(new Error(body.error ?? "Request failed"), { status: r.status });
  return body;
}

function Broadcast() {
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [ticker, setTicker] = useState<string>("AAPL");
  const [guidance, setGuidance] = useState("");
  const [live, setLive] = useState(false);
  const [log, setLog] = useState<string[]>([]);
  const [stats, setStats] = useState<Stats>(zeroStats);
  const [limit, setLimit] = useState("");
  const [summary, setSummary] = useState<string | null>(null);
  const [summarizing, setSummarizing] = useState(false);
  const statsRef = useRef<Stats>(zeroStats);
  const limitRef = useRef(0);
  useEffect(() => { statsRef.current = stats; }, [stats]);
  useEffect(() => { limitRef.current = parseFloat(limit) || 0; }, [limit]);
  const stream = useRef<MediaStream | null>(null);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  const recorder = useRef<MediaRecorder | null>(null);
  const add = (s: string) => setLog(l => [`${new Date().toLocaleTimeString()} — ${s}`, ...l].slice(0, 30));

  useEffect(() => { (async () => {
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) return setIsAdmin(false);
    const { data } = await supabase.rpc("has_role", { _user_id: u.user.id, _role: "admin" });
    setIsAdmin(Boolean(data));
  })(); }, []);

  const recordChunk = (audio: MediaStream) => {
    const mime = MediaRecorder.isTypeSupported("audio/webm;codecs=opus") ? "audio/webm;codecs=opus" : "audio/webm";
    const rec = new MediaRecorder(audio, { mimeType: mime });
    const parts: Blob[] = [];
    rec.ondataavailable = e => { if (e.data.size) parts.push(e.data); };
    rec.onstop = async () => {
      const blob = new Blob(parts, { type: "audio/webm" });
      if (blob.size < 2000) return;
      try {
        const r = await send({ ticker, action: "chunk", audio: blob });
        if (r.text) add(`Heard: ${r.text}`);
        const u = r.usage;
        setStats(s => {
          const n: Stats = { chunks: s.chunks + 1, audioSeconds: s.audioSeconds + (u?.audioSeconds ?? 10), inputTokens: s.inputTokens + (u?.inputTokens ?? 0), outputTokens: s.outputTokens + (u?.outputTokens ?? 0), analyses: s.analyses + (r.events ?? 0) };
          if (limitRef.current > 0 && estimateCredits(n) >= limitRef.current) { add(`⚠ Estimated cost reached your ${limitRef.current}-credit limit — stopping automatically.`); setTimeout(() => stop(), 0); }
          return n;
        });
      }
      catch (e) { add(`⚠ ${(e as Error).message}`); if ([402, 403].includes((e as { status?: number }).status ?? 0)) stop(); }
    };
    rec.start(); recorder.current = rec;
  };

  const start = async () => {
    try {
      const media = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: true });
      const tracks = media.getAudioTracks();
      if (!tracks.length) { media.getTracks().forEach(t => t.stop()); add("⚠ No audio. Choose the webcast tab and tick “Share tab audio”."); return; }
      stream.current = media;
      setStats(zeroStats); statsRef.current = zeroStats; setSummary(null);
      const r = await send({ ticker, action: "start", ...(guidance ? { guidance } : {}) });
      add(`Call is LIVE. Expected EPS ${r.consensus?.eps ?? "unavailable"}, revenue ${r.consensus?.revenue != null ? `$${r.consensus.revenue.toFixed(2)}B` : "unavailable"} (Yahoo Finance).`);
      const audio = new MediaStream(tracks);
      recordChunk(audio);
      timer.current = setInterval(() => { recorder.current?.stop(); recordChunk(audio); }, CHUNK_MS);
      tracks[0]!.onended = () => stop();
      setLive(true);
    } catch (e) { add(`⚠ ${(e as Error).message}`); }
  };

  const stop = async () => {
    if (timer.current) clearInterval(timer.current);
    timer.current = null;
    if (recorder.current?.state === "recording") recorder.current.stop();
    stream.current?.getTracks().forEach(t => t.stop());
    stream.current = null;
    setLive(false);
    try { await send({ ticker, action: "stop" }); add("Call ended — page now shows REPLAY."); } catch (e) { add(`⚠ ${(e as Error).message}`); }
  };

  useEffect(() => () => { if (timer.current) clearInterval(timer.current); stream.current?.getTracks().forEach(t => t.stop()); }, []);

  const company = EARNINGS_COMPANIES.find(c => c.ticker === ticker)!;
  if (isAdmin === null) return <div className="ecr"><div className="wrap"><p className="note">Checking access…</p></div></div>;
  if (!isAdmin) return <div className="ecr"><div className="wrap"><section className="box">Only the site owner can broadcast earnings calls. Sign in with the owner email and confirm it first.</section></div></div>;

  return <div className="ecr"><div className="wrap">
    <header className="box hdr"><h1>Broadcast an earnings call<small>Open the company's free public webcast in another tab, then press Start and pick that tab with “Share tab audio” ticked. Keep this tab open during the call.</small></h1>
      <span className={`ecr-live ${live ? "" : "off"}`}><i /><span>{live ? "LIVE CALL" : "NOT LIVE"}</span></span></header>
    <section className="box" style={{ display: "grid", gap: 12 }}>
      <label className="row"><span>Company</span>
        <select disabled={live} value={ticker} onChange={e => setTicker(e.target.value)} style={{ background: "#0a111b", color: "var(--ecr-tx)", border: "1px solid var(--ecr-line)", borderRadius: 8, padding: 8 }}>
          {EARNINGS_COMPANIES.map(c => <option key={c.ticker} value={c.ticker}>{c.name} ({c.ticker})</option>)}
        </select></label>
      <label className="row"><span>Street guidance expectation (%, optional)<br /><small className="note">Not published free — type it if you know it.</small></span>
        <input inputMode="decimal" value={guidance} onChange={e => setGuidance(e.target.value.replace(/[^0-9.-]/g, ""))} placeholder="e.g. 5" style={{ width: 100 }} />
      </label>
      {live && <button type="button" className="btn" onClick={() => send({ ticker, action: "guidance", guidance }).then(() => add("Guidance expectation saved.")).catch(e => add(`⚠ ${e.message}`))}>Save guidance expectation</button>}
      <div className="row">
        {live ? <button type="button" className="btn" onClick={stop}>Stop broadcast</button> : <button type="button" className="btn" onClick={start}>Start broadcast</button>}
        <Link to="/earnings-reactions/$ticker" params={{ ticker: company.slug }} target="_blank" className="btn">Open live page ↗</Link>
      </div>
      <small className="note">Audio is sent every {CHUNK_MS / 1000} seconds. Each chunk uses a small amount of Lovable AI credits.</small>
    </section>
    <section className="box" style={{ display: "grid", gap: 10 }}>
      <div className="row"><b>Session cost</b><span className="note">Rough estimate, updated as the call runs.</span></div>
      <div className="row" style={{ flexWrap: "wrap", gap: 18 }}>
        <div><small className="note">Estimated credits</small><div style={{ fontWeight: 700, fontSize: 22, color: "var(--ecr-g)" }}>~{estimateCredits(stats).toFixed(3)}</div></div>
        <div><small className="note">Audio processed</small><div style={{ fontWeight: 700 }}>{Math.floor(stats.audioSeconds / 60)}:{String(stats.audioSeconds % 60).padStart(2, "0")}</div></div>
        <div><small className="note">Chunks sent</small><div style={{ fontWeight: 700 }}>{stats.chunks}</div></div>
        <div><small className="note">Statements analysed</small><div style={{ fontWeight: 700 }}>{stats.analyses}</div></div>
        <div><small className="note">AI tokens</small><div style={{ fontWeight: 700 }}>{(stats.inputTokens + stats.outputTokens).toLocaleString()}</div></div>
      </div>
      <label className="row"><span>Auto-stop at (estimated credits)<br /><small className="note">Leave empty for no limit. The broadcast stops itself when the estimate reaches this.</small></span>
        <input inputMode="decimal" value={limit} onChange={e => setLimit(e.target.value.replace(/[^0-9.]/g, ""))} placeholder="e.g. 1" style={{ width: 100 }} />
      </label>
    </section>
    {!live && (stats.chunks > 0 || summary) && <section className="box" style={{ display: "grid", gap: 10 }}>
      <div className="row"><b>Call summary</b><span className="note">One small AI request — uses a tiny amount of credits.</span></div>
      {summary ? <p style={{ color: "var(--ecr-mut)", lineHeight: 1.7, margin: 0 }}>{summary}</p> :
        <div className="row"><button type="button" className="btn" disabled={summarizing} onClick={async () => {
          setSummarizing(true);
          try { const r = await send({ ticker, action: "summarize" }); setSummary(r.summary ?? null); add("Summary saved — it now shows on the company's reactions page."); }
          catch (e) { add(`⚠ ${(e as Error).message}`); }
          setSummarizing(false);
        }}>{summarizing ? "Writing summary…" : "Generate call summary"}</button></div>}
    </section>}
    <section className="box"><b>Activity</b><ul className="feed">{log.map((l, i) => <li key={i}>{l}</li>)}</ul></section>
  </div></div>;
}
