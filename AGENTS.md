<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

- Share navigation in the root layout and give each named section its own leaf route, so direct links and metadata remain independent.
- Render company names with letter-monogram badges, not company logo artwork, so the reference design remains recognizable without trademark graphics.
- Use a shared AcademyBrand pillar-and-growth wordmark and pillar-derived favicon for the site's own identity, keeping it separate from company labels.
- Scope calculator theme tokens to the selected company on the shared dialog, preserving semantic profit/loss colors and shared calculation state.
- Keep the Apple pro-calculator stages inside the existing shared dialog and financial formulas in a browser-safe pure module; other companies retain their investment calculator during the staged rollout.
- Never treat reference sample figures, sector medians or decision recommendations as sourced facts; financial-statement fields stay user-entered until a verified provider supplies them.
- Keep mobile navigation in the shared Radix Sheet with focus trapping and link-triggered dismissal, so the compact menu remains accessible without changing desktop navigation.
- Keep ticker and timeline query options in a browser-safe market module and validate the public price request with an allowlist, so controls cannot request arbitrary instruments.
- Use a shared date-and-share calculator on home and Markets; clear submitted results when inputs or company change so results never describe stale inputs.
- Compute date-and-share returns from allowlisted daily closing prices on demand, using source trading dates and disclosing the split-adjusted share basis so share quantities and historical prices stay consistent.
- Display source-reported after-hours prices with their source timestamps so older sessions are not misrepresented as live trades.
- Resolve card session content with a browser-safe Eastern-time clock and same-session quote timestamps; reserve the full-width session area with an invisible placeholder so timed replacements cannot move cards.
- Batch all allowlisted company quotes and market caps through a server-only Yahoo anonymous session; coalesce in-flight requests and cache at most one second to avoid duplicate provider traffic.
- Keep the most recently edited investment basis (USD or shares) when switching companies; derive its equivalent using the first source trading close on or after the investment date.
- Fetch company quotes together through an allowlisted public market function and refresh without synthesizing ticks; chart stock prices separately from calculated portfolio results so axes remain truthful.
- Transfer the request-scoped Query cache through router dehydration/hydration so live market prices match the server-rendered snapshot on first load.
- Render candlesticks only from source OHLC observations; quote-only endpoints have no fabricated candle and below-close shading uses the latest session's previous close.
- Use a responsive SVG price plot for baseline clipping and source OHLC candles so the chart is visible on first render and both views share the calendar cursor.
- Source each company's financial-statement figures from SEC EDGAR companyfacts by CIK, with concept aliases and a staleness cutoff (server-side, cached 1h) and tag every auto-filled input with its filing form, filed date and reporting period; unmapped or composite fields stay user-entered.
- Apple filings Q&A: threads/messages stored per user in Lovable Cloud; /api/filing-chat verifies the bearer and thread ownership, and the model only receives server-built SEC EDGAR references [S#] so answers cite filings rather than invented figures.
- Fill European calculators from SEC EDGAR 20-F companyfacts for SEC filers (annual only, labeled in the reporting currency), falling back to labeled Yahoo summaries for quarters and non-filers, so filed figures are never mixed up with provider summaries.
