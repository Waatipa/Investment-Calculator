import { createFileRoute } from "@tanstack/react-router";
import { FilingTutorMark } from "@/components/filing-chat";

export const Route = createFileRoute("/_authenticated/ask/")({
  component: () => <div className="flex h-full min-h-[50vh] flex-col items-center justify-center gap-3 rounded-xl border border-border bg-card/40 p-8 text-center">
    <FilingTutorMark />
    <h1 className="font-serif text-2xl font-bold text-foreground">Ask about Apple's filings</h1>
    <p className="max-w-md text-sm text-muted-foreground">Start a new question to get plain-English explanations of Apple's revenue, earnings, cash flow and balance sheet — every figure cited to its SEC filing.</p>
  </div>,
});
