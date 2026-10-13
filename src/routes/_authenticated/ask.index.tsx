import { createFileRoute } from "@tanstack/react-router";
import { FilingTutorMark } from "@/components/filing-chat";
import { pageHead } from "@/lib/markets";

export const Route = createFileRoute("/_authenticated/ask/")({
  head: () => pageHead("Ask company filings", "Start a company-specific conversation about verified SEC financial figures at Investico Academy."),
  component: () => <div className="flex h-full min-h-[50vh] flex-col items-center justify-center gap-3 rounded-xl border border-border bg-card/40 p-8 text-center">
    <FilingTutorMark />
    <h1 className="font-serif text-2xl font-bold text-foreground">Ask about the filings</h1>
    <p className="max-w-md text-sm text-muted-foreground">Pick a company, start a new question, and get plain-English explanations of its revenue, earnings, cash flow and balance sheet — every figure cited to that company's own SEC filing.</p>
  </div>,
});
