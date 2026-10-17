import { EXTRA_QUESTIONS } from "./ask-investments-extra";
import { SEARCH_VOLUMES, searchKey } from "./ask-investments-volumes";

export type QA = { cat: Category; q: string; a: string };
export const CATEGORIES = ["Beginners", "Calculators", "Comparing stocks", "Companies", "Ratios & research", "Risk & strategy"] as const;
export type Category = typeof CATEGORIES[number];

const B: Category = "Beginners", C: Category = "Calculators", K: Category = "Comparing stocks", Co: Category = "Companies", R: Category = "Ratios & research", S: Category = "Risk & strategy";

export const ORIGINAL_QUESTIONS: QA[] = [
  // Beginners (20)
  { cat: B, q: "What is a stock?", a: "A stock is a small piece of ownership in a company.\n\nExample: if a bakery is split into 100 equal pieces and you buy 1, you own 1% of the bakery — and 1% of its future profits." },
  { cat: B, q: "Why do stock prices go up and down?", a: "Prices move because buyers and sellers keep changing their minds about what a company is worth.\n\nExample: if a company reports bigger profits than expected, more people want to buy, so the price rises." },
  { cat: B, q: "What is the stock market?", a: "It's a marketplace where people buy and sell shares of companies, like a big online shop for company ownership.\n\nExample: the New York Stock Exchange and Nasdaq are stock markets in the US." },
  { cat: B, q: "How much money do I need to start investing?", a: "You can start small. Many brokers let you buy part of a share (a fractional share).\n\nExample: with $20 you could own a small fraction of a company whose share costs $200." },
  { cat: B, q: "What is a share price?", a: "It's the cost of one share right now.\n\nExample: if a share price is $50 and you buy 4 shares, you pay $200." },
  { cat: B, q: "What is a broker?", a: "A broker is the company or app that places your buy and sell orders on the stock market.\n\nExample: you tap 'Buy 2 shares' in a broker app, and the broker completes the trade for you." },
  { cat: B, q: "What is a dividend?", a: "A dividend is cash a company shares with its owners from its profits.\n\nExample: you own 100 shares and the company pays $0.50 per share — you receive $50." },
  { cat: B, q: "What does market cap mean?", a: "Market cap is the total value of all a company's shares.\n\nExample: 1 billion shares × $100 per share = a $100 billion market cap." },
  { cat: B, q: "What is a ticker symbol?", a: "A short code that identifies a company on the market.\n\nExample: AAPL is Apple, NVDA is NVIDIA and MSFT is Microsoft." },
  { cat: B, q: "What is the difference between saving and investing?", a: "Saving keeps money safe; investing puts money to work so it can grow, with some risk.\n\nExample: $1,000 in a drawer stays $1,000; invested, it could grow — or fall — over time." },
  { cat: B, q: "What is an index like the S&P 500?", a: "An index tracks a group of companies to show how the market is doing overall.\n\nExample: the S&P 500 follows about 500 large US companies; if it rises 1%, those companies rose about 1% on average." },
  { cat: B, q: "What is an ETF?", a: "An ETF is a basket of many investments you can buy as one share.\n\nExample: one S&P 500 ETF share gives you a small slice of hundreds of companies at once." },
  { cat: B, q: "What does 'bull market' and 'bear market' mean?", a: "A bull market is when prices rise for a long time; a bear market is when they fall 20% or more.\n\nExample: a market going from 100 to 80 has entered a bear market." },
  { cat: B, q: "What is pre-market and after-hours trading?", a: "Trading that happens before the normal session opens or after it closes. Prices can jump more because fewer people trade.\n\nExample: in the US, after-hours runs 4:00 PM–8:00 PM Eastern Time." },
  { cat: B, q: "What is a stock split?", a: "A stock split is when a company creates more shares so each one costs less, while your total value stays the same.\n\nExample: in a 4-for-1 split, 1 share at $400 becomes 4 shares at $100. The company itself does not change — your slice of ownership stays the same; the pie is simply cut into more, cheaper pieces.\n\nCompanies do this when a share price has grown so high that one share feels out of reach for small savers.\n\nRemember: a split does not make you richer. Your investment is worth the same that day; only the share count and price per share change." },
  { cat: B, q: "What is compounding?", a: "Compounding is earning returns on your earlier returns, so growth speeds up over time.\n\nExample: $1,000 growing 10% a year becomes $1,100, then $1,210, then $1,331 — the growth grows." },
  { cat: B, q: "What is a portfolio?", a: "Your portfolio is the collection of all your investments.\n\nExample: 5 Apple shares, 3 Microsoft shares and an ETF together make your portfolio." },
  { cat: B, q: "What is a limit order vs a market order?", a: "A market order buys right away at the current price; a limit order buys only at your chosen price or better.\n\nExample: a limit order at $95 waits until the price drops to $95." },
  { cat: B, q: "Can I lose all my money in stocks?", a: "Yes, a single company can fail and its shares can drop to zero. Spreading money across many companies lowers that risk.\n\nExample: if one of 20 equal holdings fails, you lose 5%, not everything." },
  { cat: B, q: "How do I make money from stocks?", a: "Two ways: the price rises (capital gain) or the company pays dividends.\n\nExample: buy at $50, sell at $70 = $20 gain per share, plus any dividends received." },

  // Calculators (18)
  { cat: C, q: "How does the profit calculator work?", a: "It takes your investment date, valuation date and number of shares, then uses real closing prices to show what you'd have today.\n\nExample: 10 shares bought at $20 and valued at $50 = $500 value and $300 profit." },
  { cat: C, q: "What is 'Profit Today'?", a: "It's your gain or loss using the stock price on your valuation date.\n\nExample: cost $1,000, value today $1,400 → Profit Today is $400 (+40%)." },
  { cat: C, q: "What is 'Profit at Maximum Stock Price'?", a: "It shows what you'd have made if you sold at the highest real price between your two dates.\n\nExample: price peaked at $80 while you held 10 shares bought at $50 → peak profit $300." },
  { cat: C, q: "Why does the calculator use split-adjusted prices?", a: "So old and new prices are measured on the same share basis.\n\nExample: after a 4-for-1 split, a $400 old price is shown as $100 so your share count stays fair." },
  { cat: C, q: "What is the return multiple?", a: "It tells you how many times your money grew.\n\nExample: $1,000 became $3,000 → a 3× return multiple." },
  { cat: C, q: "What is annualized return?", a: "The average yearly growth rate that would turn your start value into your end value.\n\nExample: $1,000 growing to $2,000 in about 7 years is roughly 10% a year." },
  { cat: C, q: "What is ROI (return on investment)?", a: "ROI = profit ÷ cost × 100%.\n\nExample: you spent $500 and gained $150 → ROI is 30%." },
  { cat: C, q: "Why can't I pick a weekend as my investment date?", a: "Markets are closed on weekends and holidays, so the calculator uses the next real trading day.\n\nExample: choose Saturday → it uses Monday's close." },
  { cat: C, q: "Should I enter shares or a dollar amount?", a: "Either. Enter one and the calculator works out the other from the real price on that date.\n\nExample: $1,000 at a $25 price = 40 shares." },
  { cat: C, q: "Do the calculators include fees and taxes?", a: "No. Results exclude broker fees, taxes and currency costs, so real results can be lower.\n\nExample: a $300 profit minus a $10 fee and taxes leaves less than $300." },
  { cat: C, q: "What does the 'Your Location' button do?", a: "It shows results in your country's currency using a current exchange rate.\n\nExample: a $100 profit could display as about the equivalent in euros if you choose Germany." },
  { cat: C, q: "What is the EPS calculator for?", a: "It shows how much profit a company earns for each share.\n\nExample: $10 billion profit ÷ 2 billion shares = $5 earnings per share." },
  { cat: C, q: "What does the P/E calculator tell me?", a: "It shows how many dollars investors pay for $1 of yearly earnings.\n\nExample: price $100 ÷ EPS $5 = P/E of 20." },
  { cat: C, q: "What does the liquidity calculator measure?", a: "Whether a company can pay its short-term bills.\n\nExample: current assets $200 ÷ current liabilities $100 = current ratio 2.0 — comfortable." },
  { cat: C, q: "Where do calculator figures come from?", a: "Prices come from market data providers; US company figures come from SEC filings. Each auto-filled figure shows its source.\n\nExample: Apple's revenue shows the 10-K or 10-Q it came from." },
  { cat: C, q: "Why are some calculator fields blank?", a: "If a figure isn't reported in a verified source, we leave it for you instead of guessing.\n\nExample: some banks don't report gross profit, so that field stays empty." },
  { cat: C, q: "What is free cash flow?", a: "Cash left after a company pays to run and maintain its business.\n\nExample: operating cash $50B − equipment spending $10B = $40B free cash flow." },
  { cat: C, q: "Why do results change when I change the dates?", a: "Different dates mean different real prices, so your cost and value change.\n\nExample: buying a month earlier at a lower price gives more profit for the same sale price." },

  // Comparing stocks (16)
  { cat: K, q: "How does Compare Stocks work?", a: "You invest the same amount in several companies on the same date, and it shows which grew most.\n\nExample: $1,000 each in Apple and Microsoft five years ago — see both values side by side." },
  { cat: K, q: "What does the draggable line on the compare chart do?", a: "Drag it to any date and every stock's value, profit and return updates for that day.\n\nExample: drag to a past date to see who was leading at that time." },
  { cat: K, q: "Why convert foreign stocks to US dollars in comparisons?", a: "So all companies are measured in one currency, using each day's real exchange rate.\n\nExample: a European stock's euro value is turned into dollars so it can be compared fairly with Apple." },
  { cat: K, q: "Is the stock with the highest return always the best?", a: "Not always. High returns can come with big swings and higher risk.\n\nExample: a stock up 300% may have dropped 50% along the way — not everyone could hold through that." },
  { cat: K, q: "Should I compare companies from different industries?", a: "You can compare returns, but ratios like P/E are fairer within the same industry.\n\nExample: compare a bank's P/E with other banks, not with a tech company." },
  { cat: K, q: "What does 'ranking' mean in comparison results?", a: "It orders the stocks from best to worst return over your chosen period.\n\nExample: #1 is the stock whose investment grew the most." },
  { cat: K, q: "Why does a past comparison not change with today's price?", a: "When your end date is in the past, we use that day's closing prices, so the result stays fixed.\n\nExample: a comparison ending last year shows last year's numbers forever." },
  { cat: K, q: "How do I compare growth companies vs dividend companies?", a: "Look at total return — price change plus dividends — not just price.\n\nExample: a slower stock paying 4% a year can catch up with a faster one that pays nothing." },
  { cat: K, q: "What is volatility?", a: "How much and how fast a price moves up and down.\n\nExample: a stock moving ±5% daily is more volatile than one moving ±0.5%." },
  { cat: K, q: "How many stocks should I compare at once?", a: "Two to five keeps the chart clear and easy to read.\n\nExample: compare NVIDIA, Microsoft and Apple to see the tech leaders together." },
  { cat: K, q: "What is a drawdown?", a: "The drop from a high point to a later low point.\n\nExample: a portfolio falling from $10,000 to $7,000 had a 30% drawdown." },
  { cat: K, q: "Why compare to an index?", a: "To see if a company beat the overall market.\n\nExample: your stock rose 12% but the S&P 500 rose 15% — it actually lagged the market." },
  { cat: K, q: "What is relative performance?", a: "How one investment did compared with another over the same time.\n\nExample: Stock A +20%, Stock B +10% → A outperformed B by 10 points." },
  { cat: K, q: "Can I compare stocks from Africa, Europe and the Middle East?", a: "Yes. Pick companies from any region we cover; values are converted to US dollars for fairness.\n\nExample: compare MTN Group with Saudi Aramco over the same period." },
  { cat: K, q: "What does 'normalized' performance mean on a chart?", a: "All stocks start from the same point so you see growth, not price size.\n\nExample: a $20 and a $400 stock both start at 100% and you see who grew more." },
  { cat: K, q: "Why might two similar companies perform differently?", a: "Different products, profits, debts and news change how investors value them.\n\nExample: one chipmaker winning a big customer can rise while a rival falls." },

  // Companies (17)
  { cat: Co, q: "What does NVIDIA do?", a: "NVIDIA designs graphics chips (GPUs) used in gaming, data centres and artificial intelligence.\n\nExample: many AI systems are trained on NVIDIA chips." },
  { cat: Co, q: "What does Apple make money from?", a: "Mostly from selling iPhones, plus Macs, iPads, wearables and services like the App Store and iCloud.\n\nExample: every paid app download earns Apple a share." },
  { cat: Co, q: "How does Microsoft earn its money?", a: "From cloud services (Azure), Office/Microsoft 365, Windows, gaming and LinkedIn.\n\nExample: a company paying monthly for Microsoft 365 is recurring revenue." },
  { cat: Co, q: "What is Amazon's business?", a: "Online shopping, AWS cloud computing, advertising and subscriptions like Prime.\n\nExample: a website hosted on AWS pays Amazon every month." },
  { cat: Co, q: "What does Alphabet own?", a: "Alphabet is Google's parent: Search, YouTube, Android, Google Cloud and other projects.\n\nExample: ads shown next to search results are its biggest earner." },
  { cat: Co, q: "How does Meta make money?", a: "Mostly from advertising on Facebook, Instagram and WhatsApp.\n\nExample: a shop paying to show its ad in your Instagram feed." },
  { cat: Co, q: "What does Tesla do?", a: "Tesla makes electric cars, batteries and solar energy products.\n\nExample: selling a car brings revenue; energy storage is a growing second business." },
  { cat: Co, q: "What is ASML known for?", a: "ASML builds the advanced machines used to print computer chips.\n\nExample: top chipmakers rely on ASML machines to make the newest chips." },
  { cat: Co, q: "What does Novo Nordisk do?", a: "It's a Danish healthcare company known for diabetes and weight-loss medicines.\n\nExample: insulin products are among its core medicines." },
  { cat: Co, q: "What is LVMH?", a: "A French luxury group owning brands in fashion, jewellery, wine and perfume.\n\nExample: Louis Vuitton and Moët are part of LVMH." },
  { cat: Co, q: "What does Saudi Aramco do?", a: "Aramco is Saudi Arabia's national oil and gas company, one of the world's largest companies.\n\nExample: its profits rise and fall with oil prices." },
  { cat: Co, q: "What is Naspers?", a: "A South African technology investor with big stakes in internet companies.\n\nExample: much of its value comes from shares it holds in other tech businesses." },
  { cat: Co, q: "What does MTN Group do?", a: "MTN is a mobile network and mobile-money operator across Africa and the Middle East.\n\nExample: airtime, data bundles and MoMo payments earn it revenue." },
  { cat: Co, q: "What is Dangote Cement?", a: "Africa's largest cement producer, based in Nigeria.\n\nExample: new roads and buildings across Africa drive demand for its cement." },
  { cat: Co, q: "Why are many Middle East companies banks or energy firms?", a: "Oil, gas and banking are among the region's largest industries.\n\nExample: Al Rajhi Bank, First Abu Dhabi Bank and ADNOC Gas are all region leaders." },
  { cat: Co, q: "Why are UK share prices shown in pence?", a: "The London market quotes many shares in pence (1/100 of a pound).\n\nExample: 1,200p equals £12.00 per share." },
  { cat: Co, q: "Where can I see a company's chart and statistics?", a: "Click any company card on the home page or a region page — the detail view opens with its chart first.\n\nExample: click NVIDIA, review the chart, then press Proceed to calculators." },

  // Ratios & research (16)
  { cat: R, q: "What is revenue?", a: "Revenue is all the money a company brings in from sales, before costs.\n\nExample: selling 1,000 phones at $500 = $500,000 revenue." },
  { cat: R, q: "What is net income?", a: "The profit left after all costs, interest and taxes.\n\nExample: revenue $100, total costs $80 → net income $20." },
  { cat: R, q: "What is gross margin?", a: "The share of revenue left after the direct cost of making products.\n\nExample: sell for $100, costs $40 to make → 60% gross margin." },
  { cat: R, q: "What is operating margin?", a: "Profit from main operations as a share of revenue.\n\nExample: operating income $30 on $100 revenue = 30% operating margin." },
  { cat: R, q: "What is a 10-K and a 10-Q?", a: "Official reports US companies file with the SEC: 10-K yearly, 10-Q quarterly.\n\nExample: Apple's 10-K shows its full-year revenue and profit." },
  { cat: R, q: "What is a 20-F filing?", a: "The annual report many foreign companies file with the US SEC.\n\nExample: ASML and SAP file 20-F reports." },
  { cat: R, q: "What is the debt-to-equity ratio?", a: "It compares what a company owes to what its owners have put in.\n\nExample: debt $50 ÷ equity $100 = 0.5 — fairly low debt." },
  { cat: R, q: "What is return on equity (ROE)?", a: "Profit earned for every dollar of shareholders' money.\n\nExample: net income $20 ÷ equity $100 = 20% ROE." },
  { cat: R, q: "What is a balance sheet?", a: "A snapshot of what a company owns (assets), owes (liabilities) and what's left for owners (equity).\n\nExample: assets $300 − liabilities $200 = equity $100." },
  { cat: R, q: "What is an income statement?", a: "A report of revenue, costs and profit over a period.\n\nExample: a quarter's report shows sales of $100 and profit of $15." },
  { cat: R, q: "What is a cash flow statement?", a: "It shows actual cash coming in and going out.\n\nExample: a company can report profit but still run short of cash if customers pay late." },
  { cat: R, q: "What is the dividend yield?", a: "Yearly dividend ÷ share price.\n\nExample: $2 dividend on a $50 share = 4% yield." },
  { cat: R, q: "What is a payout ratio?", a: "The share of profit paid out as dividends.\n\nExample: EPS $5, dividend $2 → 40% payout ratio." },
  { cat: R, q: "Is a low P/E always cheap?", a: "Not always. A low P/E can mean the market expects profits to fall.\n\nExample: a P/E of 6 with shrinking sales may be a 'value trap'." },
  { cat: R, q: "What is the PEG ratio?", a: "P/E divided by the expected earnings growth rate, to judge price vs growth.\n\nExample: P/E 30 ÷ growth 30% = PEG 1.0." },
  { cat: R, q: "What is fundamental vs technical analysis?", a: "Fundamental looks at the business and its numbers; technical looks at price charts and patterns.\n\nExample: reading revenue growth is fundamental; spotting a rising trend line is technical." },

  // Risk & strategy (12)
  { cat: S, q: "What is diversification?", a: "Spreading money across different investments so one loss hurts less.\n\nExample: owning tech, banks and healthcare instead of only one tech stock." },
  { cat: S, q: "What is dollar-cost averaging?", a: "Investing the same amount regularly, whatever the price.\n\nExample: $100 every month — you buy more shares when prices are low and fewer when high." },
  { cat: S, q: "Should I invest for the short or long term?", a: "Long-term investing usually smooths out short-term ups and downs, but it depends on your goals.\n\nExample: money needed next month is better saved; money for 10 years ahead can be invested." },
  { cat: S, q: "What is an emergency fund and why first?", a: "Cash set aside for surprises, so you don't sell investments at a bad time.\n\nExample: 3–6 months of expenses in savings before investing." },
  { cat: S, q: "What is currency risk?", a: "Exchange-rate changes can raise or lower your foreign investment's value.\n\nExample: your euro stock is flat, but if the euro falls vs your currency, you lose value." },
  { cat: S, q: "What is a stop-loss?", a: "An order that sells automatically if a price falls to a level you set.\n\nExample: buy at $100, set stop-loss at $90 to limit the loss to about 10%." },
  { cat: S, q: "Why does past performance not guarantee future results?", a: "Conditions change — competition, economy and company news.\n\nExample: a stock that tripled last year can fall the next year." },
  { cat: S, q: "What is rebalancing?", a: "Adjusting your holdings back to your planned mix.\n\nExample: plan 50/50; stocks grow to 70% — you sell some to get back to 50/50." },
  { cat: S, q: "How do I avoid emotional investing?", a: "Make a simple plan and stick to it, rather than reacting to every headline.\n\nExample: decide 'I invest $200 monthly' and don't panic-sell on a bad day." },
  { cat: S, q: "What is risk tolerance?", a: "How much loss you can handle — in money and in feelings — without panicking.\n\nExample: if a 20% drop would keep you awake, choose steadier investments." },
  { cat: S, q: "Is it better to buy one share of many companies or many shares of one?", a: "Usually many companies, because it lowers the damage of one company doing badly.\n\nExample: 10 companies × $100 is safer than $1,000 in one company." },
  { cat: S, q: "Does Investico give buy or sell advice?", a: "No. Investico is educational. Our tools show numbers so you can decide for yourself.\n\nExample: the calculator shows a past profit; it doesn't tell you to buy." },
];

