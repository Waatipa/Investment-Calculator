import { createOpenAI } from "@ai-sdk/openai";
import { Output, streamText } from "ai";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import type { Database } from "@/integrations/supabase/types";
import { findByTicker, type EarningsCompany } from "./earnings-companies";

const GATEWAY = "https://ai.gateway.lovable.dev/v1";
const json = (status: number, body: unknown) => Response.json(body, { status });
const nul = z.number().nullable();
const extraction = z.object({
  eps_actual: nul, eps_consensus: nul,
  revenue_actual_billions: nul, revenue_consensus_billions: nul,
  guidance_pct: nul, guidance_consensus_pct: nul,
  tone: z.number(), summary: z.string(),
});

async function admin() { return (await import("@/integrations/supabase/client.server")).supabaseAdmin; }
function apiKey() { const k = process.env["LOVABLE_API_KEY"]; if (!k) throw Object.assign(new Error("AI is not configured"), { statusCode: 500 }); return k; }

// One sentence -> structured figures + tone -> saved (Realtime pushes it to every open page).
export async function analyzeAndStore(company: EarningsCompany, text: string, signal?: AbortSignal) {
  const key = apiKey();
  const provider = createOpenAI({ baseURL: GATEWAY, apiKey: key, headers: { "Lovable-API-Key": key, "X-Lovable-AIG-SDK": "vercel-ai-sdk" } });
  const result = streamText({
    model: provider.responses("openai/gpt-6-astra"),
    instructions: `You read text from ${company.name} (${company.ticker})'s live earnings call. Extract only figures explicitly stated; use null otherwise. EPS in USD per share. Revenue in USD billions. Guidance = next-quarter revenue growth % stated by management; Street expectation % only if stated. tone = -100 (very negative for the stock) to +100 (very positive), judging management tone and analyst questions. summary = one short plain-English line.`,
    prompt: text,
    output: Output.object({ schema: extraction }),
    ...(signal ? { abortSignal: signal } : {}),
    providerOptions: { openai: { forceReasoning: true, reasoningEffort: "low", store: false } },
  });
  const o = await result.output;
  const db = await admin();
  const { error } = await db.from("call_events").insert({
    ticker: company.ticker, text, summary: o.summary, tone: Math.max(-100, Math.min(100, o.tone)),
    eps_actual: o.eps_actual, eps_consensus: o.eps_consensus, revenue_actual: o.revenue_actual_billions, revenue_consensus: o.revenue_consensus_billions,
    guidance: o.guidance_pct, guidance_consensus: o.guidance_consensus_pct,
  });
  if (error) throw new Error(error.message);
  return o;
}

// Audio chunk -> text using Lovable AI speech-to-text (streamed SSE, final text collected).
export async function transcribeChunk(file: File, company: EarningsCompany, signal?: AbortSignal) {
  const form = new FormData();
  form.append("model", "openai/gpt-transcribe");
  form.append("file", new File([file], "chunk.webm", { type: "audio/webm" }));
  form.append("response_format", "json");
  form.append("stream", "true");
  form.append("prompt", `${company.name} quarterly earnings call: EPS, revenue, guidance, analysts.`);
  const r = await fetch(`${GATEWAY}/audio/transcriptions`, { method: "POST", headers: { Authorization: `Bearer ${apiKey()}` }, body: form, ...(signal ? { signal } : {}) });
  if (!r.ok || !r.body) { const msg = await r.text().catch(() => ""); throw Object.assign(new Error(msg.slice(0, 300) || "Transcription failed"), { statusCode: r.status }); }
  const raw = await r.text();
  let done = "", deltas = "";
  for (const line of raw.split("\n")) {
    if (!line.startsWith("data:")) continue;
    const d = line.slice(5).trim(); if (!d || d === "[DONE]") continue;
    try { const ev = JSON.parse(d) as { type?: string; text?: string; delta?: string }; if (ev.type === "transcript.text.done" && ev.text) done = ev.text; else if (ev.delta) deltas += ev.delta; } catch { /* ignore */ }
  }
  return (done || deltas).trim();
}

