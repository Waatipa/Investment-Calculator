import { createFileRoute, Link, Outlet, useNavigate, useParams } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { FileText, LogOut, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { createFilingThread, deleteFilingThread, listFilingThreads } from "@/lib/filing-threads.functions";
import { pageHead } from "@/lib/markets";

export const Route = createFileRoute("/_authenticated/ask")({
  head: () => pageHead("Ask Apple's filings", "Ask questions about Apple's verified SEC financial figures and get AI explanations that cite each filing."),
  component: AskLayout,
});

export const threadsKey = ["filing-threads"] as const;

function AskLayout() {
  const list = useServerFn(listFilingThreads);
  const create = useServerFn(createFilingThread);
  const remove = useServerFn(deleteFilingThread);
  const navigate = useNavigate();
  const qc = useQueryClient();
  const params = useParams({ strict: false }) as { threadId?: string };
  const { data: threads = [] } = useQuery({ queryKey: threadsKey, queryFn: () => list() });
  const [busy, setBusy] = useState(false);

  async function newThread() {
    setBusy(true);
    try { const t = await create(); await qc.invalidateQueries({ queryKey: threadsKey }); navigate({ to: "/ask/$threadId", params: { threadId: t.id } }); }
    catch (e) { toast.error(e instanceof Error ? e.message : "Could not start a conversation."); }
    finally { setBusy(false); }
  }
  async function del(id: string) {
    try { await remove({ data: { id } }); await qc.invalidateQueries({ queryKey: threadsKey }); if (params.threadId === id) navigate({ to: "/ask" }); }
    catch (e) { toast.error(e instanceof Error ? e.message : "Could not delete."); }
  }

  return <main className="mx-auto grid max-w-6xl gap-4 px-4 py-6 md:grid-cols-[260px_1fr]">
    <aside className="filing-sidebar flex flex-col gap-3 rounded-xl border border-border bg-card/60 p-3 md:h-[calc(100vh-140px)]">
      <Button onClick={newThread} disabled={busy}><Plus />New question</Button>
      <nav className="flex max-h-48 flex-col gap-1 overflow-y-auto md:max-h-none md:flex-1" aria-label="Your conversations">
        {threads.length === 0 && <p className="px-2 py-3 text-xs text-muted-foreground">No conversations yet.</p>}
        {threads.map(t => <div key={t.id} className={`group flex items-center gap-1 rounded-md ${params.threadId === t.id ? "bg-accent" : "hover:bg-accent/60"}`}>
          <Link to="/ask/$threadId" params={{ threadId: t.id }} className="flex min-w-0 flex-1 items-center gap-2 px-2 py-2 text-sm text-foreground"><FileText className="size-4 shrink-0 text-primary" /><span className="truncate">{t.title}</span></Link>
          <Button variant="ghost" size="icon" aria-label={`Delete ${t.title}`} onClick={() => del(t.id)}><Trash2 className="size-4" /></Button>
        </div>)}
      </nav>
      <Button variant="ghost" size="sm" onClick={async () => { await supabase.auth.signOut(); navigate({ to: "/" }); }}><LogOut />Sign out</Button>
    </aside>
    <section className="min-w-0"><Outlet /></section>
  </main>;
}