export type GuideDestination = "/markets" | "/compare" | "/ask";
export const CATEGORY_GUIDES: Record<Category, { to: GuideDestination; label: string; steps: string }> = {
  Beginners: { to: "/markets", label: "Markets", steps: "1. Open Markets. 2. Select a company. 3. Read its chart and statistics. 4. Choose Proceed to calculators to explore the figures." },
  Calculators: { to: "/markets", label: "Investment Calculator", steps: "1. Open Markets. 2. Select a company. 3. Choose Proceed to calculators. 4. For historical profit, enter both dates and shares or amount, then calculate. For financial ratios, select the matching tool and check its source labels. Tools without a dedicated calculator require a manual calculation; blank fields are not estimates." },
  "Comparing stocks": { to: "/compare", label: "Compare Stocks", steps: "1. Open Compare Stocks. 2. Select supported companies. 3. Choose Next: investment details. 4. Enter the same amount and dates. 5. Calculate results and move the timeline pointer. This shows price returns, not dividends or unsupported assets." },
  Companies: { to: "/markets", label: "Company charts and calculators", steps: "1. Open Markets. 2. Choose the company's region. 3. Select its card. 4. Read About and statistics, then Proceed to calculators. Check the reporting period and source; missing information stays unavailable." },
  "Ratios & research": { to: "/markets", label: "Financial calculators", steps: "1. Open Markets and select a company. 2. Choose Proceed to calculators. 3. Select the matching financial metric. 4. Check units, reporting period and source before calculating. If no matching tool exists, use verified report values and the stated formula manually." },
  "Risk & strategy": { to: "/compare", label: "Historical comparisons", steps: "1. Open Compare Stocks. 2. Select supported companies and matching dates. 3. Calculate and move the timeline to examine past gains and losses. This cannot predict future risk, provide trade signals or calculate personal taxes." },
};

