DROP POLICY "Anyone can read earnings calls" ON public.earnings_calls;
CREATE POLICY "Public can read listed earnings calls" ON public.earnings_calls FOR SELECT TO anon, authenticated
  USING (ticker IN ('AAPL','MSFT','NVDA','AMZN','GOOGL','META','TSLA','AVGO','BRK.B','JPM'));
DROP POLICY "Anyone can read call events" ON public.call_events;
CREATE POLICY "Public can read listed call events" ON public.call_events FOR SELECT TO anon, authenticated
  USING (ticker IN ('AAPL','MSFT','NVDA','AMZN','GOOGL','META','TSLA','AVGO','BRK.B','JPM') AND created_at > now() - interval '30 days');