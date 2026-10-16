import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { pageHead } from "@/lib/markets";
import { CATEGORIES, QAS, type Category } from "@/lib/ask-investments";

export const Route = createFileRoute("/ask-investments")({
  head: () => pageHead("Ask Investments", "Tap a question about stocks, calculators, comparisons or companies and get a simple answer with an example."),
  component: AskInvestments,
});

type Msg = { role: "user" | "bot"; text: string };
const WELCOME = "Hi! I'm the Investico guide. Tap any question below and I'll explain it in simple words, with an example.";

function AskInvestments() {
  const [cat, setCat] = useState<Category | "All">("All");
  const [msgs, setMsgs] = useState<Msg[]>([{ role: "bot", text: WELCOME }]);
  const [typing, setTyping] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const log = useRef<HTMLDivElement>(null);
  const timers = useRef<number[]>([]);
  useEffect(() => () => timers.current.forEach(clearTimeout), []);
  useEffect(() => { log.current?.scrollTo({ top: log.current.scrollHeight }); }, [msgs, typing]);

  function ask(q: string, a: string) {
    if (busy) return;
    setBusy(true);
    setMsgs(m => [...m, { role: "user", text: q }]);
    setTyping("");
    let i = 0;
    const step = () => {
      i = Math.min(a.length, i + 2);
      setTyping(a.slice(0, i));
      if (i < a.length) timers.current.push(window.setTimeout(step, 18));
      else { setMsgs(m => [...m, { role: "bot", text: a }]); setTyping(null); setBusy(false); }
    };
    timers.current.push(window.setTimeout(step, 700));
  }

  const list = QAS.filter(x => cat === "All" || x.cat === cat);
  return <main className="ask-shell">
    <h1 className="font-[Lora,Georgia,serif] text-3xl font-bold">Ask Investments</h1>
    <p className="mb-4 mt-2 text-sm text-muted-foreground">{QAS.length} questions for new investors and researchers. For questions about a company's SEC filings, try our <Link to="/ask" className="text-primary underline">filings AI</Link>.</p>
    <div className="ask-chat">
      <div className="ask-log" ref={log} role="log" aria-live="polite">
        {msgs.map((m, i) => <div key={i} className={`ask-bubble ${m.role === "user" ? "ask-user" : "ask-bot"}`}>{m.text}</div>)}
        {typing !== null && <div className="ask-bubble ask-bot">{typing === "" ? <span className="ask-typing" aria-label="Typing"><span /><span /><span /></span> : typing}</div>}
      </div>
      <div className="ask-picker">
        <div className="ask-cats">{(["All", ...CATEGORIES] as const).map(c => <button key={c} type="button" className={cat === c ? "on" : ""} onClick={() => setCat(c)}>{c}</button>)}</div>
        <div className="ask-qs">{list.map(x => <button key={x.q} type="button" disabled={busy} onClick={() => ask(x.q, x.a)}>{x.q}</button>)}</div>
      </div>
    </div>
    <p className="info-fine mt-3">Educational information only, not financial advice.</p>
  </main>;
}
