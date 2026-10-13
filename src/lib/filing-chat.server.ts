import { createOpenAI } from "@ai-sdk/openai";
import { convertToModelMessages, streamText, type UIMessage } from "ai";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import type { Database } from "@/integrations/supabase/types";
import { loadFacts, makeResolver, SEC_CIKS, type SecSymbol } from "./sec-facts.functions";
import { createLovableAiGatewayRunIdFetch, getLovableAiGatewayRunId, withLovableAiGatewayRunIdHeader } from "./run-id.server";

export type FilingReference = { id: string; label: string; period: "Annual" | "Quarterly"; value: number; unit: string; concept: string; form: string; filed: string; periodStart: string | null; periodEnd: string; url: string; note?: string };

const FIGURES: { label: string; concept: string; kind: "flow" | "instant"; unit?: string; scale: number; unitLabel: string; additive?: boolean }[] = [
  { label: "Revenue", concept: "RevenueFromContractWithCustomerExcludingAssessedTax", kind: "flow", scale: 1e-6, unitLabel: "USD millions" },
  { label: "Gross profit", concept: "GrossProfit", kind: "flow", scale: 1e-6, unitLabel: "USD millions" },
  { label: "Operating income", concept: "OperatingIncomeLoss", kind: "flow", scale: 1e-6, unitLabel: "USD millions" },
  { label: "Net income", concept: "NetIncomeLoss", kind: "flow", scale: 1e-6, unitLabel: "USD millions" },
  { label: "Diluted EPS", concept: "EarningsPerShareDiluted", kind: "flow", unit: "USD/shares", scale: 1, unitLabel: "USD per share", additive: false },
  { label: "Operating cash flow", concept: "NetCashProvidedByUsedInOperatingActivities", kind: "flow", scale: 1e-6, unitLabel: "USD millions" },
  { label: "Capital expenditure", concept: "PaymentsToAcquirePropertyPlantAndEquipment", kind: "flow", scale: 1e-6, unitLabel: "USD millions" },
  { label: "Dividends paid", concept: "PaymentsOfDividends", kind: "flow", scale: 1e-6, unitLabel: "USD millions" },
  { label: "Total assets", concept: "Assets", kind: "instant", scale: 1e-6, unitLabel: "USD millions" },
  { label: "Current assets", concept: "AssetsCurrent", kind: "instant", scale: 1e-6, unitLabel: "USD millions" },
  { label: "Current liabilities", concept: "LiabilitiesCurrent", kind: "instant", scale: 1e-6, unitLabel: "USD millions" },
  { label: "Shareholders' equity", concept: "StockholdersEquity", kind: "instant", scale: 1e-6, unitLabel: "USD millions" },
  { label: "Long-term debt", concept: "LongTermDebt", kind: "instant", scale: 1e-6, unitLabel: "USD millions" },
  { label: "Cash and cash equivalents", concept: "CashAndCashEquivalentsAtCarryingValue", kind: "instant", scale: 1e-6, unitLabel: "USD millions" },
];

export const FILING_COMPANIES: Record<SecSymbol, string> = {
  AAPL: "Apple Inc.", NVDA: "NVIDIA Corporation", MSFT: "Microsoft Corporation",
  AMZN: "Amazon.com, Inc.", GOOGL: "Alphabet Inc.", META: "Meta Platforms, Inc.", TSLA: "Tesla, Inc.",
};

export async function buildReferences(symbol: SecSymbol = "AAPL"): Promise<FilingReference[]> {
  const facts = await loadFacts(symbol);
  const refs: FilingReference[] = [];
  for (const mode of ["annual", "quarterly"] as const) {
    const r = makeResolver(facts, mode);
    for (const f of FIGURES) {
      const fig = f.kind === "flow" ? r.flow(f.concept, f.unit ?? "USD", 0, f.additive ?? true) : r.instant(f.concept);
      if (!fig || !Number.isFinite(fig.value)) continue;
      refs.push({ id: `S${refs.length + 1}`, label: f.label, period: mode === "annual" ? "Annual" : "Quarterly", value: Number((fig.value * f.scale).toFixed(4)), unit: f.unitLabel, concept: fig.concept, form: fig.form, filed: fig.filed, periodStart: fig.periodStart, periodEnd: fig.periodEnd, url: fig.url, ...(fig.note ? { note: fig.note } : {}) });
    }
  }
  return refs;
}

const json = (status: number, error: string) => Response.json({ error }, { status });
const bodySchema = z.object({ threadId: z.string().uuid(), messages: z.array(z.any()).min(1).max(200) });

