import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { FilingChat } from "@/components/filing-chat";
import { getFilingThread } from "@/lib/filing-threads.functions";
import { pageHead } from "@/lib/markets";

export const Route = createFileRoute("/_authenticated/ask/$threadId")({
  head: () => pageHead("Filings conversation", "Your company-specific questions and explanations citing verified SEC filings at Investico Academy."),
  component: ThreadPage,
});

function ThreadPage() {
  const { threadId } = Route.useParams();
  const get = useServerFn(getFilingThread);
  const { data, isLoading, error } = useQuery({ queryKey: ["filing-thread", threadId], queryFn: () => get({ data: { id: threadId } }), staleTime: Infinity });
  if (isLoading) return <p className="p-6 text-sm text-muted-foreground">Loading conversation…</p>;
  if (error) return <p role="alert" className="p-6 text-sm text-destructive">{error.message}</p>;
  if (!data) return <p className="p-6 text-sm text-muted-foreground">This conversation doesn't exist.</p>;
  return <FilingChat key={threadId} threadId={threadId} symbol={data.thread.symbol ?? "AAPL"} initialMessages={data.messages as never} />;
}
