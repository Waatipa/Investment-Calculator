import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Facebook, Link2, MessageCircle, Send, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { pageHead } from "@/lib/markets";
import { CATEGORY_GUIDES, CATEGORIES, QAS, findQuestion, guideForQuestion, type Category } from "@/lib/ask-investments";
import { SEARCH_VOLUME_SOURCE } from "@/lib/ask-investments-volumes";

export const Route = createFileRoute("/ask-investments")({
  head: () => pageHead("Ask Investments", "Explore 200 numbered investment questions, simple educational examples and guided steps through Investico Academy's market tools."),
  component: AskInvestments,
});

type Msg = { role: "user" | "bot"; text: string; category?: Category; number?: number | undefined };
const WELCOME = "Hi! I'm the Investico guide. Tap any question below and I'll explain it in simple words, with an example.";

function AskInvestments() {
  const [cat, setCat] = useState<Category | "All">("All");
  const [msgs, setMsgs] = useState<Msg[]>([{ role: "bot", text: WELCOME }]);
  const [typing, setTyping] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const log = useRef<HTMLDivElement>(null);
  const timers = useRef<number[]>([]);
  useEffect(() => () => timers.current.forEach(clearTimeout), []);
  useEffect(() => { log.current?.scrollTo({ top: log.current.scrollHeight }); }, [msgs, typing]);

  function ask(q: string, a: string, category: Category, number?: number) {
    if (busy) return;
    setBusy(true);
    setMsgs(m => [...m, { role: "user", text: number ? `#${number} ${q}` : q }]);
    setTyping("");
    let i = 0;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const step = () => {
      i = reduced ? a.length : Math.min(a.length, i + 8);
      setTyping(a.slice(0, i));
      if (i < a.length) timers.current.push(window.setTimeout(step, 18));
      else { setMsgs(m => [...m, { role: "bot", text: a, category, number }]); setTyping(null); setBusy(false); }
    };
    timers.current.push(window.setTimeout(step, reduced ? 0 : 350));
  }

  function submitManual(text: string) {
    const input = text.trim();
    if (!input || busy) return;
    const exact = findQuestion(input);
    if (exact) ask(exact.q, exact.a, exact.cat, exact.number);
    else {
      const category = guideForQuestion(input);
      const guide = CATEGORY_GUIDES[category];
      ask(input, `I don't have an explicit answer to this question in the site's educational content. I won't guess a figure or invent a recommendation. The following steps may help you find relevant information; they do not guarantee this tool can answer your exact question.\n\n${guide.steps}\n\nExample: for a past investment's value, enter your own dates and shares instead of assuming today's price applied in the past. If the required data is unavailable, leave the answer unresolved.`, category);
    }
    setDraft("");
  }

  const list = QAS.filter(x => cat === "All" || x.cat === cat);
  return <main className="ask-shell">
    <h1 className="font-[Lora,Georgia,serif] text-3xl font-bold">Ask Investments</h1>
    <p className="mb-4 mt-2 text-sm text-muted-foreground">{QAS.length} questions for new investors and researchers. For questions about a company's SEC filings, try our <Link to="/ask" className="text-primary underline">filings AI</Link>.</p>
    <p className="info-fine mb-3">Provisional ranking · {SEARCH_VOLUME_SOURCE.provider} Google-search estimates for {SEARCH_VOLUME_SOURCE.country}, checked 16 October 2026. Known volumes rank highest within each category; unknown queries follow in their original order, not assumed popularity. Other countries' demand is unverified. Numbers stay the same across category views.</p>
    <div className="ask-chat">
      <div className="ask-log" ref={log} role="log" aria-live="polite">
        {msgs.map((m, i) => <div key={i} className={`ask-bubble ${m.role === "user" ? "ask-user" : "ask-bot"}`}>
          {m.role === "bot" && m.category ? <>
            {m.number && <p className="mb-1 text-xs text-muted-foreground">Question #{m.number}</p>}
            <div className="ask-answer">{m.text}</div>
            <Link to={CATEGORY_GUIDES[m.category].to} className="mt-2 inline-block text-primary underline">{CATEGORY_GUIDES[m.category].label}</Link>
            <details className="mt-2 text-xs"><summary className="cursor-pointer text-muted-foreground">Steps to explore this on Investico</summary><p className="mt-2">{CATEGORY_GUIDES[m.category].steps}</p></details>
            <div className="ask-share" aria-label="Share this answer">
              <span className="ask-share-label">Share this answer:</span>
              <Button variant="ghost" size="icon-sm" aria-label="Share on WhatsApp" onClick={() => shareAnswer(m, "whatsapp")}><MessageCircle /></Button>
              <Button variant="ghost" size="icon-sm" aria-label="Share on Facebook" onClick={() => shareAnswer(m, "facebook")}><Facebook /></Button>
              <Button variant="ghost" size="icon-sm" aria-label="Share on X" onClick={() => shareAnswer(m, "x")}><Share2 /></Button>
              <Button variant="ghost" size="icon-sm" aria-label="Copy answer link" onClick={() => shareAnswer(m, "copy")}><Link2 /></Button>
            </div>
          </> : m.text}
        </div>)}
        {typing !== null && <div className="ask-bubble ask-bot">{typing === "" ? <span className="ask-typing" aria-label="Typing"><span /><span /><span /></span> : typing}</div>}
      </div>
      <form className="ask-compose" onSubmit={e => { e.preventDefault(); submitManual(draft); }}>
        <input aria-label="Your investment question or question number" placeholder="Type a question or #number…" value={draft} onChange={e => setDraft(e.target.value)} maxLength={2000} />
        <Button type="submit" size="icon" disabled={busy || !draft.trim()} aria-label="Send question"><Send /></Button>
      </form>
      <div className="ask-picker">
        <div className="ask-cats">{(["All", ...CATEGORIES] as const).map(c => <Button variant="ghost" key={c} type="button" className={cat === c ? "on" : ""} aria-pressed={cat === c} onClick={() => setCat(c)}>{c}</Button>)}</div>
        <div className="ask-qs">{list.map(x => <Button variant="ghost" key={x.q} type="button" disabled={busy} title={x.volume === null ? "Search volume unknown · provisional position" : `${x.volume.toLocaleString()} estimated Google searches/month · UAE · Semrush`} onClick={() => ask(x.q, x.a, x.cat, x.number)}>#{x.number} {x.q}</Button>)}</div>
      </div>
    </div>
    <p className="info-fine mt-3">Educational information only, not financial advice. Examples are hypothetical. Edits are private to this open conversation, not verified source content or saved changes.</p>
  </main>;
}
