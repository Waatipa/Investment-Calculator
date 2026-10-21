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

const ITEMS = [
  ["ingestSecret", "Ingest secret", "Shared password your transcript relay sends with each sentence."],
  ["transcriptApi", "Licensed live transcript API", "Pushes call sentences as they are spoken."],
  ["deepgram", "Deepgram (speech-to-text)", "Turns the webcast audio into sentences."],
  ["assemblyai", "AssemblyAI (speech-to-text)", "Alternative to Deepgram."],
  ["consensusApi", "Consensus estimates API", "Loads expected EPS, revenue and guidance before the call."],
  ["ai", "AI analysis", "Reads each sentence and extracts figures and tone."],
] as const;

function Settings() {
  const q = useQuery({ queryKey: ["earnings-source-status"], queryFn: () => getEarningsSourceStatus() });
  return <div className="ecr"><div className="wrap">
    <header className="box hdr"><h1>Live source settings<small>Keys are stored securely on the server and are never shown here. Ask in the editor chat to add or change one.</small></h1></header>
    <section className="box" style={{ display: "grid", gap: 10 }}>{ITEMS.map(([k, n, d]) => <div key={k} className="row mini">
      <div><b>{n}</b><div className="note">{d}</div></div>
      <span className={`badge ${q.data?.[k] ? "live" : ""}`}>{q.isLoading ? "Checking…" : q.data?.[k] ? "Connected" : "Not set"}</span>
    </div>)}</section>
    <section className="box note">While no live call is in progress, company pages run the demo feed and show a "Demo data" label.</section>
    <Link to="/earnings-reactions" className="btn" style={{ justifySelf: "start" }}>← All companies</Link>
  </div></div>;
}