export async function handleFilingChat(request: Request) {
  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!token) return json(401, "Please sign in to ask questions.");
  const key = process.env["SUPABASE_PUBLISHABLE_KEY"]!;
  const supabase = createClient<Database>(process.env["SUPABASE_URL"]!, key, {
    auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: `Bearer ${token}` } },
  });
  const { data: userData, error: userError } = await supabase.auth.getUser(token);
  if (userError || !userData.user) return json(401, "Your session has expired. Please sign in again.");
  const userId = userData.user.id;

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return json(400, "Invalid request.");
  const { threadId } = parsed.data;
  const messages = parsed.data.messages as UIMessage[];
  const { data: thread } = await supabase.from("filing_threads").select("id,title").eq("id", threadId).maybeSingle();
  if (!thread) return json(404, "Conversation not found.");

  const last = messages[messages.length - 1];
  if (!last || last.role !== "user") return json(400, "Ask a question first.");
  const question = last.parts.map(p => (p.type === "text" ? p.text : "")).join(" ").trim();
  if (!question || question.length > 2000) return json(400, "Questions must be between 1 and 2,000 characters.");
  const saveUser = await supabase.from("filing_messages").upsert({ thread_id: threadId, user_id: userId, sdk_id: last.id, role: "user", parts: last.parts as never }, { onConflict: "thread_id,sdk_id" });
  if (saveUser.error) { console.error("save user message", saveUser.error); return json(500, "Could not save your question. Try again."); }
  if (thread.title === "New question") await supabase.from("filing_threads").update({ title: question.slice(0, 80), updated_at: new Date().toISOString() }).eq("id", threadId);

  let refs: FilingReference[];
  try { refs = await buildAppleReferences(); } catch (e) { console.error(e); return json(503, "SEC EDGAR filings are unavailable right now. Try again shortly."); }

  const referenceText = refs.map(r => `[${r.id}] ${r.label} (${r.period}) = ${r.value.toLocaleString("en-US")} ${r.unit}; ${r.concept}; SEC ${r.form} filed ${r.filed}; period ${r.periodStart ? `${r.periodStart} to ` : "as of "}${r.periodEnd}${r.note ? `; ${r.note}` : ""}; ${r.url}`).join("\n");
  const instructions = `You are the Investico Academy filings tutor. Explain Apple Inc.'s verified financial-statement figures to retail investors in plain English.
Use ONLY the numbered SEC EDGAR references below for Apple figures. Cite every figure you use with its reference id in square brackets, e.g. [S3], and when helpful show calculations step by step using those figures. If a question needs data not in the references (forecasts, other companies, prices, sector medians), say clearly that the displayed filings don't contain it — never invent or estimate figures. Mention reporting periods and that quarterly cash-flow figures may be derived from year-to-date totals when the reference says so. Do not give buy/sell recommendations; note this is educational, not investment advice. Keep answers concise and well formatted in markdown.

REFERENCES (Apple Inc., CIK 0000320193):
${referenceText}`;

  const runIdFetch = createLovableAiGatewayRunIdFetch(getLovableAiGatewayRunId(request));
  const apiKey = process.env["LOVABLE_API_KEY"];
  if (!apiKey) return json(500, "AI is not configured.");
  const provider = createOpenAI({ baseURL: "https://ai.gateway.lovable.dev/v1", apiKey, headers: { "Lovable-API-Key": apiKey, "X-Lovable-AIG-SDK": "vercel-ai-sdk" }, fetch: runIdFetch.fetch });
  const result = streamText({
    model: provider.responses("openai/gpt-6-astra"),
    instructions,
    messages: await convertToModelMessages(messages),
    abortSignal: request.signal,
    providerOptions: { openai: { forceReasoning: true, reasoningEffort: "low", reasoningSummary: "auto", store: false, include: ["reasoning.encrypted_content"] } },
  });
  const response = result.toUIMessageStreamResponse({
    originalMessages: messages,
    sendReasoning: true,
    onError: (error) => {
      const status = (error as { statusCode?: number })?.statusCode;
      if (status === 429) return "Too many questions right now. Please wait a moment and try again.";
      if (status === 402) return "AI credits are exhausted for this workspace. Add credits in Settings → Plans & credits.";
      console.error("filing chat error", error);
      return "The AI couldn't answer right now. Please try again.";
    },
    onFinish: async ({ responseMessage }) => {
      const { error } = await supabase.from("filing_messages").upsert({ thread_id: threadId, user_id: userId, sdk_id: responseMessage.id, role: "assistant", parts: responseMessage.parts as never }, { onConflict: "thread_id,sdk_id" });
      if (error) console.error("save assistant message", error);
      await supabase.from("filing_threads").update({ updated_at: new Date().toISOString() }).eq("id", threadId);
    },
  });
  return withLovableAiGatewayRunIdHeader(response, runIdFetch);
}