const EXPANSIONS: Record<Category, string> = {
  Beginners: "Treat this as a starting explanation, not a promise of profit. A company's share price and its business results are different things. Open Markets, select a company and review its chart and statistics to connect the idea with actual source-backed information.",
  Calculators: "To explore this, open Markets, select a company and choose Proceed to calculators. Check the dates, units and source labels before entering values. Read the result's exclusions; historical price gains do not include dividends, taxes or fees, and missing figures must not be guessed.",
  "Comparing stocks": "Open Compare Stocks, select supported companies, enter matching dates and an equal amount, then calculate. Move the shared timeline to inspect past results. Price returns exclude dividends, taxes and fees. Separate company reports are needed for business ratios or information the comparison does not display.",
  Companies: "For current information, open Markets, choose the region and select the company's card. Read its About section and statistics, then choose Proceed to calculators. Check the reporting date beside sourced figures. This description explains the business; it is not a recommendation or a live financial statement.",
  "Ratios & research": "Open Markets, select a company and choose Proceed to calculators to find related financial tools. Use matching periods and units, and read each source label. A single ratio cannot prove a business is healthy or cheap; compare it with other report figures and relevant business risks.",
  "Risk & strategy": "Use Compare Stocks to examine supported companies over matching historical dates, then move the timeline to inspect gains and losses. This is educational history, not a forecast or personal strategy. Your own costs, financial needs and ability to handle losses are not captured by the chart.",
};

