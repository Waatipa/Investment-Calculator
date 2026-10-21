import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { findByTicker } from "@/lib/earnings-companies";

// External relays (any transcript or speech-to-text provider) post sentences here with header
// x-ingest-secret = EARNINGS_INGEST_SECRET. Body: { ticker, text?, status?, consensus? }.
const json = (status: number, body: unknown) => Response.json(body, { status });
const n = z.number().nullable().optional();
const schema = z.object({
  ticker: z.string().min(1).max(10),
  text: z.string().trim().min(1).max(4000).optional(),
  status: z.enum(["live", "scheduled", "replay"]).optional(),
  consensus: z.object({ eps: n, revenue: n, guidance: n, sector: n }).optional(),
});

export const Route = createFileRoute("/api/public/earnings-ingest")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const secret = process.env["EARNINGS_INGEST_SECRET"];
        if (!secret || request.headers.get("x-ingest-secret") !== secret) return json(401, { error: "Unauthorized" });
        const parsed = schema.safeParse(await request.json().catch(() => null));
        if (!parsed.success) return json(400, { error: "Invalid body" });
        const company = findByTicker(parsed.data.ticker);
        if (!company) return json(400, { error: "Unknown ticker" });
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { status, consensus: c, text } = parsed.data;
        if (status || c) {
          const { error } = await supabaseAdmin.from("earnings_calls").upsert({ ticker: company.ticker, ...(status ? { status } : {}),
            ...(c?.eps !== undefined ? { eps_consensus: c.eps } : {}), ...(c?.revenue !== undefined ? { revenue_consensus: c.revenue } : {}),
            ...(c?.guidance !== undefined ? { guidance_consensus: c.guidance } : {}), ...(c?.sector !== undefined ? { sector_move: c.sector } : {}),
            updated_at: new Date().toISOString() });
          if (error) return json(500, { error: error.message });
        }
        if (!text) return json(200, { ok: true });
        try {
          const { analyzeAndStore } = await import("@/lib/earnings-live.server");
          return json(200, { ok: true, extracted: await analyzeAndStore(company, text, request.signal) });
        } catch (e) {
          const s = (e as { statusCode?: number }).statusCode ?? 502;
          console.error("earnings ingest", e);
          return json([402, 403, 429].includes(s) ? s : 502, { error: s === 402 ? "AI credits exhausted" : s === 429 ? "Rate limited, retry later" : "AI extraction failed" });
        }
      },
    },
  },
});
