import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import type { UIMessage } from "ai";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const listFilingThreads = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase.from("filing_threads").select("id,title,updated_at").order("updated_at", { ascending: false }).limit(100);
    if (error) throw new Error("Could not load your conversations.");
    return data;
  });

export const createFilingThread = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase.from("filing_threads").insert({ user_id: context.userId }).select("id").single();
    if (error) throw new Error("Could not start a new conversation.");
    return data;
  });

export const deleteFilingThread = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(d => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ context, data }) => {
    const { error } = await context.supabase.from("filing_threads").delete().eq("id", data.id);
    if (error) throw new Error("Could not delete the conversation.");
    return { ok: true };
  });

export const getFilingThread = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator(d => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ context, data }) => {
    const { data: thread } = await context.supabase.from("filing_threads").select("id,title").eq("id", data.id).maybeSingle();
    if (!thread) return null;
    const { data: rows, error } = await context.supabase.from("filing_messages").select("sdk_id,role,parts").eq("thread_id", data.id).order("created_at", { ascending: true });
    if (error) throw new Error("Could not load this conversation.");
    const messages = rows.map(r => ({ id: r.sdk_id, role: r.role as UIMessage["role"], parts: r.parts as unknown as UIMessage["parts"] }));
    return { thread, messages: JSON.parse(JSON.stringify(messages)) as { id: string; role: "user" | "assistant" | "system"; parts: { type: string; text?: string }[] }[] };
  });

export const getAppleFilingReferences = createServerFn({ method: "GET" }).handler(async () => {
  const { buildAppleReferences } = await import("./filing-chat.server");
  try { return { refs: await buildAppleReferences(), error: null as string | null }; }
  catch { return { refs: [], error: "SEC EDGAR filings are unavailable right now." }; }
});
