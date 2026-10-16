CREATE TABLE public.contact_messages (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), email text NOT NULL CHECK (char_length(email) BETWEEN 3 AND 255), message text NOT NULL CHECK (char_length(message) BETWEEN 1 AND 5000), emailed_at timestamptz, created_at timestamptz NOT NULL DEFAULT now());
GRANT INSERT ON public.contact_messages TO anon, authenticated;
GRANT ALL ON public.contact_messages TO service_role;
ALTER TABLE public.contact_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can send a contact message" ON public.contact_messages FOR INSERT TO anon, authenticated WITH CHECK (emailed_at IS NULL);