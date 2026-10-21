import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { getEarningsSourceStatus } from "@/lib/earnings.functions";

export const Route = createFileRoute("/earnings-reactions/settings")({
  head: () => ({ meta: [
    { title: "Live Source Settings — Earnings Call Reactions" }, { name: "description", content: "Connection status for the live earnings call transcript and consensus sources." },
    { property: "og:title", content: "Live Source Settings — Earnings Call Reactions" }, { property: "og:description", content: "Connection status for live earnings call sources." },
    { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }, { name: "robots", content: "noindex" },
  ] }),
  component: Settings,
});

type Status = Awaited<ReturnType<typeof getEarningsSourceStatus>>;
const ITEMS: [keyof Status, string, string][] = [
  ["ai", "AI analysis (Lovable AI)", "Reads each sentence and extracts figures and tone."],
  ["ai", "Speech-to-text (Lovable AI)", "Turns the webcast audio into sentences — no extra account."],
  ["ingestSecret", "Ingest secret", "Password for any outside transcript relay that posts sentences."],
  ["consensusFree", "Expected EPS & revenue (Yahoo Finance)", "Free analyst averages, loaded when a broadcast starts."],
  ["transcriptApi", "Licensed live transcript API (optional)", "Paid alternative to the broadcast page."],
  ["deepgram", "Deepgram (optional)", "Paid alternative speech-to-text."],
  ["assemblyai", "AssemblyAI (optional)", "Paid alternative speech-to-text."],
];

function Settings() {
  const q = useQuery({ queryKey: ["earnings-source-status"], queryFn: () => getEarningsSourceStatus() });
  return <div className="ecr"><div className="wrap">
    <header className="box hdr"><h1>Live source settings<small>Keys are stored securely on the server and are never shown here.</small></h1></header>
    <section className="box" style={{ display: "grid", gap: 10 }}>{ITEMS.map(([k, n, d]) => <div key={n} className="row mini">
      <div><b>{n}</b><div className="note">{d}</div></div>
      <span className={`badge ${q.data?.[k] ? "live" : ""}`}>{q.isLoading ? "Checking…" : q.data?.[k] ? "Connected" : "Not set"}</span>
    </div>)}</section>
    <section className="box note">To go live: open <Link to="/broadcast" style={{ color: "var(--ecr-gold)" }}>Broadcast</Link> (owner only), pick the company and share the webcast tab's audio. With no live call, company pages run the demo feed with a "Demo data" label.</section>
    <Link to="/earnings-reactions" className="btn" style={{ justifySelf: "start" }}>← All companies</Link>
  </div></div>;
}
