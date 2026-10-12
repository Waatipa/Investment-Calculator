type SessionQuote = {
  price: number | null; time: number | null; previousClose: number | null;
  preMarketPrice: number | null; preMarketTime: number | null;
};

const eastern = new Intl.DateTimeFormat("en-CA", {
  timeZone: "America/New_York", year: "numeric", month: "2-digit", day: "2-digit",
  hour: "2-digit", minute: "2-digit", hourCycle: "h23", weekday: "short",
});
function easternParts(time: number) {
  const parts = eastern.formatToParts(time);
  const part = (name: Intl.DateTimeFormatPartTypes) => parts.find(p => p.type === name)?.value ?? "";
  return { date: `${part("year")}-${part("month")}-${part("day")}`, minutes: Number(part("hour")) * 60 + Number(part("minute")), weekday: part("weekday") };
}

export function marketSession(now: number, quote?: SessionQuote) {
  const current = easternParts(now);
  const weekday = current.weekday !== "Sat" && current.weekday !== "Sun";
  const premarket = weekday && current.minutes >= 240 && current.minutes < 570;
  const preTime = quote?.preMarketTime;
  const fresh = preTime != null && preTime <= now && easternParts(preTime).date === current.date && easternParts(preTime).minutes >= 240;
  const price = premarket && fresh ? quote?.preMarketPrice ?? null : null;
  // Before the regular session, regularMarketPrice is the most recent session close;
  // regularMarketPreviousClose can still refer to the session before that.
  const close = quote?.time != null && easternParts(quote.time).date < current.date ? quote.price : quote?.previousClose;
  const change = price != null && close != null && close > 0 ? price - close : null;
  return {
    label: weekday && current.minutes >= 570 && current.minutes < 1200 ? "After-hours" : "Pre-market",
    price, change, percent: change != null && close != null ? change / close * 100 : null,
    time: price != null ? preTime : null,
  };
}