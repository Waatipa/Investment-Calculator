import { describe, expect, it } from "vitest";
import { companySearch, selectedCompany } from "@/lib/company-selection";

describe("company menu destinations", () => {
  it("selects NVIDIA rather than Apple for its menu destination", () => {
    expect(selectedCompany([{ symbol: "AAPL" }, { symbol: "NVDA" }], companySearch({ company: "NVDA" }).company)?.symbol).toBe("NVDA");
  });
  it("does not open a US company on a regional page", () => {
    expect(selectedCompany([{ symbol: "SAP.DE" }], "NVDA")).toBeUndefined();
  });
  it("does not open a non-trading listing", () => {
    expect(selectedCompany([{ symbol: "DANGOTEREF", notTrading: true }], "DANGOTEREF")).toBeUndefined();
  });
});