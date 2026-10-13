import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Conversation, ConversationContent, ConversationEmptyState, ConversationScrollButton } from "@/components/ai-elements/conversation";
import { Message, MessageContent, MessageResponse } from "@/components/ai-elements/message";
import { PromptInput, PromptInputFooter, PromptInputSubmit, PromptInputTextarea } from "@/components/ai-elements/prompt-input";
import { Shimmer } from "@/components/ai-elements/shimmer";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { getAppleFilingReferences } from "@/lib/filing-threads.functions";
import { longDate } from "@/lib/investment";

export function FilingTutorMark({ small = false }: { small?: boolean }) {
  const s = small ? 28 : 48;
  return <svg width={s} height={s} viewBox="0 0 48 48" aria-label="Filings tutor" role="img" className="shrink-0">
    <rect x="1" y="1" width="46" height="46" rx="12" className="fill-primary/15 stroke-primary" strokeWidth="1.5" />
    <path d="M15 11h13l6 6v20H15z" className="fill-none stroke-primary" strokeWidth="2" strokeLinejoin="round" />
    <path d="M28 11v6h6" className="fill-none stroke-primary" strokeWidth="2" />
    <path d="M19 33v-5M23.5 33v-8M28 33v-11" className="stroke-foreground" strokeWidth="2.4" strokeLinecap="round" />
  </svg>;
}

const SUGGESTIONS = [
  "How profitable was Apple in its latest fiscal year?",
  "Explain Apple's free cash flow from the latest 10-K.",
  "What was Apple's net margin and how is it calculated?",
  "How does Apple's latest quarter compare with its annual figures?",
];

export function FilingChat({ threadId, initialMessages }: { threadId: string; initialMessages: UIMessage[] }) {
  const qc = useQueryClient();
  const [input, setInput] = useState("");
  const fetchRefs = useServerFn(getAppleFilingReferences);
  const { data: refData } = useQuery({ queryKey: ["apple-filing-refs"], queryFn: () => fetchRefs(), staleTime: 3_600_000 });
  const transport = useMemo(() => new DefaultChatTransport({
    api: "/api/filing-chat",
    body: { threadId },
    headers: async (): Promise<Record<string, string>> => {
      const { data } = await supabase.auth.getSession();
      return data.session ? { Authorization: `Bearer ${data.session.access_token}` } : {};
    },
  }), [threadId]);
  const { messages, sendMessage, status, stop, error } = useChat({
    id: threadId,
    messages: initialMessages,
    transport,
    onError: (e) => toast.error(e.message || "The AI couldn't answer right now."),
    onFinish: () => { qc.invalidateQueries({ queryKey: ["filing-threads"] }); qc.invalidateQueries({ queryKey: ["filing-thread", threadId] }); },
  });
  const busy = status === "submitted" || status === "streaming";
  const ask = (text: string) => { const t = text.trim(); if (!t || busy) return; sendMessage({ text: t }); setInput(""); };

  return <div className="grid gap-4 lg:grid-cols-[1fr_280px]">
    <div className="flex h-[calc(100vh-140px)] min-h-[480px] flex-col rounded-xl border border-border bg-card/40">
      <div className="flex items-center gap-3 border-b border-border px-4 py-3"><FilingTutorMark small /><div><h1 className="text-sm font-semibold text-foreground">Apple filings tutor</h1><p className="text-xs text-muted-foreground">Answers cite SEC EDGAR references like [S1] · Educational, not investment advice</p></div></div>
      <Conversation className="flex-1">
        <ConversationContent>
          {messages.length === 0 ? <ConversationEmptyState icon={<FilingTutorMark />} title="Ask about Apple's verified figures" description="Pick a starter question or type your own.">
            <div className="flex flex-col items-center gap-3"><FilingTutorMark /><p className="text-sm font-medium text-foreground">Ask about Apple's verified figures</p><div className="grid gap-2 sm:grid-cols-2">{SUGGESTIONS.map(s => <Button key={s} variant="outline" className="h-auto whitespace-normal py-2 text-left text-xs" onClick={() => ask(s)}>{s}</Button>)}</div></div>
          </ConversationEmptyState> : messages.map(m => <Message key={m.id} from={m.role}>
            <MessageContent>{m.parts.map((p, i) => p.type === "text" ? (m.role === "assistant" ? <MessageResponse key={i}>{p.text}</MessageResponse> : <span key={i}>{p.text}</span>) : null)}</MessageContent>
          </Message>)}
          {status === "submitted" && <Message from="assistant"><MessageContent><Shimmer>Reading Apple's filings…</Shimmer></MessageContent></Message>}
          {error && !busy && <p role="alert" className="text-sm text-destructive">{error.message}</p>}
        </ConversationContent>
        <ConversationScrollButton />
      </Conversation>
      <div className="p-3">
        <PromptInput onSubmit={(msg) => ask(msg.text ?? "")}>
          <PromptInputTextarea autoFocus value={input} onChange={e => setInput(e.target.value)} placeholder="e.g. What drove Apple's operating cash flow?" maxLength={2000} />
          <PromptInputFooter className="justify-end"><PromptInputSubmit status={status} onStop={stop} disabled={!busy && !input.trim()} /></PromptInputFooter>
        </PromptInput>
      </div>
    </div>
    <aside className="rounded-xl border border-border bg-card/40 p-3 lg:h-[calc(100vh-140px)] lg:overflow-y-auto" aria-label="SEC filing references">
      <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">References · SEC EDGAR</h2>
      {refData?.error && <p className="text-xs text-destructive">{refData.error}</p>}
      {!refData && <p className="text-xs text-muted-foreground">Loading filings…</p>}
      <ol className="flex flex-col gap-2">{refData?.refs.map(r => <li key={r.id} id={`ref-${r.id}`} className="rounded-md border border-border p-2 text-xs">
        <div className="flex justify-between gap-2"><strong className="text-primary">[{r.id}]</strong><span className="text-muted-foreground">{r.period}</span></div>
        <div className="font-medium text-foreground">{r.label}: {r.value.toLocaleString("en-US")} <span className="text-muted-foreground">{r.unit}</span></div>
        <a href={r.url} target="_blank" rel="noreferrer" className="text-muted-foreground underline">{r.form} filed {longDate(r.filed)} · {r.periodStart ? `${longDate(r.periodStart)} – ` : "as of "}{longDate(r.periodEnd)}</a>
        {r.note && <p className="mt-1 text-muted-foreground">{r.note}</p>}
      </li>)}</ol>
    </aside>
  </div>;
}