// Free consensus: Yahoo Finance analyst averages for the current quarter.
export async function loadConsensus(company: EarningsCompany) {
  const { fetchYahooJson } = await import("./market-quotes.server");
  const body = await fetchYahooJson(`https://query2.finance.yahoo.com/v10/finance/quoteSummary/${encodeURIComponent(company.yahoo)}?modules=earningsTrend`, 10 * 60_000) as { quoteSummary?: { result?: { earningsTrend?: { trend?: { period?: string; earningsEstimate?: { avg?: { raw?: number } }; revenueEstimate?: { avg?: { raw?: number } } }[] } }[] } };
  const t = body.quoteSummary?.result?.[0]?.earningsTrend?.trend?.find(x => x.period === "0q");
  const eps = t?.earningsEstimate?.avg?.raw ?? null;
  const rev = t?.revenueEstimate?.avg?.raw;
  return { eps, revenue: rev ? rev / 1e9 : null };
}

const sentences = (text: string) => (text.match(/[^.!?]+[.!?]+|[^.!?]+$/g) ?? []).map(s => s.trim()).filter(s => s.length > 3);

async function requireAdmin(request: Request) {
  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!token) return null;
  const supabase = createClient<Database>(process.env["SUPABASE_URL"]!, process.env["SUPABASE_PUBLISHABLE_KEY"]!, { auth: { storage: undefined, persistSession: false, autoRefreshToken: false }, global: { headers: { Authorization: `Bearer ${token}` } } });
  const { data } = await supabase.auth.getUser(token);
  if (!data.user) return null;
  const { data: ok } = await supabase.rpc("has_role", { _user_id: data.user.id, _role: "admin" });
  return ok ? data.user.id : null;
}

const actionSchema = z.object({ ticker: z.string().min(1).max(10), action: z.enum(["start", "stop", "chunk", "status", "guidance"]), guidance: z.coerce.number().min(-100).max(100).optional() });

// Broadcast page: start/stop a live call and send audio chunks.
export async function handleBroadcast(request: Request) {
  if (!(await requireAdmin(request))) return json(403, { error: "Only the site owner can broadcast calls." });
  const form = await request.formData().catch(() => null);
  if (!form) return json(400, { error: "Invalid request" });
  const parsed = actionSchema.safeParse({ ticker: form.get("ticker"), action: form.get("action"), guidance: form.get("guidance") ?? undefined });
  if (!parsed.success) return json(400, { error: "Invalid request" });
  const company = findByTicker(parsed.data.ticker);
  if (!company) return json(400, { error: "Unknown company" });
  const db = await admin();
  const { action } = parsed.data;

  if (action === "start") {
    let consensus: { eps: number | null; revenue: number | null } = { eps: null, revenue: null };
    try { consensus = await loadConsensus(company); } catch (e) { console.error("consensus", e); }
    const { error } = await db.from("earnings_calls").upsert({ ticker: company.ticker, status: "live", eps_consensus: consensus.eps, revenue_consensus: consensus.revenue, ...(parsed.data.guidance != null ? { guidance_consensus: parsed.data.guidance } : {}), updated_at: new Date().toISOString() });
    if (error) return json(500, { error: error.message });
    return json(200, { ok: true, consensus });
  }
  if (action === "stop") {
    const { error } = await db.from("earnings_calls").upsert({ ticker: company.ticker, status: "replay", updated_at: new Date().toISOString() });
    return error ? json(500, { error: error.message }) : json(200, { ok: true });
  }
  if (action === "guidance") {
    const { error } = await db.from("earnings_calls").upsert({ ticker: company.ticker, guidance_consensus: parsed.data.guidance ?? null, updated_at: new Date().toISOString() });
    return error ? json(500, { error: error.message }) : json(200, { ok: true });
  }
  if (action === "status") return json(200, { ok: true });

  const audio = form.get("audio");
  if (!(audio instanceof File) || !audio.size || audio.size > 20 * 1024 * 1024) return json(400, { error: "Audio chunk missing or too large" });
  try {
    const text = await transcribeChunk(audio, company, request.signal);
    if (!text) return json(200, { ok: true, text: "", events: 0 });
    const parts = sentences(text);
    // Group short sentences so each analysis has enough context, sequentially to respect rate limits.
    let events = 0;
    for (let i = 0; i < parts.length; i += 2) { await analyzeAndStore(company, parts.slice(i, i + 2).join(" "), request.signal); events++; }
    return json(200, { ok: true, text, events });
  } catch (e) {
    const status = (e as { statusCode?: number }).statusCode ?? 502;
    console.error("broadcast chunk", e);
    const message = status === 402 ? "AI credits are used up. Add credits in Settings → Plans & credits." : status === 429 ? "Too many requests; the next chunk will try again." : status === 403 ? "AI access is blocked for this workspace." : "Could not analyse this chunk.";
    return json([402, 403, 429].includes(status) ? status : 502, { error: message });
  }
}
