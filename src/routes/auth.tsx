import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { pageHead } from "@/lib/markets";

const safeNext = (n?: string) => (n && n.startsWith("/") && !n.startsWith("//") ? n : "/ask");

export const Route = createFileRoute("/auth")({
  validateSearch: z.object({ next: z.string().optional() }),
  head: () => pageHead("Sign in or create an account", "Sign in or create your Investico Academy account with your email address to save filing questions and access your account."),
  component: AuthPage,
});

function AuthPage() {
  const { next } = Route.useSearch();
  const navigate = useNavigate();
  const target = safeNext(next);
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => { if (data.user) navigate({ to: target }); });
    const { data } = supabase.auth.onAuthStateChange((event, session) => { if (event === "SIGNED_IN" && session) navigate({ to: target }); });
    return () => data.subscription.unsubscribe();
  }, [navigate, target]);

  async function submit(e: FormEvent) {
    e.preventDefault(); setBusy(true); setMessage("");
    const res = mode === "signin"
      ? await supabase.auth.signInWithPassword({ email, password })
      : await supabase.auth.signUp({ email, password, options: { emailRedirectTo: `${window.location.origin}/auth?next=${encodeURIComponent(target)}` } });
    setBusy(false);
    if (res.error) return setMessage(res.error.message);
    if (mode === "signup" && !res.data.session) setMessage("Check your email to confirm your account, then sign in.");
  }

  return <main className="mx-auto flex min-h-[70vh] w-full max-w-md flex-col justify-center gap-5 px-5 py-12">
    <div><h1 className="font-serif text-3xl font-bold text-foreground">{mode === "signin" ? "Sign in" : "Create your account"}</h1><p className="mt-2 text-sm text-muted-foreground">Create an account to save your questions about each company's filings, or sign in as the owner to broadcast a live earnings call.</p></div>
    <form onSubmit={submit} className="flex flex-col gap-3">
      <label className="text-sm text-foreground">Email<Input type="email" required value={email} onChange={e => setEmail(e.target.value)} className="mt-1" /></label>
      <label className="text-sm text-foreground">Password<Input type="password" required minLength={6} value={password} onChange={e => setPassword(e.target.value)} className="mt-1" /></label>
      <Button type="submit" disabled={busy}>{busy ? "Please wait…" : mode === "signin" ? "Sign in" : "Create account"}</Button>
    </form>
    <Button variant="link" onClick={() => { setMode(mode === "signin" ? "signup" : "signin"); setMessage(""); }}>{mode === "signin" ? "New here? Create an account" : "Already have an account? Sign in"}</Button>
    <p className="text-center text-xs text-muted-foreground">Sign in and sign up use your email address only — no phone number needed.</p>
    {message && <p role="status" className="text-sm text-muted-foreground">{message}</p>}
  </main>;
}