function expandedAnswer(qa: QA): string {
  // Keep the original explanation and example; add relevant context to short entries.
  const words = qa.a.split(/\s+/).length;
  return words >= 60 ? qa.a : `${qa.a}\n\n${EXPANSIONS[qa.cat]}`;
}

export type NumberedQA = QA & { number: number; volume: number | null };
export const QAS: NumberedQA[] = CATEGORIES.flatMap(cat => {
  const entries: QA[] = [...ORIGINAL_QUESTIONS, ...EXTRA_QUESTIONS.filter(q => q.cat === cat).map(q => ({ ...q, cat }))];
  return entries.filter(q => q.cat === cat).map(qa => ({ ...qa, a: expandedAnswer(qa), volume: SEARCH_VOLUMES[searchKey(qa.q)] ?? null }))
    .sort((a, b) => a.volume === null ? b.volume === null ? 0 : 1 : b.volume === null ? -1 : b.volume - a.volume);
}).map((qa, index) => ({ ...qa, number: index + 1 }));

// Frozen evidence snapshot: refresh ordering only with an explicit content update, not on page load.
export function findQuestion(input: string): NumberedQA | undefined {
  const text = input.trim();
  const number = /^(?:#|q\s*|question\s*)?(\d+)$/i.exec(text)?.[1];
  if (number) return QAS.find(q => q.number === Number(number));
  return QAS.find(q => searchKey(q.q) === searchKey(text));
}

export function guideForQuestion(input: string): Category {
  if (/compare|versus|\bvs\b|outperform/i.test(input)) return "Comparing stocks";
  if (/ratio|earnings|revenue|cash flow|balance sheet|filing/i.test(input)) return "Ratios & research";
  if (/risk|safe|tax|buy|sell|strategy/i.test(input)) return "Risk & strategy";
  if (/profit|return|worth|calculate|invested|shares|amount/i.test(input)) return "Calculators";
  return "Companies";
}
