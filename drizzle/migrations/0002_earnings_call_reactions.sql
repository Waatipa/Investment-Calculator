CREATE TABLE public.earnings_calls (
  ticker text PRIMARY KEY,
  status text NOT NULL DEFAULT 'scheduled',
  eps_consensus numeric,
  revenue_consensus numeric,
  guidance_consensus numeric,
  sector_move numeric,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.earnings_calls TO anon, authenticated;
GRANT ALL ON public.earnings_calls TO service_role;
ALTER TABLE public.earnings_calls ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read earnings calls" ON public.earnings_calls FOR SELECT TO anon, authenticated USING (true);

CREATE TABLE public.call_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticker text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  text text NOT NULL,
  summary text,
  tone numeric,
  eps_actual numeric,
  eps_consensus numeric,
  revenue_actual numeric,
  revenue_consensus numeric,
  guidance numeric,
  guidance_consensus numeric
);
CREATE INDEX call_events_ticker_created ON public.call_events (ticker, created_at DESC);
GRANT SELECT ON public.call_events TO anon, authenticated;
GRANT ALL ON public.call_events TO service_role;
ALTER TABLE public.call_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read call events" ON public.call_events FOR SELECT TO anon, authenticated USING (true);

ALTER PUBLICATION supabase_realtime ADD TABLE public.call_events;
ALTER PUBLICATION supabase_realtime ADD TABLE public.earnings_calls;