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

- Root leaf navigation tracks visits/Back; ComingSoonButton handles unlinked options.
- Render the educational disclaimer once in root to avoid duplicate copy.
- Aggregate comparison holdings through the browser-safe portfolioTotals helper and shared CompareTotals view, so chart-cursor and end-period table totals use the same formulas.
- Company identity: letter-monogram badges only (no logo artwork); the site's own identity is the shared AcademyBrand pillar-and-growth wordmark and pillar favicon.
- Shared dialogs preserve state and profit/loss colors; pure modules hold formulas. All dates use CalculatorDateField; stable calendar components prevent focus remounts from losing clicks.
- Never treat sample figures, sector medians or recommendations as sourced facts; financial-statement fields stay user-entered until a verified provider supplies them.
- Mobile navigation stays in the shared Radix Sheet with focus trapping and link-triggered dismissal.
- Share browser-safe ticker allowlists and listing boundaries across all price paths; reused tickers must exclude the previous issuer's history.
- Shared date-and-share calculator on home and Markets; clear submitted results when inputs or company change so results never describe stale inputs.
- Date-and-share returns come from allowlisted daily closing prices on demand, using source trading dates and disclosing the split-adjusted share basis.
- After-hours prices display with source timestamps so older sessions are not misrepresented as live.
- Card session content resolves via a browser-safe Eastern-time clock and same-session quote timestamps; reserve the session area with an invisible placeholder so timed swaps never move cards.
- Quotes: batch all allowlisted company quotes and market caps through a server-only Yahoo anonymous session (coalesce in-flight, cache ≤1s); fetch together via the allowlisted public market function, refresh without synthesizing ticks, and chart stock prices separately from calculated portfolio results.
- Keep the most recently edited investment basis (USD or shares) when switching companies; derive its equivalent from the first source close on or after the investment date.
- Transfer the request-scoped Query cache through router dehydration/hydration so live prices match the server-rendered snapshot on first load.
- Charts: render candlesticks only from source OHLC (no fabricated candles from quote-only endpoints; below-close shading uses the latest previous close); use the responsive SVG price plot for baseline clipping so charts show on first render and both views share the calendar cursor.
- Financial statements: source from SEC EDGAR companyfacts by CIK with concept aliases and a staleness cutoff (server-side, cached 1h); tag every auto-filled input with filing form, filed date and period; unmapped or composite fields stay user-entered.
- Filings Q&A: threads/messages stored per user in Lovable Cloud; /api/filing-chat verifies the bearer and thread ownership; the model only receives server-built SEC EDGAR references [S#] so answers cite filings.
- European calculators: SEC EDGAR 20-F companyfacts for SEC filers (annual only, labeled in reporting currency), falling back to labeled Yahoo summaries for quarters and non-filers.
- RegionalMarketCards is shared across Africa, Europe and Middle East with data-company identity tokens for cards and all dialog stages, so each region keeps identical calculator behavior.
- Regional profit calculators reuse date/share return formulas with exchange-local dates, allowlisted Yahoo history, normalized pence/cents and source-timestamped latest trades; missing source data blocks results rather than estimating.
- African quotes and fundamentals stay allowlisted; normalize JSE cents to rand only in calculators, and distinguish share-price subunits from market-cap currencies to avoid 100-fold valuation errors.
- Compare Stocks (/compare) uses daily split-adjusted Yahoo closes converted to USD at each day's historical FX close via the pure compare.ts module; only an end date of today uses the timestamped latest trade, so past-date results never drift with live prices.
- Compare result charts and portfolio ranking share a calendar-date cursor through compare-timeline.ts; market-cap estimates use source current shares held constant and must explicitly disclose that they are not reported historical capitalization.
- Ask Investments content and routing/matching stay browser-safe with a frozen exact-query country-specific volume snapshot; missing volumes remain unknown and numbering never changes on refresh.
- PWA: vite-plugin-pwa generates /sw.js; NetworkFirst navigations exclude /~oauth. Register only via pwa-register.ts (never dev/preview/iframe; ?sw=off disables); public manifest/icons and install-prompt.tsx.
- App icons share a padded pillar asset; ordinary icons have transparent rounded corners, while a separate opaque maskable icon lets mobile operating systems apply their own shape without cropping the pillar.
- Region decoration uses a shared pointer-transparent canvas and effect-only Three.js; planet-regions maps routes to identities without quote imports.
- Platform-share owns the homepage URL; share-files prepares browser QR/PDF blobs after hydration for click-triggered downloads.
