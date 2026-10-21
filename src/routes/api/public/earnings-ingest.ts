import { createFileRoute } from "@tanstack/react-router";
import { createOpenAI } from "@ai-sdk/openai";
import { Output, streamText } from "ai";
import { z } from "zod";
import { findByTicker } from "@/lib/earnings-companies";

// Pluggable live source: a transcript provider, or a speech-to-text relay (Deepgram / AssemblyAI / Whisper)
// posts each sentence here. Body: { ticker, text } | { ticker, status } | { ticker, consensus: {...} }.
// Caller must send header x-ingest-secret = EARNINGS_INGEST_SECRET.
const json = (status: number, body: unknown) => new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
const nul = z.number().nullable();
const schema = z.object({
  eps_actual: nul, eps_consensus: nul,
  revenue_actual_billions: nul, revenue_consensus_billions: nul,
  guidance_pct: nul, guidance_consensus_pct: nul,
  tone: z.number(), summary: z.string(),
});

export const Route = createFileRoute("/api/public/earnings-ingest")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const secret = process.env["EARNINGS_INGEST_SECRET"];
        if (!secret || request.headers.get("x-ingest-secret") !== secret) return json(401, { error: "Unauthorized" });
        const body = (await request.json().catch(() => null)) as { ticker?: string; text?: string; status?: string; consensus?: Record<string, number | null> } | null;
        const company = body?.ticker ? findByTicker(body.ticker) : undefined;
        if (!company) return json(400, { error: "Unknown ticker" });
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

        if (body?.status || body?.consensus) {
          const status = body.status && ["live", "scheduled", "replay"].includes(body.status) ? body.status : undefined;
          const c = body.consensus ?? {};
          const { error } = await supabaseAdmin.from("earnings_calls").upsert({ ticker: company.ticker, ...(status ? { status } : {}), ...("eps" in c ? { eps_consensus: c["eps"] } : {}), ...("revenue" in c ? { revenue_consensus: c["revenue"] } : {}), ...("guidance" in c ? { guidance_consensus: c["guidance"] } : {}), ...("sector" in c ? { sector_move: c["sector"] } : {}), updated_at: new Date().toISOString() });
          if (error) return json(500, { error: error.message });
          if (!body.text) return json(200, { ok: true });
        }
        const text = body?.text?.trim();
        if (!text || text.length > 4000) return json(400, { error: "text required (max 4000 chars)" });

        const apiKey = process.env["LOVABLE_API_KEY"];
        if (!apiKey) return json(500, { error: "AI is not configured" });
        const provider = createOpenAI({ baseURL: "https://ai.gateway.lovable.dev/v1", apiKey, headers: { "Lovable-API-Key": apiKey, "X-Lovable-AIG-SDK": "vercel-ai-sdk" } });
        try {
          const result = streamText({
            model: provider.responses("openai/gpt-6-astra"),
            instructions: `You read one sentence from ${company.name} (${company.ticker})'s live earnings call. Extract only figures explicitly stated in the sentence; use null otherwise. EPS in USD per share. Revenue in USD billions. Guidance = next-quarter revenue growth % stated by management; Street expectation % only if stated. tone = -100 (very negative for the stock) to +100 (very positive), judging management tone and analyst questions. summary = one short plain-English line.`,
            prompt: text,
            output: Output.object({ schema }),
            abortSignal: request.signal,
            providerOptions: { openai: { forceReasoning: true, reasoningEffort: "low", store: false } },
          });
          const o = await result.output;
          const { error } = await supabaseAdmin.from("call_events").insert({
            ticker: company.ticker, text, summary: o.summary, tone: Math.max(-100, Math.min(100, o.tone)),
            eps_actual: o.eps_actual, eps_consensus: o.eps_consensus, revenue_actual: o.revenue_actual_billions, revenue_consensus: o.revenue_consensus_billions,
            guidance: o.guidance_pct, guidance_consensus: o.guidance_consensus_pct,
          });
          if (error) return json(500, { error: error.message });
          return json(200, { ok: true, extracted: o });
        } catch (e) {
          const status = (e as { statusCode?: number })?.statusCode ?? 502;
          console.error("earnings ingest", e);
          return json(status === 402 || status === 429 || status === 403 ? status : 502, { error: status === 402 ? "AI credits exhausted" : status === 429 ? "Rate limited, retry later" : "AI extraction failed" });
        }
      },
    },
  },
});
