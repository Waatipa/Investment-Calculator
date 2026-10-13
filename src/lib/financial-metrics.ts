export type MetricField = { key: string; label: string; hint?: string; optional?: boolean };
export type FinancialMetric = { id: string; name: string; badge: string; group: string; formula: string; fields: MetricField[]; unit: "usd" | "percent" | "ratio"; calculate: (v: Record<string, number>) => number };
const num = (v: Record<string, number>, key: string): number => { const value = v[key]; if (value == null || !Number.isFinite(value)) throw new Error(`Missing valid ${key}.`); return value; };
const f = (key: string, label: string, optional = false): MetricField => ({ key, label, optional });
const div = (a: number, b: number) => { if (b <= 0) throw new Error("The denominator must be greater than zero; this ratio is not meaningful with zero or negative denominators."); return a / b; };
const money = (key: string, label: string) => f(key, `${label} (USD millions)`);
const m = (id: string, name: string, badge: string, group: string, formula: string, fields: MetricField[], unit: FinancialMetric["unit"], calculate: FinancialMetric["calculate"]): FinancialMetric => ({ id, name, badge, group, formula, fields, unit, calculate });
export const FINANCIAL_METRICS = [
  m("pe", "P/E ratio", "P/E", "Valuation", "Price ÷ earnings per share", [f("price", "Current share price (USD)"), f("eps", "Earnings per share (USD)")], "ratio", v => div(num(v, "price"), num(v, "eps"))),
  m("peg", "PEG ratio", "PEG", "Valuation", "P/E ÷ EPS growth rate (percentage points)", [f("pe", "P/E ratio"), f("growth", "Annual EPS growth (%)")], "ratio", v => div(num(v, "pe"), num(v, "growth"))),
  m("pb", "Price-to-book", "P/B", "Valuation", "Price ÷ book value per share", [f("price", "Current share price (USD)"), f("book", "Book value per share (USD)")], "ratio", v => div(num(v, "price"), num(v, "book"))),
  m("ps", "Price-to-sales", "P/S", "Valuation", "Market capitalization ÷ revenue", [money("cap", "Market capitalization"), money("revenue", "Revenue")], "ratio", v => div(num(v, "cap"), num(v, "revenue"))),
  m("ev", "EV / EBITDA", "EV", "Valuation", "Enterprise value ÷ EBITDA", [money("ev", "Enterprise value"), money("ebitda", "EBITDA")], "ratio", v => div(num(v, "ev"), num(v, "ebitda"))),
  m("dcf", "Intrinsic value", "DCF", "Valuation", "Discounted cash flows + terminal value − net debt, per share", [money("fcf", "Annual free cash flow"), f("growth", "Forecast annual cash flow growth (%)"), f("years", "Forecast years"), f("discount", "Discount rate (%)"), f("terminal", "Terminal growth (%)"), money("debt", "Net debt"), f("shares", "Shares outstanding (millions)")], "usd", v => {
    if (!Number.isInteger(num(v, "years")) || num(v, "years") < 1 || num(v, "years") > 50) throw new Error("Forecast years must be a whole number from 1 to 50.");
    if (num(v, "discount") <= num(v, "terminal") || num(v, "discount") <= 0 || num(v, "growth") <= -100 || num(v, "terminal") <= -100) throw new Error("Use a positive discount rate above terminal growth, and growth above −100%.");
    const r = num(v, "discount") / 100, g = num(v, "growth") / 100, t = num(v, "terminal") / 100;
    let pv = 0;
    for (let y = 1; y <= num(v, "years"); y++) pv += num(v, "fcf") * (1 + g) ** y / (1 + r) ** y;
    const terminal = num(v, "fcf") * (1 + g) ** num(v, "years") * (1 + t) / (r - t) / (1 + r) ** num(v, "years");
    return div(pv + terminal - num(v, "debt"), num(v, "shares"));
  }),
  m("eps", "Earnings per share (EPS)", "EPS", "Profitability", "EPS = (Net income − Preferred dividends) ÷ Weighted average shares", [f("price", "Current share price (USD)"), money("income", "Net income"), money("preferred", "Preferred dividends"), f("shares", "Weighted average shares (millions)"), f("prior", "Prior-period EPS (USD)", true)], "usd", v => div(num(v, "income") - num(v, "preferred"), num(v, "shares"))),
  m("roe", "Return on equity", "ROE", "Profitability", "Net income ÷ average equity × 100", [money("income", "Net income"), money("equity", "Average shareholders’ equity")], "percent", v => div(num(v, "income"), num(v, "equity")) * 100),
  m("roa", "Return on assets", "ROA", "Profitability", "Net income ÷ average assets × 100", [money("income", "Net income"), money("assets", "Average total assets")], "percent", v => div(num(v, "income"), num(v, "assets")) * 100),
  m("gross", "Gross margin", "GM", "Profitability", "Gross profit ÷ revenue × 100", [money("profit", "Gross profit"), money("revenue", "Revenue")], "percent", v => div(num(v, "profit"), num(v, "revenue")) * 100),
  m("operating", "Operating margin", "OM", "Profitability", "Operating income ÷ revenue × 100", [money("income", "Operating income"), money("revenue", "Revenue")], "percent", v => div(num(v, "income"), num(v, "revenue")) * 100),
  m("net", "Net margin", "NM", "Profitability", "Net income ÷ revenue × 100", [money("income", "Net income"), money("revenue", "Revenue")], "percent", v => div(num(v, "income"), num(v, "revenue")) * 100),
  m("fcf", "Free cash flow", "FCF", "Growth & cash", "Operating cash flow − capital expenditure", [money("cash", "Operating cash flow"), money("capex", "Capital expenditure (positive outflow)")], "usd", v => (num(v, "cash") - num(v, "capex")) * 1e6),
  m("fcy", "FCF yield", "FCY", "Growth & cash", "Free cash flow ÷ market capitalization × 100", [money("fcf", "Free cash flow"), money("cap", "Market capitalization")], "percent", v => div(num(v, "fcf"), num(v, "cap")) * 100),
  m("cagr", "Revenue CAGR", "CAGR", "Growth & cash", "((Ending revenue ÷ starting revenue)^(1 / years) − 1) × 100", [money("start", "Starting revenue"), money("end", "Ending revenue"), f("years", "Years between reporting periods")], "percent", v => { if (num(v, "end") <= 0 || num(v, "years") <= 0) throw new Error("Ending revenue and years must be positive."); return (div(num(v, "end"), num(v, "start")) ** (1 / num(v, "years")) - 1) * 100; }),
  m("growth", "EPS growth", "EG", "Growth & cash", "(Current EPS − prior EPS) ÷ prior EPS × 100", [f("eps", "Current EPS (USD)"), f("prior", "Prior-period EPS (USD)")], "percent", v => div(num(v, "eps") - num(v, "prior"), num(v, "prior")) * 100),
  m("de", "Debt-to-equity", "D/E", "Balance sheet & income", "Total debt ÷ shareholders’ equity", [money("debt", "Total debt"), money("equity", "Shareholders’ equity")], "ratio", v => div(num(v, "debt"), num(v, "equity"))),
  m("current", "Current ratio", "CR", "Balance sheet & income", "Current assets ÷ current liabilities", [money("assets", "Current assets"), money("liabilities", "Current liabilities")], "ratio", v => div(num(v, "assets"), num(v, "liabilities"))),
  m("interest", "Interest coverage", "IC", "Balance sheet & income", "EBIT ÷ interest expense", [money("ebit", "EBIT"), money("interest", "Interest expense")], "ratio", v => div(num(v, "ebit"), num(v, "interest"))),
  m("dividend", "Dividend yield", "DY", "Balance sheet & income", "Annual dividend per share ÷ price × 100", [f("dividend", "Annual dividend per share (USD)"), f("price", "Current share price (USD)")], "percent", v => div(num(v, "dividend"), num(v, "price")) * 100),
  m("payout", "Payout ratio", "PO", "Balance sheet & income", "Common dividends ÷ income available to common shareholders × 100", [money("dividends", "Common dividends"), money("income", "Net income"), money("preferred", "Preferred dividends")], "percent", v => div(num(v, "dividends"), num(v, "income") - num(v, "preferred")) * 100),
];
export function calculateMetric(metric: FinancialMetric, inputs: Record<string, string>) {
  const values: Record<string, number> = {};
  for (const field of metric.fields) {
    const raw = inputs[field.key]?.trim();
    if (!raw && field.optional) continue;
    if (!raw || !Number.isFinite(Number(raw))) throw new Error(`Enter a valid ${field.label.toLowerCase()}.`);
    values[field.key] = Number(raw);
  }
  if (values["price"] != null && values["price"] <= 0) throw new Error("Share price must be greater than zero.");
  const value = metric.calculate(values);
  if (!Number.isFinite(value)) throw new Error("These inputs do not produce a finite result.");
  return { value, values };
}