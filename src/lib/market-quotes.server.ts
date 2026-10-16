// Yahoo's anonymous data session stays server-only and is never returned to clients.
let session: { cookie: string; crumb: string; expires: number } | null = null;
let sessionPending: Promise<{ cookie: string; crumb: string; expires: number }> | null = null;
const cache = new Map<string, { data: Record<string, unknown>[]; expires: number }>();
const pendingBy = new Map<string, Promise<Record<string, unknown>[]>>();
const headers = { "User-Agent": "Mozilla/5.0", Accept: "*/*" };
const US_SYMBOLS = "NVDA,AAPL,MSFT,AMZN,GOOGL,META,TSLA";

async function getSession() {
  if (session && session.expires > Date.now()) return session;
  if (sessionPending) return sessionPending;
  sessionPending = (async () => {
    const response = await fetch("https://fc.yahoo.com", { headers, signal: AbortSignal.timeout(10000) });
    const cookieHeaders = response.headers.getSetCookie();
    const cookie = cookieHeaders.map(value => value.split(";")[0]).filter(Boolean).join("; ");
    await response.arrayBuffer();
    if (!cookie) throw new Error("Quote session unavailable");
    const crumbResponse = await fetch("https://query2.finance.yahoo.com/v1/test/getcrumb", { headers: { ...headers, Cookie: cookie }, signal: AbortSignal.timeout(10000) });
    const crumb = await crumbResponse.text();
    if (!crumbResponse.ok || !crumb || crumb.length > 100 || crumb.includes("<")) throw new Error("Quote session unavailable");
    session = { cookie, crumb, expires: Date.now() + 30 * 60 * 1000 };
    return session;
  })();
  try { return await sessionPending; } finally { sessionPending = null; }
}

export async function fetchCompanyQuotes(symbols: string = US_SYMBOLS): Promise<Record<string, unknown>[]> {
  const cached = cache.get(symbols);
  if (cached && cached.expires > Date.now()) return cached.data;
  const existing = pendingBy.get(symbols);
  if (existing) return existing;
  const pending = (async () => {
    for (let attempt = 0; attempt < 2; attempt++) {
      const auth = await getSession();
      const response = await fetch(`https://query2.finance.yahoo.com/v7/finance/quote?symbols=${symbols}&crumb=${encodeURIComponent(auth.crumb)}`, { headers: { ...headers, Cookie: auth.cookie }, signal: AbortSignal.timeout(10000) });
      if (response.status === 401 || response.status === 403) { await response.arrayBuffer(); session = null; continue; }
      if (!response.ok) { await response.arrayBuffer(); throw new Error("Quotes unavailable"); }
      const body: { quoteResponse?: { result?: Record<string, unknown>[] } } = await response.json();
      const data = body.quoteResponse?.result;
      if (!Array.isArray(data)) throw new Error("Quotes unavailable");
      cache.set(symbols, { data, expires: Date.now() + 1000 });
      return data;
    }
    throw new Error("Quotes unavailable");
  })();
  pendingBy.set(symbols, pending);
  try { return await pending; } finally { pendingBy.delete(symbols); }
}
// Authenticated Yahoo JSON request (adds the server-only crumb/cookie); cached per URL for `ttl` ms.
const jsonCache = new Map<string, { data: unknown; expires: number }>();
export async function fetchYahooJson(url: string, ttl = 60_000): Promise<unknown> {
  const hit = jsonCache.get(url);
  if (hit && hit.expires > Date.now()) return hit.data;
  for (let attempt = 0; attempt < 2; attempt++) {
    const auth = await getSession();
    const sep = url.includes("?") ? "&" : "?";
    const r = await fetch(`${url}${sep}crumb=${encodeURIComponent(auth.crumb)}`, { headers: { ...headers, Cookie: auth.cookie }, signal: AbortSignal.timeout(12000) });
    if (r.status === 401 || r.status === 403) { await r.arrayBuffer(); session = null; continue; }
    if (!r.ok) { await r.arrayBuffer(); throw new Error("Data unavailable"); }
    const data = await r.json();
    jsonCache.set(url, { data, expires: Date.now() + ttl });
    return data;
  }
  throw new Error("Data unavailable");
}
