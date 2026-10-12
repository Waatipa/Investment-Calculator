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
- Use a shared brand-label component with hosted logo assets and CSS brand tokens, so compact company cards stay recognizable without changing market data or calculator behavior.
- Keep ticker and timeline query options in a browser-safe market module and validate the public price request with an allowlist, so controls cannot request arbitrary instruments.
- Use a shared date-and-share calculator on home and Markets; clear submitted results when inputs or company change so results never describe stale inputs.
- Compute date-and-share returns from allowlisted daily closing prices on demand, using source trading dates and disclosing the split-adjusted share basis so share quantities and historical prices stay consistent.
- Display source-reported after-hours prices with their source timestamps so older sessions are not misrepresented as live trades.
- Batch all allowlisted company quotes and market caps through a server-only Yahoo anonymous session; coalesce in-flight requests and cache at most one second to avoid duplicate provider traffic.
- Keep the most recently edited investment basis (USD or shares) when switching companies; derive its equivalent using the first source trading close on or after the investment date.
- Fetch company quotes together through an allowlisted public market function and refresh without synthesizing ticks; chart stock prices separately from calculated portfolio results so axes remain truthful.
- Transfer the request-scoped Query cache through router dehydration/hydration so live market prices match the server-rendered snapshot on first load.
- Render candlesticks only from source OHLC observations; quote-only endpoints have no fabricated candle and below-close shading uses the latest session's previous close.
- Use a responsive SVG price plot for baseline clipping and source OHLC candles so the chart is visible on first render and both views share the calendar cursor.
