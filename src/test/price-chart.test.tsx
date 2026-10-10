import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { PriceChart } from "@/components/price-chart";
import { marketQuery, quotesQuery } from "@/lib/markets";

const points = [{ t: 1, c: 90, o: 95, h: 98, l: 88 }, { t: 2, c: 110, o: 92, h: 115, l: 91 }, { t: 3, c: 112, o: null, h: null, l: null }];
const props = { points, previousClose: 100, index: 1, onSelect: () => {}, dateLabel: String, marketOpen: false };
describe("Real stock chart", () => {
  it("renders separate above-close and below-close regions", () => {
    const { container } = render(<PriceChart {...props} candles={false}/>);
    expect(screen.getByText("Previous close $100.00")).toBeInTheDocument();
    expect(container.querySelectorAll('[data-chart="line"] path')).toHaveLength(4);
  });
  it("only renders candles with source OHLC data", () => {
    const { container } = render(<PriceChart {...props} candles/>);
    expect(container.querySelectorAll('[data-chart="candles"] rect')).toHaveLength(2);
  });
  it("checks company quotes every second and chart history every five seconds", () => {
    expect(marketQuery().refetchInterval).toBe(5000);
    expect(quotesQuery().refetchInterval).toBe(1000);
    expect(quotesQuery().staleTime).toBe(0);
  });
});