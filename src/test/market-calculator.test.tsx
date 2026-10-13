import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MarketCalculator } from "@/components/market-calculator";
import { formatMarketCap } from "@/lib/markets";

const api = vi.hoisted(() => ({ price: vi.fn(), result: vi.fn(), quotes: vi.fn() }));
vi.mock("@/lib/nvda.functions", () => ({ getPriceOnDate: api.price, getInvestmentResult: api.result, getMarketQuotes: api.quotes, getMarketHistory: vi.fn() }));
vi.mock("@tanstack/react-router", () => ({ Link: ({ to, children, ...props }: { to: string; children: React.ReactNode }) => <a href={to} {...props}>{children}</a> }));

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
  it("opens Apple choices first, then a metric form and its results in the same dialog", () => {
    const client = mount();
    fireEvent.click(screen.getByRole("button", { name: /Apple \(AAPL\) calculator/ }));
    expect(screen.getByText("Apple (AAPL) pro calculator")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /EPS Earnings per share/ }));
    fireEvent.change(screen.getByLabelText("Current share price (USD)"), { target: { value: "230" } });
    fireEvent.change(screen.getByLabelText("Net income (USD millions)"), { target: { value: "112000" } });
    fireEvent.change(screen.getByLabelText("Preferred dividends (USD millions)"), { target: { value: "0" } });
    fireEvent.change(screen.getByLabelText("Weighted average shares (millions)"), { target: { value: "15000" } });
    fireEvent.change(screen.getByLabelText("Prior-period EPS (USD) (optional)"), { target: { value: "6.6" } });
    fireEvent.click(screen.getByRole("button", { name: "Calculate EPS" }));
    expect(screen.getByText("$7.47")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Invest Now" })).toHaveAttribute("href", "/subscribe");
    expect(screen.getAllByRole("dialog")).toHaveLength(1);
    fireEvent.click(screen.getByRole("button", { name: "Edit inputs" }));
    expect(screen.getByLabelText("Net income (USD millions)")).toHaveValue(112000);
    client.clear();
  });
  it("matches reference labels and never invents missing off-hours prices", () => {
    const client = mount();
    expect(screen.getAllByText("Close")).toHaveLength(7);
    expect(screen.getAllByText("Off-Hours")).toHaveLength(7);
    expect(screen.getByRole("button", { name: /^Calculate$/ })).toBeInTheDocument();
    document.querySelectorAll(".off-hours .quote-price").forEach(price => expect(price).toHaveTextContent("—"));
    client.clear();
  });
  it("shows sourced regular and off-hours prices with correct movement", async () => {
    const client = mount();
    const quote = { symbol: "NVDA", price: 100, previousClose: 99, marketOpen: true, marketCap: null, postMarketPrice: 98, postMarketTime: Date.parse("2026-10-12T23:59:00Z") };
    client.setQueryData(["market-quotes"], [quote]);
    await waitFor(() => expect(screen.getByText("Live")).toBeInTheDocument());
    expect(screen.getByText("$98.00")).toBeInTheDocument();
    expect(document.querySelector(".off-hours .quote-change")).toHaveClass("text-destructive");
    expect(document.querySelector(".off-hours .quote-time")).toHaveTextContent("7:59 PM ET");
    client.setQueryData(["market-quotes"], [{ ...quote, marketOpen: false }]);
    await waitFor(() => expect(screen.queryByText("Live")).not.toBeInTheDocument());
    client.clear();
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