import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MarketCalculator } from "@/components/market-calculator";
import { formatMarketCap } from "@/lib/markets";

const api = vi.hoisted(() => ({ price: vi.fn(), result: vi.fn(), quotes: vi.fn() }));
vi.mock("@/lib/nvda.functions", () => ({ getPriceOnDate: api.price, getInvestmentResult: api.result, getMarketQuotes: api.quotes, getMarketHistory: vi.fn() }));

beforeEach(() => {
  vi.clearAllMocks();
  api.price.mockImplementation(async ({ data }: { data: { symbol: string } }) => data.symbol === "NVDA" ? 20 : 50);
  api.quotes.mockResolvedValue([]);
});
afterEach(cleanup);
function mount() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  client.setQueryData(["market-quotes"], []);
  render(<QueryClientProvider client={client}><MarketCalculator /></QueryClientProvider>);
  return client;
}
describe("Linked investment calculator", () => {
  it("shows only after-hours timing in the existing session area during regular hours", () => {
    vi.spyOn(Date, "now").mockReturnValue(Date.parse("2026-10-12T14:32:00Z"));
    const client = mount();
    expect(screen.getAllByText("Market :")).toHaveLength(7);
    expect(document.querySelectorAll('[data-session="After-hours"]')).toHaveLength(7);
    document.querySelectorAll('[data-session]').forEach(session => {
      expect(session).toHaveTextContent("4:00 PM–8:00 PM ET");
      expect(session).not.toHaveTextContent("Pre-market");
    });
    document.querySelectorAll(".trading-sessions").forEach(session => expect(session).not.toHaveTextContent("Unavailable"));
    client.clear();
    vi.restoreAllMocks();
  });
  it("links shares and USD amount and preserves the chosen basis across companies", async () => {
    const client = mount();
    fireEvent.click(screen.getByRole("button", { name: /NVIDIA/ }));
    fireEvent.change(screen.getByLabelText("Investment date"), { target: { value: "2021-10-07" } });
    fireEvent.change(screen.getByLabelText("Valuation date"), { target: { value: "2026-10-08" } });
    await waitFor(() => expect(screen.getByLabelText("Investment amount (USD)")).toHaveValue(200));
    fireEvent.change(screen.getByLabelText("Number of shares"), { target: { value: "25" } });
    expect(screen.getByLabelText("Investment amount (USD)")).toHaveValue(500);
    fireEvent.keyDown(document.activeElement ?? document.body, { key: "Escape" });
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    fireEvent.click(screen.getByRole("button", { name: /Meta/ }));
    await waitFor(() => expect(screen.getByLabelText("Investment amount (USD)")).toHaveValue(1250));
    expect(screen.getByLabelText("Number of shares")).toHaveValue(25);
    expect(screen.getByLabelText("Investment date")).toHaveValue("2021-10-07");
    expect(screen.getByLabelText("Valuation date")).toHaveValue("2026-10-08");
    fireEvent.change(screen.getByLabelText("Investment amount (USD)"), { target: { value: "1000" } });
    expect(screen.getByLabelText("Number of shares")).toHaveValue(20);
    fireEvent.keyDown(document.activeElement ?? document.body, { key: "Escape" });
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    fireEvent.click(screen.getByRole("button", { name: /NVIDIA/ }));
    await waitFor(() => expect(screen.getByLabelText("Number of shares")).toHaveValue(50));
    expect(screen.getByLabelText("Investment amount (USD)")).toHaveValue(1000);
    expect(screen.queryByText("Premarket")).not.toBeInTheDocument();
    client.clear();
  });
  it("formats actual capitalization with compact USD units", () => {
    expect(formatMarketCap(3.544e12)).toBe("$3.54 T");
    expect(formatMarketCap(754.126e9)).toBe("$754.13 B");
    expect(formatMarketCap(null)).toBe("Unavailable");
    expect(formatMarketCap(NaN)).toBe("Unavailable");
  });
});