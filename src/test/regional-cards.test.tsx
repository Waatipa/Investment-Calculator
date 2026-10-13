import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { RegionalMarketCards, marketCapCurrency } from "@/components/regional-market-cards";
import { AF_COMPANIES } from "@/lib/africa";
vi.mock("@tanstack/react-router", () => ({ Link: ({ to, children, ...props }: { to: string; children: React.ReactNode }) => <a href={to} {...props}>{children}</a> }));
afterEach(cleanup);
describe("Regional cards", () => {
  it("uses eight unique companies with appropriate market-cap units", () => {
    expect(new Set(AF_COMPANIES.map(c => c.symbol)).size).toBe(8);
    expect(marketCapCurrency("ZAc")).toBe("ZAR");
    expect(marketCapCurrency("GBp")).toBe("GBP");
    expect(marketCapCurrency("SAR")).toBe("SAR");
  });
  it("opens company-themed calculator stages and calculates in rand", () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(<QueryClientProvider client={client}><RegionalMarketCards companies={AF_COMPANIES} quotes={[]} region="African" /></QueryClientProvider>);
    fireEvent.click(screen.getByRole("button", { name: "FirstRand calculator" }));
    expect(screen.getByRole("dialog")).toHaveAttribute("data-company", "FSR.JO");
    const profit = screen.getByRole("button", { name: /Profit calculator Investment date/ });
    expect(profit.compareDocumentPosition(screen.getByRole("button", { name: /ROE Return on equity/ })) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    fireEvent.click(profit);
    expect(screen.getByLabelText("Investment date")).toBeInTheDocument();
    expect(screen.getByLabelText("Valuation date")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Choose investment date" })).toBeInTheDocument();
    expect(screen.getByLabelText("Number of shares")).toHaveValue(10);
    fireEvent.click(screen.getByRole("button", { name: "← All calculators" }));
    fireEvent.click(screen.getByRole("button", { name: /ROE Return on equity/ }));
    fireEvent.change(screen.getByLabelText("Net income (ZAR millions)"), { target: { value: "10" } });
    fireEvent.change(screen.getByLabelText("Average shareholders’ equity (ZAR millions)"), { target: { value: "100" } });
    fireEvent.click(screen.getByRole("button", { name: "Calculate ROE" }));
    expect(screen.getAllByText("10.00%").length).toBeGreaterThan(0);
    expect(screen.getByRole("link", { name: "Invest Now" })).toBeInTheDocument();
    client.clear();
  });
});