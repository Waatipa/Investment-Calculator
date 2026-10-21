import { createServerFn } from "@tanstack/react-start";
import { EARNINGS_COMPANIES } from "./earnings-companies";

export type EarningsQuote = { ticker: string; price: number | null; change: number | null; time: number | null; earningsAt: number | null; earningsEstimate: boolean };

// Real source quotes and next earnings dates for the allowlisted earnings companies.
export const getEarningsQuotes = createServerFn({ method: "GET" }).handler(async (): Promise<EarningsQuote[]> => {
  const { fetchCompanyQuotes } = await import("./market-quotes.server");
  const rows = await fetchCompanyQuotes(EARNINGS_COMPANIES.map(c => c.yahoo).join(","));
  const num = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? v : null);
  return EARNINGS_COMPANIES.map(c => {
    const q = rows.find(r => r["symbol"] === c.yahoo) ?? {};
    const start = num(q["earningsTimestampStart"]) ?? num(q["earningsTimestamp"]);
    return { ticker: c.ticker, price: num(q["regularMarketPrice"]), change: num(q["regularMarketChangePercent"]), time: num(q["regularMarketTime"]), earningsAt: start, earningsEstimate: q["isEarningsDateEstimate"] === true };
  });
});

// Which live-source keys are configured (names only, never values).
export const getEarningsSourceStatus = createServerFn({ method: "GET" }).handler(async () => {
  const has = (k: string) => Boolean(process.env[k]);
  return {
    ingestSecret: has("EARNINGS_INGEST_SECRET"),
    transcriptApi: has("TRANSCRIPT_API_KEY"),
    deepgram: has("DEEPGRAM_API_KEY"),
    assemblyai: has("ASSEMBLYAI_API_KEY"),
    consensusApi: has("CONSENSUS_API_KEY"),
    ai: has("LOVABLE_API_KEY"),
  };
});
