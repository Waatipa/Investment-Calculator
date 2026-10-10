// Yahoo's anonymous data session stays server-only and is never returned to clients.
let session: { cookie: string; crumb: string; expires: number } | null = null;
let sessionPending: Promise<{ cookie: string; crumb: string; expires: number }> | null = null;
let cached: { data: Record<string, unknown>[]; expires: number } | null = null;
let pending: Promise<Record<string, unknown>[]> | null = null;
const headers = { "User-Agent": "Mozilla/5.0", Accept: "*/*" };
const symbols = "NVDA,AAPL,MSFT,AMZN,GOOGL,META,TSLA";

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

export async function fetchCompanyQuotes(): Promise<Record<string, unknown>[]> {
  if (cached && cached.expires > Date.now()) return cached.data;
  if (pending) return pending;
  pending = (async () => {
    for (let attempt = 0; attempt < 2; attempt++) {
      const auth = await getSession();
      const response = await fetch(`https://query2.finance.yahoo.com/v7/finance/quote?symbols=${symbols}&crumb=${encodeURIComponent(auth.crumb)}`, { headers: { ...headers, Cookie: auth.cookie }, signal: AbortSignal.timeout(10000) });
      if (response.status === 401 || response.status === 403) { await response.arrayBuffer(); session = null; continue; }
      if (!response.ok) { await response.arrayBuffer(); throw new Error("Quotes unavailable"); }
      const body: { quoteResponse?: { result?: Record<string, unknown>[] } } = await response.json();
      const data = body.quoteResponse?.result;
      if (!Array.isArray(data)) throw new Error("Quotes unavailable");
      cached = { data, expires: Date.now() + 1000 };
      return data;
    }
    throw new Error("Quotes unavailable");
  })();
  try { return await pending; } finally { pending = null; }
}